import { describe, it, expect } from 'vitest';
import { createPathCompleter, nextCycleIndex, resolvePathCandidates } from '../src/interactive/path-completion.js';

describe('createPathCompleter', () => {
  it('completes from current directory and prioritizes json files', () => {
    const completer = createPathCompleter({
      cwd: '/workspace',
      homeDirectory: '/home/tester',
      readDirectory: (directory) => {
        if (directory !== '/workspace') {
          throw new Error('Unexpected directory');
        }

        return [
          { name: 'notes.txt', isDirectory: false },
          { name: 'transcript.json', isDirectory: false },
          { name: 'fixtures', isDirectory: true },
          { name: '.env', isDirectory: false },
        ];
      },
    });

    const [matches, line] = completer('');
    expect(line).toBe('');
    expect(matches).toEqual(['transcript.json', 'fixtures/', 'notes.txt']);
  });

  it('completes nested relative paths and keeps the typed prefix', () => {
    const completer = createPathCompleter({
      cwd: '/workspace',
      homeDirectory: '/home/tester',
      readDirectory: (directory) => {
        if (directory !== '/workspace/fixtures') {
          throw new Error('Unexpected directory');
        }

        return [
          { name: 'sample.json', isDirectory: false },
          { name: 'sandbox', isDirectory: true },
        ];
      },
    });

    const [matches, line] = completer('./fixtures/sa');
    expect(line).toBe('./fixtures/sa');
    expect(matches).toEqual(['./fixtures/sample.json', './fixtures/sandbox/']);
  });

  it('supports home-relative paths', () => {
    const completer = createPathCompleter({
      cwd: '/workspace',
      homeDirectory: '/home/tester',
      readDirectory: (directory) => {
        if (directory !== '/home/tester/docs') {
          throw new Error('Unexpected directory');
        }

        return [{ name: 'transcript.json', isDirectory: false }];
      },
    });

    const [matches] = completer('~/docs/tr');
    expect(matches).toEqual(['~/docs/transcript.json']);
  });

  it('returns no matches when directory cannot be read', () => {
    const completer = createPathCompleter({
      cwd: '/workspace',
      homeDirectory: '/home/tester',
      readDirectory: () => {
        throw new Error('Permission denied');
      },
    });

    const [matches, line] = completer('./missing/file');
    expect(line).toBe('./missing/file');
    expect(matches).toEqual([]);
  });
});

describe('resolvePathCandidates', () => {
  it('returns candidates with directory metadata', () => {
    const candidates = resolvePathCandidates('./data/tr', {
      cwd: '/workspace',
      homeDirectory: '/home/tester',
      readDirectory: (directory) => {
        if (directory !== '/workspace/data') {
          throw new Error('Unexpected directory');
        }

        return [
          { name: 'transcript.json', isDirectory: false },
          { name: 'traces', isDirectory: true },
        ];
      },
    });

    expect(candidates).toEqual([
      { value: './data/transcript.json', isDirectory: false },
      { value: './data/traces/', isDirectory: true },
    ]);
  });
});

describe('nextCycleIndex', () => {
  it('starts at first candidate when cycle begins', () => {
    expect(nextCycleIndex(null, 3)).toBe(0);
  });

  it('advances to the next index', () => {
    expect(nextCycleIndex(0, 3)).toBe(1);
  });

  it('wraps back to first candidate after reaching the end', () => {
    expect(nextCycleIndex(2, 3)).toBe(0);
  });

  it('returns null when there are no candidates', () => {
    expect(nextCycleIndex(null, 0)).toBeNull();
  });
});
