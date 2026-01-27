import { DriftEvent, TranscriptMessage } from './types.js';

/**
 * Configurable weights for drift scoring
 */
export const DEFAULT_WEIGHTS = {
  preference_forgotten: 15,
  repetition_cluster: 10,
  session_reset: 20,
  contradiction: 10,
};

/**
 * Calculate drift score from events
 */
export function calculateDriftScore(
  events: DriftEvent[],
  weights = DEFAULT_WEIGHTS
): { drift_score: number; raw_score: number } {
  let raw_score = 0;

  for (const event of events) {
    const weight = weights[event.type as keyof typeof weights] || 0;
    raw_score += weight;
  }

  // Clamp to 0-100 range
  const drift_score = Math.max(0, Math.min(100, raw_score));

  return { drift_score, raw_score };
}

/**
 * Calculate token waste percentage
 */
export function calculateTokenWaste(
  messages: TranscriptMessage[],
  events: DriftEvent[]
): number {
  // Find all repetition cluster events
  const repetitionEvents = events.filter(e => e.type === 'repetition_cluster');
  
  if (repetitionEvents.length === 0) {
    return 0;
  }

  // Collect all message indices involved in repetitions
  const wasteIndices = new Set<number>();
  for (const event of repetitionEvents) {
    for (const idx of event.evidence.msg_idxs) {
      wasteIndices.add(idx);
    }
  }

  // Calculate waste tokens (from user messages in clusters)
  let wasteTokens = 0;
  for (const idx of wasteIndices) {
    const msg = messages.find(m => m.idx === idx);
    if (msg && msg.role === 'user') {
      wasteTokens += msg.tokens || 0;
    }
  }

  // Calculate total tokens
  const totalTokens = messages.reduce((sum, msg) => sum + (msg.tokens || 0), 0);

  if (totalTokens === 0) {
    return 0;
  }

  return (wasteTokens / totalTokens) * 100;
}
