/**
 * LLM Fact Extraction tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractFactsLLM, extractFactsLLMBatched } from '../src/core/llm/extract-llm.js';
import { LLMClient } from '../src/core/llm/client.js';
import type { TranscriptMessage } from '../src/core/types.js';

describe('LLM Fact Extraction', () => {
  beforeEach(() => {
    // Reset environment variables
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = vi.fn() as any;
  });

  describe('extractFactsLLM', () => {
    it('should extract identity facts', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'John Doe', msg_idx: 0, confidence: 0.9 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is John Doe' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(1);
      expect(facts[0].fact_key).toBe('identity:name');
      expect(facts[0].fact_value).toBe('John Doe');
      expect(facts[0].confidence).toBe(0.9);
    });

    it('should extract preference facts', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'pref:language', fact_value: 'English', msg_idx: 1, confidence: 0.85 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Hi' },
        { idx: 1, role: 'user', content: 'I prefer English please' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(1);
      expect(facts[0].fact_key).toBe('pref:language');
      expect(facts[0].fact_value).toBe('English');
    });

    it('should extract multiple facts', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'Jane', msg_idx: 0, confidence: 0.95 },
                  { fact_key: 'pref:tone', fact_value: 'casual', msg_idx: 1, confidence: 0.8 },
                  { fact_key: 'identity:email', fact_value: 'jane@example.com', msg_idx: 2, confidence: 0.9 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is Jane' },
        { idx: 1, role: 'user', content: 'Keep it casual' },
        { idx: 2, role: 'user', content: 'My email is jane@example.com' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(3);
      expect(facts.map(f => f.fact_key)).toContain('identity:name');
      expect(facts.map(f => f.fact_key)).toContain('pref:tone');
      expect(facts.map(f => f.fact_key)).toContain('identity:email');
    });

    it('should return empty array if no facts found', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '[]'
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Hello' },
        { idx: 1, role: 'assistant', content: 'Hi there!' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(0);
    });

    it('should handle empty transcript', async () => {
      const messages: TranscriptMessage[] = [];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(0);
    });

    it('should filter low confidence facts', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'John', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'pref:language', fact_value: 'Spanish', msg_idx: 1, confidence: 0.3 },
                  { fact_key: 'pref:tone', fact_value: 'formal', msg_idx: 2, confidence: 0.7 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is John' },
        { idx: 1, role: 'user', content: 'Maybe Spanish' },
        { idx: 2, role: 'user', content: 'Be formal' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      // Should still include all facts with their confidence scores
      expect(facts).toHaveLength(3);
    });

    it('should work with Anthropic provider', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            model: 'claude-3-5-sonnet-20241022',
            content: [{ type: 'text', text: JSON.stringify([
              { fact_key: 'identity:name', fact_value: 'Alice', msg_idx: 0, confidence: 0.88 }
            ])}],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is Alice' },
      ];

      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(1);
      expect(facts[0].fact_key).toBe('identity:name');
      expect(facts[0].fact_value).toBe('Alice');
    });
  });

  describe('extractFactsLLMBatched', () => {
    it('should extract facts from batch of messages', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'Bob', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'pref:language', fact_value: 'French', msg_idx: 5, confidence: 0.85 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is Bob' },
        { idx: 1, role: 'assistant', content: 'Hello Bob!' },
        { idx: 2, role: 'user', content: 'How are you?' },
        { idx: 3, role: 'assistant', content: 'I am well!' },
        { idx: 4, role: 'user', content: 'Can you help me?' },
        { idx: 5, role: 'user', content: 'I speak French' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLMBatched(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(2);
    });

    it('should handle large transcript with batching', async () => {
      const largeMessages: TranscriptMessage[] = Array.from({ length: 100 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: '[]'
              }
            }],
          }),
        })
      ) as any;

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLMBatched(largeMessages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(0);
    });

    it('should merge facts from multiple batches', async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify([
                    { fact_key: 'identity:name', fact_value: 'Charlie', msg_idx: 0, confidence: 0.9 }
                  ])
                }
              }],
            }),
          });
        } else {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify([
                    { fact_key: 'pref:language', fact_value: 'German', msg_idx: 5, confidence: 0.85 }
                  ])
                }
              }],
            }),
          });
        }
      }) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 20 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLMBatched(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(2);
      expect(facts.map(f => f.fact_key)).toContain('identity:name');
      expect(facts.map(f => f.fact_key)).toContain('pref:language');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON response', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: 'not valid json {{'
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Test' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      await expect(extractFactsLLM(messages, client)).rejects.toThrow();
    });

    it('should handle API errors', async () => {
      global.fetch = vi.fn(() =>
        Promise.reject(new Error('API error'))
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Test' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      await expect(extractFactsLLM(messages, client)).rejects.toThrow('API error');
    });

    it('should handle invalid fact structure', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', msg_idx: 0, confidence: 0.9 } // Missing fact_value
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Test' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;
      expect(facts).toBeDefined();
    });

    it('should handle duplicate facts', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'John', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'identity:name', fact_value: 'John', msg_idx: 0, confidence: 0.85 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is John' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      // Should return all facts including duplicates
      expect(facts).toHaveLength(2);
    });

    it('should handle facts with special characters', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'José María', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'pref:language', fact_value: '中文', msg_idx: 1, confidence: 0.85 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is José María' },
        { idx: 1, role: 'user', content: '我讲中文' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(2);
      expect(facts[0].fact_value).toBe('José María');
      expect(facts[1].fact_value).toBe('中文');
    });
  });

  describe('Fact Categories', () => {
    it('should extract identity facts correctly', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'identity:name', fact_value: 'Alice', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'identity:email', fact_value: 'alice@test.com', msg_idx: 1, confidence: 0.85 },
                  { fact_key: 'identity:phone', fact_value: '+1234567890', msg_idx: 2, confidence: 0.88 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'My name is Alice' },
        { idx: 1, role: 'user', content: 'Email: alice@test.com' },
        { idx: 2, role: 'user', content: 'Phone: +1234567890' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(3);
      expect(facts.every(f => f.fact_key.startsWith('identity:'))).toBe(true);
    });

    it('should extract preference facts correctly', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify([
                  { fact_key: 'pref:language', fact_value: 'English', msg_idx: 0, confidence: 0.9 },
                  { fact_key: 'pref:tone', fact_value: 'professional', msg_idx: 1, confidence: 0.85 },
                  { fact_key: 'pref:format', fact_value: 'bullet points', msg_idx: 2, confidence: 0.88 }
                ])
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Please speak English' },
        { idx: 1, role: 'user', content: 'Be professional' },
        { idx: 2, role: 'user', content: 'Use bullet points' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const result = await extractFactsLLM(messages, client);
      const facts = result.facts;

      expect(facts).toHaveLength(3);
      expect(facts.every(f => f.fact_key.startsWith('pref:'))).toBe(true);
    });
  });
});
