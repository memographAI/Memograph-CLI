# Contributing to Memograph CLI

Thank you for your interest in contributing to Memograph CLI! This document provides technical details about how the tool works internally and guidelines for development.

---

## How It Works

### Detection Rules

Memograph uses **LLM-based semantic analysis** to detect memory drift patterns with AI understanding of context and meaning.

#### Repetition clusters

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

#### Session reset

**Goal:** detect assistant statements that imply it "forgot" or restarted.

**Example patterns** (heuristic):

- "new chat"
- "let's start over"
- "from scratch"
- "forget everything"

This is a high-severity signal when it happens.

#### Preference forgotten

**Goal:** detect when the user repeats a preference much later, implying it was not retained.

**Approach:**

- Extract preference facts (e.g., language, tone)
- Group by (fact_key, fact_value)
- If the same preference is restated far apart (last_idx - first_idx >= 5), trigger event

You can improve this later by checking assistant behavior in between.

#### Contradictions

**Goal:** detect conflicting extracted facts over time.

**Approach:**

- Track last seen value per fact key
- When value changes → contradiction signal

**Example:**

- `identity:name = tusher` later becomes `identity:name = jane` → flagged

---

### Scoring Algorithm

Drift score is a simple weighted sum (clamped to 0–100):

**Default weights:**

- `preference_forgotten`: +15
- `repetition_cluster`: +10
- `session_reset`: +20
- `contradiction`: +10

**Implementation detail:**

- `raw_score`: sum of weights
- `drift_score`: clamp raw to [0..100]

#### Token waste %

Estimated as:

- `total_tokens`: sum of tokens across all messages (estimated if missing)
- `waste_tokens`: tokens in user messages that appear in repetition clusters
- `token_waste_pct = waste_tokens / total_tokens * 100`

This is a proxy, not billing-grade accounting.

---

### Performance & Scaling

**Goals**

- Keep inspection fast and predictable.
- Avoid quadratic comparisons.

**Techniques used**

- Bucketing signatures for repetition clusters
- `--max-messages` to cap work
- Lightweight normalization and heuristics
- Minimal allocations and stable sorting

**If transcripts are huge**

Recommended:

- start with `--max-messages 1000`
- later add streaming parse for extremely large JSON
- move heavy clustering to a Worker Thread if you hit CPU stalls

---

## Development

### Local Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/memograph-cli
cd memograph-cli
npm install
```

### Project Structure

```
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
  interactive/
    index.ts                  # interactive mode main menu
    wizard.ts                 # setup wizard
    settings.ts               # settings persistence
tests/
  fixtures/
    sample.json
    clean.json
    invalid.json
  render.test.ts
```

### Scripts

```bash
npm run dev       # run via tsx (no build)
npm run build     # tsc build to dist/
npm run test      # vitest
npm start         # run dist/cli.js
```

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

**Running tests:**

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Run specific test file
npx vitest tests/score.test.ts
```

---

## Publishing

### Package.json essentials

- Provide a bin entry:

```json
"bin": { "memograph-cli": "./dist/cli.js" }
```

This makes the command `memograph-cli` available when installed globally or via npx.

- Make sure dist/ is included in package files:

```json
"files": ["dist", "README.md", "LICENSE"]
```

### Publishing to npm

```bash
# Login to npm
npm login

# Build the project
npm run build

# Publish
npm publish
```

### Version Management

Follow semantic versioning:

- **Patch** (0.1.x): Bug fixes, minor improvements
- **Minor** (0.x.0): New features, backwards compatible
- **Major** (x.0.0): Breaking changes

Update version in `package.json` before publishing:

```bash
npm version patch  # 0.1.0 -> 0.1.1
npm version minor  # 0.1.0 -> 0.2.0
npm version major  # 0.1.0 -> 1.0.0
```

---

## Roadmap

### High-value upgrades

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
   - `--redact` for keys/emails/phones
   - `--no-snippets` mode for strict privacy

5. **Export**
   - `memograph export --format memograph` (canonical transcript converter)

6. **CI integration**
   - GitHub Action wrapper
   - threshold checks: fail if drift_score > N

### Interactive Mode Improvements

- Save analysis history
- Compare multiple transcripts
- Export reports to different formats (PDF, HTML)
- Real-time analysis mode (watch file)

### LLM Integration

- Support more providers (Cohere, Google AI, Mistral)
- Streaming responses for large transcripts
- Cost tracking and estimation
- Model comparison mode

---

## Privacy & Security

- Memograph CLI uses LLM-based analysis for semantic understanding
- Calls external LLM APIs (OpenAI/Anthropic) or local models (Ollama)
- It reads from local files and prints to stdout

**API Key Security:**

- API keys are loaded from environment variables or CLI flags (not stored in code)
- Never hardcode API keys in code or commit them to git
- Use `--llm-api-key` sparingly; prefer environment variables
- Add `/.env` to `.gitignore` to avoid accidentally committing keys

**Future redaction features:**

- implement `--redact` to mask emails/phones/keys
- keep raw data out of JSON outputs by default for safer CI logs

---

## Contributing Guidelines

### Code Style

- Use TypeScript strict mode
- Follow existing code formatting
- Add JSDoc comments for public APIs
- Write tests for new features

### Pull Request Process

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes with clear commit messages
4. Add tests for new functionality
5. Run tests: `npm test`
6. Build: `npm run build`
7. Submit a pull request

### Commit Message Format

Use clear, descriptive commit messages:

```
feat: add support for custom LLM providers
fix: correct drift score calculation for edge cases
docs: update setup wizard documentation
test: add tests for repetition detection
```

### Bug Reports

When reporting bugs, please include:

- Memograph CLI version (`memograph-cli --version`)
- Node.js version (`node --version`)
- Operating system
- Steps to reproduce
- Expected vs actual behavior
- Sample transcript (if possible, without sensitive data)

---

## License

MIT License - see LICENSE file for details.
