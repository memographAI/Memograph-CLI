# Interactive Mode Guide

Memograph CLI now supports an **interactive mode with arrow key navigation** that makes it easy to configure settings and analyze transcripts without remembering command-line flags.

## Launching Interactive Mode

Simply run `memograph` without any arguments:

```bash
memograph
```

## Main Menu

When you launch interactive mode, you'll see:

```
╭─ Welcome to Memograph ───────────────────────────────────╮
│  Analyze conversation transcripts for memory drift   │
╰────────────────────────────────────────────────────────╯

╭─ Main Menu ──────────────────────────────────────────────────
│                                                           │
│   ▸ Inspect a transcript                                │
│     Manage settings                                     │
│     Exit                                                │
│                                                           │
╰────────────────────────────────────────────────────────────

  Use ↑/↓ arrows to move, Enter to select
```

**Navigation:**
- Use `↑` (up) and `↓` (down) arrow keys to highlight options
- Press `Enter` to select the highlighted option
- Press `Ctrl+C` to exit the application
- Press `Esc` to cancel current action
- Selected option is highlighted in **cyan** color

## Option 1: Inspect a Transcript

Choose this option to analyze a transcript file:

1. **Use ↑/↓ arrows** to select "Inspect a transcript"
2. **Press Enter** to confirm selection
3. **Enter path** to your transcript JSON file
4. **Use ↑/↓ arrows** to choose output format (Text or JSON)
5. **Analysis runs automatically** with progress indicators
6. **Results displayed** in your chosen format
7. **Press Enter** to return to main menu

### Example Flow

```
  Use ↑/↓ arrows to move, Enter to select
Select option: [highlighting Inspect a transcript]

Enter path to transcript file: ./transcript.json

╭─ Output Format ──────────────────────────────────────────────────
│                                                           │
│   ▸ Text (human-readable)                           │
│     JSON (machine-readable)                           │
│                                                           │
╰────────────────────────────────────────────────────────────

  Use ↑/↓ arrows to move, Enter to select

✓ Loading transcript...
✓ Loaded transcript with 23 messages
✓ Extracting facts using LLM...
✓ Detecting drift patterns...
✓ Analysis complete!

=== Memograph Inspect Report ===
Drift Score: 25/100
[... full report ...]

Press Enter to return to main menu...
```

## Option 2: Manage Settings

Configure your LLM settings using arrow keys:

```
╭─ Current Settings ─────────────────────────────────────╮
│                                               │
│  ◆ LLM Provider:  openai                       │
│  ◆ LLM Model:      gpt-4o-mini                 │
│  ◆ Temperature:    0.3                          │
│  ◆ Max Tokens:     4096                         │
│  ◆ Base URL:       (default)                     │
│  ◆ API Key:        ••••••••••••              │
│                                               │
╰──────────────────────────────────────────────────────╯

╭─ Settings ─────────────────────────────────────╮
│                                             │
│   ▸ Change LLM Provider                   │
│     Change LLM Model                      │
│     Change Temperature                     │
│     Change Max Tokens                     │
│     Change Base URL                       │
│     Set/Update API Key                    │
│     Show raw config                       │
│     Back to main menu                    │
│                                             │
╰───────────────────────────────────────────────╯

  Use ↑/↓ arrows to move, Enter to select, Ctrl+C to exit
```

### Available Settings

1. **Change LLM Provider**
   - Select between `OpenAI` and `Anthropic` using arrow keys
   - Model options change based on provider
   - Press Enter to confirm selection

2. **Change LLM Model**
   - Choose from recommended models using arrow keys
   - Or select "Custom..." to enter a custom model name
   - Press Enter to confirm selection

3. **Change Temperature**
   - Range: 0.0-1.0
   - Lower = more focused, Higher = more creative
   - Default: 0.3
   - Type the value and press Enter

4. **Change Max Tokens**
   - Maximum tokens in LLM response
   - Default: 4096
   - Type the value and press Enter

5. **Change Base URL**
   - For custom LLM endpoints (e.g., Ollama)
   - Type URL and press Enter
   - Press Enter (empty) to use default

6. **Set/Update API Key**
   - Enter your API key securely
   - Masked display for security
   - Type the key and press Enter

7. **Show Raw Config**
   - View current configuration as JSON
   - API key is masked
   - Press Enter to continue

## Option 3: Exit

Select "Exit" using arrow keys and press Enter to close interactive mode.

## Command-Line Mode (Still Available!)

The original CLI commands still work perfectly for scripts and power users:

```bash
# Inspect with default settings
memograph inspect -i transcript.json

# Inspect with custom settings
memograph inspect -i transcript.json \
  --llm-provider openai \
  --llm-model gpt-4o \
  --json

# Get help
memograph inspect --help

# Get version
memograph --version
```

## Environment Variables

Settings configured in interactive mode are **not persisted** between sessions. For persistent settings, use environment variables:

```bash
# Create .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...

# Or export in shell
export OPENAI_API_KEY=sk-...
```

## Tips

1. **First-time users**: Start with interactive mode to configure settings
2. **Regular use**: Use CLI commands with flags for speed
3. **API keys**: Set them once in `.env` file
4. **Model selection**: Start with `gpt-4o-mini` (fast, cost-effective)
5. **Troubleshooting**: Use "Show raw config" to verify settings

## Comparison: Interactive vs CLI

| Feature | Interactive Mode | CLI Mode |
|----------|-----------------|-----------|
| Easy to use | ✅ | ⚠️ (need to remember flags) |
| Arrow key navigation | ✅ (↑/↓ + Enter) | ❌ |
| Scripts/CI | ❌ | ✅ |
| Speed | ⚠️ (multiple prompts) | ✅ (one command) |
| Discoverability | ✅ (see all options) | ⚠️ (need --help) |
| Configuration | Session only | Flags + env vars |
| Error messages | Detailed | Concise |

## Examples

### Interactive Session

```bash
$ memograph
╭─ Welcome to Memograph ───────────────────────────────────╮
│  Analyze conversation transcripts for memory drift   │
╰────────────────────────────────────────────────────────╯

  Use ↑/↓ arrows to move, Enter to select
[User presses ↓, highlights "Manage settings"]
[User presses ↓, highlights "Exit"]
[User presses ↑, highlights "Manage settings"]
[User presses Enter]

Enter path to transcript file: transcript.json
[Menu appears for output format]
[User presses ↑/↓ to select "Text"]
[User presses Enter]

✓ Loading...
✓ Analysis complete!
[... report ...]
```

### CLI Command

```bash
$ memograph inspect -i transcript.json --json
{"drift_score": 25, "events": [...]}
```

Both produce the same results - choose based on your workflow!
