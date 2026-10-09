# CipherSeek: Verifiable Searchable Symmetric Encryption (SSE)

CipherSeek is a cryptographic search engine built from scratch for a hackathon. It allows organizations to search encrypted confidential documents stored on an untrusted cloud server **without exposing plaintext documents or search keywords** to the server, while supporting native server-side **Boolean logic** and **Substring matching**. Crucially, clients independently verify the completeness and integrity of the server's search results.

---

## 🏗️ Architecture & Integration Strategy

### Research Adaptation (Option A)
After inspecting external research repositories like CloudSSE/Clusion, this project adopted **Option A (Research-guided implementation)**. Rather than blindly merging external C++/Python research code which would conflict with the pure TypeScript/Node.js stack and the "from scratch" hackathon constraint, this project isolated and implemented key SSE concepts natively:
1. **Blind Inverted Index:** Deterministic HMAC-SHA-256 tokens used for protected posting lists.
2. **Boolean Trapdoors:** Server-side set intersection/union.
3. **Commitment Verification:** Independent cryptographic hashing of result sets to detect server-side tampering.

### Technology Stack
*   **Frontend:** React, Vite, Tailwind CSS, TypeScript.
*   **Backend API:** Node.js, Express, TypeScript.
*   **Database:** SQLite (mocked for demo purposes via memory store).
*   **Cryptography:** Native browser Web Crypto API (AES-256-GCM, HMAC-SHA-256, SHA-256).

---

## 🚀 Features

*   **Zero-Knowledge Backend:** The server only stores opaque Document IDs, ciphertext, and deterministic hashes. 
*   **Absolute Filename Privacy:** Filenames are stored strictly in `localStorage` on the client. The server never learns metadata.
*   **Server-Side Boolean Search:** The client sends an array of protected tokens and an operator (`AND` / `OR`). The server natively intersects or unions the posting lists to resolve the query.
*   **Blind N-Gram Substring Search:** The client tokenizes words into 3-gram sequences before hashing. Substring queries like "confid" are converted to N-gram hashes, allowing the server to perform substring searches over ciphertext without knowing the letters.
*   **Dual-Perspective Audit Log:** A UI feature showing exactly what the Client computes in parallel with what the Server receives, providing concrete proof of privacy.
*   **Independent Result Verification:** A built-in "Attack Simulator" demonstrates the system catching omitted or fabricated results.

---

## 🛠️ Setup & Running

### Requirements
*   Node.js LTS (v18+)
*   npm

### Installation
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Run the automated test suite (verifying Boolean logic, encryption, and attack detection):
    ```bash
    npm test --workspaces --if-present
    ```
3.  Start the API server and the Frontend:
    ```bash
    npm run dev
    ```
4.  Open the browser at `http://localhost:5173`

---

## 🎬 Demo Sequence (For Judges)

Use this script to demonstrate the project:

1.  **Generate Keys:** Open the app. The master keys are generated locally. Note that keys are never sent to the server.
2.  **Document Vault:** Upload a sensitive document (e.g., containing the word "confidential"). Notice that the filename is stripped before reaching the server.
3.  **Privacy Audit:** Open the **Dual-Perspective Audit Log**. Show the judges the left column (Client: knows plaintext) vs the right column (Server: sees only `mock-enc`, opaque IDs, and hashes).
4.  **Substring & Boolean Search:** 
    *   Search for "confid". The N-gram engine finds the document without the server knowing the string.
    *   Search for "confidential AND project". The server computes the intersection of the two hashes natively.
5.  **Attack Simulator (Verification):** 
    *   Enable the Attack Simulator toggle. 
    *   Perform a search. The server will intentionally omit a valid document ID from the results.
    *   Watch the client instantly flag the result as **Manipulated** because the cryptographic commitment hash returned by the server does not match the client's independently derived expectation.

---

## 🔒 Security Limitations & Threat Model

*   **Access Pattern Leakage:** While the server cannot read the keywords, it can observe access patterns (e.g., observing that Token X consistently retrieves Document Y). 
*   **Deterministic Tokens:** This implementation uses a deterministic blind index. It lacks Forward/Backward privacy (e.g., Sophos/Diana schemes) which would dynamically randomize tokens on every insertion to prevent leakage against future queries. 
*   **Metadata:** Document size and total result counts per token are visible to the server. 
*   **Hackathon Prototype:** This is a conceptual implementation of SSE and should not be used for production health or financial data without upgrading to a stateful dynamic SSE protocol.
