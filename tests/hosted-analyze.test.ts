import { beforeEach, describe, expect, it, vi } from 'vitest';
import { inspectTranscript } from '../src/core/inspect.js';
import type { Transcript } from '../src/core/types.js';

const sampleTranscript: Transcript = {
  schema_version: '1.0',
  messages: [{ idx: 0, role: 'user', content: 'hello' }],
};

const sampleResult = {
  drift_score: 12,
  raw_score: 11.7,
  token_waste_pct: 0,
  events: [],
  should_have_been_memory: [],
  timings_ms: {
    extract_facts: 10,
    repetition: 0,
    session_reset: 0,
    contradictions: 0,
    pref_forgotten: 0,
    drift_detection: 15,
  },
};

describe('Hosted analyze mode', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.MEMOGRAPH_ANALYZE_MODE;
    delete process.env.MEMOGRAPH_ANALYZE_API_URL;
  });

  it('uses hosted mode by default when llm config is absent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => sampleResult,
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await inspectTranscript(sampleTranscript, {
      max_messages: 100,
    });

    expect(result.drift_score).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('http://localhost:8080/api/v1/analyze');
  });

  it('retries on 429 and succeeds', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        headers: { get: () => '0' },
        json: async () => ({ error: { message: 'too many requests' } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => sampleResult,
      });
    vi.stubGlobal('fetch', fetchMock);

    const result = await inspectTranscript(sampleTranscript, {
      analyzeMode: 'hosted',
      apiRetries: 1,
    });

    expect(result.drift_score).toBe(12);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('uses legacy llm path when analyze mode is llm', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(
      inspectTranscript(sampleTranscript, {
        analyzeMode: 'llm',
        llm: {
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4o-mini',
        },
      })
    ).rejects.toThrow('OpenAI API key not found');

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
