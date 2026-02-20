import { InspectResult, Transcript } from '../types.js';

export interface HostedAnalyzeRequest {
  schema_version: string;
  messages: Transcript['messages'];
  raw_text?: string;
  options?: {
    max_messages?: number;
  };
  client?: {
    name: string;
    version?: string;
  };
}

export interface HostedAnalyzeErrorBody {
  error?: {
    code?: string;
    message?: string;
    request_id?: string;
    retryable?: boolean;
  };
}

export interface HostedAnalyzeOptions {
  apiUrl?: string;
  timeoutMs?: number;
  retries?: number;
  maxMessages?: number;
  clientName?: string;
  clientVersion?: string;
}

export type HostedAnalyzeResponse = InspectResult;
