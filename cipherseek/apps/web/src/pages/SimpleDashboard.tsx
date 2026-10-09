import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocumentAndIndex, getDocumentList, getDocument, performSearch } from "../api";
import { useCrypto } from "../hooks/useCrypto";
import { encryptDocument, decryptDocument, computeSearchToken, computePostingListCommitment } from "../crypto";
import { tokenizeText } from "../search";
import { saveTrustedCommitment, getTrustedCommitment } from "../verification";
import { Upload, Search, File, ShieldCheck, Loader2, Download, AlertCircle, Key, FileText, Bug } from "lucide-react";

export function SimpleDashboard() {
  const { documentKey, searchKey, isInitialized, initializeKeys } = useCrypto();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Set<string> | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [auditLogs, setAuditLogs] = useState<Array<{ time: string, action: string, details: string, hash?: string }>>([]);
  const addLog = (action: string, details: string, hash?: string) => {
    setAuditLogs(prev => [{ time: new Date().toLocaleTimeString(), action, details, hash }, ...prev].slice(0, 10));
  };

  const [serverAuditLogs, setServerAuditLogs] = useState<any[]>([]);
  const [attackActive, setAttackActive] = useState(false);

  const fetchServerLogs = async () => {
    try {
      const res = await fetch("http://localhost:3001/api/audit");
      if (res.ok) {
        setServerAuditLogs(await res.json());
      }
    } catch (e) {}
  };

  const { data: documents, isLoading } = useQuery({
    queryKey: ["documents"],
    queryFn: getDocumentList,
  });

  // Automatically fetch server logs periodically to show the dual-perspective
  useEffect(() => {
    const interval = setInterval(fetchServerLogs, 2000);
    fetchServerLogs();
    return () => clearInterval(interval);
  }, []);

  // Automatically initialize keys if not initialized (for simplicity)
  useEffect(() => {
    if (!isInitialized) {
      initializeKeys();
    }
  }, [isInitialized, initializeKeys]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!documentKey || !searchKey) return setError("Keys not ready.");

    setUploading(true);
    setError("");
    
    try {
      const isText = file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md");
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const fileData = event.target?.result as string; // Data URL or Text
          const docId = crypto.randomUUID();

          // 1. Tokenize filename (and content if it's a text file)
          let indexableText = file.name;
          if (isText) {
            // If it's text, we want the raw text for indexing, but we still need to store it safely.
            // Since we read as DataURL, we can't easily extract text from DataURL here for indexing.
            // Actually, we should read as DataURL, and if it's text, read again as text to index.
          }
          
          // Let's just index the filename for non-text files, or both for text files.
          let textToIndex = file.name;
          if (isText) {
            const textContent = await file.text();
            textToIndex += " " + textContent;
          }

          const plaintextTokens = tokenizeText(textToIndex);
          addLog("Tokenization", `Extracted ${plaintextTokens.length} unique words from file.`);
          
          const hmacTokens = await Promise.all(plaintextTokens.map(t => computeSearchToken(searchKey, t)));
          if (hmacTokens.length > 0) {
            addLog("Trapdoor Generation", `First keyword hashed to blind token`, hmacTokens[0].substring(0, 32) + "...");
          }
          
          // 2. Fetch existing index for verifiable commitments
          let existingIndex: Record<string, string[]> = {};
          if (hmacTokens.length > 0) {
            const searchRes = await performSearch({ tokens: hmacTokens, operator: "OR" });
            existingIndex = searchRes.results;
          }

          const indexUpdates: Record<string, string[]> = {};
          for (const hmac of hmacTokens) {
            indexUpdates[hmac] = [docId];
            const existingIds = existingIndex[hmac] || [];
            const newPostingList = Array.from(new Set([...existingIds, docId])).sort();
            const commitment = await computePostingListCommitment(newPostingList);
            saveTrustedCommitment(hmac, commitment);
          }

          // 3. Encrypt the file data (Data URL)
          const encrypted = await encryptDocument(documentKey, fileData);
          addLog("AES-256-GCM Encryption", `File content encrypted locally before upload`, encrypted.ciphertext.substring(0, 40) + "...");

          // 4. Upload (Without filename to protect privacy)
          await uploadDocumentAndIndex({
            document: {
              id: docId,
              ciphertext: encrypted.ciphertext,
              nonce: encrypted.nonce,
            },
            indexUpdates,
          });

          // Save filename locally to prove the server never needs it
          localStorage.setItem(`cipherseek_filename_${docId}`, file.name);

          queryClient.invalidateQueries({ queryKey: ["documents"] });
        } catch (err: any) {
          setError(err.message || "Failed to encrypt/upload.");
        } finally {
          setUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = "";
        }
      };

      // Read as Data URL to support images, pdfs, etc.
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message);
      setUploading(false);
    }
  };

  const handleDownload = async (doc: any) => {
    if (!documentKey) return;
    setDownloadingId(doc.id);
    try {
      const fullDoc = await getDocument(doc.id);
      const fileDataUrl = await decryptDocument(documentKey, fullDoc.ciphertext, fullDoc.nonce);
      
      // Trigger download using the locally known filename
      const a = document.createElement("a");
      a.href = fileDataUrl;
      const localName = localStorage.getItem(`cipherseek_filename_${doc.id}`) || "Encrypted_Document";
      a.download = localName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      alert("Decryption failed. The file may be tampered with or keys are invalid.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    if (!searchKey) return;

    setIsSearching(true);
    try {
      const tokens = tokenizeText(searchQuery, true);
      if (tokens.length === 0) {
        setSearchResults(new Set());
        return;
      }

      addLog("Search Initiated", `User typed plaintext query: "${searchQuery}"`);

      const hmacTokens = await Promise.all(tokens.map(t => computeSearchToken(searchKey, t)));
      addLog("Blind Tokenization", `Plaintext converted to blind token for server`, hmacTokens[0].substring(0, 40) + "...");
      
      const res = await performSearch({ tokens: hmacTokens, operator: "AND" });
      addLog("Server Response", `Server returned matching opaque IDs without seeing the keyword`, Object.values(res.results).flat().join(", ").substring(0, 40) + "...");
      
      // Verify individual posting lists
      let isValid = true;
      for (const token of hmacTokens) {
        const ids = res.results[token] || [];
        const expectedCommitment = getTrustedCommitment(token);
        const actualCommitment = await computePostingListCommitment(ids);
        
        if (expectedCommitment && expectedCommitment !== actualCommitment) {
          isValid = false;
        }
      }

      // Verify boolean intersection
      let expectedFinalIds: string[] = [];
      if (hmacTokens.length > 0) {
        expectedFinalIds = res.results[hmacTokens[0]] || [];
        for (let i = 1; i < hmacTokens.length; i++) {
          expectedFinalIds = expectedFinalIds.filter(id => (res.results[hmacTokens[i]] || []).includes(id));
        }
      }
      
      if (JSON.stringify(expectedFinalIds.sort()) !== JSON.stringify((res.finalIds || []).sort())) {
        isValid = false;
      }

      if (!isValid) {
        alert("CRITICAL WARNING: Search results verification failed! The server has tampered with the index or omitted results.");
      }

      setSearchResults(new Set(res.finalIds || []));
    } catch (e: any) {
      alert("Search failed: " + e.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAttackToggle = async () => {
    try {
      if (attackActive) {
        await fetch("http://localhost:3001/api/demo/reset", { method: "POST" });
        setAttackActive(false);
        addLog("Attack Simulator", "Server reset to honest behavior.");
      } else {
        await fetch("http://localhost:3001/api/demo/attack", { 
          method: "POST", 
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attackType: "OMIT_RESULT" })
        });
        setAttackActive(true);
        addLog("Attack Simulator", "Server compromised. It will maliciously omit results in the next search.");
      }
    } catch (e: any) {
      alert("Failed to toggle attack: " + e.message);
    }
  };

  const displayedDocs = documents?.filter((doc: any) => {
    if (!searchResults) return true;
    return searchResults.has(doc.id);
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center">
            <ShieldCheck className="w-8 h-8 text-primary mr-3" />
            CipherSeek
          </h1>
          <p className="text-muted-foreground mt-1">End-to-End Encrypted Document Vault.</p>
        </div>
        <div className="flex items-center space-x-4 bg-background p-3 rounded-lg border border-border shadow-sm">
          <div className="flex items-center text-sm">
            <Key className="w-4 h-4 text-green-500 mr-2" />
            <span className="font-medium">Keys Active</span>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <div className="text-xs text-muted-foreground max-w-[150px] leading-tight">
            Files are encrypted locally. The server cannot read your data.
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-lg border border-destructive/20 flex items-center">
          <AlertCircle className="w-5 h-5 mr-3" />
          {error}
        </div>
      )}

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search */}
        <div className="md:col-span-2 space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h2 className="text-lg font-semibold flex items-center">
            <Search className="w-5 h-5 mr-2 text-primary" />
            Secure Search
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by filename or content..."
              className="flex-1 bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </button>
            {searchResults && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults(null); }}
                className="px-4 py-2.5 bg-muted text-foreground rounded-lg font-medium hover:bg-muted/80 transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Keywords are mathematically scrambled before leaving your device.
          </p>
        </div>

        {/* Upload */}
        <div className="space-y-4 bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col justify-center items-center text-center border-dashed border-2 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => !uploading && fileInputRef.current?.click()}>
          <input
            type="file"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={uploading || !isInitialized}
          />
          {uploading ? (
            <>
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-2" />
              <p className="font-medium">Encrypting & Uploading...</p>
            </>
          ) : (
            <>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="font-medium">Upload File</p>
                <p className="text-xs text-muted-foreground mt-1">Images, PDFs, Docs, TXT</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Document List */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Your Vault
          </h2>
          <span className="text-sm text-muted-foreground">
            {displayedDocs?.length || 0} files {searchResults ? "found" : "stored"}
          </span>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          </div>
        ) : displayedDocs?.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <File className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p>{searchResults ? "No files matched your search." : "Your vault is empty."}</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {displayedDocs?.map((doc: any) => (
              <div key={doc.id} className="p-4 hover:bg-muted/30 transition-colors flex items-center justify-between group">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <File className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{localStorage.getItem(`cipherseek_filename_${doc.id}`) || "Encrypted Document"}</p>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">ID: {doc.id.split("-")[0]}...</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                    disabled={downloadingId === doc.id}
                    className="p-2 bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground rounded-lg transition-colors disabled:opacity-50"
                    title="Decrypt & Download"
                  >
                    {downloadingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dual Perspective Audit Log for Judges */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden mt-8">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold flex items-center">
              <ShieldCheck className="w-5 h-5 mr-2 text-primary" />
              Dual-Perspective Cryptography Audit
            </h2>
            <p className="text-sm text-muted-foreground mt-1">Proof that the server only sees opaque hashes and ciphertext.</p>
          </div>
          
          <button
            onClick={handleAttackToggle}
            className={`px-4 py-2 rounded-md text-sm font-bold transition-colors flex items-center ${
              attackActive 
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-pulse" 
                : "bg-muted text-foreground hover:bg-muted/80"
            }`}
          >
            <Bug className="w-4 h-4 mr-2" />
            {attackActive ? "Disable Malicious Server" : "Simulate Malicious Server"}
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
          {/* Client Perspective */}
          <div className="p-6 bg-black/5 dark:bg-black/40 font-mono text-xs md:text-sm overflow-x-auto max-h-80 overflow-y-auto">
            <h3 className="text-primary font-bold mb-4 border-b border-primary/20 pb-2">Client Perspective (What you know)</h3>
            {auditLogs.length === 0 ? (
              <p className="text-muted-foreground italic">No local actions recorded yet.</p>
            ) : (
              <ul className="space-y-4">
                {auditLogs.map((log, i) => (
                  <li key={i} className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0">
                    <span className="text-primary font-bold">{log.time}</span>
                    <strong className="text-foreground">{log.action}</strong>
                    <span className="text-muted-foreground">{log.details}</span>
                    {log.hash && (
                      <div className="mt-1 p-2 bg-primary/10 text-primary rounded break-all">
                        {log.hash}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Server Perspective */}
          <div className="p-6 bg-destructive/5 dark:bg-destructive/10 font-mono text-xs md:text-sm overflow-x-auto max-h-80 overflow-y-auto">
            <h3 className="text-destructive font-bold mb-4 border-b border-destructive/20 pb-2">Untrusted Server Audit Log (What it sees)</h3>
            {serverAuditLogs.length === 0 ? (
              <p className="text-muted-foreground italic">No server actions recorded yet.</p>
            ) : (
              <ul className="space-y-4">
                {serverAuditLogs.map((log: any) => (
                  <li key={log.id} className="flex flex-col gap-1 border-b border-border/50 pb-3 last:border-0">
                    <span className="text-destructive font-bold">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <strong className="text-foreground">{log.type}</strong>
                    <pre className="text-muted-foreground whitespace-pre-wrap mt-1 p-2 bg-black/10 dark:bg-black/40 rounded border border-border/50 text-xs">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
