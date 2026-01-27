import { describe, it, expect } from 'vitest';
import { loadTranscript, normalizeTranscript } from '../src/core/load.js';

describe('loadTranscript', () => {
  it('should load a valid transcript file', async () => {
    const transcript = await loadTranscript('./tests/fixtures/sample.json');
    expect(transcript).toBeDefined();
    expect(transcript.messages).toBeInstanceOf(Array);
    expect(transcript.messages.length).toBeGreaterThan(0);
  });

  it('should throw error for non-existent file', async () => {
    await expect(loadTranscript('./non-existent.json')).rejects.toThrow('Transcript file not found');
  });

  it('should throw error for invalid JSON', async () => {
    await expect(loadTranscript('./tests/fixtures/invalid.json')).rejects.toThrow('Invalid JSON');
  });
});

describe('normalizeTranscript', () => {
  it('should normalize transcript with messages array', () => {
    const raw = {
      schema_version: '1.0',
      messages: [
        { idx: 0, role: 'user', content: 'Hello' },
        { idx: 1, role: 'assistant', content: 'Hi there!' }
      ]
    };
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages).toHaveLength(2);
    expect(transcript.messages[0].content).toBe('Hello');
  });

  it('should handle raw array format', () => {
    const raw = [
      { idx: 0, role: 'user', content: 'Test' },
      { idx: 1, role: 'assistant', content: 'Response' }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages).toHaveLength(2);
    expect(transcript.schema_version).toBe('1.0');
  });

  it('should auto-assign missing indices', () => {
    const raw = [
      { role: 'user', content: 'First' },
      { role: 'assistant', content: 'Second' }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].idx).toBe(0);
    expect(transcript.messages[1].idx).toBe(1);
  });

  it('should normalize role values', () => {
    const raw = [
      { idx: 0, role: 'USER', content: 'Test' },
      { idx: 1, role: 'Assistant', content: 'Test' }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].role).toBe('user');
    expect(transcript.messages[1].role).toBe('assistant');
  });

  it('should estimate tokens if missing', () => {
    const raw = [
      { idx: 0, role: 'user', content: 'Hello world' }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].tokens).toBeGreaterThan(0);
  });

  it('should apply max messages limit', () => {
    const raw = [
      { idx: 0, role: 'user', content: 'Message 1' },
      { idx: 1, role: 'assistant', content: 'Message 2' },
      { idx: 2, role: 'user', content: 'Message 3' }
    ];
    const transcript = normalizeTranscript(raw, 2);
    expect(transcript.messages).toHaveLength(2);
  });

  it('should preserve optional fields when present', () => {
    const raw = [
      { 
        idx: 0, 
        role: 'user', 
        content: 'Test',
        ts: '2024-01-01T00:00:00Z',
        tokens: 5,
        session_id: 'session-1',
        metadata: { key: 'value' }
      }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].ts).toBe('2024-01-01T00:00:00Z');
    expect(transcript.messages[0].tokens).toBe(5);
    expect(transcript.messages[0].session_id).toBe('session-1');
    expect(transcript.messages[0].metadata).toEqual({ key: 'value' });
  });

  it('should stringify non-string content', () => {
    const raw = [
      { idx: 0, role: 'user', content: 12345 }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].content).toBe('12345');
  });

  it('should throw error for invalid transcript format', () => {
    const raw = { invalid: 'structure' };
    expect(() => normalizeTranscript(raw)).toThrow('Invalid transcript');
  });

  it('should handle empty messages array', () => {
    const raw = { messages: [] };
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages).toHaveLength(0);
  });

  it('should default unknown roles to user', () => {
    const raw = [
      { idx: 0, role: 'unknown_role', content: 'Test' }
    ];
    const transcript = normalizeTranscript(raw);
    expect(transcript.messages[0].role).toBe('user');
  });
});
