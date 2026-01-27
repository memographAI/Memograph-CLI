#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { loadTranscript } from './core/load.js';
import { inspectTranscript } from './core/inspect.js';
import { renderTextReport, renderJsonReport } from './core/render.js';
import { runInteractiveMode } from './interactive/index.js';

const program = new Command();

program
  .name('memograph')
  .version('0.1.0')
  .description('LLM-powered CLI tool for analyzing conversation transcripts and detecting memory drift');

program
  .command('inspect')
  .description('Analyze a transcript for drift and repetition using LLM-based semantic analysis')
  .requiredOption('-i, --input <path>', 'path to transcript JSON file')
  .option('--json', 'output JSON (machine-readable)', false)
  .option('--max-messages <n>', 'cap number of messages processed', (val) => parseInt(val, 10), 2000)
  .option('--llm-provider <provider>', 'LLM provider: openai or anthropic', 'openai')
  .option('--llm-model <model>', 'LLM model to use (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)')
  .option('--llm-api-key <key>', 'LLM API key (or set OPENAI_API_KEY or ANTHROPIC_API_KEY env var)')
  .option('--llm-base-url <url>', 'Custom base URL for LLM API (useful for local models like Ollama)')
  .option('--llm-temperature <temp>', 'LLM temperature (0.0-1.0)', (val) => parseFloat(val), 0.3)
  .option('--llm-max-tokens <tokens>', 'Maximum tokens for LLM response', (val) => parseInt(val, 10), 4096)
  .action(async (options) => {
    try {
      // Load transcript
      const transcript = await loadTranscript(options.input, options.maxMessages);

      // Build inspection config (LLM-only mode)
      const config: any = {
        max_messages: options.maxMessages,
        llm: {
          provider: options.llmProvider,
          apiKey: options.llmApiKey,
          model: options.llmModel,
          temperature: options.llmTemperature,
          maxTokens: options.llmMaxTokens,
          baseUrl: options.llmBaseUrl,
        },
      };

      // Run inspection (LLM-based, async)
      const result = await inspectTranscript(transcript, config);

      // Render output
      const output = options.json
        ? renderJsonReport(result)
        : renderTextReport(result);

      console.log(output);
      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });

program
  .command('interactive', { hidden: true })
  .description('Launch interactive mode (automatically used when no arguments provided)')
  .action(async () => {
    try {
      await runInteractiveMode();
      process.exit(0);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error: ${error.message}`);
      } else {
        console.error('Unknown error occurred');
      }
      process.exit(1);
    }
  });

// Check if we should launch interactive mode
const args = process.argv.slice(2);

// Check for help or version flags
const isHelpOrVersion = args.length === 1 && (args[0] === '-h' || args[0] === '--help' || args[0] === '-V' || args[0] === '--version');

// Check if there's a command (inspect, interactive)
const hasCommand = args.length > 0 && (args[0] === 'inspect' || args[0] === 'interactive' || args[0] === 'help');

if (!hasCommand && !isHelpOrVersion) {
  // No command provided, launch interactive mode
  runInteractiveMode().catch((error) => {
    console.error('Error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  });
} else {
  // Parse command line arguments for CLI commands
  program.parse(process.argv);
}
