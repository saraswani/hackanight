import { ShieldAlert, KeyRound, Server, EyeOff, BookOpen } from "lucide-react";

export function ThreatModel() {
  return (
    <div className="space-y-8 max-w-4xl pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Security & Threat Model</h1>
        <p className="text-muted-foreground mt-2">
          An overview of the security guarantees, assumptions, and residual leakage in this Searchable Symmetric Encryption (SSE) prototype.
        </p>
      </div>

      <div className="space-y-6">
        <section className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4 text-primary">
            <BookOpen className="w-5 h-5 mr-2" />
            1. Protected Assets
          </h2>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
            <li><strong>Plaintext Documents:</strong> The actual contents of the documents.</li>
            <li><strong>Encryption Keys:</strong> The AES-256-GCM keys used to encrypt and decrypt documents.</li>
            <li><strong>Search Keys:</strong> The HMAC-SHA-256 keys used to generate deterministic search tokens.</li>
            <li><strong>Plaintext Queries:</strong> The actual keywords users search for.</li>
            <li><strong>Integrity of Search Results:</strong> The completeness and correctness of the returned search results.</li>
          </ul>
        </section>

        <section className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4 text-green-500">
            <KeyRound className="w-5 h-5 mr-2" />
            2. Trusted vs. Untrusted Components
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-foreground mb-2">Trusted (Client)</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                <li>The User's Browser</li>
                <li>Cryptographic execution (Web Crypto API)</li>
                <li>Local trusted commitments state</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-2">Untrusted (Server)</h3>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                <li>Cloud API (Express server)</li>
                <li>Database (SQLite)</li>
                <li>Storage Administrators</li>
                <li>Server-Side Search Execution</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="border border-destructive/20 rounded-lg bg-card p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4 text-destructive">
            <ShieldAlert className="w-5 h-5 mr-2" />
            3. Attacker Capabilities & Assumptions
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-foreground mb-1 text-sm">Assumptions</h3>
              <p className="text-sm text-muted-foreground">
                The client application has not been compromised (e.g., via XSS). Keys remain confidential and are exclusively held by the client. The trusted reference commitments stored on the client cannot be silently replaced or modified by the server.
              </p>
            </div>
            <div>
              <h3 className="font-medium text-foreground mb-1 text-sm">Attacker Capabilities (Malicious Server)</h3>
              <p className="text-sm text-muted-foreground">
                The server can read all database storage, inspect API logs, alter ciphertexts, alter opaque search indexes, remove matching IDs from results, fabricate IDs, and return stale posting lists. The system is designed to detect these active attacks via verification.
              </p>
            </div>
          </div>
        </section>

        <section className="border border-border rounded-lg bg-card p-6">
          <h2 className="text-xl font-semibold flex items-center mb-4 text-amber-500">
            <EyeOff className="w-5 h-5 mr-2" />
            4. Residual Leakage
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            This design minimizes data exposure but does not eliminate all metadata leakage. The following information remains visible to the untrusted server:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground text-sm">
            <li><strong>Ciphertext Sizes:</strong> The length of encrypted documents approximates the plaintext size.</li>
            <li><strong>Search Pattern:</strong> The server can see if the same opaque search token is queried multiple times.</li>
            <li><strong>Access Pattern:</strong> Which encrypted documents are accessed after a search.</li>
            <li><strong>Result Counts:</strong> The number of documents matching a query token.</li>
            <li><strong>Timing:</strong> The time taken to upload, index, or retrieve documents.</li>
          </ul>
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Disclaimer: This prototype demonstrates core SSE concepts and verifiable search. It is not a production-grade system with formal zero-knowledge guarantees.
        </p>
      </div>
    </div>
  );
}
