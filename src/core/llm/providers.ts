/**
 * LLM Provider Registry
 * Maps all supported providers with their configurations
 */

export type LLMProvider =
  | "openai"
  | "anthropic"
  | "gemini"
  | "mistral"
  | "cohere"
  | "xai"
  | "perplexity"
  | "openrouter"
  | "together"
  | "groq"
  | "fireworks"
  | "deepseek"
  | "ollama"
  | "lmstudio"
  | "vllm"
  | "localai"
  | "openai_compatible";

export interface ProviderInfo {
  label: string;
  category: "cloud" | "aggregator" | "local";
  defaultBaseUrl?: string;
  needsApiKey: boolean;
  modelPresets?: string[];
  openAICompatible?: boolean;
}

/**
 * Provider catalog with all supported LLM providers
 */
export const PROVIDERS: Record<LLMProvider, ProviderInfo> = {
  // Cloud Providers (Direct)
  openai: {
    label: "OpenAI",
    category: "cloud",
    defaultBaseUrl: "https://api.openai.com/v1",
    needsApiKey: true,
    openAICompatible: true,
    modelPresets: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },

  anthropic: {
    label: "Anthropic (Claude)",
    category: "cloud",
    defaultBaseUrl: "https://api.anthropic.com",
    needsApiKey: true,
    modelPresets: ["claude-3-5-sonnet", "claude-3-5-haiku"],
  },

  gemini: {
    label: "Google Gemini",
    category: "cloud",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    needsApiKey: true,
    modelPresets: ["gemini-1.5-flash", "gemini-1.5-pro"],
  },

  mistral: {
    label: "Mistral",
    category: "cloud",
    defaultBaseUrl: "https://api.mistral.ai/v1",
    needsApiKey: true,
    openAICompatible: true,
    modelPresets: ["mistral-small", "mistral-large"],
  },

  cohere: {
    label: "Cohere",
    category: "cloud",
    defaultBaseUrl: "https://api.cohere.com",
    needsApiKey: true,
    modelPresets: ["command-r", "command-r-plus"],
  },

  xai: {
    label: "xAI (Grok)",
    category: "cloud",
    defaultBaseUrl: "https://api.x.ai/v1",
    needsApiKey: true,
    openAICompatible: true,
    modelPresets: ["grok-2", "grok-2-mini"],
  },

  perplexity: {
    label: "Perplexity",
    category: "cloud",
    defaultBaseUrl: "https://api.perplexity.ai",
    needsApiKey: true,
    openAICompatible: true,
    modelPresets: ["sonar", "sonar-pro"],
  },

  // Aggregators / Routers (OpenAI-compatible)
  openrouter: {
    label: "OpenRouter",
    category: "aggregator",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    needsApiKey: true,
    openAICompatible: true,
  },

  together: {
    label: "Together.ai",
    category: "aggregator",
    defaultBaseUrl: "https://api.together.xyz/v1",
    needsApiKey: true,
    openAICompatible: true,
  },

  groq: {
    label: "Groq",
    category: "aggregator",
    defaultBaseUrl: "https://api.groq.com/openai/v1",
    needsApiKey: true,
    openAICompatible: true,
  },

  fireworks: {
    label: "Fireworks.ai",
    category: "aggregator",
    defaultBaseUrl: "https://api.fireworks.ai/inference/v1",
    needsApiKey: true,
    openAICompatible: true,
  },

  deepseek: {
    label: "DeepSeek",
    category: "aggregator",
    defaultBaseUrl: "https://api.deepseek.com",
    needsApiKey: true,
    openAICompatible: true,
  },

  // Local / Self-hosted
  ollama: {
    label: "Ollama (Local)",
    category: "local",
    defaultBaseUrl: "http://localhost:11434/v1",
    needsApiKey: false,
    openAICompatible: true,
  },

  lmstudio: {
    label: "LM Studio (Local)",
    category: "local",
    defaultBaseUrl: "http://localhost:1234/v1",
    needsApiKey: false,
    openAICompatible: true,
  },

  vllm: {
    label: "vLLM (Self-hosted)",
    category: "local",
    defaultBaseUrl: "http://localhost:8000/v1",
    needsApiKey: false,
    openAICompatible: true,
  },

  localai: {
    label: "LocalAI (Self-hosted)",
    category: "local",
    defaultBaseUrl: "http://localhost:8080/v1",
    needsApiKey: false,
    openAICompatible: true,
  },

  // Custom OpenAI-compatible endpoint
  openai_compatible: {
    label: "Custom (OpenAI-compatible)",
    category: "aggregator",
    needsApiKey: true,
    openAICompatible: true,
  },
};

/**
 * Get provider info by provider key
 */
export function getProviderInfo(provider: LLMProvider): ProviderInfo {
  return PROVIDERS[provider];
}

/**
 * Check if provider is OpenAI-compatible
 */
export function isOpenAICompatible(provider: LLMProvider): boolean {
  return PROVIDERS[provider]?.openAICompatible || false;
}

/**
 * Get list of providers by category
 */
export function getProvidersByCategory(category: "cloud" | "aggregator" | "local"): LLMProvider[] {
  return Object.entries(PROVIDERS)
    .filter(([_, info]) => info.category === category)
    .map(([key, _]) => key as LLMProvider);
}

/**
 * Get all provider labels for display
 */
export function getAllProviderLabels(): Record<LLMProvider, string> {
  return Object.fromEntries(
    Object.entries(PROVIDERS).map(([key, info]) => [key as LLMProvider, info.label])
  ) as Record<LLMProvider, string>;
}
