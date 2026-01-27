import { describe, it, expect } from 'vitest';
import { 
  normalizeText, 
  tokenize, 
  makeSignature, 
  jaccardSimilarity,
  areSimilar
} from '../src/core/normalize.js';

describe('normalizeText', () => {
  it('should lowercase text', () => {
    expect(normalizeText('HELLO')).toBe('hello');
    expect(normalizeText('HeLLo WoRLD')).toBe('hello world');
  });

  it('should trim whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
    expect(normalizeText('\thello\t')).toBe('hello');
  });

  it('should collapse multiple spaces', () => {
    expect(normalizeText('hello    world')).toBe('hello world');
    expect(normalizeText('hello   world   test')).toBe('hello world test');
  });

  it('should remove special characters', () => {
    expect(normalizeText('hello!')).toBe('hello');
    expect(normalizeText('hello, world!')).toBe('hello world');
    expect(normalizeText('hello-world')).toBe('helloworld');
    expect(normalizeText('hello@world.com')).toBe('helloworldcom');
  });

  it('should handle empty string', () => {
    expect(normalizeText('')).toBe('');
  });

  it('should handle special characters only', () => {
    expect(normalizeText('!!!@@@###')).toBe('');
  });
});

describe('tokenize', () => {
  it('should split text into words', () => {
    expect(tokenize('hello world')).toEqual(['hello', 'world']);
  });

  it('should handle multiple spaces', () => {
    expect(tokenize('hello   world   test')).toEqual(['hello', 'world', 'test']);
  });

  it('should filter empty tokens', () => {
    expect(tokenize('  ')).toEqual([]);
    expect(tokenize('')).toEqual([]);
  });

  it('should handle single word', () => {
    expect(tokenize('hello')).toEqual(['hello']);
  });

  it('should handle punctuation', () => {
    expect(tokenize('hello, world!')).toEqual(['hello,', 'world!']);
  });
});

describe('makeSignature', () => {
  it('should create signature from first N tokens', () => {
    const tokens = ['hello', 'world', 'this', 'is', 'a', 'test', 'of', 'signatures'];
    expect(makeSignature(tokens, 3)).toBe('hello world this');
  });

  it('should use default N=8', () => {
    const tokens = ['hello', 'world', 'this', 'is', 'a', 'test', 'of', 'signatures'];
    expect(makeSignature(tokens)).toBe(tokens.join(' '));
  });

  it('should handle fewer tokens than N', () => {
    const tokens = ['hello', 'world'];
    expect(makeSignature(tokens, 5)).toBe('hello world');
  });

  it('should handle empty tokens', () => {
    expect(makeSignature([])).toBe('');
  });
});

describe('jaccardSimilarity', () => {
  it('should return 1.0 for identical sets', () => {
    const set1 = new Set(['hello', 'world']);
    const set2 = new Set(['hello', 'world']);
    expect(jaccardSimilarity(set1, set2)).toBe(1.0);
  });

  it('should return 0.0 for disjoint sets', () => {
    const set1 = new Set(['hello', 'world']);
    const set2 = new Set(['foo', 'bar']);
    expect(jaccardSimilarity(set1, set2)).toBe(0.0);
  });

  it('should calculate partial overlap', () => {
    const set1 = new Set(['hello', 'world', 'test']);
    const set2 = new Set(['hello', 'world', 'different']);
    // Intersection: hello, world = 2
    // Union: hello, world, test, different = 4
    // Similarity: 2/4 = 0.5
    expect(jaccardSimilarity(set1, set2)).toBe(0.5);
  });

  it('should handle one empty set', () => {
    const set1 = new Set(['hello', 'world']);
    const set2 = new Set([]);
    expect(jaccardSimilarity(set1, set2)).toBe(0.0);
  });

  it('should handle both empty sets', () => {
    const set1 = new Set([]);
    const set2 = new Set([]);
    expect(jaccardSimilarity(set1, set2)).toBe(1.0);
  });

  it('should handle case sensitivity', () => {
    const set1 = new Set(['Hello', 'World']);
    const set2 = new Set(['hello', 'world']);
    expect(jaccardSimilarity(set1, set2)).toBe(0.0);
  });

  it('should calculate correct similarity for real-world example', () => {
    const set1 = new Set(['i', 'need', 'help', 'with', 'my', 'code']);
    const set2 = new Set(['i', 'need', 'help', 'with', 'coding']);
    // Intersection: i, need, help, with = 4
    // Union: i, need, help, with, my, code, coding = 7
    // Similarity: 4/7 ≈ 0.571
    expect(jaccardSimilarity(set1, set2)).toBeCloseTo(0.571, 2);
  });
});

describe('areSimilar', () => {
  it('should return true for identical token arrays', () => {
    const tokens1 = ['hello', 'world'];
    const tokens2 = ['hello', 'world'];
    expect(areSimilar(tokens1, tokens2)).toBe(true);
  });

  it('should return false for dissimilar token arrays', () => {
    const tokens1 = ['hello', 'world'];
    const tokens2 = ['foo', 'bar'];
    expect(areSimilar(tokens1, tokens2)).toBe(false);
  });

  it('should use default threshold of 0.65', () => {
    const tokens1 = ['hello', 'world', 'test'];
    const tokens2 = ['hello', 'world', 'different'];
    // Jaccard similarity = 0.5, which is below 0.65
    expect(areSimilar(tokens1, tokens2)).toBe(false);
  });

  it('should respect custom threshold', () => {
    const tokens1 = ['hello', 'world', 'test'];
    const tokens2 = ['hello', 'world', 'different'];
    // With threshold 0.5, similarity 0.5 should pass
    expect(areSimilar(tokens1, tokens2, 0.5)).toBe(true);
  });

  it('should handle empty arrays', () => {
    const tokens1: string[] = [];
    const tokens2: string[] = [];
    expect(areSimilar(tokens1, tokens2)).toBe(true);
  });

  it('should handle one empty array', () => {
    const tokens1 = ['hello', 'world'];
    const tokens2: string[] = [];
    expect(areSimilar(tokens1, tokens2)).toBe(false);
  });

  it('should be case sensitive', () => {
    const tokens1 = ['Hello', 'World'];
    const tokens2 = ['hello', 'world'];
    expect(areSimilar(tokens1, tokens2)).toBe(false);
  });
});
