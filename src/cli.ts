#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { loadTranscript } from './core/load.js';
import { inspectTranscript } from './core/inspect.js';
import { renderTextReport, renderJsonReport } from './core/render.js';
import { createProgressIndicator } from './core/progress.js';
import type { InspectResult } from './core/types.js';
import { runInteractiveMode } from './interactive/index.js';

const program = new Command();

program
  .name('memograph')
  .version('0.1.0')
  .description('CLI tool for analyzing conversation transcripts and detecting memory drift');

program
  .command('inspect')
  .description('Analyze a transcript for drift and repetition')
  .requiredOption('-i, --input <path>', 'path to transcript JSON file')
  .option('--json', 'output JSON (machine-readable)', false)
  .option('--max-messages <n>', 'cap number of messages processed', (val) => parseInt(val, 10), 2000)
  .option('--analyze-mode <mode>', 'analysis mode: hosted or llm')
  .option('--api-url <url>', 'Hosted analyze API URL')
  .option('--api-timeout-ms <ms>', 'Hosted analyze API timeout in milliseconds', (val) => parseInt(val, 10))
  .option('--api-retries <n>', 'Hosted analyze API retry count', (val) => parseInt(val, 10))
  .option('--llm-provider <provider>', 'LLM provider: openai or anthropic', 'openai')
  .option('--llm-model <model>', 'LLM model to use (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)')
  .option('--llm-api-key <key>', 'LLM API key (or set OPENAI_API_KEY or ANTHROPIC_API_KEY env var)')
  .option('--llm-base-url <url>', 'Custom base URL for LLM API (useful for local models like Ollama)')
  .option('--llm-temperature <temp>', 'LLM temperature (0.0-1.0)', (val) => parseFloat(val), 0.3)
  .option('--llm-max-tokens <tokens>', 'Maximum tokens for LLM response', (val) => parseInt(val, 10), 4096)
  .action(async (options) => {
    try {
      const analyzeMode = options.analyzeMode || process.env.MEMOGRAPH_ANALYZE_MODE || 'hosted';

      const llmFlagsUsed =
        options.llmModel ||
        options.llmApiKey ||
        options.llmBaseUrl ||
        options.llmTemperature !== 0.3 ||
        options.llmMaxTokens !== 4096 ||
        options.llmProvider !== 'openai';

      if (analyzeMode !== 'llm' && llmFlagsUsed) {
        console.warn('Warning: LLM flags are ignored unless --analyze-mode llm is used.');
      }

      // Load transcript
      const transcript = await loadTranscript(options.input, options.maxMessages);

      // Build inspection config (hosted by default, llm via feature flag)
      const config: any = {
        analyzeMode,
        max_messages: options.maxMessages,
        apiUrl: options.apiUrl,
        apiTimeoutMs: options.apiTimeoutMs,
        apiRetries: options.apiRetries,
      };

      if (analyzeMode === 'llm') {
        config.llm = {
          provider: options.llmProvider,
          apiKey: options.llmApiKey,
          model: options.llmModel,
          temperature: options.llmTemperature,
          maxTokens: options.llmMaxTokens,
          baseUrl: options.llmBaseUrl,
        };
      }

      // Run inspection with progress for human-readable mode
      const progress = options.json
        ? null
        : createProgressIndicator(
            analyzeMode === 'hosted'
              ? 'Sending transcript to Analyze API'
              : 'Extracting facts with AI model',
            {
              output: process.stderr,
              messages:
                analyzeMode === 'hosted'
                  ? [
                      'Sending transcript to Analyze API',
                      'Waiting for hosted analysis',
                      'Preparing drift report',
                    ]
                  : [
                      'Extracting facts with AI model',
                      'Detecting drift patterns',
                      'Scoring conversation quality',
                    ],
            }
          );

      let result: InspectResult;
      try {
        result = await inspectTranscript(transcript, config);
        progress?.succeed('Analysis complete');
      } catch (error) {
        progress?.fail('Analysis failed');
        throw error;
      }

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
