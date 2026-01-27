import { describe, it, expect } from 'vitest';
import { calculateDriftScore, calculateTokenWaste } from '../src/core/score.js';
import { DriftEvent, TranscriptMessage, RepetitionCluster } from '../src/core/types.js';

describe('calculateDriftScore', () => {
  it('should calculate score for repetition cluster', () => {
    const events: DriftEvent[] = [
      {
        type: 'repetition_cluster',
        severity: 2,
        confidence: 0.7,
        cluster_size: 3,
        evidence: { msg_idxs: [0, 2, 4], snippets: [] },
        summary: 'Test',
      } as RepetitionCluster,
    ];

    const { drift_score, raw_score } = calculateDriftScore(events);

    expect(raw_score).toBe(10); // default weight for repetition_cluster
    expect(drift_score).toBe(10);
  });

  it('should clamp score to 100', () => {
    const events: DriftEvent[] = Array(20).fill({
      type: 'session_reset',
      severity: 5,
      confidence: 0.9,
      reset_phrase: 'test',
      evidence: { msg_idxs: [0], snippets: [] },
      summary: 'Test',
    });

    const { drift_score, raw_score } = calculateDriftScore(events);

    expect(raw_score).toBe(400); // 20 * 20
    expect(drift_score).toBe(100); // clamped
  });

  it('should return 0 for no events', () => {
    const { drift_score, raw_score } = calculateDriftScore([]);

    expect(drift_score).toBe(0);
    expect(raw_score).toBe(0);
  });
});

describe('calculateTokenWaste', () => {
  it('should calculate waste from repetition clusters', () => {
    const messages: TranscriptMessage[] = [
      { idx: 0, role: 'user', content: 'Test 1', tokens: 100 },
      { idx: 1, role: 'assistant', content: 'Response', tokens: 50 },
      { idx: 2, role: 'user', content: 'Test 2', tokens: 100 },
    ];

    const events: DriftEvent[] = [
      {
        type: 'repetition_cluster',
        severity: 2,
        confidence: 0.7,
        cluster_size: 2,
        evidence: { msg_idxs: [0, 2], snippets: [] },
        summary: 'Test',
      } as RepetitionCluster,
    ];

    const waste_pct = calculateTokenWaste(messages, events);

    // 200 tokens wasted out of 250 total = 80%
    expect(waste_pct).toBeCloseTo(80, 1);
  });

  it('should return 0 for no repetitions', () => {
    const messages: TranscriptMessage[] = [
      { idx: 0, role: 'user', content: 'Test', tokens: 100 },
    ];

    const waste_pct = calculateTokenWaste(messages, []);

    expect(waste_pct).toBe(0);
  });
});
