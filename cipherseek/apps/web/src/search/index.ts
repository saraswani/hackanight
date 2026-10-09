export function normalizeText(text: string): string {
  // Normalize to NFKC to unify visually similar characters
  return text.normalize("NFKC").toLowerCase();
}

export function tokenizeText(text: string): string[] {
  const normalized = normalizeText(text);
  // Match words, numbers. Simple tokenization for the prototype.
  const words = normalized.match(/\b\w+\b/g) || [];
  
  // Return unique tokens
  return Array.from(new Set(words));
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
