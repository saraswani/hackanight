import { describe, it, expect, beforeAll } from 'vitest';
import { encryptDocument, decryptDocument, computeSearchToken, computePostingListCommitment, generateKeyMaterial } from '../index';

describe('End-to-End SSE Integration (Simulated Server)', () => {
  let documentKey: CryptoKey;
  let searchKey: CryptoKey;

  beforeAll(async () => {
    const keys = await generateKeyMaterial();
    documentKey = keys.documentKey;
    searchKey = keys.searchKey;
  });
  
  // A mock server state
  const mockServerDb: {
    documents: Record<string, { ciphertext: string, nonce: string }>;
    index: Record<string, string[]>;
  } = {
    documents: {},
    index: {},
  };

  const mockServerUpload = (id: string, ciphertext: string, nonce: string, indexUpdates: Record<string, string[]>) => {
    mockServerDb.documents[id] = { ciphertext, nonce };
    for (const [token, ids] of Object.entries(indexUpdates)) {
      const existing = mockServerDb.index[token] || [];
      mockServerDb.index[token] = Array.from(new Set([...existing, ...ids])).sort();
    }
  };

  const mockServerSearch = (tokens: string[], operator: 'AND' | 'OR') => {
    const results: Record<string, string[]> = {};
    for (const token of tokens) {
      results[token] = mockServerDb.index[token] || [];
    }

    let finalIds: string[] = [];
    if (tokens.length > 0) {
      if (operator === "AND") {
        finalIds = results[tokens[0]];
        for (let i = 1; i < tokens.length; i++) {
          finalIds = finalIds.filter(id => results[tokens[i]].includes(id));
        }
      } else if (operator === "OR") {
        const all = new Set<string>();
        for (const token of tokens) {
          results[token].forEach(id => all.add(id));
        }
        finalIds = Array.from(all).sort();
      }
    }
    
    return { results, finalIds };
  };

  it('verifies standard Boolean AND search logic', async () => {
    const tHello = await computeSearchToken(searchKey, "hello");
    const tWorld = await computeSearchToken(searchKey, "world");
    mockServerUpload("doc-1", "mock-enc", "mock-nonce", { [tHello]: ["doc-1"], [tWorld]: ["doc-1"] });
    mockServerUpload("doc-2", "mock-enc", "mock-nonce", { [tHello]: ["doc-2"] });

    const res = mockServerSearch([tHello, tWorld], 'AND');
    
    // Server should correctly perform the AND operation
    expect(res.finalIds).toEqual(["doc-1"]);
    // Client can independently verify results
    expect(res.results[tHello]).toEqual(["doc-1", "doc-2"]);
    expect(res.results[tWorld]).toEqual(["doc-1"]);
  });

  it('detects omitted or modified results (Attack simulation)', async () => {
    const token = await computeSearchToken(searchKey, "test");
    mockServerUpload("doc-1", "enc1", "nonce1", { [token]: ["doc-1"] });
    mockServerUpload("doc-2", "enc2", "nonce2", { [token]: ["doc-2"] });

    // Client computes trusted commitment for this token's IDs ["doc-1", "doc-2"]
    const trustedCommitment = await computePostingListCommitment(["doc-1", "doc-2"]);

    // Honest server search
    const resHonest = mockServerSearch([token], 'AND');
    const honestCommitment = await computePostingListCommitment(resHonest.results[token]);
    expect(honestCommitment).toBe(trustedCommitment);

    // Malicious server search (Omit doc-2)
    const maliciousResults = { [token]: ["doc-1"] }; 
    const maliciousCommitment = await computePostingListCommitment(maliciousResults[token]);
    
    // Verifier catches it
    expect(maliciousCommitment).not.toBe(trustedCommitment);
  });

  it('supports substring search using character n-grams', async () => {
    // We index the word "confidential"
    const word = "confidential";
    const trigram1 = await computeSearchToken(searchKey, "3g:con");
    const trigram2 = await computeSearchToken(searchKey, "3g:onf");
    const trigram3 = await computeSearchToken(searchKey, "3g:nfi");
    const trigram4 = await computeSearchToken(searchKey, "3g:fid");
    
    mockServerUpload("doc-1", "enc", "nonce", {
      [await computeSearchToken(searchKey, word)]: ["doc-1"],
      [trigram1]: ["doc-1"],
      [trigram2]: ["doc-1"],
      [trigram3]: ["doc-1"],
      [trigram4]: ["doc-1"],
    });

    // We search for "confid" which breaks down into just trigrams (isQuery=true means word >= 3 is dropped)
    const queryTokens = [
      trigram1, trigram2, trigram3, trigram4
    ];

    const res = mockServerSearch(queryTokens, 'AND');
    expect(res.finalIds).toEqual(["doc-1"]);
  });
});
