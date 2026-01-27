/**
 * Error handling and edge case tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadTranscript } from '../src/core/load.js';
import { normalizeTranscript } from '../src/core/load.js';
import { inspectTranscript } from '../src/core/inspect.js';
import { LLMClient } from '../src/core/llm/client.js';
import { extractFactsLLM } from '../src/core/llm/extract-llm.js';
import { detectDriftLLM } from '../src/core/llm/detect-llm.js';
import type { InspectConfig } from '../src/core/types.js';

describe('Error Handling and Edge Cases', () => {
  describe('File Loading Errors', () => {
    it('should handle file not found error', async () => {
      await expect(loadTranscript('/nonexistent/file.json')).rejects.toThrow();
    });

    it('should handle permission denied error', async () => {
      // This test may not work on all systems, so we'll mock it
      const fs = await import('fs');
      vi.spyOn(fs.promises, 'readFile').mockRejectedValue(
        new Error('EACCES: permission denied')
      );

      // Just check that it rejects, not specific error message
      await expect(loadTranscript('/restricted/file.json')).rejects.toThrow();
    });

    it('should handle malformed JSON', async () => {
      const fs = await import('fs');
      vi.spyOn(fs.promises, 'readFile').mockResolvedValue(
        Buffer.from('invalid json {{{')
      );

      await expect(loadTranscript('test.json')).rejects.toThrow();
    });
  });

  describe('Transcript Validation', () => {
    it('should handle empty messages array', () => {
      const raw = { messages: [] };
      const result = normalizeTranscript(raw);

      expect(result.messages).toEqual([]);
      expect(result.schema_version).toBe('1.0');
    });

    it('should handle missing required fields in message', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: 'test' },
          { role: 'assistant', content: 'response' }, // Missing idx
        ],
      };

      const result = normalizeTranscript(raw);

      // Should auto-assign idx
      expect(result.messages[1].idx).toBe(1);
    });

    it('should handle invalid role values', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'invalid_role', content: 'test' },
        ],
      };

      // Should not crash, though TypeScript would catch this at compile time
      const result = normalizeTranscript(raw);
      expect(result.messages).toHaveLength(1);
    });

    it('should handle non-string content', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: null as any },
          { idx: 1, role: 'user', content: 123 as any },
          { idx: 2, role: 'user', content: { text: 'obj' } as any },
        ],
      };

      const result = normalizeTranscript(raw);

      // Normalize converts null/numbers/objects to string representation
      expect(result.messages[0].content).toBe('');
      expect(result.messages[1].content).toBe('123');
      expect(result.messages[2].content).toBe('[object Object]');
    });

    it('should handle raw array format (no messages wrapper)', () => {
      const raw = [
        { idx: 0, role: 'user', content: 'test' },
        { idx: 1, role: 'assistant', content: 'response' },
      ];

      const result = normalizeTranscript(raw);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('test');
    });

    it('should handle missing idx (auto-assign)', () => {
      const raw = {
        messages: [
          { role: 'user', content: 'first' },
          { role: 'assistant', content: 'second' },
          { role: 'user', content: 'third' },
        ],
      };

      const result = normalizeTranscript(raw);

      expect(result.messages[0].idx).toBe(0);
      expect(result.messages[1].idx).toBe(1);
      expect(result.messages[2].idx).toBe(2);
    });
  });

  describe('Max Messages Capping', () => {
    it('should cap messages at max limit', () => {
      const raw = {
        messages: Array.from({ length: 100 }, (_, i) => ({
          idx: i,
          role: 'user',
          content: `message ${i}`,
        })),
      };

      const result = normalizeTranscript(raw, 10);

      expect(result.messages).toHaveLength(10);
      expect(result.messages[9].content).toBe('message 9');
    });

    it('should not cap if under limit', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: 'test' },
        ],
      };

      const result = normalizeTranscript(raw, 100);

      expect(result.messages).toHaveLength(1);
    });
  });

  describe('LLM Client Errors', () => {
    it('should handle missing API key', () => {
      expect(() => {
        new LLMClient({
          provider: 'openai',
          apiKey: '',
          model: 'gpt-4o-mini',
        });
      }).toThrow('OpenAI API key not found');
    });

    it('should handle invalid provider', () => {
      expect(() => {
        new LLMClient({
          provider: 'invalid' as any,
          apiKey: 'test',
          model: 'test',
        });
      }).not.toThrow();
    });

    it('should handle empty model name', () => {
      expect(() => {
        new LLMClient({
          provider: 'openai',
          apiKey: 'test',
          model: '',
        });
      }).not.toThrow();
    });

    it('should handle invalid temperature range', () => {
      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
        temperature: 2.0, // Invalid: > 1.0
      });

      expect(client).toBeDefined();
    });

    it('should handle negative temperature', () => {
      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
        temperature: -0.5, // Invalid: < 0
      });

      expect(client).toBeDefined();
    });

    it('should handle invalid max tokens', () => {
      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
        maxTokens: -100, // Invalid: negative
      });

      expect(client).toBeDefined();
    });
  });

  // Note: OpenAI and Anthropic SDKs use their own HTTP clients
  // and don't respect global.fetch mocking. These tests would require
  // proper SDK mocking or integration testing with actual API calls.
  // For now, we skip these SDK-specific error tests.
  describe.skip('LLM API Errors (requires SDK mocking)', () => {

    it('should handle rate limit errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 429,
          json: () => Promise.resolve({ error: { message: 'Rate limit exceeded' } }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result).toBeDefined();
    });

    it('should handle unauthorized error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: 'Invalid API key' } }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'invalid',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result).toBeDefined();
    });

    it('should handle server error (500)', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: 'Internal server error' }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result).toBeDefined();
    });
  });

  describe('LLM Response Validation', () => {
    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve('not valid json {{{'),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      await expect(client.complete('test prompt')).rejects.toThrow();
    });

    it('should handle missing choices in response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}), // Missing choices
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result.content).toBe('');
    });

    it('should handle empty content in response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '' } }],
          }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result.content).toBe('');
    });

    it('should handle non-string content in response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 123 } }],
          }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test',
        model: 'gpt-4o-mini',
      });

      const result = await client.complete('test prompt');
      expect(result.content).toBe('123');
    });
  });

  describe('Inspection Errors', () => {
    it('should handle empty transcript', async () => {
      const transcript = {
        schema_version: '1.0',
        messages: [] as any,
      };

      const config: InspectConfig = {
        max_messages: 100,
        llm: {
          provider: 'openai',
          apiKey: 'test',
          model: 'gpt-4o-mini',
        },
      };

      // Mock LLM responses
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: '[]' } }],
          }),
        })
      ) as any;

      const result = await inspectTranscript(transcript, config);

      expect(result).toBeDefined();
      expect(result.events).toEqual([]);
      expect(result.drift_score).toBe(0);
    });

    it('should handle LLM API failure gracefully', async () => {
      const transcript = {
        schema_version: '1.0',
        messages: [
          { idx: 0, role: 'user' as const, content: 'test' },
        ],
      };

      const config: InspectConfig = {
        max_messages: 100,
        llm: {
          provider: 'openai',
          apiKey: 'test',
          model: 'gpt-4o-mini',
        },
      };

      // Mock fetch to fail
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('Network error'))
      ) as any;

      // Should not crash, though may return partial results
      await expect(inspectTranscript(transcript, config)).rejects.toThrow();
    });

    it('should handle malformed LLM fact extraction response', async () => {
      const transcript = {
        schema_version: '1.0',
        messages: [
          { idx: 0, role: 'user' as const, content: 'My name is John' },
        ],
      };

      const config: InspectConfig = {
        max_messages: 100,
        llm: {
          provider: 'openai',
          apiKey: 'test',
          model: 'gpt-4o-mini',
        },
      };

      // Mock malformed response
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'not valid json {{' } }],
          }),
        })
      ) as any;

      await expect(inspectTranscript(transcript, config)).rejects.toThrow();
    });

    it('should handle malformed LLM drift detection response', async () => {
      const transcript = {
        schema_version: '1.0',
        messages: [
          { idx: 0, role: 'user' as const, content: 'test' },
          { idx: 1, role: 'assistant' as const, content: 'response' },
        ],
      };

      const config: InspectConfig = {
        max_messages: 100,
        llm: {
          provider: 'openai',
          apiKey: 'test',
          model: 'gpt-4o-mini',
        },
      };

      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        // First call: fact extraction (valid)
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              choices: [{ message: { content: '[]' } }],
            }),
          });
        }
        // Second call: drift detection (malformed)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{ message: { content: 'invalid json {' } }],
          }),
        });
      }) as any;

      await expect(inspectTranscript(transcript, config)).rejects.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long messages', () => {
      const longContent = 'a'.repeat(100000);
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: longContent },
        ],
      };

      const result = normalizeTranscript(raw);

      expect(result.messages[0].content).toBe(longContent);
      // Should estimate tokens
      expect(result.messages[0].tokens).toBeGreaterThan(0);
    });

    it('should handle special characters in content', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: '🎉 Special chars: \n\t\r\n' },
        ],
      };

      const result = normalizeTranscript(raw);

      expect(result.messages[0].content).toContain('🎉');
      expect(result.messages[0].content).toContain('\n');
    });

    it('should handle unicode in content', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: 'こんにちは مرحبا היי' },
        ],
      };

      const result = normalizeTranscript(raw);

      expect(result.messages[0].content).toBe('こんにちは مرحبا היי');
    });

    it('should handle null metadata', () => {
      const raw = {
        messages: [
          { idx: 0, role: 'user', content: 'test', metadata: null as any },
        ],
      };

      const result = normalizeTranscript(raw);

      // Normalize may remove undefined/null metadata
      expect(result.messages[0].metadata).toBeUndefined();
    });

    it('should handle large number of messages', () => {
      const raw = {
        messages: Array.from({ length: 5000 }, (_, i) => ({
          idx: i,
          role: 'user',
          content: `message ${i}`,
        })),
      };

      const start = Date.now();
      const result = normalizeTranscript(raw, 2000);
      const duration = Date.now() - start;

      expect(result.messages).toHaveLength(2000);
      expect(duration).toBeLessThan(1000); // Should be fast
    });
  });
});
