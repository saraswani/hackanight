# CipherSeek

Verifiable Searchable Symmetric Encryption (SSE) Engine

## Overview
CipherSeek demonstrates how organizations can search confidential documents stored on an untrusted cloud server without exposing plaintext documents or search keywords to the server. It also allows clients to verify the completeness and integrity of search results.

## Requirements
- Node.js LTS (v18+)
- npm

## Setup & Running

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the API server and the Frontend in development mode:
   ```bash
   npm run dev
   ```

3. Open the browser at `http://localhost:5173`

## Demo Usage
1. Open the **Overview** page and click "Generate Session Keys". (Note: Secret keys exist entirely in memory and are never sent to the server. If you refresh, you will lose access to existing documents!).
2. Go to **Add Document** (Quick Encrypt & Search) to paste text or upload a `.txt` file. The file is encrypted securely, indexed, and uploaded to the server, while keys remain client-side.
3. Alternatively, go to **Document Vault** and click "Load Demo Workspace" to populate the server with 10 synthetic contracts.
4. Navigate to **Private Search** to query the dataset (e.g., "vendor", "confidentiality").
5. Open the **Verification Center** to activate a server-side attack.
6. Search again to see the client detect the manipulation.
7. Open the **Privacy Audit** to see what the server observes.

*Disclaimer: This is a hackathon prototype, not a production-grade system.*
