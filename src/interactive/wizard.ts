/**
 * LLM Setup Wizard
 * Guides users through provider selection, base URL, API key, and model configuration
 */

import type { Settings } from './index.js';
import type { LLMProvider } from '../core/llm/providers.js';
import {
  PROVIDERS,
  getProvidersByCategory,
  getProviderInfo,
  isOpenAICompatible,
} from '../core/llm/providers.js';
import { ask, selectMenu, createRL, ensureStdinReady } from './index.js';

/**
 * Run complete LLM setup wizard
 */
export async function runSetupWizard(currentSettings: Settings): Promise<Settings> {
  const settings = { ...currentSettings };

  console.log('\n╭─ LLM Configuration Wizard ───────────────────────────╮');
  console.log('│  Let\'s configure your language model provider     │');
  console.log('╰───────────────────────────────────────────────────────╯\n');

  // Step 1: Select provider category
  console.log('Step 1 of 4: Select Provider Category\n');
  const categoryChoice = await selectMenu(
    'Select Category',
    ['Cloud Providers', 'Aggregators (OpenAI-compatible)', 'Local / Self-hosted']
  );

  let category: 'cloud' | 'aggregator' | 'local';
  if (categoryChoice === 0) category = 'cloud';
  else if (categoryChoice === 1) category = 'aggregator';
  else category = 'local';

  // Step 2: Select provider from category
  const providersInCategory = getProvidersByCategory(category);
  const providerOptions = providersInCategory.map((p) => PROVIDERS[p].label);

  console.log('\nStep 2 of 4: Select Provider\n');
  const providerChoice = await selectMenu(`Select ${category} Provider`, providerOptions);
  const selectedProvider = providersInCategory[providerChoice];
  const providerInfo = getProviderInfo(selectedProvider);

  console.log(`\n✓ Selected: ${providerInfo.label}`);

  // Update settings
  settings.llm.provider = selectedProvider;

  // Step 3: Base URL configuration
  console.log('\nStep 3 of 4: Configure Base URL\n');

  if (providerInfo.defaultBaseUrl) {
    console.log(`Default base URL for ${providerInfo.label}:`);
    console.log(`  ${providerInfo.defaultBaseUrl}\n`);

    await ensureStdinReady();
    const rl = createRL();
    const useDefault = await ask(rl, 'Use default base URL? (Y/n): ');
    rl.close();
    if (!useDefault || useDefault.toLowerCase() === 'y' || useDefault === '') {
      settings.llm.baseUrl = providerInfo.defaultBaseUrl;
      console.log('✓ Using default base URL');
    } else {
      await ensureStdinReady();
      const rl2 = createRL();
      const customUrl = await ask(rl2, 'Enter custom base URL: ');
      rl2.close();
      settings.llm.baseUrl = customUrl || undefined;
      console.log('✓ Base URL updated');
    }
  } else {
    // Custom provider - must ask for base URL
    await ensureStdinReady();
    const rl = createRL();
    const customUrl = await ask(rl, 'Enter base URL: ');
    rl.close();
    if (!customUrl) {
      console.log('❌ Base URL is required for custom providers');
      return currentSettings; // Return original settings
    }
    settings.llm.baseUrl = customUrl;
    console.log('✓ Base URL set');
  }

  // Step 4: API Key
  console.log('\nStep 4 of 4: Configure API Key\n');

  if (providerInfo.needsApiKey) {
    const providerLabel = providerInfo.label;
    const currentKey = currentSettings.llm.apiKey;

    if (currentKey) {
      console.log('Current API key:', currentKey.substring(0, 8) + '•••••••••••');
      await ensureStdinReady();
      const rl = createRL();
      const update = await ask(rl, 'Update API key? (y/N): ');
      rl.close();
      if (update.toLowerCase() !== 'y') {
        console.log('✓ Keeping existing API key');
        settings.llm.apiKey = currentKey;
      } else {
        await ensureStdinReady();
        const rl2 = createRL();
        const newKey = await ask(rl2, `Enter ${providerLabel} API key: `);
        rl2.close();
        if (newKey) {
          settings.llm.apiKey = newKey;
          console.log('✓ API key updated');
        }
      }
    } else {
      await ensureStdinReady();
      const rl = createRL();
      const newKey = await ask(rl, `Enter ${providerLabel} API key: `);
      rl.close();
      if (newKey) {
        settings.llm.apiKey = newKey;
        console.log('✓ API key set');
      }
    }
  } else {
    console.log(`${providerInfo.label} does not require an API key`);
    console.log('✓ Skipping API key configuration');
    settings.llm.apiKey = ''; // Clear any existing key
  }

  // Step 5: Model selection
  console.log('\nStep 5 of 5: Select Model\n');

  if (providerInfo.modelPresets && providerInfo.modelPresets.length > 0) {
    const modelOptions = [
      ...providerInfo.modelPresets.map((m) => `${m} (preset)`),
      'Custom model...',
    ];

    const modelChoice = await selectMenu('Select Model', modelOptions);

    if (modelChoice === modelOptions.length - 1) {
      // Custom model
      await ensureStdinReady();
      const rl = createRL();
      const customModel = await ask(rl, 'Enter model name: ');
      rl.close();
      if (customModel) {
        settings.llm.model = customModel;
        console.log('✓ Custom model set');
      }
    } else {
      // Preset model
      settings.llm.model = providerInfo.modelPresets[modelChoice];
      console.log(`✓ Model set to: ${settings.llm.model}`);
    }
  } else {
    // No presets available (e.g., aggregators, local)
    console.log(`${providerInfo.label} has many available models`);
    console.log('Common examples:');

    if (category === 'local') {
      console.log('  - llama3');
      console.log('  - qwen2.5');
      console.log('  - mistral');
    } else if (category === 'aggregator') {
      console.log('  - openai/gpt-4o-mini');
      console.log('  - anthropic/claude-3-5-sonnet');
      console.log('  - meta-llama/Llama-3.1-70b-instruct');
    }

    await ensureStdinReady();
    const rl = createRL();
    const customModel = await ask(rl, 'Enter model name: ');
    rl.close();
    if (customModel) {
      settings.llm.model = customModel;
      console.log(`✓ Model set to: ${customModel}`);
    }
  }

  // Optional: Temperature
  console.log('\nAdvanced Settings\n');
  await ensureStdinReady();
  const rl1 = createRL();
  const changeTemp = await ask(rl1, 'Change temperature from 0.3? (y/N): ');
  rl1.close();
  if (changeTemp.toLowerCase() === 'y') {
    await ensureStdinReady();
    const rl2 = createRL();
    const temp = await ask(rl2, 'Enter temperature (0.0-1.0): ');
    rl2.close();
    if (temp) {
      const tempVal = parseFloat(temp);
      if (!isNaN(tempVal) && tempVal >= 0 && tempVal <= 1) {
        settings.llm.temperature = tempVal;
        console.log(`✓ Temperature set to ${tempVal}`);
      }
    }
  }

  // Optional: Max tokens
  await ensureStdinReady();
  const rl3 = createRL();
  const changeTokens = await ask(rl3, 'Change max tokens from 4096? (y/N): ');
  rl3.close();
  if (changeTokens.toLowerCase() === 'y') {
    await ensureStdinReady();
    const rl4 = createRL();
    const tokens = await ask(rl4, 'Enter max tokens: ');
    rl4.close();
    if (tokens) {
      const tokensVal = parseInt(tokens, 10);
      if (!isNaN(tokensVal) && tokensVal > 0) {
        settings.llm.maxTokens = tokensVal;
        console.log(`✓ Max tokens set to ${tokensVal}`);
      }
    }
  }

  // Summary
  console.log('\n╭─ Configuration Summary ──────────────────────────────╮');
  console.log('│                                               │');
  console.log(`│  Provider:       ${providerInfo.label.padEnd(20)}│`);
  console.log(
    `│  Base URL:       ${(settings.llm.baseUrl || 'default').padEnd(20)}│`
  );
  console.log(
    `│  Model:          ${settings.llm.model.padEnd(20)}│`
  );
  
  const apiKeyDisplay = settings.llm.apiKey ? '••••••••••' : '(none)';
  console.log(
    `│  API Key:        ${apiKeyDisplay.padEnd(20)}│`
  );
  
  console.log(
    `│  Temperature:    ${String(settings.llm.temperature).padEnd(20)}│`
  );
  console.log(
    `│  Max Tokens:     ${String(settings.llm.maxTokens).padEnd(20)}│`
  );
  console.log('│                                               │');
  console.log('╰───────────────────────────────────────────────────────╯');

  await ensureStdinReady();
  const rlFinal = createRL();
  await ask(rlFinal, '\nPress Enter to continue...');
  rlFinal.close();

  return settings;
}
