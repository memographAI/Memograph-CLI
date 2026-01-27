import { describe, it, expect } from 'vitest';
import { renderTextReport, renderJsonReport } from '../src/core/render.js';
import type { InspectResult } from '../src/core/types.js';

describe('renderTextReport', () => {
  it('should render a complete report', () => {
    const result: InspectResult = {
      drift_score: 25,
      raw_score: 25,
      token_waste_pct: 7.1,
      events: [
        {
          type: 'preference_forgotten',
          severity: 4,
          confidence: 0.65,
          preference_key: 'pref:language',
          preference_value: 'bangla',
          evidence: {
            msg_idxs: [2, 4],
            snippets: ['Please reply in Bangla...', 'Reply in Bangla please...'],
            fact_key: 'pref:language'
          },
          summary: 'User restated pref:language=bangla later, suggesting that assistant didn\'t retain it.'
        }
      ],
      should_have_been_memory: [
        {
          fact_key: 'identity:name',
          fact_value: 'tusher',
          msg_idx: 0,
          confidence: 0.9
        }
      ],
      timings_ms: {
        extract_facts: 0.2,
        repetition: 1.1,
        session_reset: 0.1,
        contradictions: 0.1,
        pref_forgotten: 0.2
      }
    };

    const output = renderTextReport(result);

    expect(output).toContain('=== Memograph Inspect Report ===');
    expect(output).toContain('Drift Score: 25/100 (raw: 25)');
    expect(output).toContain('Token Waste: 7.1%');
    expect(output).toContain('[preference_forgotten]');
    expect(output).toContain('sev=4 conf=0.65');
    expect(output).toContain('idx=2,4');
    expect(output).toContain('identity:name="tusher"');
    expect(output).toContain('@0 (conf 0.90)');
    expect(output).toContain('extract_facts: 0.2');
    expect(output).toContain('repetition: 1.1');
  });

  it('should handle no events', () => {
    const result: InspectResult = {
      drift_score: 0,
      raw_score: 0,
      token_waste_pct: 0,
      events: [],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0,
        repetition: 0,
        session_reset: 0,
        contradictions: 0,
        pref_forgotten: 0
      }
    };

    const output = renderTextReport(result);

    expect(output).toContain('Critical Events: None detected');
    expect(output).toContain('Should-have-been memory: None extracted');
  });

  it('should handle repetition cluster events', () => {
    const result: InspectResult = {
      drift_score: 10,
      raw_score: 10,
      token_waste_pct: 15.5,
      events: [
        {
          type: 'repetition_cluster',
          severity: 2,
          confidence: 0.70,
          cluster_size: 3,
          evidence: {
            msg_idxs: [2, 4, 6],
            snippets: ['Help me', 'Help me', 'Help me please']
          },
          summary: 'User repeated a similar request 3 times.'
        }
      ],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0.1,
        repetition: 0.5,
        session_reset: 0,
        contradictions: 0,
        pref_forgotten: 0
      }
    };

    const output = renderTextReport(result);

    expect(output).toContain('[repetition_cluster]');
    expect(output).toContain('sev=2 conf=0.70');
    expect(output).toContain('idx=2,4,6');
  });

  it('should handle session reset events', () => {
    const result: InspectResult = {
      drift_score: 20,
      raw_score: 20,
      token_waste_pct: 0,
      events: [
        {
          type: 'session_reset',
          severity: 5,
          confidence: 0.9,
          reset_phrase: 'let\'s start over',
          evidence: {
            msg_idxs: [5],
            snippets: ['Let\'s start over from the beginning']
          },
          summary: 'Assistant indicated session reset: "let\'s start over"'
        }
      ],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0.1,
        repetition: 0,
        session_reset: 0.1,
        contradictions: 0,
        pref_forgotten: 0
      }
    };

    const output = renderTextReport(result);

    expect(output).toContain('[session_reset]');
    expect(output).toContain('sev=5 conf=0.90');
    expect(output).toContain('idx=5');
  });

  it('should handle contradiction events', () => {
    const result: InspectResult = {
      drift_score: 10,
      raw_score: 10,
      token_waste_pct: 0,
      events: [
        {
          type: 'contradiction',
          severity: 3,
          confidence: 0.8,
          old_value: 'tusher',
          new_value: 'jane',
          evidence: {
            msg_idxs: [0, 10],
            snippets: ['Old: tusher', 'New: jane'],
            fact_key: 'identity:name'
          },
          summary: 'identity:name changed from "tusher" to "jane"'
        }
      ],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0.1,
        repetition: 0,
        session_reset: 0,
        contradictions: 0.2,
        pref_forgotten: 0
      }
    };

    const output = renderTextReport(result);

    expect(output).toContain('[contradiction]');
    expect(output).toContain('sev=3 conf=0.80');
  });

  it('should sort events by severity and confidence', () => {
    const result: InspectResult = {
      drift_score: 30,
      raw_score: 30,
      token_waste_pct: 0,
      events: [
        {
          type: 'contradiction',
          severity: 3,
          confidence: 0.8,
          old_value: 'value1',
          new_value: 'value2',
          evidence: {
            msg_idxs: [0, 1],
            snippets: ['Old: value1', 'New: value2'],
            fact_key: 'test:key'
          },
          summary: 'Test contradiction'
        },
        {
          type: 'session_reset',
          severity: 5,
          confidence: 0.9,
          reset_phrase: 'new chat',
          evidence: {
            msg_idxs: [5],
            snippets: ['New chat started']
          },
          summary: 'Session reset detected'
        },
        {
          type: 'preference_forgotten',
          severity: 4,
          confidence: 0.65,
          preference_key: 'pref:language',
          preference_value: 'bangla',
          evidence: {
            msg_idxs: [2, 4],
            snippets: ['Use Bangla', 'Use Bangla'],
            fact_key: 'pref:language'
          },
          summary: 'Preference forgotten'
        }
      ],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0.1,
        repetition: 0,
        session_reset: 0,
        contradictions: 0,
        pref_forgotten: 0
      }
    };

    const output = renderTextReport(result);
    const lines = output.split('\n');
    
    // Find event lines
    const eventLines = lines.filter(line => line.includes('['));
    
    // Check order: session_reset (sev=5) should come first
    expect(eventLines[0]).toContain('[session_reset]');
    expect(eventLines[1]).toContain('[preference_forgotten]');
    expect(eventLines[2]).toContain('[contradiction]');
  });
});

describe('renderJsonReport', () => {
  it('should render valid JSON', () => {
    const result: InspectResult = {
      drift_score: 25,
      raw_score: 25,
      token_waste_pct: 7.1,
      events: [
        {
          type: 'preference_forgotten',
          severity: 4,
          confidence: 0.65,
          preference_key: 'pref:language',
          preference_value: 'bangla',
          evidence: {
            msg_idxs: [2, 4],
            snippets: ['Please reply in Bangla...', 'Reply in Bangla please...'],
            fact_key: 'pref:language'
          },
          summary: 'User restated pref:language=bangla later, suggesting that assistant didn\'t retain it.'
        }
      ],
      should_have_been_memory: [
        {
          fact_key: 'identity:name',
          fact_value: 'tusher',
          msg_idx: 0,
          confidence: 0.9
        }
      ],
      timings_ms: {
        extract_facts: 0.2,
        repetition: 1.1,
        session_reset: 0.1,
        contradictions: 0.1,
        pref_forgotten: 0.2
      }
    };

    const output = renderJsonReport(result);
    const parsed = JSON.parse(output);

    expect(parsed.drift_score).toBe(25);
    expect(parsed.raw_score).toBe(25);
    expect(parsed.token_waste_pct).toBe(7.1);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].type).toBe('preference_forgotten');
    expect(parsed.should_have_been_memory).toHaveLength(1);
    expect(parsed.should_have_been_memory[0].fact_key).toBe('identity:name');
  });

  it('should handle empty results', () => {
    const result: InspectResult = {
      drift_score: 0,
      raw_score: 0,
      token_waste_pct: 0,
      events: [],
      should_have_been_memory: [],
      timings_ms: {
        extract_facts: 0,
        repetition: 0,
        session_reset: 0,
        contradictions: 0,
        pref_forgotten: 0
      }
    };

    const output = renderJsonReport(result);
    const parsed = JSON.parse(output);

    expect(parsed.drift_score).toBe(0);
    expect(parsed.events).toHaveLength(0);
    expect(parsed.should_have_been_memory).toHaveLength(0);
  });
});
