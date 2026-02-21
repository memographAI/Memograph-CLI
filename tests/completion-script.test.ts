import { describe, it, expect } from 'vitest';
import { getCompletionScript } from '../src/completion/shell.js';

describe('getCompletionScript', () => {
  it('returns bash script with file completion for --input', () => {
    const script = getCompletionScript('bash');
    expect(script).toContain('_memograph_completion');
    expect(script).toContain('compgen -f');
    expect(script).toContain('compopt -o filenames -o nospace');
    expect(script).toContain('--input');
  });

  it('returns zsh script with _files completion for --input', () => {
    const script = getCompletionScript('zsh');
    expect(script).toContain('#compdef memograph');
    expect(script).toContain('_files -/');
    expect(script).toContain('--input');
  });

  it('returns fish script with file completion for --input', () => {
    const script = getCompletionScript('fish');
    expect(script).toContain('complete -c memograph');
    expect(script).toContain('-s i -l input');
    expect(script).toContain('-F');
  });
});
