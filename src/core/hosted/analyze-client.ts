import { InspectResult, Transcript } from '../types.js';
import {
  HostedAnalyzeErrorBody,
  HostedAnalyzeOptions,
  HostedAnalyzeRequest,
  HostedAnalyzeResponse,
} from './types.js';

const DEFAULT_API_URL = 'http://localhost:8080/api/v1/analyze';
const DEFAULT_TIMEOUT_MS = 30000;
const DEFAULT_RETRIES = 1;
const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

class HostedApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'HostedApiError';
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isInspectResult(value: unknown): value is InspectResult {
  if (!isObject(value)) return false;
  return (
    typeof value.drift_score === 'number' &&
    typeof value.raw_score === 'number' &&
    typeof value.token_waste_pct === 'number' &&
    Array.isArray(value.events) &&
    Array.isArray(value.should_have_been_memory) &&
    isObject(value.timings_ms)
  );
}

function formatHttpError(status: number, body: HostedAnalyzeErrorBody | null): string {
  const requestId = body?.error?.request_id ? ` [request_id=${body.error.request_id}]` : '';
  const messageFromBody = body?.error?.message;

  if (status === 400) return `Transcript format invalid.${requestId}`;
  if (status === 413) return `Transcript too large. Reduce input size.${requestId}`;
  if (status === 429) return `Rate limit reached. Retry later.${requestId}`;
  if (status >= 500) return `Analyze service unavailable.${requestId}`;
  if (messageFromBody) return `${messageFromBody}${requestId}`;
  return `Analyze API request failed with status ${status}.${requestId}`;
}

async function callHostedApi(
  payload: HostedAnalyzeRequest,
  options: Required<Pick<HostedAnalyzeOptions, 'apiUrl' | 'timeoutMs' | 'retries'>>,
  attempt: number
): Promise<HostedAnalyzeResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const clientVersion = payload.client?.version || '0.0.0';
    const response = await fetch(options.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': `memograph-cli/${clientVersion}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      let errorBody: HostedAnalyzeErrorBody | null = null;
      try {
        errorBody = (await response.json()) as HostedAnalyzeErrorBody;
      } catch {
        errorBody = null;
      }

      const retryable =
        RETRYABLE_STATUS.has(response.status) && attempt < options.retries;
      if (retryable) {
        const retryAfter = response.headers.get('retry-after');
        const retryAfterSeconds = retryAfter ? Number(retryAfter) : NaN;
        const delayMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 500;
        await sleep(delayMs);
        return callHostedApi(payload, options, attempt + 1);
      }

      throw new HostedApiError(formatHttpError(response.status, errorBody), response.status);
    }

    const data = (await response.json()) as unknown;
    if (!isInspectResult(data)) {
      throw new Error('Invalid API response.');
    }
    return data;
  } catch (error) {
    if (error instanceof HostedApiError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      const retryable = attempt < options.retries;
      if (retryable) {
        await sleep(500);
        return callHostedApi(payload, options, attempt + 1);
      }
      throw new Error('Analyze API timed out. Try again.');
    }

    const retryable = attempt < options.retries;
    if (retryable) {
      await sleep(500);
      return callHostedApi(payload, options, attempt + 1);
    }

    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Cannot reach analyze API. ${message}`);
  } finally {
    clearTimeout(timeout);
  }
}

function buildRawFallback(transcript: Transcript): string | null {
  if (transcript.raw_text && transcript.raw_text.trim().length > 0) {
    return transcript.raw_text;
  }
  if (!transcript.messages || transcript.messages.length === 0) {
    return null;
  }
  const lines = transcript.messages.map((msg) => `${msg.role}: ${msg.content}`);
  const rawText = lines.join('\n');
  return rawText.trim().length > 0 ? rawText : null;
}

export async function analyzeTranscriptHosted(
  transcript: Transcript,
  options: HostedAnalyzeOptions = {}
): Promise<InspectResult> {
  const apiUrl = options.apiUrl || process.env.MEMOGRAPH_ANALYZE_API_URL || DEFAULT_API_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;

  const payload: HostedAnalyzeRequest = {
    schema_version: transcript.schema_version || '1.0',
    messages: transcript.messages,
    ...(transcript.raw_text ? { raw_text: transcript.raw_text } : {}),
    options: {
      max_messages: options.maxMessages,
    },
    client: {
      name: options.clientName || 'memograph-cli',
      ...(options.clientVersion ? { version: options.clientVersion } : {}),
    },
  };

  try {
    return await callHostedApi(payload, { apiUrl, timeoutMs, retries }, 0);
  } catch (error) {
    const shouldFallback =
      error instanceof HostedApiError &&
      error.status === 400 &&
      error.message.includes('Transcript format invalid') &&
      transcript.messages &&
      transcript.messages.length > 0;

    if (!shouldFallback) {
      throw error;
    }

    const rawText = buildRawFallback(transcript);
    if (!rawText) {
      throw error;
    }

    const fallbackPayload: HostedAnalyzeRequest = {
      schema_version: transcript.schema_version || '1.0',
      messages: [],
      raw_text: rawText,
      options: {
        max_messages: options.maxMessages,
      },
      client: {
        name: options.clientName || 'memograph-cli',
        ...(options.clientVersion ? { version: options.clientVersion } : {}),
      },
    };

    return callHostedApi(fallbackPayload, { apiUrl, timeoutMs, retries }, 0);
  }
}
