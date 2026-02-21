# Memograph CLI

Detect **memory drift** in AI conversation transcripts. Find where assistants forget facts, contradict themselves, ignore preferences, or force users to repeat instructions.

Works out of the box — no API keys or configuration required.

## Install

### Run instantly (no install)

```bash
npx @memograph/cli
```

### Install globally

```bash
npm i -g @memograph/cli
```

After install, the command is `memograph`.

## Usage

### Interactive mode (recommended)

```bash
memograph
```

Launches a guided menu where you can load transcripts, view results, and manage settings — all with arrow-key navigation.

When choosing **Enter file path**, interactive completion works like this:
- `Tab` cycles through matching path suggestions.
- `/` commits the selected directory and opens suggestions for the next segment.
- `Enter` on a selected directory drills into it; `Enter` on a file confirms it.
- Suggestions are redrawn in place below the input instead of printing repeatedly.

### CLI mode (for scripts and automation)

```bash
# Analyze a transcript file
memograph inspect -i ./transcript.json

# JSON output (pipe to jq, save to file, etc.)
memograph inspect -i ./transcript.json --json

# Limit messages processed
memograph inspect -i ./transcript.json --max-messages 100
```

## Transcript format

Create a `.json` file with this structure:

```json
{
  "schema_version": "1.0",
  "messages": [
    { "idx": 0, "role": "user", "content": "My name is Tusher" },
    { "idx": 1, "role": "assistant", "content": "Nice to meet you, Tusher!" },
    { "idx": 2, "role": "user", "content": "Please reply in Bangla from now on" },
    { "idx": 3, "role": "assistant", "content": "Sure, I'll use English." },
    { "idx": 4, "role": "user", "content": "Reply in Bangla please (I told you before)" },
    { "idx": 5, "role": "assistant", "content": "I'll use Bangla from now on." }
  ]
}
```

Each message needs:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `idx` | number | Yes | Message index (0-based) |
| `role` | string | Yes | `"user"`, `"assistant"`, `"system"`, or `"tool"` |
| `content` | string | Yes | Message text |
| `ts` | string | No | ISO timestamp |
| `tokens` | number | No | Token count (estimated automatically if omitted) |

You can also pass a plain array of messages without the wrapper object, or even raw text — the CLI handles normalization.

## What it detects

| Drift type | Description |
|------------|-------------|
| **Contradiction** | Assistant states conflicting facts (e.g., calls user Alice, then Bob) |
| **Preference forgotten** | User repeats a preference the assistant already heard |
| **Repetition cluster** | User forced to re-ask the same question multiple times |
| **Session reset** | Assistant behaves as if conversation history was lost |

## Example output

```
=== Memograph Inspect Report ===
Drift Score: 65/100 (raw: 65)
Token Waste: 18.2%

Critical Events:
- [contradiction] sev=4 conf=0.90 idx=0,2
  User identified as "Alice" at idx 0, then "Bob" at idx 2
- [preference_forgotten] sev=3 conf=0.85 idx=2,4
  User repeated language preference (Bangla) that was previously stated

Should-have-been memory (top):
- identity:name="Tusher" @0 (conf 0.95)
- pref:language="Bangla" @2 (conf 0.90)
```

## CLI options

```
memograph inspect -i <path> [options]

Options:
  -i, --input <path>           Path to transcript JSON file (required)
  --json                       Output JSON instead of human-readable text
  --max-messages <n>           Cap number of messages processed (default: 2000)
  --analyze-mode <mode>        Analysis mode: "hosted" or "llm"
  --api-url <url>              Custom analyze API URL
  --api-timeout-ms <ms>        API request timeout in milliseconds
  --api-retries <n>            Number of API retries on failure
  --llm-provider <provider>    LLM provider (openai, anthropic, etc.)
  --llm-model <model>          LLM model name
  --llm-api-key <key>          LLM API key
  --llm-base-url <url>         Custom LLM base URL (e.g., for Ollama)
  --llm-temperature <temp>     LLM temperature (0.0-1.0, default: 0.3)
  --llm-max-tokens <tokens>    Max tokens for LLM response (default: 4096)
```

## Shell completion

Generate and install completion for your shell:

### Bash

```bash
memograph completion bash > ~/.memograph-completion.bash
echo 'source ~/.memograph-completion.bash' >> ~/.bashrc
source ~/.bashrc
```

### Zsh

```bash
mkdir -p ~/.zsh/completions
memograph completion zsh > ~/.zsh/completions/_memograph
echo 'fpath=(~/.zsh/completions $fpath)' >> ~/.zshrc
echo 'autoload -Uz compinit && compinit' >> ~/.zshrc
source ~/.zshrc
```

### Fish

```bash
mkdir -p ~/.config/fish/completions
memograph completion fish > ~/.config/fish/completions/memograph.fish
```

Optional shell UX tweaks for menu-style cycling:
- **Bash (`~/.inputrc`)**:
  ```bash
  TAB: menu-complete
  set show-all-if-ambiguous on
  ```
- **Zsh (`~/.zshrc`)**:
  ```bash
  bindkey '^I' menu-complete
  ```

## Environment variables

| Variable | Description |
|----------|-------------|
| `MEMOGRAPH_ANALYZE_MODE` | Set to `llm` to use local LLM instead of hosted API |
| `MEMOGRAPH_ANALYZE_API_URL` | Override the default analyze API endpoint |
| `OPENAI_API_KEY` | OpenAI API key (for LLM mode) |
| `ANTHROPIC_API_KEY` | Anthropic API key (for LLM mode) |

## Requirements

- Node.js >= 18.0.0

## License

MIT
