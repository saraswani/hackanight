import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyMaterial, encryptDocument, decryptDocument, computeSearchToken, computePostingListCommitment } from '../index';

describe('Cryptographic Operations', () => {
  let docKey: CryptoKey;
  let srchKey: CryptoKey;

  beforeAll(async () => {
    const keys = await generateKeyMaterial();
    docKey = keys.documentKey;
    srchKey = keys.searchKey;
  });

  it('generates independent keys', () => {
    expect(docKey).toBeDefined();
    expect(srchKey).toBeDefined();
    expect(docKey).not.toBe(srchKey);
  });

  it('encrypts and decrypts a document successfully', async () => {
    const plaintext = "This is a confidential contract.";
    
    const encrypted = await encryptDocument(docKey, plaintext);
    expect(encrypted.ciphertext).toBeDefined();
    expect(encrypted.nonce).toBeDefined();
    expect(encrypted.fingerprint).toBeDefined();

    const decrypted = await decryptDocument(docKey, encrypted.ciphertext, encrypted.nonce);
    expect(decrypted).toBe(plaintext);
  });

  it('decryption with wrong key fails', async () => {
    const plaintext = "Secret";
    const encrypted = await encryptDocument(docKey, plaintext);
    
    const wrongKeys = await generateKeyMaterial();
    
    await expect(decryptDocument(wrongKeys.documentKey, encrypted.ciphertext, encrypted.nonce))
      .rejects.toThrow();
  });

  it('generates deterministic search tokens', async () => {
    const keyword = "vendor";
    const token1 = await computeSearchToken(srchKey, keyword);
    const token2 = await computeSearchToken(srchKey, keyword);
    
    expect(token1).toBe(token2);
    
    const token3 = await computeSearchToken(srchKey, "different");
    expect(token1).not.toBe(token3);
  });

  it('computes deterministic posting list commitments', async () => {
    const list1 = ["doc-1", "doc-2", "doc-3"];
    // Different order should yield same commitment
    const list2 = ["doc-2", "doc-3", "doc-1"];
    
    const hash1 = await computePostingListCommitment(list1);
    const hash2 = await computePostingListCommitment(list2);
    
    expect(hash1).toBe(hash2);
    
    const list3 = ["doc-1", "doc-2"];
    const hash3 = await computePostingListCommitment(list3);
    
    expect(hash1).not.toBe(hash3);
  });
});
