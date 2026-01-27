/**
 * LLM-based drift detection
 */

import {
  TranscriptMessage,
  DriftEvent,
  ExtractedFact,
  RepetitionCluster,
  SessionReset,
  PreferenceForgotten,
  Contradiction,
} from '../types.js';
import { LLMClient } from './client.js';
import {
  DRIFT_DETECTION_SYSTEM,
  createDriftDetectionPrompt,
} from './prompts.js';

export interface DetectDriftLLMResult {
  events: DriftEvent[];
  drift_score?: number; // LLM-calculated drift score (0-100)
  timing_ms: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Detect drift events using LLM
 */
export async function detectDriftLLM(
  messages: TranscriptMessage[],
  facts: ExtractedFact[],
  llmClient: LLMClient
): Promise<DetectDriftLLMResult> {
  const start = performance.now();

  // Format messages for the prompt
  const formattedMessages = messages.map(m => 
    `[${m.idx}] ${m.role}: ${m.content}`
  );

  // Format facts
  const formattedFacts = facts.length > 0
    ? facts.map(f => `- ${f.fact_key} = ${f.fact_value} (msg ${f.msg_idx}, confidence: ${f.confidence})`).join('\n')
    : 'No facts extracted';

  try {
    // Call LLM
    const prompt = createDriftDetectionPrompt(formattedMessages, formattedFacts);
    const response = await llmClient.complete(prompt, DRIFT_DETECTION_SYSTEM);

    // Parse and validate response
    let llmResponse;
    try {
      llmResponse = JSON.parse(response.content);
    } catch (parseError) {
      throw new Error(
        `Failed to parse LLM response as JSON: ${(parseError as Error).message}\n` +
        `Response content: ${response.content.substring(0, 200)}...`
      );
    }

    // Validate response structure
    if (!llmResponse || typeof llmResponse !== 'object') {
      throw new Error('LLM response is not a valid object');
    }

    if (!Array.isArray(llmResponse.events)) {
      throw new Error('LLM response does not contain an events array');
    }

    const rawEvents = llmResponse.events;

    // Extract drift score if provided
    let drift_score: number | undefined = undefined;
    if (typeof llmResponse.drift_score === 'number') {
      drift_score = Math.max(0, Math.min(100, llmResponse.drift_score));
    }

    // Map to DriftEvent types
    const events: DriftEvent[] = rawEvents.map((event: any) => 
      mapLLMEventToDriftEvent(event, messages)
    );

    return {
      events,
      drift_score,
      timing_ms: performance.now() - start,
      usage: response.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM drift detection failed: ${errorMessage}`);
  }
}

/**
 * Map LLM event to DriftEvent type
 */
function mapLLMEventToDriftEvent(
  event: any,
  messages: TranscriptMessage[]
): DriftEvent {
  const baseEvent = {
    severity: Math.max(1, Math.min(5, event.severity || 3)),
    confidence: Math.max(0, Math.min(1, event.confidence || 0.5)),
    evidence: {
      msg_idxs: event.msg_idxs || [],
      snippets: event.snippets || [],
      context: event.details,
    },
    summary: event.summary || 'No summary provided',
  };

  switch (event.type) {
    case 'repetition_cluster':
      return {
        type: 'repetition_cluster',
        ...baseEvent,
        cluster_size: event.msg_idxs?.length || 2,
      } as RepetitionCluster;

    case 'session_reset':
      return {
        type: 'session_reset',
        ...baseEvent,
        reset_phrase: event.details?.reset_phrase || 'reset',
      } as SessionReset;

    case 'preference_forgotten':
      return {
        type: 'preference_forgotten',
        ...baseEvent,
        preference_key: event.details?.preference_key || 'unknown',
        preference_value: event.details?.preference_value || 'unknown',
      } as PreferenceForgotten;

    case 'contradiction':
      return {
        type: 'contradiction',
        ...baseEvent,
        old_value: event.details?.old_value || 'unknown',
        new_value: event.details?.new_value || 'unknown',
      } as Contradiction;

    // For new event types not in the original DriftEvent union,
    // we'll map them to existing types with appropriate defaults
    case 'context_loss':
      return {
        type: 'session_reset', // Map to session_reset as closest match
        ...baseEvent,
        reset_phrase: 'context lost',
      } as SessionReset;

    case 'inconsistent_behavior':
      return {
        type: 'preference_forgotten', // Map to preference_forgotten as closest match
        ...baseEvent,
        preference_key: 'behavior',
        preference_value: 'inconsistent',
      } as PreferenceForgotten;

    default:
      // Default to session_reset for unknown types
      return {
        type: 'session_reset',
        ...baseEvent,
        reset_phrase: 'unknown drift',
      } as SessionReset;
  }
}

/**
 * Detect drift events in batches for large transcripts
 */
export async function detectDriftLLMBatched(
  messages: TranscriptMessage[],
  facts: ExtractedFact[],
  llmClient: LLMClient,
  batchSize = 100
): Promise<DetectDriftLLMResult> {
  const start = performance.now();
  const allEvents: DriftEvent[] = [];
  const driftScores: number[] = [];
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Process in batches
  for (let i = 0; i < messages.length; i += batchSize) {
    const batchMessages = messages.slice(i, i + batchSize);
    const batchStartIdx = batchMessages[0]?.idx || 0;
    const batchEndIdx = batchMessages[batchMessages.length - 1]?.idx || batchStartIdx;
    
    // Filter facts to those in this batch
    const batchFacts = facts.filter(f => 
      f.msg_idx >= batchStartIdx && f.msg_idx <= batchEndIdx
    );

    const result = await detectDriftLLM(batchMessages, batchFacts, llmClient);
    
    // No index adjustment needed - LLM returns actual message indices
    // Just add events as-is
    allEvents.push(...result.events);
    
    // Track drift scores
    if (result.drift_score !== undefined) {
      driftScores.push(result.drift_score);
    }
    
    if (result.usage) {
      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens += result.usage.totalTokens;
    }
  }

  // Use max drift score across batches (worst case)
  const drift_score = driftScores.length > 0
    ? Math.max(...driftScores)
    : undefined;

  return {
    events: allEvents,
    drift_score,
    timing_ms: performance.now() - start,
    usage: totalUsage,
  };
}
