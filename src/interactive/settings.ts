/**
 * Settings persistence and validation utilities
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { Settings } from './index.js';
import { getProviderInfo } from '../core/llm/providers.js';

const CONFIG_DIR = path.join(os.homedir(), '.memograph');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Default settings
 */
export const defaultSettings: Settings = {
  llm: {
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKey: '',
    temperature: 0.3,
    maxTokens: 4096,
    baseUrl: undefined,
  },
};

/**
 * Load settings from config file
 * Falls back to default settings if file doesn't exist
 */
export function loadSettings(): Settings {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return { ...defaultSettings };
    }

    const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const loaded = JSON.parse(data) as Partial<Settings>;

    // Merge with defaults to ensure all fields exist
    return {
      llm: {
        ...defaultSettings.llm,
        ...loaded.llm,
      },
    };
  } catch (error) {
    console.error('Warning: Failed to load settings, using defaults:', error);
    return { ...defaultSettings };
  }
}

/**
 * Save settings to config file
 */
export function saveSettings(settings: Settings): void {
  try {
    // Create config directory if it doesn't exist
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }

    // Write settings to file
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(settings, null, 2));
  } catch (error) {
    console.error('Warning: Failed to save settings:', error);
  }
}

/**
 * Validate LLM configuration
 * Returns true if configuration is complete and valid
 */
export function isLLMConfigured(settings: Settings): boolean {
  const { llm } = settings;

  // Check if provider is set
  if (!llm.provider) {
    return false;
  }

  // Check if model is set
  if (!llm.model) {
    return false;
  }

  // Check if API key is required and present
  const providerInfo = getProviderInfo(llm.provider);
  if (providerInfo?.needsApiKey && !llm.apiKey) {
    return false;
  }

  return true;
}

/**
 * Get configuration status message
 * Returns human-readable description of what's missing
 */
export function getConfigStatus(settings: Settings): { configured: boolean; message: string } {
  const { llm } = settings;

  if (!llm.provider) {
    return {
      configured: false,
      message: 'AI model configuration incomplete: No LLM provider is configured',
    };
  }

  if (!llm.model) {
    return {
      configured: false,
      message: 'AI model configuration incomplete: No model is configured',
    };
  }

  const providerInfo = getProviderInfo(llm.provider);
  if (providerInfo?.needsApiKey && !llm.apiKey) {
    const providerLabel = providerInfo.label || llm.provider;
    return {
      configured: false,
      message: `AI model configuration incomplete: ${providerLabel} API key is not set`,
    };
  }

  return {
    configured: true,
    message: 'LLM is properly configured',
  };
}

/**
 * Check and prompt for configuration if needed
 * Returns true if configuration is complete
 */
export async function ensureConfigured(settings: Settings): Promise<boolean> {
  const status = getConfigStatus(settings);

  if (status.configured) {
    return true;
  }

  console.log(`\n❌ Configuration Error: ${status.message}`);
  console.log('\nYour LLM is not properly configured.');
  console.log('You need to set up your provider, model, and API key.\n');

  // In interactive mode, we'll handle this differently
  // This is for CLI usage
  console.log('Run: memograph interactive');
  console.log('Then select: Manage settings → Quick Setup (Wizard)\n');

  return false;
}
