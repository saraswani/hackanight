export async function generateKeyMaterial() {
  // Generate a random master seed
  const masterKeyMaterial = crypto.getRandomValues(new Uint8Array(32));

  // We derive two separate keys: one for document encryption (AES-GCM), one for search tokens (HMAC)
  const baseKey = await crypto.subtle.importKey(
    "raw",
    masterKeyMaterial,
    "HKDF",
    false,
    ["deriveKey"]
  );

  const documentKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode("document_encryption"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  const searchKey = await crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(),
      info: new TextEncoder().encode("search_tokens"),
    },
    baseKey,
    { name: "HMAC", hash: "SHA-256", length: 256 },
    true,
    ["sign", "verify"]
  );

  return { documentKey, searchKey };
}

export async function encryptDocument(documentKey: CryptoKey, plaintext: string) {
  const nonce = crypto.getRandomValues(new Uint8Array(12)); // 96-bit nonce
  const encoded = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    documentKey,
    encoded
  );

  // Compute SHA-256 fingerprint of the plaintext document
  const fingerprintBuffer = await crypto.subtle.digest("SHA-256", encoded);

  return {
    ciphertext: bufferToBase64(ciphertextBuffer),
    nonce: bufferToBase64(nonce),
    fingerprint: bufferToHex(fingerprintBuffer),
  };
}

export async function decryptDocument(documentKey: CryptoKey, ciphertextBase64: string, nonceBase64: string) {
  const ciphertextBuffer = base64ToBuffer(ciphertextBase64);
  const nonce = base64ToBuffer(nonceBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce },
    documentKey,
    ciphertextBuffer
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export async function computeSearchToken(searchKey: CryptoKey, keyword: string) {
  // Deterministic HMAC-SHA-256 token for each normalized keyword
  const encoded = new TextEncoder().encode(keyword);
  const signatureBuffer = await crypto.subtle.sign("HMAC", searchKey, encoded);
  return bufferToHex(signatureBuffer); // The token
}

export async function computePostingListCommitment(documentIds: string[]) {
  // Sort IDs deterministically
  const sorted = [...documentIds].sort();
  const serialized = JSON.stringify(sorted);
  const encoded = new TextEncoder().encode(serialized);
  
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  return bufferToHex(hashBuffer);
}

// Utility functions

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

export function bufferToHex(buffer: ArrayBuffer | Uint8Array): string {
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
