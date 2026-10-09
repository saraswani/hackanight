# Security Documentation

## Cryptographic Design
- **Document Encryption:** AES-256-GCM using Web Crypto API. A fresh 96-bit nonce is generated for every encryption.
- **Search Tokens:** HMAC-SHA-256. A separate key is used to ensure isolation from the document encryption key.
- **Commitments:** SHA-256. The client sorts the document IDs for each token deterministically and hashes them.

## Key Management
- Keys are derived from a randomly generated 256-bit seed using HKDF.
- Keys are never persisted. They exist only in the browser's memory and are lost upon refresh.

## Known Limitations & Production Gaps
- **Key Persistence:** A real system needs a way to store or recover keys (e.g., wrapping them with a PBKDF2-derived passphrase key and storing them locally or securely).
- **Incremental Indexing & Commitments:** The current prototype computes commitments over the whole list. In production, an authenticated data structure (like a Merkle tree) is needed for efficient updates.
- **Forward & Backward Privacy:** Not implemented. The static inverted index leaks when a newly added document matches a previously queried token.
- **Metadata Leakage:** Ciphertext sizes and access patterns are not padded or obfuscated (e.g., using ORAM).
