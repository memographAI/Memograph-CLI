# Memograph-CLI

Memograph CLI tool.

# Memograph CLI (Node.js) — Memory Drift Inspector

An **LLM-powered** CLI tool that analyzes conversation transcripts and outputs a **memory drift report**: repetitions, preference "forgotten" signals, session resets, contradictions, and a simple drift score.  
Uses **AI models for semantic understanding** to detect subtle context loss and memory drift patterns.

---

## Table of Contents

- [What it does](#what-it-does)
- [Why this exists](#why-this-exists)
- [Install](#install)
- [Quickstart](#quickstart)
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

## Install

### Option A: Use locally in a repo (recommended during development)

\`\`\`bash
git clone <your-repo>
cd memograph-cli
npm install
npm run build
node dist/cli.js inspect -i ./tests/fixtures/sample.json
\`\`\`

### Option B: Install globally (after publishing to npm)

\`\`\`bash
npm i -g memograph
memograph inspect -i ./transcript.json
\`\`\`

### Option C: No-install via npx (after publishing)

\`\`\`bash
npx memograph inspect -i ./transcript.json
\`\`\`

---

## Quickstart

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

2. Run inspect:

\`\`\`bash
memograph inspect -i transcript.json
\`\`\`

3. Or JSON output for CI:

\`\`\`bash
memograph inspect -i transcript.json --json
\`\`\`

---

## Commands

### inspect

Analyze a transcript for drift and repetition using LLM-based semantic analysis.

**Usage**

\`\`\`bash
memograph inspect -i <path> [--json] [--max-messages N]
\`\`\`

**Options**

- \`-i, --input <path>\`: path to transcript JSON (required)
- \`--json\`: output JSON (machine-readable)
- \`--max-messages <n>\`: cap number of messages processed (default: 2000)
- \`--llm-provider <provider>\`: LLM provider: \`openai\` or \`anthropic\` (default: openai)
- \`--llm-model <model>\`: LLM model (e.g., gpt-4o-mini, claude-3-5-sonnet-20241022)
- \`--llm-api-key <key>\`: API key (or set OPENAI_API_KEY/ANTHROPIC_API_KEY env var)
- \`--llm-base-url <url>\`: Custom base URL (for local models like Ollama)
- \`--llm-temperature <temp>\`: LLM temperature 0.0-1.0 (default: 0.3)
- \`--llm-max-tokens <tokens>\`: Max tokens in LLM response (default: 4096)

**Examples**

Text output:

\`\`\`bash
memograph inspect -i ./transcript.json
\`\`\`

Using Anthropic:

\`\`\`bash
memograph inspect -i ./transcript.json --llm-provider anthropic
\`\`\`

Using a local model (Ollama):

\`\`\`bash
memograph inspect -i ./transcript.json --llm-provider openai --llm-base-url http://localhost:11434/v1 --llm-model llama3.2
\`\`\`

JSON output:

\`\`\`bash
memograph inspect -i ./transcript.json --json
\`\`\`

Limit processing:

\`\`\`bash
memograph inspect -i ./big.json --max-messages 500
\`\`\`

---

### Setup

**Using cloud APIs (OpenAI/Anthropic):**

1. Copy \`.env.example\` to \`.env\`
2. Add your API key and preferred model:
   \`\`\`bash
   # For OpenAI
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your-key-here
   LLM_MODEL=gpt-4o-mini
   
   # Or for Anthropic
   LLM_PROVIDER=anthropic
   ANTHROPIC_API_KEY=your-key-here
   LLM_MODEL=claude-3-5-sonnet-20241022
   \`\`\`
3. Run analysis without specifying model:
   \`\`\`bash
   memograph inspect -i transcript.json
   \`\`\`

**Using local models (Ollama):**

You can use local LLMs like Ollama to avoid API costs and keep data local:

\`\`\`bash
# Install Ollama
brew install ollama  # macOS
# or download from ollama.ai

# Pull a model
ollama pull llama3.2

# Configure in .env
LLM_PROVIDER=openai
LLM_BASE_URL=http://localhost:11434/v1
LLM_MODEL=llama3.2

# Run without specifying model each time
memograph inspect -i transcript.json
\`\`\`

**Overriding defaults:**

You can temporarily override your `.env` settings with CLI flags:

\`\`\`bash
# Temporarily use gpt-4o instead of your default
memograph inspect -i transcript.json --llm-model gpt-4o

# Temporarily use Anthropic instead of OpenAI
memograph inspect -i transcript.json --llm-provider anthropic --llm-api-key your-key
\`\`\`

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
"bin": { "memograph": "./dist/cli.js" }
\`\`\`

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

### "API key not found" error

You'll see this error if:

- No API key environment variable is set
- No \`--llm-api-key\` flag is provided

**Solution:**

\`\`\`bash
# Copy example file
cp .env.example .env

# Edit .env and add your key
# For OpenAI:
OPENAI_API_KEY=your-actual-key-here

# Or for Anthropic:
ANTHROPIC_API_KEY=your-actual-key-here
\`\`\`

Then run again without \`--llm-api-key\`.

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
memograph inspect -i transcript.json --llm-temperature 0.1
\`\`\`

#### Local model (Ollama) not working

If using \`--llm-base-url http://localhost:11434/v1\` and getting errors:

**Solutions:**

1. Ensure Ollama is running:
   \`\`\`bash
   ollama serve
   # or check with: curl http://localhost:11434/api/tags
   \`\`\`

2. Verify the URL is correct:
   - Default: `http://localhost:11434/v1`
   - Some setups use: `http://localhost:11434` (without `/v1`)

3. Pull the model:
   \`\`\`bash
   ollama pull llama3.2
   \`\`\`

4. Check model name matches exactly:
   - Ollama uses lowercase (e.g., `llama3.2`, not `Llama3.2`)

---

## License

MIT License - see LICENSE file for details.
