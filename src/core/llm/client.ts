/**
 * LLM Client - Unified interface for multiple LLM providers
 */

import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider } from './providers.js';
import { isOpenAICompatible, PROVIDERS } from './providers.js';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  baseUrl?: string; // For custom endpoints (e.g., local models)
}

export interface LLMResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Unified LLM client supporting multiple providers
 */
export class LLMClient {
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;

    // Validate API key is present (for providers that need it)
    const providerInfo = PROVIDERS[config.provider];
    const needsApiKey = providerInfo?.needsApiKey ?? true;

    if (needsApiKey) {
      if (config.provider === 'anthropic') {
        const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          throw new Error(
            'Anthropic API key not found. Set ANTHROPIC_API_KEY environment variable or provide --llm-api-key'
          );
        }
        this.anthropicClient = new Anthropic({
          apiKey,
          baseURL: config.baseUrl || providerInfo.defaultBaseUrl,
        });
      } else {
        // All other providers use OpenAI-compatible client
        // For openai provider, check OPENAI_API_KEY, otherwise check llm.apiKey
        let apiKey = config.apiKey;
        if (!apiKey) {
          apiKey = config.provider === 'openai' ? process.env.OPENAI_API_KEY : process.env.LLM_API_KEY;
        }
        if (!apiKey && needsApiKey) {
          const providerLabel = providerInfo?.label || config.provider;
          throw new Error(
            `${providerLabel} API key not found. Provide it via environment variables or settings`
          );
        }
        this.openaiClient = new OpenAI({
          apiKey: apiKey || 'dummy', // OpenAI SDK requires a key even if unused (local providers)
          baseURL: config.baseUrl || providerInfo.defaultBaseUrl,
        });
      }
    } else {
      // Local providers that don't need API key
      this.openaiClient = new OpenAI({
        apiKey: 'dummy', // OpenAI SDK requires a key
        baseURL: config.baseUrl || providerInfo.defaultBaseUrl,
      });
    }
  }

  /**
   * Generate a completion from the LLM
   */
  async complete(prompt: string, systemPrompt?: string): Promise<LLMResponse> {
    const model = this.config.model || this.getDefaultModel();

    if (this.config.provider === 'anthropic') {
      return this.completeAnthropic(prompt, systemPrompt, model);
    } else if (isOpenAICompatible(this.config.provider) || this.openaiClient) {
      return this.completeOpenAI(prompt, systemPrompt, model);
    }

    throw new Error(`Unsupported provider: ${this.config.provider}`);
  }

  /**
   * OpenAI completion
   */
  private async completeOpenAI(
    prompt: string,
    systemPrompt: string | undefined,
    model: string
  ): Promise<LLMResponse> {
    if (!this.openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const response = await this.openaiClient.chat.completions.create({
      model,
      messages: systemPrompt
        ? [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }]
        : [{ role: 'user', content: prompt }],
      temperature: this.config.temperature ?? 0.3,
      max_tokens: this.config.maxTokens ?? 4096,
    });

    const choice = response.choices[0];
    if (!choice || !choice.message) {
      throw new Error('No completion returned from OpenAI');
    }

    return {
      content: choice.message.content ?? '',
      model: response.model,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
    };
  }

  /**
   * Anthropic completion
   */
  private async completeAnthropic(
    prompt: string,
    systemPrompt: string | undefined,
    model: string
  ): Promise<LLMResponse> {
    if (!this.anthropicClient) {
      throw new Error('Anthropic client not initialized');
    }

    const response = await this.anthropicClient.messages.create({
      model,
      max_tokens: this.config.maxTokens ?? 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: prompt }],
      temperature: this.config.temperature ?? 0.3,
    });

    const block = response.content[0];
    if (block.type !== 'text') {
      throw new Error('Non-text response from Anthropic');
    }

    return {
      content: block.text,
      model: response.model,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  /**
   * Get default model for each provider
   */
  private getDefaultModel(): string {
    // Use first model from presets if available, otherwise use provider name
    const providerInfo = PROVIDERS[this.config.provider];
    if (providerInfo?.modelPresets && providerInfo.modelPresets.length > 0) {
      return providerInfo.modelPresets[0];
    }
    
    // Fallback defaults
    const fallbacks: Record<LLMProvider, string> = {
      openai: 'gpt-4o-mini',
      anthropic: 'claude-3-5-sonnet-20241022',
      gemini: 'gemini-1.5-flash',
      mistral: 'mistral-small',
      cohere: 'command-r',
      xai: 'grok-2',
      perplexity: 'sonar',
      openrouter: 'openai/gpt-4o-mini',
      together: 'meta-llama/Llama-3.1-70b-instruct',
      groq: 'llama-3.1-70b-versatile',
      fireworks: 'accounts/fireworks/models/llama-v3p-70b-instruct',
      deepseek: 'deepseek-chat',
      ollama: 'llama3',
      lmstudio: 'llama3',
      vllm: 'llama3',
      localai: 'llama3',
      openai_compatible: 'gpt-4o-mini',
    };
    return fallbacks[this.config.provider];
  }

  /**
   * Test the connection
   */
  async test(): Promise<boolean> {
    try {
      const response = await this.complete('Hello', 'You are a helpful assistant.');
      return response.content.length > 0;
    } catch (error) {
      console.error('LLM connection test failed:', error);
      return false;
    }
  }
}

/**
 * Create LLM client from environment or explicit config
 */
export function createLLMClient(config?: Partial<LLMConfig>): LLMClient {
  const provider = (config?.provider || process.env.LLM_PROVIDER || 'openai') as LLMProvider;
  const apiKey = config?.apiKey;
  const model = config?.model || process.env.LLM_MODEL;
  const temperature = config?.temperature;
  const maxTokens = config?.maxTokens;
  const baseUrl = config?.baseUrl || process.env.LLM_BASE_URL;

  return new LLMClient({
    provider,
    apiKey,
    model,
    temperature,
    maxTokens,
    baseUrl,
  });
}
