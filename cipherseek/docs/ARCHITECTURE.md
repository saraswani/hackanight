# Architecture

## Monorepo Structure
- `apps/web`: React + Vite frontend. Manages keys, cryptographic operations, and verification.
- `apps/api`: Express.js + SQLite backend. Untrusted storage and search execution.
- `packages/shared`: Shared Zod schemas and TypeScript types.

## Component Responsibilities

### Trusted Client (Frontend)
- **Key Generation & Management:** In-memory session keys.
- **Document Encryption/Decryption:** AES-256-GCM.
- **Token Generation:** HMAC-SHA-256 deterministic keyword tokens.
- **Index Construction:** Builds an inverted index and computes HMACs locally before upload.
- **Verification Engine:** Re-computes commitments of returned posting lists and compares them with locally held trusted commitments.

### Untrusted Server (Backend)
- **Document Storage:** Stores ciphertext and nonces.
- **Inverted Index Storage:** Maps opaque search tokens to lists of opaque document IDs.
- **Search Execution:** Looks up matching lists for queried tokens and returns them.
- **Audit Logging:** Logs observable events without plaintext data.
