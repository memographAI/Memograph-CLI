# Memograph-CLI

Memograph CLI tool.

# Memograph CLI (Node.js) — Memory Drift Inspector

An **LLM-powered** CLI tool that analyzes conversation transcripts and outputs a **memory drift report**: repetitions, preference "forgotten" signals, session resets, contradictions, and a simple drift score.  
Uses **AI models for semantic understanding** to detect subtle context loss and memory drift patterns.

---

## Table of Contents

- [What it does](#what-it-does)
- [Why this exists](#why-this-exists)
- [Try it now](#try-it-now)
- [Interactive Mode](#interactive-mode)
  - [Main Menu](#main-menu)
  - [Inspecting Transcripts](#inspecting-transcripts)
  - [Settings & Configuration](#settings--configuration)
  - [Setup Wizard](#setup-wizard)
  - [Keyboard Shortcuts](#keyboard-shortcuts)
- [Install](#install)
- [Quickstart](#quickstart)
- [Interactive vs CLI](#interactive-vs-cli)
- [Commands](#commands)
  - [`inspect`](#inspect)
- [Input format (Transcript)](#input-format-transcript)
- [Output formats](#output-formats)
  - [Text output](#text-output)
  - [JSON output](#json-output)
- [Detection rules](#detection-rules)
  - [Repetition clusters](#repetition-clusters)
  - [Session reset](#session-reset)
  - [Preference forgotten](#preference-forgotten)
  - [Contradictions](#contradictions)
- [Scoring](#scoring)
- [Performance & scaling](#performance--scaling)
- [Privacy & security](#privacy--security)
- [Development](#development)
  - [Project layout](#project-layout)
  - [Scripts](#scripts)
  - [Testing](#testing)
- [Publishing](#publishing)
- [Roadmap](#roadmap)
- [Troubleshooting](#troubleshooting)

---

## What it does

Given a transcript (JSON), Memograph CLI:

1. **Loads** and normalizes messages into a canonical "Transcript"
2. **Extracts** user facts/preferences with lightweight patterns
3. **Detects** memory drift signals:
   - repetition clusters
   - assistant "session reset" language
   - user restating preferences (suggesting they were not retained)
   - contradictions in extracted facts
4. Computes:
   - **Drift Score** (0–100)
   - **Token Waste %** (approx)
5. Prints:
   - human-readable report (default)
   - machine-readable JSON (`--json`)

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

**Get started instantly without installation:**

```bash
npx memograph-cli
```

This launches the **interactive mode** with a visual menu and guided setup. No installation required!

On first run, you'll be prompted to configure your AI model (OpenAI, Anthropic, or local models like Ollama). Settings are saved to `~/.memograph/config.json` and persist across sessions.

**Why interactive mode?**

- 🎯 **Zero config**: Arrow keys + Enter to navigate
- 🔧 **Setup wizard**: Step-by-step AI model configuration
- 💾 **Settings persist**: Configure once, use everywhere
- 📊 **Visual progress**: See analysis in real-time
- 🚀 **Instant start**: No flags to remember

---

## Interactive Mode

Memograph CLI features a beautiful **interactive mode** with arrow key navigation that makes analyzing transcripts effortless.

### Main Menu

When you run `memograph-cli` or `npx memograph-cli` without arguments, you'll see:

```
   ███   ███ █████ ███   ███  ███████  ███████ ███████   ███   ███████ █   █    ███  █     █████
   ████ ████ █     ████ ████ █     █ █       █     █  █   █ █     █ █   █  █     █   █       █
   █ ███ █ █████ █ ███ █ █ █     █ █   ███ ███████ ███████ ███████ ████████     █   █       █
   █  █  █ █     █  █  █ █ █     █ █     █ █   █  █     █ █     █ █   █  █     █   █       █
   █     █ █████ █     █  ███████  ███████ █   █  █     █ █     █ █   █   ███ █████ █████

  Analyze conversation transcripts for memory drift

╭─ Main Menu ─────────────────────────────────────────────
│
│  ▸ Inspect a transcript
│    Manage settings
│    Exit
│
╰─────────────────────────────────────────────────────────

  Use ↑/↓ arrows to move, Enter to select, Ctrl+C to exit
```

**Navigation:**
- Use `↑` and `↓` arrow keys to highlight options
- Press `Enter` to select
- Press `Ctrl+C` to exit anytime
- Selected option appears in **cyan**

### Inspecting Transcripts

Choose **"Inspect a transcript"** to analyze a conversation:

1. **Enter file path**: Type the path to your transcript JSON file
2. **Choose format**: Use arrows to select Text (human-readable) or JSON (machine-readable)
3. **Watch progress**: Real-time indicators show extraction and analysis
4. **View results**: Full drift report displayed inline
5. **Return to menu**: Press Enter to continue

**Example flow:**

```
Enter path to transcript file: ./tests/fixtures/sample.json

╭─ Output Format ───────────────────────────────────────
│
│  ▸ Text (human-readable)
│    JSON (machine-readable)
│
╰───────────────────────────────────────────────────────

✓ Loading transcript...
✓ Loaded transcript with 23 messages
✓ Extracting facts using LLM...
✓ Detecting drift patterns...
✓ Analysis complete!

=== Memograph Inspect Report ===
Drift Score: 25/100
[... full report ...]

Press Enter to return to main menu (or Ctrl+C to exit)...
```

### Settings & Configuration

Select **"Manage settings"** to configure your AI model and preferences.

**Settings are saved to:** `~/.memograph/config.json`

This means you configure once and your settings persist across all sessions. No need to specify flags every time!

**Available settings:**
- **Quick Setup (Wizard)**: Guided setup for first-time configuration
- **LLM Provider**: OpenAI, Anthropic, or custom
- **LLM Model**: Pre-configured options or custom model name
- **Temperature**: Control randomness (0.0-1.0)
- **Max Tokens**: Response length limit
- **Base URL**: For local models (Ollama, LM Studio)
- **API Key**: Securely stored (masked in display)

**Current settings display:**

```
╭─ Current Settings ─────────────────────────────────────╮
│                                                         │
│  ◆ LLM Provider:  openai                                │
│  ◆ LLM Model:      gpt-4o-mini                          │
│  ◆ Temperature:    0.3                                  │
│  ◆ Max Tokens:     4096                                 │
│  ◆ Base URL:       (default)                            │
│  ◆ API Key:        sk-proj••••••••••••                 │
│                                                         │
╰─────────────────────────────────────────────────────────╯
```

### Setup Wizard

The **Quick Setup Wizard** guides you through 5 simple steps:

**Step 1: Select Provider Category**
- **Cloud Providers**: OpenAI, Anthropic (requires API key)
- **Aggregators**: OpenRouter, Together AI (OpenAI-compatible)
- **Local / Self-hosted**: Ollama, LM Studio, custom endpoints

**Step 2: Select Specific Provider**
Choose from providers in your selected category.

**Step 3: Configure Base URL**
- Cloud providers use default URLs automatically
- Local providers prompt for custom URL (e.g., `http://localhost:11434/v1`)

**Step 4: Set API Key**
- Required for cloud providers
- Optional for local models
- Securely stored in config file

**Step 5: Select Model**
- Pre-configured options for popular providers
- Custom model input for flexibility
- Recommendations shown for each provider

**Example wizard flow:**

```
╭─ LLM Configuration Wizard ───────────────────────────╮
│  Let's configure your language model provider        │
╰──────────────────────────────────────────────────────╯

Step 1 of 4: Select Provider Category

╭─ Select Category ────────────────────────────────────
│
│  ▸ Cloud Providers
│    Aggregators (OpenAI-compatible)
│    Local / Self-hosted
│
╰──────────────────────────────────────────────────────

[After completing all steps...]

╭─ Configuration Summary ──────────────────────────────╮
│                                                       │
│  Provider:       OpenAI                               │
│  Base URL:       default                              │
│  Model:          gpt-4o-mini                          │
│  API Key:        ••••••••••                           │
│  Temperature:    0.3                                  │
│  Max Tokens:     4096                                 │
│                                                       │
╰───────────────────────────────────────────────────────╯

✓ Configuration saved!
```

### Keyboard Shortcuts

**In menus:**
- `↑` / `↓` - Navigate up/down through options
- `Enter` - Select the highlighted option
- `Ctrl+C` - Exit the application immediately
- `Esc` - Cancel current operation (context-dependent)

**During analysis:**
- `Ctrl+C` - Exit the application
- `Enter` - Return to main menu (after results shown)

**Text input:**
- Type normally and press `Enter` to submit
- `Ctrl+C` - Exit the application

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
memograph-cli

# Or CLI mode
memograph-cli inspect -i ./transcript.json
\`\`\`

The package name is `memograph-cli` and the command is also `memograph-cli`.

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
memograph-cli inspect -i transcript.json

# Or specify all options via CLI flags
memograph-cli inspect -i transcript.json \
  --llm-provider openai \
  --llm-model gpt-4o-mini \
  --llm-api-key sk-...

# JSON output for CI/scripts
memograph-cli inspect -i transcript.json --json
\`\`\`

**Note:** If you've configured settings in interactive mode, CLI commands automatically use those settings. You can override any setting with CLI flags.

---

## Interactive vs CLI

Choose the mode that fits your workflow:

| Use Case | Interactive Mode | CLI Mode |
|----------|-----------------|----------|
| **First-time setup** | ✅ Best choice - guided wizard | ⚠️ Complex - many flags to learn |
| **Quick analysis** | ✅ Guided prompts | ⚠️ Need to remember flags |
| **Exploring options** | ✅ Discoverable menu | ⚠️ Need to check --help |
| **Scripts & automation** | ❌ Not suitable | ✅ Perfect - single command |
| **CI/CD pipelines** | ❌ Requires interaction | ✅ Non-interactive |
| **Speed (one-off)** | ⚠️ Multi-step process | ✅ One command |
| **Speed (repeated use)** | ✅ Settings persist | ⚠️ Type flags each time |
| **Visual feedback** | ✅ Progress indicators | ❌ Text output only |
| **Configuration** | ✅ Saved to config file | ⚠️ Flags or env vars |

**When to use Interactive Mode:**
- First time using Memograph
- Trying different settings
- Don't want to remember CLI flags
- Want visual confirmation and progress
- Occasional analysis tasks

**When to use CLI Mode:**
- Automation scripts
- CI/CD workflows
- Batch processing multiple files
- Integration with other tools
- When you already know your settings

**Pro tip:** Use interactive mode to discover and configure settings, then use CLI mode with those saved settings for automated workflows!

---

## Commands

**Note:** When you run `memograph-cli` without any command, it automatically launches **interactive mode**. To use CLI commands, specify a command explicitly.

### inspect

Analyze a transcript for drift and repetition using LLM-based semantic analysis.

**Usage**

\`\`\`bash
memograph-cli inspect -i <path> [options]
\`\`\`

**Options**

- \`-i, --input <path>\`: path to transcript JSON (required)
- \`--json\`: output JSON (machine-readable)
- \`--max-messages <n>\`: cap number of messages processed (default: 2000)
- \`--llm-provider <provider>\`: LLM provider: \`openai\`, \`anthropic\`, etc.
- \`--llm-model <model>\`: LLM model (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)
- \`--llm-api-key <key>\`: API key (or set OPENAI_API_KEY/ANTHROPIC_API_KEY env var)
- \`--llm-base-url <url>\`: Custom base URL (for local models like Ollama)
- \`--llm-temperature <temp>\`: LLM temperature 0.0-1.0 (default: 0.3)
- \`--llm-max-tokens <tokens>\`: Max tokens in LLM response (default: 4096)

**Using saved settings:**

If you've configured settings via interactive mode, the CLI automatically uses those settings:

\`\`\`bash
# Uses settings from ~/.memograph/config.json
memograph-cli inspect -i transcript.json
\`\`\`

You can override any saved setting with CLI flags:

\`\`\`bash
# Override model but use other saved settings
memograph-cli inspect -i transcript.json --llm-model gpt-4o
\`\`\`

**Examples**

Text output (uses saved settings or env vars):

\`\`\`bash
memograph-cli inspect -i ./transcript.json
\`\`\`

Using Anthropic (override provider):

\`\`\`bash
memograph-cli inspect -i ./transcript.json --llm-provider anthropic
\`\`\`

Using a local model (Ollama):

\`\`\`bash
memograph-cli inspect -i ./transcript.json \
  --llm-provider openai \
  --llm-base-url http://localhost:11434/v1 \
  --llm-model llama3.2
\`\`\`

JSON output:

\`\`\`bash
memograph-cli inspect -i ./transcript.json --json
\`\`\`

Limit processing:

\`\`\`bash
memograph-cli inspect -i ./big.json --max-messages 500
\`\`\`

**Tip:** Configure settings once in interactive mode, then use simple CLI commands!

---

### Setup

**Recommended: Use Interactive Mode**

The easiest way to configure Memograph is through interactive mode:

\`\`\`bash
npx memograph-cli

# Select "Manage settings" → "Quick Setup (Wizard)"
# Follow the 5-step guided setup
# Settings are saved to ~/.memograph/config.json
\`\`\`

**Alternative: Environment Variables**

For CI/CD or if you prefer environment variables:

1. Copy `.env` example:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit `.env` and add your configuration:
   \`\`\`bash
   # For OpenAI
   LLM_PROVIDER=openai
   OPENAI_API_KEY=sk-your-key-here
   LLM_MODEL=gpt-4o-mini
   
   # Or for Anthropic
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   LLM_MODEL=claude-3-5-sonnet-20241022
   \`\`\`

3. Run analysis:
   \`\`\`bash
   memograph-cli inspect -i transcript.json
   \`\`\`

**Using Local Models (Ollama)**

You can use local LLMs like Ollama to avoid API costs and keep data local:

\`\`\`bash
# Install Ollama
brew install ollama  # macOS
# or download from ollama.ai

# Pull a model
ollama pull llama3.2

# Start Ollama server
ollama serve
\`\`\`

**Configure in interactive mode:**

\`\`\`bash
npx memograph-cli
# Select "Manage settings" → "Quick Setup (Wizard)"
# Choose "Local / Self-hosted" → "Ollama"
# Enter: http://localhost:11434/v1
# Model: llama3.2
\`\`\`

**Or use CLI flags:**

\`\`\`bash
memograph-cli inspect -i transcript.json \
  --llm-provider openai \
  --llm-base-url http://localhost:11434/v1 \
  --llm-model llama3.2
\`\`\`

**Priority Order:**

Settings are loaded in this order (highest priority first):

1. **CLI flags** - Highest priority, override everything
2. **Environment variables** - From `.env` or shell exports
3. **Config file** - `~/.memograph/config.json` (set via interactive mode)
4. **Built-in defaults** - Fallback values

---

## Input format (Transcript)

Memograph accepts either:
- A root object: \`{ "messages": [...] }\`
- OR a raw array: \`[ ...messages ]\`

**Canonical Schema**

\`\`\`typescript
type Transcript = {
  schema_version: "1.0";
  messages: TranscriptMessage[];
};

type TranscriptMessage = {
  idx: number;                          // message index
  role: "system" | "user" | "assistant" | "tool";
  content: string;                       // message text
  ts?: string;                           // ISO timestamp (optional)
  tokens?: number;                       // if you already know exact tokens (optional)
  session_id?: string;                   // session boundary marker (optional)
  metadata?: Record<string, unknown>;    // anything extra (optional)
};
\`\`\`

**Minimal Valid Example**

\`\`\`json
{
  "schema_version": "1.0",
  "messages": [
    { "idx": 0, "role": "user", "content": "Hello" },
    { "idx": 1, "role": "assistant", "content": "Hi!" }
  ]
}
\`\`\`

**Notes**

- If \`idx\` is missing, Memograph will auto-assign based on array order.
- If \`tokens\` is missing, Memograph uses an estimate (~ len(content)/4).
- Non-string content fields will be stringified.

---

## Output formats

### Text output

Text output is designed to be screenshot-friendly and stable.

**Example:**

\`\`\`
=== Memograph Inspect Report ===
Drift Score: 25/100 (raw: 25)
Token Waste: 7.1%

Critical Events:
- [preference_forgotten] sev=4 conf=0.65 idx=2,4
  User restated pref:language=bangla later, suggesting the assistant didn't retain it.
- [repetition_cluster] sev=2 conf=0.70 idx=2,4
  User repeated a similar request 2 times.

Should-have-been memory (top):
- identity:name="tusher" @0 (conf 0.90)
- pref:language="bangla" @2 (conf 0.70)

Timings (ms):
- extract_facts: 0
- repetition: 1
- session_reset: 0
- contradictions: 0
- pref_forgotten: 0
\`\`\`

### JSON output

Use \`--json\` for machine consumption.

**Top-level structure:**

\`\`\`json
{
  "drift_score": 25,
  "raw_score": 25,
  "token_waste_pct": 7.1,
  "events": [
    {
      "type": "preference_forgotten",
      "severity": 4,
      "confidence": 0.65,
      "evidence": {
        "msg_idxs": [2, 4],
        "snippets": ["Please reply in Bangla...", "Reply in Bangla please..."],
        "fact_key": "pref:language"
      },
      "summary": "User restated pref:language=bangla later..."
    }
  ],
  "should_have_been_memory": [
    { "fact_key": "identity:name", "fact_value": "tusher", "msg_idx": 0, "confidence": 0.9 }
  ],
  "timings_ms": {
    "extract_facts": 0.2,
    "repetition": 1.1,
    "session_reset": 0.1,
    "contradictions": 0.1,
    "pref_forgotten": 0.2
  }
}
\`\`\`

---

## Detection rules

Memograph uses **LLM-based semantic analysis** to detect memory drift patterns with AI understanding of context and meaning.

### Repetition clusters

**Goal:** detect when the user is forced to repeat themselves.

**Approach:**

- Normalize user messages
- Tokenize and compute a cheap signature (first ~8 tokens)
- Bucket messages by signature (avoids O(n²))
- Verify similarity within each bucket using Jaccard similarity (threshold ~0.65)
- Output top clusters by size

**Typical causes:**

- assistant not using memory
- prompt not constraining output
- tool failures causing "try again"
- missing retrieval / user preference ignored

### Session reset

**Goal:** detect assistant statements that imply it "forgot" or restarted.

**Example patterns** (heuristic):

- "new chat"
- "let's start over"
- "from scratch"
- "forget everything"

This is a high-severity signal when it happens.

### Preference forgotten

**Goal:** detect when the user repeats a preference much later, implying it was not retained.

**Approach:**

- Extract preference facts (e.g., language, tone)
- Group by (fact_key, fact_value)
- If the same preference is restated far apart (last_idx - first_idx >= 5), trigger event

You can improve this later by checking assistant behavior in between.

### Contradictions

**Goal:** detect conflicting extracted facts over time.

**Approach:**

- Track last seen value per fact key
- When value changes → contradiction signal

**Example:**

- \`identity:name = tusher\` later becomes \`identity:name = jane\` → flagged

---

## Scoring

Drift score is a simple weighted sum (clamped to 0–100):

**Default weights:**

- \`preference_forgotten\`: +15
- \`repetition_cluster\`: +10
- \`session_reset\`: +20
- \`contradiction\`: +10

**Implementation detail:**

- \`raw_score\`: sum of weights
- \`drift_score\`: clamp raw to [0..100]

### Token waste %

Estimated as:

- \`total_tokens\`: sum of tokens across all messages (estimated if missing)
- \`waste_tokens\`: tokens in user messages that appear in repetition clusters
- \`token_waste_pct = waste_tokens / total_tokens * 100\`

This is a proxy, not billing-grade accounting.

---

## Performance & scaling

**Goals**

- Keep inspection fast and predictable.
- Avoid quadratic comparisons.

**Techniques used**

- Bucketing signatures for repetition clusters
- \`--max-messages\` to cap work
- Lightweight normalization and heuristics
- Minimal allocations and stable sorting

**If transcripts are huge**

Recommended:

- start with \`--max-messages 1000\`
- later add streaming parse for extremely large JSON
- move heavy clustering to a Worker Thread if you hit CPU stalls

---

## Privacy & security

- Memograph CLI uses LLM-based analysis for semantic understanding
- Calls external LLM APIs (OpenAI/Anthropic) or local models (Ollama)
- It reads from local files and prints to stdout

**API Key Security:**

- API keys are loaded from environment variables or CLI flags (not stored)
- Never hardcode API keys in code or commit them to git
- Use \`--llm-api-key\` sparingly; prefer environment variables
- Add \`/.env\` to \`.gitignore\` to avoid accidentally committing keys

If you later add redaction:

- implement \`--redact\` to mask emails/phones/keys
- keep raw data out of JSON outputs by default for safer CI logs

---

## Development

### Project layout

\`\`\`
src/
  cli.ts                      # command parsing / IO
  core/
    types.ts                  # shared types
    load.ts                   # transcript loader + coercion
    normalize.ts              # text normalization, token estimate
    inspect.ts                # LLM-based pipeline
    score.ts                  # drift + token waste
    render.ts                 # text renderer
    llm/                     # LLM integration
      client.ts               # unified LLM client (OpenAI/Anthropic)
      prompts.ts             # prompt templates for fact extraction & drift detection
      extract-llm.ts        # LLM-based fact extraction
      detect-llm.ts         # LLM-based drift detection
tests/
  fixtures/
    sample.json
    clean.json
    invalid.json
  render.test.ts
\`\`\`

### Scripts

\`\`\`bash
npm run dev       # run via tsx (no build)
npm run build     # tsc build to dist/
npm run test      # vitest
npm start         # run dist/cli.js
\`\`\`

### Testing

**Unit tests:**

- fact extraction correctness
- repetition bucketing
- scoring stable and bounded

**Snapshot tests (recommended):**

- run inspect on fixed fixtures
- snapshot the text output so formatting changes are intentional

**Example fixture-based test idea:**

- fixture: repetition.json
- expected: one repetition cluster event, token waste > 0

---

## Publishing

**Package.json essentials**

- Provide a bin entry:

\`\`\`json
"bin": { "memograph-cli": "./dist/cli.js" }
\`\`\`

This makes the command `memograph-cli` available when installed globally or via npx.

- Make sure dist/ is included in package files:

\`\`\`json
"files": ["dist", "README.md", "LICENSE"]
\`\`\`

**Publish:**

\`\`\`bash
npm login
npm run build
npm publish
\`\`\`

---

## Roadmap

High-value upgrades:

1. **More extract rules**
   - "I prefer X"
   - "Don't do X"
   - "Always do Y"
   - identity signals (timezone, location, language, style)

2. **Better preference-forgotten detection**
   - check assistant replies between repeats
   - detect assistant ignoring preference (not just user restating it)

3. **Tool failure detection**
   - "tool error" messages
   - repeated retries

4. **Redaction**
   - \`--redact\` for keys/emails/phones
   - \`--no-snippets\` mode for strict privacy

5. **Export**
   - \`memograph export --format memograph\` (canonical transcript converter)

6. **CI integration**
   - GitHub Action wrapper
   - threshold checks: fail if drift_score > N

---

## Troubleshooting

### Interactive mode issues

#### Interactive mode doesn't start

If `memograph-cli` or `npx memograph-cli` doesn't launch interactive mode:

1. Make sure you're not passing any arguments (arguments trigger CLI mode)
2. Check that your terminal supports ANSI colors and arrow keys
3. Try clearing your terminal: `clear` or `Ctrl+L`

#### Arrow keys not working

If arrow keys don't navigate the menu:

1. Ensure your terminal emulator supports ANSI escape sequences
2. Try a different terminal (Terminal.app on macOS, Windows Terminal, iTerm2)
3. SSH users: Make sure your connection supports interactive TTY

#### Settings not persisting

Settings are saved to `~/.memograph/config.json`. If they're not persisting:

1. Check file permissions:
   \`\`\`bash
   ls -la ~/.memograph/config.json
   \`\`\`

2. View current settings:
   \`\`\`bash
   cat ~/.memograph/config.json
   \`\`\`

3. Manually edit if needed:
   \`\`\`bash
   nano ~/.memograph/config.json
   \`\`\`

4. Delete and reconfigure:
   \`\`\`bash
   rm ~/.memograph/config.json
   npx memograph-cli  # Will prompt for setup
   \`\`\`

### Configuration issues

#### "AI model configuration incomplete" error

This means your LLM settings are not complete. In interactive mode:

1. Select "Manage settings"
2. Choose "Quick Setup (Wizard)"
3. Follow the 5-step configuration process

Or manually check your config:

\`\`\`bash
cat ~/.memograph/config.json
\`\`\`

Required fields:
- `llm.provider` - e.g., "openai", "anthropic"
- `llm.model` - e.g., "gpt-4o-mini"
- `llm.apiKey` - API key (if provider requires it)

#### "API key not found" error

**In Interactive Mode:**

1. Launch: `npx memograph-cli`
2. Select "Manage settings"
3. Choose "Set/Update API Key"
4. Enter your key (it will be saved)

**In CLI Mode:**

You'll see this error if:

- No API key in config file (`~/.memograph/config.json`)
- No API key environment variable is set
- No `--llm-api-key` flag is provided

**Solutions:**

Option 1 - Use interactive mode to save the key (recommended):
\`\`\`bash
npx memograph-cli
# Select "Manage settings" → "Set/Update API Key"
\`\`\`

Option 2 - Set environment variable:
\`\`\`bash
# For OpenAI:
export OPENAI_API_KEY=sk-your-actual-key-here

# Or for Anthropic:
export ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
\`\`\`

Option 3 - Use .env file:
\`\`\`bash
# Copy example file
cp .env.example .env

# Edit .env and add your key
# For OpenAI:
OPENAI_API_KEY=sk-your-actual-key-here

# Or for Anthropic:
ANTHROPIC_API_KEY=sk-ant-your-actual-key-here
\`\`\`

Option 4 - Pass via CLI flag:
\`\`\`bash
memograph-cli inspect -i transcript.json --llm-api-key sk-...
\`\`\`

### Network and API issues

#### Connection timeout or network errors

LLM mode requires internet access (unless using local models). If you see:

- "ETIMEDOUT" or network errors
- Slow responses (>10s)

**Solutions:**

1. Check internet connection
2. For OpenAI: Verify status at https://status.openai.com
3. For Anthropic: Check https://status.anthropic.com
4. Use \`--llm-max-tokens 2048\` to reduce payload size
5. Try a different model (e.g., \`gpt-3.5-turbo\` instead of \`gpt-4o\`)

#### "Rate limit" errors

If you see "rate limit exceeded" from the API:

**Solutions:**

1. Reduce usage frequency
2. Use a different API tier/account
3. Switch to a local model (Ollama) - see "Using local models" section

#### Unexpected results

LLM analysis is non-deterministic (varies with temperature). If results are inconsistent:

\`\`\`bash
# Lower temperature for more deterministic output
memograph-cli inspect -i transcript.json --llm-temperature 0.1
\`\`\`

#### Local model (Ollama) not working

If using Ollama and getting errors:

**In Interactive Mode:**

1. Launch: `npx memograph-cli`
2. Select "Manage settings" → "Quick Setup (Wizard)"
3. Choose "Local / Self-hosted" → "Ollama"
4. Enter base URL: `http://localhost:11434/v1`
5. Enter model name: `llama3.2` (or your installed model)

**Verify Ollama is running:**

\`\`\`bash
# Start Ollama server
ollama serve

# In another terminal, check it's running
curl http://localhost:11434/api/tags
\`\`\`

**Common issues:**

1. **Wrong URL format:**
   - Correct: `http://localhost:11434/v1`
   - Some setups: `http://localhost:11434` (without `/v1`)

2. **Model not installed:**
   \`\`\`bash
   ollama pull llama3.2
   ollama list  # See installed models
   \`\`\`

3. **Model name case sensitivity:**
   - Use lowercase: `llama3.2`, not `Llama3.2`

4. **Port conflicts:**
   - Default port is 11434
   - Check with: `lsof -i :11434`

### General issues

#### How to reset everything

If you want to start fresh:

\`\`\`bash
# Delete saved settings
rm -rf ~/.memograph/config.json

# Launch interactive mode again
npx memograph-cli

# You'll be prompted to configure from scratch
\`\`\`

#### Where are my settings stored?

Settings location: `~/.memograph/config.json`

View current settings:

\`\`\`bash
# Pretty print
cat ~/.memograph/config.json | jq .

# Or without jq
cat ~/.memograph/config.json
\`\`\`

In interactive mode, select "Manage settings" → "Show raw config"

#### CLI flags vs saved settings priority

Priority order (highest to lowest):

1. **CLI flags** - Override everything
2. **Environment variables** - Used if no CLI flag
3. **Saved settings** (`~/.memograph/config.json`) - Default source
4. **Built-in defaults** - Fallback if nothing else is set

Example:

\`\`\`bash
# Saved settings: gpt-4o-mini
# CLI flag overrides saved settings
memograph-cli inspect -i file.json --llm-model gpt-4o
# Uses gpt-4o (CLI flag wins)
\`\`\`

---

## License

MIT License - see LICENSE file for details.
