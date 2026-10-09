import { useState } from "react";
import { performSearch } from "../api";
import { useCrypto } from "../hooks/useCrypto";
import { computeSearchToken } from "../crypto";
import { tokenizeText } from "../search";
import { verifyPostingList } from "../verification";
import { Search, Loader2, ShieldCheck, ShieldAlert, FileLock2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDocumentList } from "../api";
import { DecryptModal } from "../components/DecryptModal";

export function PrivateSearch() {
  const { searchKey, isInitialized } = useCrypto();
  const [query, setQuery] = useState("");
  const [operator, setOperator] = useState<"EXACT" | "AND" | "OR">("AND");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ id: string, name: string }[]>([]);
  const [verificationStats, setVerificationStats] = useState<{ passed: number, failed: number } | null>(null);
  const [error, setError] = useState("");
  const [decryptingDocId, setDecryptingDocId] = useState<string | null>(null);

  const { data: documents } = useQuery({ queryKey: ["documents"], queryFn: getDocumentList });

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInitialized || !searchKey) return setError("Initialize keys first!");
    if (!query.trim()) return;

    setLoading(true);
    setError("");
    setResults([]);
    setVerificationStats(null);

    try {
      const tokens = tokenizeText(query);
      if (tokens.length === 0) throw new Error("No searchable words found.");

      if (tokens.length > 1 && operator === "EXACT") {
        throw new Error("EXACT mode only supports single keyword. Use AND/OR.");
      }

      const hmacTokens = await Promise.all(tokens.map(t => computeSearchToken(searchKey, t)));
      
      const res = await performSearch({ tokens: hmacTokens, operator });

      let passed = 0;
      let failed = 0;

      // Verify each returned list against trusted commitments
      const verifiedLists: string[][] = [];

      for (let i = 0; i < hmacTokens.length; i++) {
        const token = hmacTokens[i];
        const serverList = res.results[token] || [];
        
        const verification = await verifyPostingList(token, serverList);
        
        if (verification.verified) {
          passed++;
          verifiedLists.push(serverList);
        } else {
          failed++;
          console.error(`Verification failed for token ${tokens[i]}:`, verification.reason);
        }
      }

      setVerificationStats({ passed, failed });

      if (failed > 0) {
        throw new Error("Search result integrity verification failed! The server may be compromised.");
      }

      // Compute final result list locally since the server only returns raw lists
      let finalIds: string[] = [];
      if (verifiedLists.length > 0) {
        if (operator === "AND" || operator === "EXACT") {
          finalIds = verifiedLists[0];
          for (let i = 1; i < verifiedLists.length; i++) {
            finalIds = finalIds.filter(id => verifiedLists[i].includes(id));
          }
        } else if (operator === "OR") {
          const set = new Set<string>();
          for (const list of verifiedLists) {
            list.forEach(id => set.add(id));
          }
          finalIds = Array.from(set);
        }
      }

      // Map back to document names (in a real app, this mapping might be encrypted)
      const mapped = finalIds.map(id => {
        const doc = documents?.find((d: any) => d.id === id);
        return { id, name: doc?.fileName || "Unknown Document" };
      });

      setResults(mapped);

    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Private Search</h1>
        <p className="text-muted-foreground">Search securely with cryptographic verification.</p>
      </div>

      <form onSubmit={handleSearch} className="max-w-2xl bg-card p-6 rounded-lg border border-border space-y-4 shadow-sm">
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search documents (e.g., 'vendor payment')"
                className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
              />
            </div>
          </div>
          <select 
            value={operator}
            onChange={(e) => setOperator(e.target.value as any)}
            className="bg-background border border-border rounded-md px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground"
          >
            <option value="AND">AND (All terms)</option>
            <option value="OR">OR (Any term)</option>
            <option value="EXACT">Exact (Single term)</option>
          </select>
          <button 
            type="submit"
            disabled={loading || !isInitialized}
            className="px-6 py-3 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-semibold transition-colors disabled:opacity-50 flex items-center"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Search"}
          </button>
        </div>
        {error && <p className="text-destructive text-sm font-medium">{error}</p>}
      </form>

      {verificationStats && (
        <div className={`p-4 rounded-md border flex items-start space-x-3 ${verificationStats.failed > 0 ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-green-500/10 border-green-500/20 text-green-600"}`}>
          {verificationStats.failed > 0 ? <ShieldAlert className="w-5 h-5 shrink-0" /> : <ShieldCheck className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-semibold text-sm">
              {verificationStats.failed > 0 ? "Verification Failed!" : "Results Verified Successfully!"}
            </p>
            <p className="text-xs opacity-90 mt-1">
              Checked {verificationStats.passed + verificationStats.failed} posting lists against trusted local commitments. 
              Passed: {verificationStats.passed}, Failed: {verificationStats.failed}.
            </p>
          </div>
        </div>
      )}

      {results.length > 0 && !error && (
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-muted/30">
            <h3 className="font-medium">Found {results.length} matching document(s)</h3>
          </div>
          <ul className="divide-y divide-border">
            {results.map(doc => (
              <li key={doc.id} className="p-4 flex justify-between items-center hover:bg-muted/30 transition-colors">
                <div className="flex items-center">
                  <FileLock2 className="w-5 h-5 text-primary mr-3" />
                  <div>
                    <p className="font-medium text-foreground">{doc.name}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-1">ID: {doc.id}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setDecryptingDocId(doc.id)}
                  className="text-primary hover:underline text-sm font-medium"
                >
                  Decrypt
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {decryptingDocId && (
        <DecryptModal 
          documentId={decryptingDocId} 
          onClose={() => setDecryptingDocId(null)} 
        />
      )}
    </div>
  );
}
