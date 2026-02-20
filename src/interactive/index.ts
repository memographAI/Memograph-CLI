/**
 * Interactive CLI menu system for Memograph
 * Uses Node.js built-in readline with arrow key navigation
 */

import * as readline from 'readline';
import { inspectTranscript } from '../core/inspect.js';
import { loadTranscript, normalizeTranscript } from '../core/load.js';
import { createProgressIndicator } from '../core/progress.js';
import { renderTextReport, renderJsonReport } from '../core/render.js';
import { InspectConfig, InspectResult } from '../core/types.js';
import type { LLMProvider } from '../core/llm/providers.js';
import { getProvidersByCategory, getProviderInfo, PROVIDERS } from '../core/llm/providers.js';
import { runSetupWizard } from './wizard.js';
import { loadSettings, saveSettings, isAnalyzeConfigured, getAnalyzeConfigStatus } from './settings.js';

export interface Settings {
  analyzeMode: 'hosted' | 'llm';
  api: {
    url: string;
    timeoutMs: number;
    retries: number;
  };
  llm: {
    provider: LLMProvider;
    model: string;
    apiKey: string;
    temperature: number;
    maxTokens: number;
    baseUrl?: string;
  };
}

const CLOUD_PROVIDERS: LLMProvider[] = [
  'openai',
  'anthropic',
  'gemini',
  'mistral',
  'cohere',
  'xai',
  'perplexity',
];

const OTHER_PROVIDER_GROUPS = [
  { key: 'aggregator', label: 'Aggregators (OpenAI-compatible)' },
  { key: 'local', label: 'Local / Self-hosted' },
  { key: 'custom', label: 'Custom (OpenAI-compatible)' },
] as const;

type OtherProviderGroupKey = (typeof OTHER_PROVIDER_GROUPS)[number]['key'];

function getOtherProviderOptions(group: OtherProviderGroupKey): LLMProvider[] {
  if (group === 'custom') {
    return ['openai_compatible'];
  }

  return getProvidersByCategory(group === 'aggregator' ? 'aggregator' : 'local');
}

async function selectProvider(): Promise<LLMProvider> {
  const cloudProviderOptions = CLOUD_PROVIDERS.map((p) => PROVIDERS[p].label);

  while (true) {
    const providerChoice = await selectMenu('Select Cloud Provider', [
      ...cloudProviderOptions,
      'Others',
    ]);

    if (providerChoice < CLOUD_PROVIDERS.length) {
      return CLOUD_PROVIDERS[providerChoice];
    }

    const otherChoice = await selectMenu(
      'Select Category',
      [...OTHER_PROVIDER_GROUPS.map((group) => group.label), 'Back']
    );
    if (otherChoice === OTHER_PROVIDER_GROUPS.length) {
      console.clear();
      continue;
    }
    const otherGroup = OTHER_PROVIDER_GROUPS[otherChoice].key;
    const providersInGroup = getOtherProviderOptions(otherGroup);
    const providerLabels = providersInGroup.map((p) => PROVIDERS[p].label);
    const groupedChoice = await selectMenu('Select Provider', providerLabels);
    return providersInGroup[groupedChoice];
  }
}

const BANNER_COLOR_ON = '\x1b[97m';
const BANNER_COLOR_RESET = '\x1b[0m';
const BANNER_BLOCK_FULL = `${BANNER_COLOR_ON}█${BANNER_COLOR_RESET}`;
const BANNER_BLOCK_TOP = `${BANNER_COLOR_ON}▀${BANNER_COLOR_RESET}`;
const BANNER_BLOCK_BOTTOM = `${BANNER_COLOR_ON}▄${BANNER_COLOR_RESET}`;
const BANNER_FONT_WIDTH = 5;
const BANNER_FONT_HEIGHT = 5;
const BANNER_LETTER_SPACING = 1;
const BANNER_FONT: Record<string, string[]> = {
  M: ['X   X', 'XX XX', 'X X X', 'X   X', 'X   X'],
  E: ['XXXX', 'X', 'XXXX', 'X', 'XXXX'],
  O: ['XXXXX', 'X   X', 'X   X', 'X   X', 'XXXXX'],
  G: ['XXXX', 'X', 'X XXX', 'X   X', 'XXXX'],
  R: ['XXXX', 'X   X', 'XXXX', 'X  X', 'X   X'],
  A: [' XXX ', 'X   X', 'XXXX', 'X   X', 'X   X'],
  P: ['XXXX', 'X   X', 'XXXX', 'X', 'X'],
  H: ['X   X', 'X   X', 'XXXX', 'X   X', 'X   X'],
  C: [' XXXX', 'X', 'X', 'X', ' XXXX'],
  L: ['X', 'X', 'X', 'X', 'XXXX'],
  I: ['XXXX', '  X', '  X', '  X', 'XXXX'],
  ' ': ['', '', '', '', ''],
};

const BANNER_LOGO_TEXT = 'MEMOGRAPH CLI';
const BANNER_TAGLINE = 'Analyze conversation transcripts for memory drift';

function buildWordPattern(word: string): string[] {
  const rows = Array.from({ length: BANNER_FONT_HEIGHT }, () => '');

  for (const char of word) {
    const glyph = BANNER_FONT[char] || BANNER_FONT[' '] || ['', '', '', '', ''];
    for (let i = 0; i < BANNER_FONT_HEIGHT; i += 1) {
      const row = glyph[i] ?? '';
      rows[i] += row.padEnd(BANNER_FONT_WIDTH, ' ') + ' '.repeat(BANNER_LETTER_SPACING);
    }
  }

  return rows.map((row) => row.trimEnd());
}

function renderPixelLines(patternLines: string[]): string[] {
  const width = Math.max(...patternLines.map((line) => line.length), 0);
  const padded = patternLines.map((line) => line.padEnd(width, ' '));
  if (padded.length % 2 !== 0) {
    padded.push(''.padEnd(width, ' '));
  }

  const rendered: string[] = [];
  for (let row = 0; row < padded.length; row += 2) {
    const top = padded[row];
    const bottom = padded[row + 1];
    let line = '';

    for (let col = 0; col < width; col += 1) {
      const topOn = top[col] === 'X';
      const bottomOn = bottom[col] === 'X';

      if (topOn && bottomOn) {
        line += BANNER_BLOCK_FULL;
      } else if (topOn) {
        line += BANNER_BLOCK_TOP;
      } else if (bottomOn) {
        line += BANNER_BLOCK_BOTTOM;
      } else {
        line += ' ';
      }
    }

    rendered.push(line);
  }

  return rendered;
}

const BANNER_LOGO_PATTERN = buildWordPattern(BANNER_LOGO_TEXT);
const BANNER_LOGO_LINES = renderPixelLines(BANNER_LOGO_PATTERN);

function renderBanner(trailingNewline = false) {
  console.log('');
  BANNER_LOGO_LINES.forEach((line) => {
    console.log(line);
  });
  console.log('');
  console.log(`  ${BANNER_TAGLINE}`);
  if (trailingNewline) {
    console.log('');
  }
}

// Default settings are now imported from settings.ts

/**
 * Ensure stdout is fully flushed before reading input
 */
export function flushStdout(): Promise<void> {
  return new Promise((resolve) => {
    // Write a newline to ensure buffer is flushed
    // If this returns false, the buffer is full and we need to wait for drain
    const needsDrain = !process.stdout.write('');
    
    if (needsDrain) {
      process.stdout.once('drain', () => {
        // Even after drain, give a moment for the OS to process
        setTimeout(resolve, 10);
      });
    } else {
      // Buffer not full, but still give time for previous writes
      setTimeout(resolve, 10);
    }
  });
}

/**
 * Drain stdout completely and wait for all writes to finish
 */
export function drainStdout(): Promise<void> {
  return new Promise((resolve) => {
    // Force a write that will trigger drain if needed
    if (process.stdout.write('\n')) {
      // Write succeeded immediately, wait a bit for OS buffer
      setImmediate(() => resolve());
    } else {
      // Buffer full, wait for drain event
      process.stdout.once('drain', () => {
        setImmediate(() => resolve());
      });
    }
  });
}

/**
 * Create a readline interface
 */
export function createRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Create a readline interface optimized for interactive terminals
 */
export function createTerminalRL() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
}

/**
 * Wait for Enter (return to menu) or Ctrl+C (exit)
 * Used for the final analysis prompt to avoid readline issues
 */
export function waitForEnterOrCtrlC(message: string): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = (stdin as any).isRaw;

    console.log(message);

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) {
        stdin.setRawMode(false);
      }
      if (wasRaw === false) {
        stdin.pause();
      }
    };

    const onData = (chunk: Buffer) => {
      const key = chunk?.[0];
      if (key === 3) {
        cleanup();
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
      }

      if (key === 13 || key === 10) {
        cleanup();
        resolve();
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Reset stdin to canonical mode and clear listeners after raw input usage
 */
export function resetStdinState() {
  const stdin = process.stdin;
  stdin.removeAllListeners('data');
  stdin.removeAllListeners('keypress');
  if (stdin.setRawMode) {
    stdin.setRawMode(false);
  }
  stdin.pause();
  stdin.resume();
}

/**
 * Ensure stdin is ready for readline input
 * Call this before using readline after selectMenu
 */
export async function ensureStdinReady() {
  // Drain stdout completely first
  await drainStdout();
  
  // Pause stdin to reset its state
  process.stdin.pause();
  
  // Clear any existing stdin listeners
  process.stdin.removeAllListeners('data');
  process.stdin.removeAllListeners('keypress');
  
  // Ensure no raw mode
  if (process.stdin.setRawMode) {
    process.stdin.setRawMode(false);
  }
  
  // Resume stdin in canonical mode
  process.stdin.resume();
  
  // Longer delay for terminal stabilization after heavy output
  // Increased from 100ms to 200ms for terminals with slower buffers
  return new Promise((resolve) => setTimeout(resolve, 200));
}

/**
 * Ask a question and get user input (for text input)
 */
export function ask(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let resolved = false;
    
    const sigintHandler = () => {
      if (resolved) return;
      resolved = true;
      
      process.removeListener('SIGINT', sigintHandler);
      rl.removeListener('SIGINT', sigintHandler);
      rl.close();
      console.log('\n👋 Goodbye!\n');
      process.exit(0);
    };
    
    process.on('SIGINT', sigintHandler);
    rl.on('SIGINT', sigintHandler);
    
    rl.question(question, (answer) => {
      if (resolved) return;
      resolved = true;
      
      process.removeListener('SIGINT', sigintHandler);
      rl.removeListener('SIGINT', sigintHandler);
      rl.close();
      resolve(answer.trim());
    });
    
    // Ensure rl properly emits events
    rl.resume();
  });
}

/**
 * Ask a question and mask input (for sensitive text like API keys)
 */
export function askMasked(question: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    let value = '';

    const wasRaw = (stdin as any).isRaw;

    stdout.write(question);

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) {
        stdin.setRawMode(wasRaw ?? false);
      }
      stdin.pause();
    };

    const onData = (chunk: Buffer) => {
      const char = chunk.toString('utf8');

      // Enter
      if (chunk[0] === 13 || chunk[0] === 10) {
        stdout.write('\n');
        cleanup();
        resolve(value.trim());
        return;
      }

      // Ctrl+C
      if (chunk[0] === 3) {
        cleanup();
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
        return;
      }

      // Backspace
      if (chunk[0] === 127 || chunk[0] === 8) {
        if (value.length > 0) {
          value = value.slice(0, -1);
          stdout.write('\b \b');
        }
        return;
      }

      if (char) {
        for (const ch of char) {
          value += ch;
          stdout.write('*');
        }
      }
    };

    stdin.on('data', onData);
  });
}

/**
 * Read multi-line input until a blank line is entered.
 */
export async function readMultilineInput(prompt: string): Promise<string> {
  await ensureStdinReady();
  console.log(prompt);
  console.log('(Finish by entering a blank line)');

  const rl = createRL();
  const lines: string[] = [];

  return new Promise((resolve) => {
    rl.on('line', (line) => {
      if (line.trim() === '') {
        rl.close();
        resolve(lines.join('\n'));
      } else {
        lines.push(line);
      }
    });
  });
}

/**
 * Show an interactive select menu with arrow keys
 */
export async function selectMenu(
  title: string,
  options: string[],
  selectedIndex = 0,
  showBannerText = false
): Promise<number> {
  // Save original settings
  const stdin = process.stdin;
  const stdout = process.stdout;
  const isRaw = (stdin as any).isRaw;
  const wasMuted = (stdout as any)._muted;

  // Enable raw mode for arrow key detection
  stdin.setRawMode(true);
  stdin.resume();
  (stdout as any)._muted = false;

  let resolved = false;

  const render = () => {
    console.clear();
    
    // Show banner if requested
    if (showBannerText) {
      renderBanner();
    }
    
    console.log(`\n╭─ ${title} ${'─'.repeat(50)}`);
    console.log('│'.padEnd(60) + '│');
    
    options.forEach((opt, idx) => {
      const isSelected = idx === selectedIndex;
      const prefix = isSelected ? '▸' : ' ';
      const line = isSelected ? `\x1b[36m${opt}\x1b[0m` : opt; // Cyan for selected
      console.log(`│  ${prefix} ${line.padEnd(50)}│`);
    });
    
    console.log('│'.padEnd(60) + '│');
    console.log('╰' + '─'.repeat(60));
    console.log('\n  Use ↑/↓ arrows to move, Enter to select, Ctrl+C to exit');
  };

  render();

  const cleanup = () => {
    if (resolved) return;
    resolved = true;
    
    // Clean up event listeners first
    stdin.removeAllListeners('data');
    
    // Restore original settings
    stdin.setRawMode(isRaw);
    (stdout as any)._muted = wasMuted;
  };

  return new Promise((resolve) => {
    stdin.on('data', (key: Buffer) => {
      const str = key.toString();
      
      // Arrow up (↑)
      if (key[0] === 27 && key[1] === 91 && key[2] === 65) {
        selectedIndex = (selectedIndex - 1 + options.length) % options.length;
        render();
        return;
      }
      
      // Arrow down (↓)
      if (key[0] === 27 && key[1] === 91 && key[2] === 66) {
        selectedIndex = (selectedIndex + 1) % options.length;
        render();
        return;
      }
      
      // Enter key
      if (key[0] === 13) {
        cleanup();
        resolve(selectedIndex);
        return;
      }
      
      // Ctrl+C - graceful exit
      if (key[0] === 3) {
        cleanup();
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
        return;
      }
      
      // Escape - cancel only
      if (key[0] === 27) {
        cleanup();
        console.log('\n❌ Cancelled');
        process.exit(1);
        return;
      }
    });
  });
}

/**
 * Show welcome banner
 */
function showBanner() {
  renderBanner(true);
}

/**
 * Resolve analyze mode from settings + env
 */
function resolveAnalyzeMode(settings: Settings): 'hosted' | 'llm' {
  if (process.env.MEMOGRAPH_ANALYZE_MODE === 'llm') {
    return 'llm';
  }
  return settings.analyzeMode || 'hosted';
}

/**
 * Check configuration and prompt for required setup if needed
 */
async function checkAndPromptWizard(settings: Settings): Promise<boolean> {
  settings.analyzeMode = resolveAnalyzeMode(settings);
  const status = getAnalyzeConfigStatus(settings);
  
  if (status.configured) {
    return true;
  }

  console.log(`\n❌ ${status.message}`);
  const mode = resolveAnalyzeMode(settings);
  console.log(`\n${mode === 'hosted' ? 'Analyze API' : 'AI model'} is not configured yet.`);
  
  // Ensure stdin is active and in the correct mode
  await ensureStdinReady();

  if (mode === 'hosted') {
    const rl = createRL();
    const response = await ask(rl, 'Set Analyze API URL now? (Y/n): ');
    rl.close();

    if (response.toLowerCase() === 'y' || response === '') {
      await ensureStdinReady();
      const rl2 = createRL();
      const apiUrl = await ask(
        rl2,
        `Enter Analyze API URL (default: ${settings.api.url || 'https://ap-south-1-test.memograph.click/v1/analyze'}): `
      );
      rl2.close();
      if (apiUrl.trim()) {
        settings.api.url = apiUrl.trim();
      }
      saveSettings(settings);
      return isAnalyzeConfigured(settings);
    }
    return false;
  }

  const rl = createRL();
  const response = await ask(rl, 'Run Setup Wizard now? (Y/n): ');
  rl.close();

  if (response.toLowerCase() === 'y' || response === '') {
    console.clear();
    const newSettings = await runSetupWizard(settings);
    Object.assign(settings, newSettings);
    settings.analyzeMode = 'llm';
    saveSettings(settings);
    
    return isAnalyzeConfigured(settings);
  }

  return false;
}

/**
 * Display current settings
 */
export function displaySettings(settings: Settings) {
  const mode = resolveAnalyzeMode(settings);
  const maskedKey = settings.llm.apiKey
    ? settings.llm.apiKey.substring(0, 8) + '••••••••••••'
    : '(not set)';

  console.log('\n╭─ Current Settings ─────────────────────────────────────╮');
  console.log('│                                               │');
  console.log(`│  ◆ Analyze Mode:   ${mode.padEnd(20)}│`);
  console.log(`│  ◆ API URL:        ${(settings.api.url || '(not set)').padEnd(20)}│`);
  console.log(`│  ◆ API Timeout:    ${String(settings.api.timeoutMs).padEnd(20)}│`);
  console.log(`│  ◆ API Retries:    ${String(settings.api.retries).padEnd(20)}│`);
  if (mode === 'llm') {
    console.log(`│  ◆ LLM Provider:   ${settings.llm.provider.padEnd(20)}│`);
    console.log(`│  ◆ LLM Model:      ${settings.llm.model.padEnd(20)}│`);
    console.log(`│  ◆ Temperature:    ${String(settings.llm.temperature).padEnd(20)}│`);
    console.log(`│  ◆ Max Tokens:     ${String(settings.llm.maxTokens).padEnd(20)}│`);
    console.log(`│  ◆ LLM Base URL:   ${(settings.llm.baseUrl || '(default)').padEnd(20)}│`);
    console.log(`│  ◆ LLM API Key:    ${maskedKey.padEnd(20)}│`);
  }
  console.log('│                                               │');
  console.log('╰──────────────────────────────────────────────────────╯\n');
}

/**
 * Settings menu
 */
async function settingsMenu(settings: Settings): Promise<boolean> {
  while (true) {
    const mode = resolveAnalyzeMode(settings);
    settings.analyzeMode = mode;
    const options = mode === 'hosted'
      ? [
          'Change Analyze Mode',
          'Change API URL',
          'Change API Timeout',
          'Change API Retries',
          'Advanced: LLM Setup (Legacy)',
          'Show raw config',
          'Back to main menu',
        ]
      : [
          'Change Analyze Mode',
          'Quick Setup (Wizard)',
          'Change LLM Provider',
          'Change LLM Model',
          'Change Temperature',
          'Change Max Tokens',
          'Change Base URL',
          'Set/Update API Key',
          'Show raw config',
          'Back to main menu',
        ];

    const choice = await selectMenu('Settings', options);

    if (mode === 'hosted') {
      switch (choice) {
        case 0: // Change mode
          {
            const modeChoice = await selectMenu('Select Analyze Mode', [
              'hosted (default)',
              'llm (legacy fallback)',
            ]);
            settings.analyzeMode = modeChoice === 0 ? 'hosted' : 'llm';
            saveSettings(settings);
            console.log('\n✓ Analyze mode updated to', settings.analyzeMode);
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 1: // API URL
          {
            await ensureStdinReady();
            const apiUrl = await ask(
              createRL(),
              `Enter Analyze API URL (current: ${settings.api.url}): `
            );
            if (apiUrl.trim()) {
              settings.api.url = apiUrl.trim();
              saveSettings(settings);
              console.log('\n✓ API URL updated');
            }
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 2: // API timeout
          {
            await ensureStdinReady();
            const timeout = await ask(
              createRL(),
              `Enter API timeout in ms (current: ${settings.api.timeoutMs}): `
            );
            const timeoutVal = parseInt(timeout, 10);
            if (!isNaN(timeoutVal) && timeoutVal > 0) {
              settings.api.timeoutMs = timeoutVal;
              saveSettings(settings);
              console.log('\n✓ API timeout updated');
            } else if (timeout.trim()) {
              console.log('\n❌ Invalid timeout value');
            }
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 3: // API retries
          {
            await ensureStdinReady();
            const retries = await ask(
              createRL(),
              `Enter API retries (current: ${settings.api.retries}): `
            );
            const retriesVal = parseInt(retries, 10);
            if (!isNaN(retriesVal) && retriesVal >= 0) {
              settings.api.retries = retriesVal;
              saveSettings(settings);
              console.log('\n✓ API retries updated');
            } else if (retries.trim()) {
              console.log('\n❌ Invalid retries value');
            }
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 4: // Legacy wizard
          {
            console.clear();
            const newSettings = await runSetupWizard(settings);
            Object.assign(settings, newSettings);
            settings.analyzeMode = 'llm';
            saveSettings(settings);
            console.clear();
            displaySettings(settings);
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 5: // Show raw config
          {
            const displayConfig = {
              ...settings,
              llm: {
                ...settings.llm,
                apiKey: settings.llm.apiKey
                  ? settings.llm.apiKey.substring(0, 8) + '••••••••••'
                  : '',
              },
            };
            console.log('\nRaw configuration:');
            console.log(JSON.stringify(displayConfig, null, 2));
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 6: // Back
          console.clear();
          return true;
      }
    } else {
      switch (choice) {
        case 0: // Change mode
          {
            const modeChoice = await selectMenu('Select Analyze Mode', [
              'hosted (default)',
              'llm (legacy fallback)',
            ]);
            settings.analyzeMode = modeChoice === 0 ? 'hosted' : 'llm';
            saveSettings(settings);
            console.log('\n✓ Analyze mode updated to', settings.analyzeMode);
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 1: // Quick setup wizard
          {
            console.clear();
            const newSettings = await runSetupWizard(settings);
            Object.assign(settings, newSettings);
            settings.analyzeMode = 'llm';
            saveSettings(settings);
            console.clear();
            displaySettings(settings);
            await ensureStdinReady();
            await ask(createRL(), '\nPress Enter to continue...');
          }
          break;
        case 2: // Change provider
        {
          const selectedProvider = await selectProvider();
          settings.llm.provider = selectedProvider;
          const providerInfo = getProviderInfo(selectedProvider);
          if (providerInfo?.defaultBaseUrl) {
            settings.llm.baseUrl = providerInfo.defaultBaseUrl;
          }
          saveSettings(settings);
          console.log('\n✓ Provider updated to', settings.llm.provider);
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 3: // Change model
        {
          const models = settings.llm.provider === 'openai'
            ? ['gpt-4o-mini (recommended)', 'gpt-4o', 'gpt-3.5-turbo', 'Custom...']
            : ['claude-3-5-sonnet-20241022 (recommended)', 'claude-3-5-haiku-20241022', 'Custom...'];
          
          const modelChoice = await selectMenu('Select LLM Model', models);
          const selected = models[modelChoice];
          
          if (selected === 'Custom...') {
            await ensureStdinReady();
            const customModel = await ask(createRL(), 'Enter custom model name: ');
            settings.llm.model = customModel;
          } else {
            settings.llm.model = selected.split(' ')[0];
          }
          saveSettings(settings);
          console.log('\n✓ Model updated to', settings.llm.model);
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 4: // Change temperature
        {
          await ensureStdinReady();
          const temp = await ask(createRL(), 'Enter temperature (0.0-1.0, default 0.3): ');
          if (temp) {
            const tempVal = parseFloat(temp);
            if (!isNaN(tempVal) && tempVal >= 0 && tempVal <= 1) {
              settings.llm.temperature = tempVal;
              saveSettings(settings);
              console.log('\n✓ Temperature updated to', tempVal);
            } else {
              console.log('\n❌ Invalid temperature. Must be between 0.0 and 1.0');
            }
          }
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 5: // Change max tokens
        {
          await ensureStdinReady();
          const maxTokens = await ask(createRL(), 'Enter max tokens (default 4096): ');
          if (maxTokens) {
            const tokensVal = parseInt(maxTokens, 10);
            if (!isNaN(tokensVal) && tokensVal > 0) {
              settings.llm.maxTokens = tokensVal;
              saveSettings(settings);
              console.log('\n✓ Max tokens updated to', tokensVal);
            } else {
              console.log('\n❌ Invalid value. Must be a positive number');
            }
          }
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 6: // Change base URL
        {
          await ensureStdinReady();
          const baseUrl = await ask(createRL(), 'Enter base URL (or press Enter to clear): ');
          if (baseUrl) {
            settings.llm.baseUrl = baseUrl;
          } else {
            settings.llm.baseUrl = undefined;
          }
          saveSettings(settings);
          console.log('\n✓ Base URL updated');
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 7: // Set API key
        {
          const currentKey = settings.llm.apiKey;
          if (currentKey) {
            console.log('\nCurrent API key:', currentKey.substring(0, 8) + '••••••••••');
            await ensureStdinReady();
            const confirm = await ask(createRL(), 'Update API key? (y/N): ');
            if (confirm.toLowerCase() !== 'y') {
              console.clear();
              displaySettings(settings);
              break;
            }
          }
          await ensureStdinReady();
          const apiKey = await askMasked(`Enter ${settings.llm.provider.toUpperCase()} API key: `);
          if (apiKey) {
            settings.llm.apiKey = apiKey;
            saveSettings(settings);
            console.log('\n✓ API key updated');
          }
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 8: // Show raw config
        {
          const displayConfig = { ...settings };
          if (displayConfig.llm.apiKey) {
            displayConfig.llm.apiKey = displayConfig.llm.apiKey.substring(0, 8) + '••••••••••';
          }
          console.log('\nRaw configuration:');
          console.log(JSON.stringify(displayConfig, null, 2));
          await ensureStdinReady();
          await ask(createRL(), '\nPress Enter to continue...');
        }
        break;

      case 9: // Back
        console.clear();
        return true;
      }
    }

    console.clear();
    displaySettings(settings);
  }
}

/**
 * Inspect transcript interactively
 */
async function inspectTranscriptInteractive(settings: Settings): Promise<void> {
  // Check configuration first
  const isReady = await checkAndPromptWizard(settings);
  if (!isReady) {
    console.log('\n❌ Cannot proceed: LLM is not configured');
    await flushStdout();
    await ensureStdinReady();
    const rl = createRL();
    await ask(rl, '\nPress Enter to return to main menu (or Ctrl+C to exit)...');
    rl.close();
    return;
  }

  try {
    // Get transcript input method
    const inputChoice = await selectMenu('Transcript Input', [
      'Enter file path',
      'Paste transcript',
      'Back to Home',
    ]);

    if (inputChoice === 2) {
      console.clear();
      return;
    }

    let transcript;

    if (inputChoice === 0) {
      await ensureStdinReady();
      const path = await ask(createRL(), 'Enter path to transcript file: ');
      transcript = await loadTranscript(path);
    } else {
      const pasted = await readMultilineInput('Paste transcript JSON below:');
      const raw = JSON.parse(pasted);
      transcript = normalizeTranscript(raw);
    }

    // Get output format
    const formatChoice = await selectMenu('Output Format', ['Text (human-readable)', 'JSON (machine-readable)']);
    const asJson = formatChoice === 1;

    console.log(`✓ Loaded transcript with ${transcript.messages.length} messages`);
    const mode = resolveAnalyzeMode(settings);

    const config: InspectConfig = {
      analyzeMode: mode,
      max_messages: 2000,
      apiUrl: settings.api.url,
      apiTimeoutMs: settings.api.timeoutMs,
      apiRetries: settings.api.retries,
      ...(mode === 'llm' ? { llm: settings.llm } : {}),
    };

    const progress = createProgressIndicator(
      mode === 'hosted' ? 'Sending transcript to hosted Analyze API' : 'Extracting facts using LLM',
      {
        messages:
          mode === 'hosted'
            ? [
                'Sending transcript to hosted Analyze API',
                'Waiting for hosted analysis',
                'Preparing drift report',
              ]
            : [
                'Extracting facts using LLM',
                'Detecting drift patterns',
                'Scoring conversation quality',
              ],
      }
    );

    let result: InspectResult;
    try {
      result = await inspectTranscript(transcript, config);
      progress.succeed('Analysis complete');
    } catch (error) {
      progress.fail('Analysis failed');
      throw error;
    }
    console.log('');

    const output = asJson ? renderJsonReport(result) : renderTextReport(result);
    
    // Use direct write with proper async handling instead of console.log
    await new Promise<void>((resolve) => {
      if (process.stdout.write(output + '\n')) {
        // Write successful, resolve immediately
        setImmediate(resolve);
      } else {
        // Buffer full, wait for drain
        process.stdout.once('drain', () => setImmediate(resolve));
      }
    });

    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.resume();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await waitForEnterOrCtrlC('\nPress Enter to return to main menu (or Ctrl+C to exit)...');
    resetStdinState();
    await ensureStdinReady();
  } catch (error) {
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }
    const errorMsg = '\n❌ Error: ' + (error instanceof Error ? error.message : 'Unknown error');
    
    // Use direct write with proper async handling
    await new Promise<void>((resolve) => {
      if (process.stdout.write(errorMsg + '\n')) {
        setImmediate(resolve);
      } else {
        process.stdout.once('drain', () => setImmediate(resolve));
      }
    });
    
    if (process.stdin.setRawMode) {
      process.stdin.setRawMode(false);
    }
    process.stdin.resume();
    await new Promise((resolve) => setTimeout(resolve, 50));
    await waitForEnterOrCtrlC('\nPress Enter to return to main menu (or Ctrl+C to exit)...');
    resetStdinState();
    await ensureStdinReady();
  }
}

/**
 * Main menu
 */
export async function runInteractiveMode(settings?: Settings): Promise<void> {
  // Load settings from config file if not provided
  if (!settings) {
    settings = loadSettings();
  }

  const options = [
    'Inspect a transcript',
    'Manage settings',
    'Exit',
  ];

  while (true) {
    const choice = await selectMenu('Main Menu', options, 0, true);

    switch (choice) {
      case 0:
        console.clear();
        await inspectTranscriptInteractive(settings);
        break;

      case 1:
        console.clear();
        displaySettings(settings);
        await settingsMenu(settings);
        break;

      case 2:
        console.log('\n👋 Goodbye!\n');
        process.exit(0);
    }
  }
}
