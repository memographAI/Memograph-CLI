/**
 * Core type definitions for Memograph CLI
 */

import type { LLMProvider } from './llm/providers.js';

/**
 * A single message in a conversation transcript
 */
export interface TranscriptMessage {
  /** Message index (0-based) */
  idx: number;
  /** Role of the message sender */
  role: 'system' | 'user' | 'assistant' | 'tool';
  /** Message content (text) */
  content: string;
  /** Optional ISO timestamp */
  ts?: string;
  /** Optional token count (estimated if missing) */
  tokens?: number;
  /** Optional session boundary marker */
  session_id?: string;
  /** Optional additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Complete conversation transcript
 */
export interface Transcript {
  /** Schema version for forward compatibility */
  schema_version: string;
  /** Array of messages in conversation order */
  messages: TranscriptMessage[];
  /** Optional raw transcript content for non-JSON inputs */
  raw_text?: string;
}

/**
 * A fact extracted from the conversation
 */
export interface ExtractedFact {
  /** Fact category and key (e.g., "identity:name", "pref:language") */
  fact_key: string;
  /** Fact value */
  fact_value: string;
  /** Message index where fact was found */
  msg_idx: number;
  /** Confidence score (0-1) */
  confidence: number;
}

/**
 * Evidence for a drift event
 */
export interface EventEvidence {
  /** Message indices involved */
  msg_idxs: number[];
  /** Text snippets from messages */
  snippets: string[];
  /** Optional fact key involved */
  fact_key?: string;
  /** Optional additional context */
  context?: Record<string, unknown>;
}

/**
 * Base drift event
 */
export interface BaseDriftEvent {
  /** Event type discriminator */
  type: string;
  /** Severity (1-5, higher is worse) */
  severity: number;
  /** Confidence (0-1) */
  confidence: number;
  /** Supporting evidence */
  evidence: EventEvidence;
  /** Human-readable summary */
  summary: string;
}

/**
 * Repetition cluster event - user forced to repeat themselves
 */
export interface RepetitionCluster extends BaseDriftEvent {
  type: 'repetition_cluster';
  /** Number of similar messages */
  cluster_size: number;
}

/**
 * Session reset event - assistant implies starting over
 */
export interface SessionReset extends BaseDriftEvent {
  type: 'session_reset';
  /** Reset phrase that triggered detection */
  reset_phrase: string;
}

/**
 * Preference forgotten event - user restates preference
 */
export interface PreferenceForgotten extends BaseDriftEvent {
  type: 'preference_forgotten';
  /** Preference that was forgotten */
  preference_key: string;
  /** Preference value */
  preference_value: string;
}

/**
 * Contradiction event - conflicting facts detected
 */
export interface Contradiction extends BaseDriftEvent {
  type: 'contradiction';
  /** Old fact value */
  old_value: string;
  /** New (conflicting) fact value */
  new_value: string;
}

/**
 * Union of all drift event types
 */
export type DriftEvent =
  | RepetitionCluster
  | SessionReset
  | PreferenceForgotten
  | Contradiction;

/**
 * Timing measurements for inspection phases
 * Note: In LLM-only mode, individual detection types are not timed separately
 * All drift detection is combined into drift_detection timing
 */
export interface Timings {
  extract_facts: number;
  repetition: number;
  session_reset: number;
  contradictions: number;
  pref_forgotten: number;
  drift_detection?: number; // Combined time for all LLM drift detection
}

/**
 * Complete inspection result
 */
export interface InspectResult {
  /** Drift score (0-100, higher is worse) */
  drift_score: number;
  /** Raw score before clamping */
  raw_score: number;
  /** Token waste percentage */
  token_waste_pct: number;
  /** Detected drift events */
  events: DriftEvent[];
  /** Facts that should have been remembered */
  should_have_been_memory: ExtractedFact[];
  /** Timing measurements (ms) */
  timings_ms: Timings;
}

/**
 * Configuration options for inspection (LLM-only)
 */
export interface InspectConfig {
  /** Analyze execution mode */
  analyzeMode?: 'hosted' | 'llm';
  /** Maximum number of messages to process */
  max_messages?: number;
  /** Hosted analyze API base URL */
  apiUrl?: string;
  /** Hosted analyze API request timeout (ms) */
  apiTimeoutMs?: number;
  /** Hosted analyze API retries */
  apiRetries?: number;
  /** LLM configuration (required for LLM-based analysis) */
  llm?: {
    provider?: LLMProvider;
    apiKey?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    baseUrl?: string;
  };
}
