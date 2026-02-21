import * as readline from 'readline';
import { nextCycleIndex, resolvePathCandidates, type PathCandidate } from './path-completion.js';

interface PromptPathOptions {
  prompt: string;
  maxSuggestions?: number;
}

function isPrintable(input: string): boolean {
  if (!input) {
    return false;
  }

  const code = input.charCodeAt(0);
  return code >= 32 && code !== 127;
}

function renderSuggestionLine(candidate: PathCandidate, isActive: boolean): string {
  const marker = isActive ? '›' : ' ';
  const kind = candidate.isDirectory ? 'dir' : 'file';
  return `${marker} ${candidate.value} (${kind})`;
}

export function promptPathWithCycleAutocomplete(options: PromptPathOptions): Promise<string> {
  const { prompt, maxSuggestions = 8 } = options;

  return new Promise((resolve) => {
    const stdin = process.stdin;
    const stdout = process.stdout;
    const wasRaw = Boolean((stdin as NodeJS.ReadStream & { isRaw?: boolean }).isRaw);

    let rawInput = '';
    let tabBaseInput: string | null = null;
    let activeIndex: number | null = null;
    let tabCandidates: PathCandidate[] = [];
    let suggestions: PathCandidate[] = resolvePathCandidates(rawInput);

    const getDisplayedInput = (): string => {
      if (tabBaseInput !== null && activeIndex !== null && tabCandidates[activeIndex]) {
        return tabCandidates[activeIndex].value;
      }
      return rawInput;
    };

    const cancelTabCycle = () => {
      tabBaseInput = null;
      activeIndex = null;
      tabCandidates = [];
    };

    const syncSuggestions = () => {
      suggestions = resolvePathCandidates(rawInput);
    };

    const render = () => {
      const displayedInput = getDisplayedInput();
      const visibleSuggestions = (tabBaseInput !== null ? tabCandidates : suggestions).slice(0, maxSuggestions);

      readline.cursorTo(stdout, 0);
      readline.clearScreenDown(stdout);
      stdout.write(`${prompt}${displayedInput}\n`);

      for (let i = 0; i < visibleSuggestions.length; i += 1) {
        const candidate = visibleSuggestions[i];
        const isActive = tabBaseInput !== null && activeIndex === i;
        stdout.write(`${renderSuggestionLine(candidate, isActive)}\n`);
      }

      readline.moveCursor(stdout, 0, -(visibleSuggestions.length + 1));
      readline.cursorTo(stdout, prompt.length + displayedInput.length);
    };

    const cleanup = () => {
      stdin.removeListener('data', onData);
      if (stdin.setRawMode) {
        stdin.setRawMode(wasRaw);
      }
      if (!wasRaw) {
        stdin.pause();
      }
    };

    const finalize = (value: string) => {
      cleanup();
      readline.cursorTo(stdout, 0);
      readline.clearScreenDown(stdout);
      stdout.write(`${prompt}${value}\n`);
      resolve(value);
    };

    const commitActiveCandidate = (): PathCandidate | null => {
      if (tabBaseInput === null || activeIndex === null || !tabCandidates[activeIndex]) {
        return null;
      }
      return tabCandidates[activeIndex];
    };

    const onData = (chunk: Buffer) => {
      const key = chunk.toString('utf8');

      if (key === '\u0003') {
        cleanup();
        stdout.write('\n👋 Goodbye!\n');
        process.exit(0);
      }

      if (key === '\u001b[A' || key === '\u001b[B') {
        if (tabBaseInput !== null && tabCandidates.length > 0) {
          const direction = key === '\u001b[A' ? -1 : 1;
          const total = tabCandidates.length;
          const start = activeIndex ?? 0;
          const next = (start + direction + total) % total;
          activeIndex = next;
          render();
        }
        return;
      }

      if (key === '\t') {
        if (tabBaseInput === null) {
          tabBaseInput = rawInput;
          tabCandidates = resolvePathCandidates(tabBaseInput);
          activeIndex = null;
        }

        activeIndex = nextCycleIndex(activeIndex, tabCandidates.length);
        render();
        return;
      }

      if (key === '\r' || key === '\n') {
        const selected = commitActiveCandidate();
        if (selected?.isDirectory) {
          rawInput = selected.value;
          cancelTabCycle();
          syncSuggestions();
          render();
          return;
        }

        if (selected) {
          rawInput = selected.value;
          cancelTabCycle();
        }

        finalize(rawInput.trim());
        return;
      }

      if (key === '\u007f') {
        const selected = commitActiveCandidate();
        if (selected) {
          rawInput = selected.value;
          cancelTabCycle();
        }
        rawInput = rawInput.slice(0, -1);
        syncSuggestions();
        render();
        return;
      }

      if (key === '/') {
        const selected = commitActiveCandidate();
        if (selected) {
          rawInput = selected.value;
          cancelTabCycle();
        }

        if (!rawInput.endsWith('/')) {
          rawInput += '/';
        }

        syncSuggestions();
        render();
        return;
      }

      if (isPrintable(key)) {
        const selected = commitActiveCandidate();
        if (selected) {
          rawInput = selected.value;
          cancelTabCycle();
        }
        rawInput += key;
        syncSuggestions();
        render();
      }
    };

    if (stdin.setRawMode) {
      stdin.setRawMode(true);
    }
    stdin.resume();
    stdin.on('data', onData);
    render();
  });
}
