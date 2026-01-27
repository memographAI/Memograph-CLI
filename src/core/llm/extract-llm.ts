/**
 * LLM-based fact extraction
 */

import { TranscriptMessage, ExtractedFact } from '../types.js';
import { LLMClient } from './client.js';
import {
  FACT_EXTRACTION_SYSTEM,
  createFactExtractionPrompt,
} from './prompts.js';

export interface ExtractFactsLLMResult {
  facts: ExtractedFact[];
  timing_ms: number;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Extract facts from transcript using LLM
 */
export async function extractFactsLLM(
  messages: TranscriptMessage[],
  llmClient: LLMClient
): Promise<ExtractFactsLLMResult> {
  const start = performance.now();

  // Format messages for the prompt
  const formattedMessages = messages
    .filter(m => m.role === 'user')
    .map(m => `[${m.idx}] ${m.role}: ${m.content}`);

  if (formattedMessages.length === 0) {
    return {
      facts: [],
      timing_ms: performance.now() - start,
    };
  }

  try {
    // Call LLM
    const prompt = createFactExtractionPrompt(formattedMessages);
    const response = await llmClient.complete(prompt, FACT_EXTRACTION_SYSTEM);

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

    if (!Array.isArray(llmResponse.facts)) {
      throw new Error('LLM response does not contain a facts array');
    }

    const facts: ExtractedFact[] = llmResponse.facts;

    // Map message indices from LLM response back to actual indices
    const userMessages = messages.filter(m => m.role === 'user');
    
    const mappedFacts = facts.map((fact: any) => {
      // If msg_idx is provided, map it to actual message index
      let actualMsgIdx = 0;
      if (typeof fact.msg_idx === 'number' && fact.msg_idx < userMessages.length) {
        actualMsgIdx = userMessages[fact.msg_idx].idx;
      } else {
        // Default to the first user message
        actualMsgIdx = userMessages[0]?.idx || 0;
      }

      return {
        fact_key: fact.fact_key,
        fact_value: fact.fact_value,
        msg_idx: actualMsgIdx,
        confidence: fact.confidence || 0.5,
      };
    });

    return {
      facts: mappedFacts,
      timing_ms: performance.now() - start,
      usage: response.usage,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`LLM fact extraction failed: ${errorMessage}`);
  }
}

/**
 * Extract facts in batches for large transcripts
 */
export async function extractFactsLLMBatched(
  messages: TranscriptMessage[],
  llmClient: LLMClient,
  batchSize = 50
): Promise<ExtractFactsLLMResult> {
  const start = performance.now();
  const allFacts: ExtractedFact[] = [];
  let totalUsage = {
    promptTokens: 0,
    completionTokens: 0,
    totalTokens: 0,
  };

  // Filter user messages
  const userMessages = messages.filter(m => m.role === 'user');

  // Process in batches
  for (let i = 0; i < userMessages.length; i += batchSize) {
    const batch = userMessages.slice(i, i + batchSize);
    const result = await extractFactsLLM(batch, llmClient);
    
    allFacts.push(...result.facts);
    
    if (result.usage) {
      totalUsage.promptTokens += result.usage.promptTokens;
      totalUsage.completionTokens += result.usage.completionTokens;
      totalUsage.totalTokens += result.usage.totalTokens;
    }
  }

  return {
    facts: allFacts,
    timing_ms: performance.now() - start,
    usage: totalUsage,
  };
}
