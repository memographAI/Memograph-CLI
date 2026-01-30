# Memograph CLI

Quickly inspect conversation transcripts and detect memory drift in AI assistants.

## Install

### Option A: Run instantly (no install)

```bash
npx memograph-cli
```

### Option B: Install globally

```bash
npm i -g memograph-cli
```

After install, the command is `memograph`.

## Quickstart

### 1) Interactive mode (recommended)

```bash
# Launch the guided menu
npx memograph-cli
```

Follow the prompts to configure your AI provider and inspect a transcript.

### 2) CLI mode (for scripts)

```bash
# Inspect a transcript file
memograph inspect -i ./transcript.json

# JSON output (for automation)
memograph inspect -i ./transcript.json --json
```

### Example transcript format

```json
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
```

---

For help: `memograph --help`