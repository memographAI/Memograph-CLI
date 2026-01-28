# Memograph CLI

**Memory Drift Inspector for Conversational AI**

Analyze conversation transcripts and detect when AI assistants lose context. Get a drift score, identify repetitions, forgotten preferences, and contradictions using AI-powered semantic analysis.

---

## Table of Contents

- [What it does](#what-it-does)
- [Why this exists](#why-this-exists)
- [Try it now](#try-it-now)
- [Install](#install)
- [Quickstart](#quickstart)
- [Using Memograph](#using-memograph)
  - [Interactive Mode](#interactive-mode-recommended)
  - [CLI Mode](#cli-mode-for-scripts--automation)
- [Configuration](#configuration)
- [Input Format](#input-format)
- [Output](#output)
- [Privacy & Security](#privacy--security)
- [For Developers & Contributors](#for-developers--contributors)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## What it does

Memograph analyzes conversation transcripts to detect when AI assistants lose context or "forget" information:

- **Detects repetitions**: User forced to repeat themselves
- **Finds session resets**: Assistant language suggesting it forgot context
- **Identifies forgotten preferences**: User restating preferences
- **Spots contradictions**: Conflicting facts over time
- **Calculates drift score** (0-100) and token waste percentage

---

## Why this exists

When building conversational apps, memory failures often look like:

- Users repeating preferences: "I already said I want Bangla…"
- The assistant resets context: "Let's start over…"
- The same question is asked multiple times because the assistant doesn't converge
- Contradictory facts creep in

Memograph CLI gives you a **quick, local diagnostic** before you rebuild prompts, memory layers, or retrieval logic.

---

## Try it now

Get started in one command:

```bash
npx memograph-cli
```

This launches interactive mode with:
- Visual menu (arrow keys + Enter)
- Setup wizard for AI configuration
- Settings that persist across sessions
- Real-time progress indicators

---

## Using Memograph

### Interactive Mode (Recommended)

Run without arguments for a guided experience with arrow key navigation:

```bash
npx memograph-cli
```

**Main features:**
- **Visual menu** with ↑/↓ arrow key navigation
- **Inspect transcripts**: Enter file path → Choose output format → View results
- **Manage settings**: Configure once, settings persist in `~/.memograph/config.json`
- **Setup wizard**: 5-step guided configuration for AI providers

**Quick setup wizard:**
1. Select provider category (Cloud/Aggregators/Local)
2. Choose specific provider (OpenAI, Anthropic, Ollama, etc.)
3. Configure base URL (if needed)
4. Enter API key (if required)
5. Select model

**Keyboard shortcuts:**
- `↑` / `↓` - Navigate options
- `Enter` - Select/confirm
- `Ctrl+C` - Exit

---

## Install

### Option A: Try instantly (no installation) ⚡

**Recommended for first-time users and quick analysis:**

\`\`\`bash
npx memograph-cli
\`\`\`

Launches the interactive mode immediately. Configure your AI model on first run, and you're ready to analyze transcripts!

### Option B: Install globally 📦

**Best for regular use:**

\`\`\`bash
npm i -g memograph-cli
\`\`\`

After installation, run from anywhere:

\`\`\`bash
# Interactive mode
memograph

# Or CLI mode
memograph inspect -i ./transcript.json
\`\`\`

The package name is `memograph-cli` and the command is `memograph`.

### Option C: Local development 🛠️

**For contributors and local testing:**

\`\`\`bash
git clone https://github.com/yourusername/memograph-cli
cd memograph-cli
npm install
npm run build

# Run directly
node dist/cli.js

# Or use npm scripts
npm start
\`\`\`

---

## Quickstart

### Interactive Mode (Recommended)

**Get started in 3 steps:**

\`\`\`bash
# 1. Launch interactive mode
npx memograph-cli

# 2. First time? Run the setup wizard
#    - Select your AI provider (OpenAI, Anthropic, Ollama, etc.)
#    - Enter API key (if required)
#    - Choose a model
#    Settings are saved to ~/.memograph/config.json

# 3. Select "Inspect a transcript"
#    - Enter path: ./transcript.json
#    - Choose format: Text or JSON
#    - View your drift analysis!
\`\`\`

### CLI Mode (For Scripts & Power Users)

**Quick example:**

1. Create a transcript file:

**transcript.json**

\`\`\`json
{
  "schema_version": "1.0",
  "messages": [
    { "idx": 0, "role": "user", "content": "My name is Tusher" },
    { "idx": 1, "role": "assistant", "content": "Nice to meet you!" },
    { "idx": 2, "role": "user", "content": "Please reply in Bangla from now on" },
    { "idx": 3, "role": "assistant", "content": "Sure." },
    { "idx": 4, "role": "user", "content": "Reply in Bangla please (I told you before)" }
  ]
}
\`\`\`

2. Run inspect with flags:

\`\`\`bash
# Text output (uses settings from interactive mode or env vars)
memograph inspect -i transcript.json

# Or specify all options via CLI flags
memograph inspect -i transcript.json \
  --llm-provider openai \
  --llm-model gpt-4o-mini \
  --llm-api-key sk-...

# JSON output for CI/scripts
memograph inspect -i transcript.json --json
\`\`\`

**Note:** If you've configured settings in interactive mode, CLI commands automatically use those settings. You can override any setting with CLI flags.

---

### CLI Mode (For Scripts & Automation)

For scripting and automation, use the `inspect` command directly:

```bash
memograph-cli inspect -i transcript.json
```

**When to use CLI mode:**
- Automation scripts and CI/CD pipelines
- Batch processing multiple files
- When you already know your settings

**Pro tip:** Configure settings once in interactive mode, then use CLI mode for automated workflows!

---

**CLI inspect command:**

```bash
memograph-cli inspect -i <path> [--json] [--llm-model <model>]
```

**Common options:**
- `-i, --input <path>` - Transcript file (required)
- `--json` - Output JSON instead of text
- `--llm-model <model>` - Override model (e.g., gpt-4o)
- `--llm-provider <provider>` - Override provider (openai, anthropic)
- `--max-messages <n>` - Limit messages processed

**Examples:**

```bash
# Basic usage (uses saved settings)
memograph-cli inspect -i transcript.json

# JSON output for scripts
memograph-cli inspect -i transcript.json --json

# Use different model
memograph-cli inspect -i transcript.json --llm-model gpt-4o
```

For all options, run: `memograph-cli inspect --help`

---

## Configuration

**Easiest: Interactive Setup**

```bash
npx memograph-cli
# Select "Manage settings" → Follow wizard
# Settings saved to ~/.memograph/config.json
```

**Alternative: Environment Variables**

```bash
# Create .env file
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-4o-mini
```

**Using Local Models (Ollama)**

```bash
# Install and start Ollama
brew install ollama
ollama pull llama3.2
ollama serve

# Configure in interactive mode or use CLI flags
```

Settings priority: CLI flags > Environment variables > Config file

---

## Input Format

Provide a JSON file with conversation messages:

```json
{
  "schema_version": "1.0",
  "messages": [
    { "idx": 0, "role": "user", "content": "Hello" },
    { "idx": 1, "role": "assistant", "content": "Hi!" }
  ]
}
```

**Required fields:**
- `role`: "user", "assistant", "system", or "tool"
- `content`: Message text

**Optional fields:**
- `idx`: Message index (auto-assigned if missing)
- `ts`: ISO timestamp
- `tokens`: Token count (estimated if missing)

---

## Output

**Text output** (default): Human-readable report with drift score, events, and extracted facts.

**JSON output** (`--json` flag): Machine-readable format for scripts and CI/CD.

```json
{
  "drift_score": 25,
  "token_waste_pct": 7.1,
  "events": [...],
  "should_have_been_memory": [...]
}
```

---



## Privacy & Security

**Your data stays local:**
- Memograph reads transcript files from your local filesystem
- Only sends data to LLM APIs for analysis (or uses local models)
- No data is stored or transmitted elsewhere

**API Key Safety:**
- Keys are stored in `~/.memograph/config.json` or environment variables
- Never commit API keys to git (add `.env` to `.gitignore`)
- Use local models (Ollama) to avoid sending data to external APIs

---



## For Developers & Contributors

Interested in contributing or understanding how Memograph works? Check out [CONTRIBUTING.md](CONTRIBUTING.md) for:

- **How it works**: Detection algorithms, scoring, performance optimizations
- **Development setup**: Local environment, project structure, testing
- **Roadmap**: Planned features and improvements
- **Publishing**: Guidelines for releasing new versions

---

## Troubleshooting

### Common Issues

**"API key not found"**
- Run `npx memograph-cli` and use "Manage settings" → "Set/Update API Key"
- Or set environment variable: `export OPENAI_API_KEY=sk-...`

**Interactive mode doesn't start**
- Don't pass any arguments (they trigger CLI mode)
- Ensure terminal supports ANSI colors and arrow keys

**Settings not saving**
- Settings are in `~/.memograph/config.json`
- Reset with: `rm ~/.memograph/config.json && npx memograph-cli`

**Ollama not working**
- Ensure Ollama is running: `ollama serve`
- Use correct URL: `http://localhost:11434/v1`
- Install model: `ollama pull llama3.2`

**Network/API errors**
- Check internet connection
- Verify API status (status.openai.com / status.anthropic.com)
- Try a different model or use local models

**Where are settings stored?**
- Location: `~/.memograph/config.json`
- View: `cat ~/.memograph/config.json`
- Edit via interactive mode: "Manage settings" → "Show raw config"

**Settings priority:** CLI flags > Environment variables > Config file

---

## License

MIT License - see LICENSE file for details.
