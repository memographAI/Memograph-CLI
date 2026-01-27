/**
 * LLM Drift Detection tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectDriftLLM, detectDriftLLMBatched } from '../src/core/llm/detect-llm.js';
import { LLMClient } from '../src/core/llm/client.js';
import type { TranscriptMessage } from '../src/core/types.js';

describe('LLM Drift Detection', () => {
  beforeEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    global.fetch = vi.fn() as any;
  });

  describe('detectDriftLLM', () => {
    it('should detect repetition clusters', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'repetition_cluster',
                      severity: 2,
                      confidence: 0.75,
                      msg_idxs: [0, 2, 4],
                      snippets: ['Please help', 'Please help', 'Please help'],
                      summary: 'User repeated similar request 3 times'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Please help' },
        { idx: 1, role: 'assistant', content: 'How can I help?' },
        { idx: 2, role: 'user', content: 'Please help' },
        { idx: 3, role: 'assistant', content: 'I can help with...' },
        { idx: 4, role: 'user', content: 'Please help' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('repetition_cluster');
      expect(events[0].severity).toBe(2);
      expect(events[0].confidence).toBe(0.75);
    });

    it('should detect session reset', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'session_reset',
                      severity: 4,
                      confidence: 0.9,
                      msg_idxs: [5],
                      snippets: ['Let\'s start over from scratch'],
                      summary: 'Assistant indicated a fresh start',
                      reset_phrase: 'from scratch'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 5, role: 'assistant', content: 'Let\'s start over from scratch' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('session_reset');
      expect(events[0].severity).toBe(4);
    });

    it('should detect preference forgotten', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'preference_forgotten',
                      severity: 3,
                      confidence: 0.8,
                      msg_idxs: [0, 10],
                      snippets: ['I prefer English', 'I said I prefer English'],
                      fact_key: 'pref:language',
                      summary: 'User restated language preference later in conversation'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 15 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('preference_forgotten');
    });

    it('should detect contradictions', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'contradiction',
                      severity: 3,
                      confidence: 0.85,
                      msg_idxs: [0, 8],
                      snippets: ['My name is John', 'Actually my name is Jane'],
                      fact_key: 'identity:name',
                      summary: 'User provided conflicting identity information'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 10 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('contradiction');
    });

    it('should detect multiple event types', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'repetition_cluster',
                      severity: 2,
                      confidence: 0.7,
                      msg_idxs: [0, 2],
                      snippets: ['Help', 'Help'],
                      summary: 'User repeated request'
                    },
                    {
                      type: 'session_reset',
                      severity: 4,
                      confidence: 0.9,
                      msg_idxs: [5],
                      snippets: ['Let\'s start fresh'],
                      summary: 'Assistant reset context'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 10 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(2);
      expect(events.map(e => e.type)).toContain('repetition_cluster');
      expect(events.map(e => e.type)).toContain('session_reset');
    });

    it('should return empty events if no drift detected', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: []
                })
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

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(0);
    });

    it('should handle empty transcript', async () => {
      const messages: TranscriptMessage[] = [];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(0);
    });

    it('should work with Anthropic provider', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            model: 'claude-3-5-sonnet-20241022',
            content: [{ type: 'text', text: JSON.stringify({
              events: [
                {
                  type: 'repetition_cluster',
                  severity: 2,
                  confidence: 0.7,
                  msg_idxs: [0, 1],
                  snippets: ['Test', 'Test'],
                  summary: 'Repeated test'
                }
              ]
            })}],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Test' },
        { idx: 1, role: 'user', content: 'Test' },
      ];

      const client = new LLMClient({
        provider: 'anthropic',
        apiKey: 'test-key',
        model: 'claude-3-5-sonnet-20241022',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe('repetition_cluster');
    });
  });

  describe('detectDriftLLMBatched', () => {
    it('should detect drift in batch of messages', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'repetition_cluster',
                      severity: 2,
                      confidence: 0.75,
                      msg_idxs: [0, 5, 10],
                      snippets: ['Repeat', 'Repeat', 'Repeat'],
                      summary: 'User repeated multiple times'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

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

      const facts: any[] = [];
      const result = await detectDriftLLMBatched(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
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
                content: JSON.stringify({
                  events: []
                })
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

      const facts: any[] = [];
      const result = await detectDriftLLMBatched(largeMessages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(0);
    });

    it('should merge events from multiple batches', async () => {
      let callCount = 0;
      global.fetch = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              choices: [{
                message: {
                  content: JSON.stringify({
                    events: [
                      {
                        type: 'repetition_cluster',
                        severity: 2,
                        confidence: 0.7,
                        msg_idxs: [0, 1],
                        snippets: ['A', 'A'],
                        summary: 'Repetition'
                      }
                    ]
                  })
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
                  content: JSON.stringify({
                    events: [
                      {
                        type: 'session_reset',
                        severity: 4,
                        confidence: 0.9,
                        msg_idxs: [10],
                        snippets: ['Start over'],
                        summary: 'Reset'
                      }
                    ]
                  })
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

      const facts: any[] = [];
      const result = await detectDriftLLMBatched(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(2);
      expect(events.map(e => e.type)).toContain('repetition_cluster');
      expect(events.map(e => e.type)).toContain('session_reset');
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

      const facts: any[] = [];
      await expect(detectDriftLLM(messages, facts, client)).rejects.toThrow();
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

      const facts: any[] = [];
      await expect(detectDriftLLM(messages, facts, client)).rejects.toThrow('API error');
    });

    it('should handle invalid event structure', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    { type: 'invalid_event' } // Missing required fields
                  ]
                })
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

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      expect(result).toBeDefined();
    });

    it('should handle missing events array', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({}) // No events array
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

      const facts: any[] = [];
      await expect(detectDriftLLM(messages, facts, client)).rejects.toThrow();
    });
  });

  describe('Event Properties', () => {
    it('should include severity scores', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    { type: 'repetition_cluster', severity: 1, confidence: 0.6, msg_idxs: [0], snippets: ['test'], summary: 'low' },
                    { type: 'session_reset', severity: 3, confidence: 0.8, msg_idxs: [1], snippets: ['test'], summary: 'medium' },
                    { type: 'preference_forgotten', severity: 5, confidence: 0.95, msg_idxs: [2], snippets: ['test'], summary: 'high' }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 5 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(3);
      expect(events[0].severity).toBe(1);
      expect(events[1].severity).toBe(3);
      expect(events[2].severity).toBe(5);
    });

    it('should include confidence scores', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    { type: 'repetition_cluster', severity: 2, confidence: 0.5, msg_idxs: [0], snippets: ['test'], summary: 'low confidence' },
                    { type: 'session_reset', severity: 4, confidence: 0.95, msg_idxs: [1], snippets: ['test'], summary: 'high confidence' }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = [
        { idx: 0, role: 'user', content: 'Test' },
        { idx: 1, role: 'assistant', content: 'Test' },
      ];

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(2);
      expect(events[0].confidence).toBe(0.5);
      expect(events[1].confidence).toBe(0.95);
    });

    it('should include evidence with message indices', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    {
                      type: 'repetition_cluster',
                      severity: 2,
                      confidence: 0.7,
                      msg_idxs: [0, 2, 4, 6],
                      snippets: ['msg0', 'msg2', 'msg4', 'msg6'],
                      summary: 'Multiple repetitions'
                    }
                  ]
                })
              }
            }],
          }),
        })
      ) as any;

      const messages: TranscriptMessage[] = Array.from({ length: 10 }, (_, i) => ({
        idx: i,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const client = new LLMClient({
        provider: 'openai',
        apiKey: 'test-key',
        model: 'gpt-4o-mini',
      });

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);
      const events = result.events;

      expect(events).toHaveLength(1);
      expect(events[0].evidence.msg_idxs).toEqual([0, 2, 4, 6]);
      expect(events[0].evidence.snippets).toHaveLength(4);
    });
  });

  describe('Timing and Usage', () => {
    it('should track timing', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: [
                    { type: 'repetition_cluster', severity: 2, confidence: 0.7, msg_idxs: [0], snippets: ['test'], summary: 'test' }
                  ]
                })
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

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);

      expect(result.timing_ms).toBeGreaterThan(0);
    });

    it('should track token usage', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            choices: [{
              message: {
                content: JSON.stringify({
                  events: []
                })
              },
              usage: {
                prompt_tokens: 100,
                completion_tokens: 50,
                total_tokens: 150,
              },
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

      const facts: any[] = [];
      const result = await detectDriftLLM(messages, facts, client);

      expect(result.usage).toBeDefined();
      expect(result.usage?.totalTokens).toBe(150);
    });
  });
});
