import { readFile } from 'fs/promises';
import { Transcript, TranscriptMessage } from './types.js';

/**
 * Load and normalize a transcript from a JSON file
 */
export async function loadTranscript(path: string, maxMessages?: number): Promise<Transcript> {
  try {
    const content = await readFile(path, 'utf-8');
    const raw = JSON.parse(content);
    return normalizeTranscript(raw, maxMessages);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`Transcript file not found: ${path}`);
    }
    if (error instanceof SyntaxError) {
      const content = await readFile(path, 'utf-8');
      return {
        schema_version: 'raw',
        messages: [],
        raw_text: content,
      };
    }
    if (error instanceof Error && error.message.includes('Invalid transcript')) {
      const content = await readFile(path, 'utf-8');
      return {
        schema_version: 'raw',
        messages: [],
        raw_text: content,
      };
    }
    throw error;
  }
}

/**
 * Normalize raw input to canonical Transcript format
 */
export function normalizeTranscript(raw: any, maxMessages?: number): Transcript {
  // Handle both { messages: [...] } and raw array formats
  let messages: any[];
  let schema_version: string;

  if (Array.isArray(raw)) {
    messages = raw;
    schema_version = '1.0';
  } else if (raw && Array.isArray(raw.messages)) {
    messages = raw.messages;
    schema_version = raw.schema_version || '1.0';
  } else {
    throw new Error('Invalid transcript: expected messages array or { messages: [...] }');
  }

  if (messages.length === 0) {
    console.warn('Warning: Empty transcript (no messages)');
  }

  // Apply max messages limit
  if (maxMessages && maxMessages > 0) {
    messages = messages.slice(0, maxMessages);
  }

  // Normalize each message
  const normalized: TranscriptMessage[] = messages.map((msg, arrayIdx) => {
    return normalizeMessage(msg, arrayIdx);
  });

  return {
    schema_version,
    messages: normalized,
  };
}

/**
 * Normalize a single message
 */
function normalizeMessage(msg: any, arrayIdx: number): TranscriptMessage {
  // Auto-assign idx if missing
  const idx = typeof msg.idx === 'number' ? msg.idx : arrayIdx;

  // Coerce role to valid value
  const role = normalizeRole(msg.role);

  // Stringify content if not a string
  const content = typeof msg.content === 'string' ? msg.content : String(msg.content || '');

  // Estimate tokens if missing (rough approximation: chars / 4)
  const tokens = typeof msg.tokens === 'number' ? msg.tokens : Math.ceil(content.length / 4);

  return {
    idx,
    role,
    content,
    tokens,
    ...(msg.ts && { ts: msg.ts }),
    ...(msg.session_id && { session_id: msg.session_id }),
    ...(msg.metadata && { metadata: msg.metadata }),
  };
}

/**
 * Normalize role to valid value
 */
function normalizeRole(role: any): 'system' | 'user' | 'assistant' | 'tool' {
  const validRoles = ['system', 'user', 'assistant', 'tool'];
  const normalized = String(role || 'user').toLowerCase();
  
  if (validRoles.includes(normalized)) {
    return normalized as 'system' | 'user' | 'assistant' | 'tool';
  }
  
  // Default to 'user' for unknown roles
  return 'user';
}
