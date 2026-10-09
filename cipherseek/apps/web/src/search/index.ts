export function normalizeText(text: string): string {
  // Normalize to NFKC to unify visually similar characters
  return text.normalize("NFKC").toLowerCase();
}

export function tokenizeText(text: string, isQuery: boolean = false): string[] {
  const normalized = normalizeText(text);
  // Match words, numbers. Simple tokenization for the prototype.
  const words = normalized.match(/\b\w+\b/g) || [];
  
  const tokens = new Set<string>();
  
  for (const word of words) {
    if (!isQuery || word.length < 3) {
      tokens.add(word); // Exact word match (indexed always, queried only if short)
    }
    
    // Character N-grams (trigrams) for substring search support
    if (word.length >= 3) {
      for (let i = 0; i <= word.length - 3; i++) {
        tokens.add(`3g:${word.substring(i, i + 3)}`);
      }
    }
  }
  
  return Array.from(tokens);
}

// Inverted index builder in memory
export function buildLocalInvertedIndex(documents: { id: string, content: string }[]) {
  const index: Record<string, Set<string>> = {};

  for (const doc of documents) {
    const tokens = tokenizeText(doc.content);
    for (const token of tokens) {
      if (!index[token]) {
        index[token] = new Set();
      }
      index[token].add(doc.id);
    }
  }

  // Convert sets to sorted arrays
  const finalIndex: Record<string, string[]> = {};
  for (const [token, ids] of Object.entries(index)) {
    finalIndex[token] = Array.from(ids).sort();
  }

  return finalIndex;
}
