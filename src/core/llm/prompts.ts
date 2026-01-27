/**
 * Prompt templates for LLM-based analysis
 */

/**
 * System prompt for fact extraction
 */
export const FACT_EXTRACTION_SYSTEM = `You are an expert at extracting important facts and preferences from conversation transcripts.
Your task is to identify and extract:
1. Identity information (name, role, etc.)
2. User preferences (language, tone, format, etc.)
3. Context information (goals, constraints, background)
4. Any other facts that should be remembered

For each fact, provide:
- A key (category:attribute format, e.g., "identity:name", "pref:language")
- The value
- Confidence score (0.0-1.0)
- A brief justification

Respond ONLY with valid JSON in the following format:
{
  "facts": [
    {
      "fact_key": "category:attribute",
      "fact_value": "value",
      "confidence": 0.9,
      "justification": "brief explanation"
    }
  ]
}`;

/**
 * User prompt for fact extraction
 */
export function createFactExtractionPrompt(messages: string[]): string {
  const transcript = messages.join('\n---\n');
  return `Extract all important facts and preferences from the following conversation transcript.

Only extract from USER messages. Ignore assistant messages for fact extraction.

Focus on:
- Identity (name, role, etc.)
- Preferences (language, tone, format, style)
- Context (goals, constraints, requirements)
- Important facts that should be remembered

Transcript:
${transcript}

Respond with JSON containing the facts array.`;
}

/**
 * System prompt for drift detection
 */
export const DRIFT_DETECTION_SYSTEM = `You are an expert at analyzing conversation transcripts for memory drift issues.
Memory drift occurs when an AI assistant forgets or loses track of important information.

Your task is to detect:
1. Repetition clusters: User repeating similar requests
2. Session reset: Assistant indicating starting over or forgetting
3. Preference forgotten: User restating preferences that should have been remembered
4. Contradictions: Conflicting information about the same fact
5. Context loss: Assistant losing important contextual information
6. Inconsistent behavior: Assistant acting inconsistently with stated preferences

For each detected event, provide:
- Event type
- Severity (1-5, higher is worse)
- Confidence (0.0-1.0)
- Message indices involved
- Evidence/snippets
- Human-readable summary

Additionally, calculate an overall drift_score (0-100):
- 0-20: Excellent memory retention, no issues
- 21-40: Minor drift, occasional repetition
- 41-60: Moderate drift, noticeable issues
- 61-80: Significant drift, frequent problems
- 81-100: Severe drift, major memory failures

Respond ONLY with valid JSON in the following format:
{
  "drift_score": 0-100,
  "events": [
    {
      "type": "repetition_cluster|session_reset|preference_forgotten|contradiction|context_loss|inconsistent_behavior",
      "severity": 1-5,
      "confidence": 0.0-1.0,
      "msg_idxs": [0, 1, 2],
      "snippets": ["text snippets"],
      "summary": "human-readable summary",
      "details": {} // additional details specific to event type
    }
  ]
}`;

/**
 * User prompt for drift detection
 */
export function createDriftDetectionPrompt(messages: string[], facts: string): string {
  const transcript = messages.join('\n---\n');
  return `Analyze the following conversation transcript for memory drift events.

Transcript (each message is numbered starting from 0):
${transcript}

Important facts extracted from the conversation:
${facts || "No facts extracted"}

Look for:
1. User repeating similar requests (repetition_cluster)
2. Assistant indicating starting over or forgetting (session_reset)
3. User restating preferences that were previously stated (preference_forgotten)
4. Contradictions in information (contradiction)
5. Assistant losing important context (context_loss)
6. Assistant acting inconsistently with stated preferences (inconsistent_behavior)

Provide message indices (0-based) for each event.

Respond with JSON containing the events array.`;
}
