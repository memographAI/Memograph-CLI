import { readdirSync } from 'fs';
import path from 'path';
import { homedir } from 'os';
import type readline from 'readline';

type DirectoryEntry = {
  name: string;
  isDirectory: boolean;
};

type ReadDirectoryFn = (directory: string) => DirectoryEntry[];

interface PathCompleterOptions {
  cwd?: string;
  homeDirectory?: string;
  readDirectory?: ReadDirectoryFn;
}

export interface PathCandidate {
  value: string;
  isDirectory: boolean;
}

export interface ResolvePathCandidatesOptions {
  cwd?: string;
  homeDirectory?: string;
  readDirectory?: ReadDirectoryFn;
}

interface SplitInput {
  directoryPrefix: string;
  fragment: string;
}

function splitPathInput(input: string): SplitInput {
  if (input === '~') {
    return {
      directoryPrefix: '~/',
      fragment: '',
    };
  }

  const lastSlash = input.lastIndexOf('/');
  if (lastSlash === -1) {
    return {
      directoryPrefix: '',
      fragment: input,
    };
  }

  return {
    directoryPrefix: input.slice(0, lastSlash + 1),
    fragment: input.slice(lastSlash + 1),
  };
}

function toAbsoluteDirectory(directoryPrefix: string, cwd: string, homeDirectory: string): string {
  if (!directoryPrefix) {
    return cwd;
  }

  if (directoryPrefix.startsWith('~/')) {
    return path.resolve(homeDirectory, directoryPrefix.slice(2));
  }

  if (path.isAbsolute(directoryPrefix)) {
    return path.resolve(directoryPrefix);
  }

  return path.resolve(cwd, directoryPrefix);
}

function shouldIncludeEntry(entryName: string, fragment: string): boolean {
  if (!entryName.startsWith(fragment)) {
    return false;
  }

  const startsHidden = entryName.startsWith('.');
  const userAskedHidden = fragment.startsWith('.');
  if (startsHidden && !userAskedHidden) {
    return false;
  }

  return true;
}

function rankCompletion(candidate: string, isDirectory: boolean): number {
  if (isDirectory) {
    return 1;
  }

  if (candidate.toLowerCase().endsWith('.json')) {
    return 0;
  }

  return 2;
}

function defaultReadDirectory(directory: string): DirectoryEntry[] {
  const entries = readdirSync(directory, { withFileTypes: true });
  return entries.map((entry) => ({
    name: entry.name,
    isDirectory: entry.isDirectory(),
  }));
}

export function resolvePathCandidates(
  input: string,
  options: ResolvePathCandidatesOptions = {}
): PathCandidate[] {
  const cwd = options.cwd ?? process.cwd();
  const homeDirectory = options.homeDirectory ?? homedir();
  const readDirectory = options.readDirectory ?? defaultReadDirectory;
  const { directoryPrefix, fragment } = splitPathInput(input);
  const absoluteDirectory = toAbsoluteDirectory(directoryPrefix, cwd, homeDirectory);

  let directoryEntries: DirectoryEntry[] = [];
  try {
    directoryEntries = readDirectory(absoluteDirectory);
  } catch {
    return [];
  }

  return directoryEntries
    .filter((entry) => shouldIncludeEntry(entry.name, fragment))
    .map((entry) => {
      const suffix = entry.isDirectory ? '/' : '';
      const value = `${directoryPrefix}${entry.name}${suffix}`;
      return {
        value,
        isDirectory: entry.isDirectory,
        rank: rankCompletion(value, entry.isDirectory),
      };
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.value.localeCompare(b.value);
    })
    .map(({ value, isDirectory }) => ({ value, isDirectory }));
}

export function nextCycleIndex(current: number | null, total: number): number | null {
  if (total <= 0) {
    return null;
  }

  if (current === null || current < 0 || current >= total - 1) {
    return 0;
  }

  return current + 1;
}

/**
 * Create a readline-compatible path completer for transcript file inputs.
 */
export function createPathCompleter(options: PathCompleterOptions = {}): readline.Completer {
  return (line: string): readline.CompleterResult => {
    const matches = resolvePathCandidates(line, options).map((entry) => entry.value);

    return [matches, line];
  };
}
