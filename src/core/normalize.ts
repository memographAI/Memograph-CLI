/**
 * Text normalization and similarity utilities
 */

/**
 * Normalize text for comparison
 * - Lowercase
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove special characters
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '');
}

/**
 * Tokenize text into words
 */
export function tokenize(text: string): string[] {
  return text
    .split(/\s+/)
    .filter(token => token.length > 0);
}

/**
 * Create a signature from first N tokens
 * Used for bucketing to enable O(n) similarity detection
 */
export function makeSignature(tokens: string[], n = 8): string {
  return tokens.slice(0, n).join(' ');
}

/**
 * Calculate Jaccard similarity between two sets
 * Returns value between 0 (no overlap) and 1 (identical)
 */
export function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) {
    return 1.0;
  }
  if (a.size === 0 || b.size === 0) {
    return 0.0;
  }

  const intersection = new Set([...a].filter(x => b.has(x)));
  const union = new Set([...a, ...b]);

  return intersection.size / union.size;
}

/**
 * Check if two token sets are similar above threshold
 */
export function areSimilar(
  tokens1: string[],
  tokens2: string[],
  threshold = 0.65
): boolean {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  return jaccardSimilarity(set1, set2) >= threshold;
}
