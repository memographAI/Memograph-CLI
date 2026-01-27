import { Transcript, InspectResult, InspectConfig, Timings } from './types.js';
import { calculateDriftScore, calculateTokenWaste } from './score.js';
import { createLLMClient } from './llm/client.js';
import { extractFactsLLM, extractFactsLLMBatched, extractFactsLLMFromRaw } from './llm/extract-llm.js';
import { detectDriftLLM, detectDriftLLMBatched, detectDriftLLMFromRaw } from './llm/detect-llm.js';

/**
 * Main inspection pipeline (LLM-based)
 * Uses AI models for semantic understanding of drift patterns
 */
export async function inspectTranscript(
  transcript: Transcript,
  config: InspectConfig = {}
): Promise<InspectResult> {
  const { messages } = transcript;
  const rawText = transcript.raw_text;

  // Cap messages if configured
  const cappedMessages = config.max_messages
    ? messages.slice(0, config.max_messages)
    : messages;

  // Create LLM client
  const llmConfig = config.llm || {};
  const llmClient = createLLMClient(llmConfig);

  // Phase 1: Extract facts using LLM
  const factStart = performance.now();
  let extractResult;
  
  // Use batching for large transcripts
  if (rawText) {
    extractResult = await extractFactsLLMFromRaw(rawText, llmClient);
  } else if (cappedMessages.length > 50) {
    extractResult = await extractFactsLLMBatched(cappedMessages, llmClient);
  } else {
    extractResult = await extractFactsLLM(cappedMessages, llmClient);
  }
  
  const facts = extractResult.facts;
  const extractTiming = performance.now() - factStart;

  // Phase 2: Detect drift using LLM
  const driftStart = performance.now();
  let driftResult;
  
  // Use batching for large transcripts
  if (rawText) {
    driftResult = await detectDriftLLMFromRaw(rawText, facts, llmClient);
  } else if (cappedMessages.length > 100) {
    driftResult = await detectDriftLLMBatched(cappedMessages, facts, llmClient);
  } else {
    driftResult = await detectDriftLLM(cappedMessages, facts, llmClient);
  }
  
  const events = driftResult.events;
  const driftTiming = performance.now() - driftStart;

  // Sort events by severity (descending), then by confidence (descending)
  events.sort((a, b) => {
    if (a.severity !== b.severity) {
      return b.severity - a.severity;
    }
    return b.confidence - a.confidence;
  });

  // Phase 3: Calculate scores
  // Prefer LLM-provided drift score, fallback to calculated score
  let drift_score: number;
  let raw_score: number;
  
  if (driftResult.drift_score !== undefined) {
    // Use LLM's assessment
    drift_score = Math.round(driftResult.drift_score);
    raw_score = driftResult.drift_score;
  } else {
    // Fallback to calculated score from events
    const calculated = calculateDriftScore(events);
    drift_score = calculated.drift_score;
    raw_score = calculated.raw_score;
  }
  
  const token_waste_pct = rawText ? 0 : calculateTokenWaste(cappedMessages, events);

  // Prepare "should have been memory" facts (top by confidence)
  const should_have_been_memory = [...facts]
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10); // Top 10 facts

  // Collect timings
  // Note: LLM handles all drift detection types together, so we don't have per-type timings
  const timings_ms: Timings = {
    extract_facts: Number(extractTiming.toFixed(2)),
    repetition: 0, // LLM handles all detection together
    session_reset: 0,
    contradictions: 0,
    pref_forgotten: 0, // All drift detection combined
    drift_detection: Number(driftTiming.toFixed(2)), // Total LLM drift detection time
  };

  return {
    drift_score,
    raw_score,
    token_waste_pct: Number(token_waste_pct.toFixed(1)),
    events,
    should_have_been_memory,
    timings_ms,
  };
}
