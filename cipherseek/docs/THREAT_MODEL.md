# Threat Model

## 1. Protected Assets
- **Plaintext Documents**: The actual contents of the documents.
- **Encryption Keys**: The AES-256-GCM keys used to encrypt and decrypt documents.
- **Search Keys**: The HMAC-SHA-256 keys used to generate deterministic search tokens.
- **Plaintext Queries**: The actual keywords users search for.
- **Document Contents**: The meaning and context derived from the documents.
- **Integrity of Search Results**: The completeness and correctness of the returned search results.

## 2. Trusted Components
- **The User's Browser**: The client environment where the application runs.
- **Cryptographic Code Executing in Browser**: The Web Crypto API and client-side application logic performing encryption, decryption, token generation, and verification.

## 3. Untrusted Components
- **Cloud API**: The backend Express server.
- **Database**: The SQLite database storing ciphertexts and opaque search indexes.
- **Storage Administrator**: Any personnel with access to the backend infrastructure.
- **Server-Side Search Execution**: The process matching opaque tokens against the inverted index.

## 4. Assumptions
- The client application has not been compromised (e.g., via XSS or malicious browser extensions).
- Keys remain confidential and are exclusively held by the client.
- The trusted reference commitments stored on the client cannot be silently replaced or modified by the server.

## 5. Attacker Capabilities
- Read all server storage (database, backups, files).
- Inspect server logs and network traffic to the server.
- Alter stored ciphertexts.
- Alter the opaque search indexes.
- Remove matching document IDs from search results.
- Fabricate document IDs and inject them into search results.
- Return incomplete, stale, or completely incorrect search results.

## 6. Residual Leakage
This Searchable Symmetric Encryption (SSE) design minimizes data exposure but does not eliminate all metadata leakage. The following information remains visible to the untrusted server:
- **Document IDs**: Opaque identifiers for each document.
- **Ciphertext Sizes**: The length of the encrypted documents, which approximates the plaintext size.
- **Search Frequency**: How often queries are executed.
- **Access Patterns**: Which encrypted documents are retrieved after a search.
- **Result Counts**: The number of documents matching a given query token.
- **Repeated Tokens**: The server can observe if the same search token is queried multiple times, even without knowing the underlying keyword.
- **Timing Information**: The time taken to upload, index, or retrieve documents.

*Disclaimer: This prototype demonstrates core SSE concepts and result verification. It is not a production-grade system with formal zero-knowledge guarantees or regulatory compliance.*
