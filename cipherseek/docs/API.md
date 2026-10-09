# API Endpoints

The API is strictly untrusted. No plaintext secrets are ever sent to it.

### `GET /api/health`
Health check.

### `POST /api/documents`
Uploads a document and updates the index.
**Payload:**
```json
{
  "document": {
    "id": "uuid",
    "ciphertext": "base64...",
    "nonce": "base64...",
    "fileName": "Plaintext.md"
  },
  "indexUpdates": {
    "hmac-token-hex": ["doc-id-1", "doc-id-2"]
  }
}
```

### `GET /api/documents`
Retrieves a list of documents.

### `GET /api/documents/:id`
Retrieves a specific document ciphertext.

### `POST /api/search`
Queries the index.
**Payload:**
```json
{
  "tokens": ["hmac-token-1", "hmac-token-2"],
  "operator": "AND"
}
```
**Response:**
```json
{
  "results": {
    "hmac-token-1": ["doc-1", "doc-2"],
    "hmac-token-2": ["doc-2"]
  },
  "durationMs": 5
}
```

### `GET /api/audit`
Retrieves server-side audit logs.

### `POST /api/demo/attack`
Simulates a malicious server behavior (Demo only).
