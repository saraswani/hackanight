import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { uploadDocumentAndIndex, performSearch } from "../api";
import { useCrypto } from "../hooks/useCrypto";
import { encryptDocument, computeSearchToken, computePostingListCommitment } from "../crypto";
import { tokenizeText } from "../search";
import { saveTrustedCommitment } from "../verification";
import { Upload, FilePlus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

export function AddDocument() {
  const { documentKey, searchKey, isInitialized } = useCrypto();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState<{ id: string, title: string } | null>(null);
  const [error, setError] = useState("");

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "text/plain" && !file.name.endsWith(".md") && !file.name.endsWith(".txt")) {
      setError("Only .txt and .md files are supported for local text extraction in this prototype.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setContent(event.target?.result as string);
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
      setError("");
    };
    reader.readAsText(file);
  };

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!documentKey || !searchKey) throw new Error("Keys not initialized.");
      if (!title.trim() || !content.trim()) throw new Error("Title and content are required.");

      // 1. Generate unique document ID
      const docId = crypto.randomUUID();

      // 2. Tokenize and compute HMAC tokens locally
      const plaintextTokens = tokenizeText(content);
      const hmacTokens = await Promise.all(plaintextTokens.map(t => computeSearchToken(searchKey, t)));
      
      // 3. Fetch existing posting lists from the server to update local trusted commitments correctly
      // We do this by searching for all tokens at once (OR query)
      let existingIndex: Record<string, string[]> = {};
      if (hmacTokens.length > 0) {
        const searchRes = await performSearch({ tokens: hmacTokens, operator: "OR" });
        existingIndex = searchRes.results;
      }

      // 4. Update local trusted commitments and prepare index updates for the server
      const indexUpdates: Record<string, string[]> = {};
      for (const hmac of hmacTokens) {
        indexUpdates[hmac] = [docId]; // The server only needs the new ID; it merges automatically.
        
        // Merge locally to compute new commitment
        const existingIds = existingIndex[hmac] || [];
        const newPostingList = Array.from(new Set([...existingIds, docId])).sort();
        
        const commitment = await computePostingListCommitment(newPostingList);
        saveTrustedCommitment(hmac, commitment);
      }

      // 5. Encrypt document contents
      const encrypted = await encryptDocument(documentKey, content);

      // 6. Upload encrypted payload and index updates
      await uploadDocumentAndIndex({
        document: {
          id: docId,
          ciphertext: encrypted.ciphertext,
          nonce: encrypted.nonce,
        },
        indexUpdates,
      });

      return { docId, title };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      setSuccessInfo({ id: data.docId, title: data.title });
      setTitle("");
      setContent("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    onError: (err: any) => {
      setError(err.message || "Failed to encrypt and save document.");
    },
    onSettled: () => {
      setLoading(false);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessInfo(null);
    setError("");
    setLoading(true);
    uploadMutation.mutate();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Document</h1>
        <p className="text-muted-foreground mt-2">
          Encrypt and index a document locally before securely uploading it to the vault.
        </p>
      </div>

      {!isInitialized && (
        <div className="p-4 bg-yellow-500/10 text-yellow-600 rounded-md border border-yellow-500/20 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="space-y-1">
            <p className="font-medium">Missing Session Keys</p>
            <p className="text-sm">You must configure your encryption and search keys before adding documents.</p>
            <Link to="/" className="text-sm underline font-medium">Go to Overview</Link>
          </div>
        </div>
      )}

      {successInfo && (
        <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-lg space-y-4">
          <div className="flex items-center text-green-600">
            <CheckCircle2 className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Document Encrypted & Saved</h2>
          </div>
          <div className="text-sm text-green-700 dark:text-green-400 space-y-2">
            <p><strong>Title:</strong> {successInfo.title}</p>
            <p className="font-mono"><strong>ID:</strong> {successInfo.id}</p>
            <p>The document content was encrypted locally and the search index was successfully updated.</p>
          </div>
          <div className="pt-2 flex space-x-4">
            <Link to="/vault" className="text-sm font-medium text-green-700 dark:text-green-400 underline">View in Vault</Link>
            <Link to="/search" className="text-sm font-medium text-green-700 dark:text-green-400 underline">Test Search</Link>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border border-border bg-card rounded-lg p-6 space-y-6">
        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">Document Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Confidential Q3 Report"
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
            disabled={loading || !isInitialized}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium">Document Content</label>
            <div>
              <input
                type="file"
                accept=".txt,.md"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
                disabled={loading || !isInitialized}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading || !isInitialized}
                className="text-xs flex items-center text-primary hover:underline disabled:opacity-50"
              >
                <Upload className="w-3 h-3 mr-1" />
                Upload .txt file
              </button>
            </div>
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Paste document text here..."
            className="w-full h-48 bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
            required
            disabled={loading || !isInitialized}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !isInitialized || !title.trim() || !content.trim()}
          className="w-full py-2.5 bg-primary text-primary-foreground rounded-md font-medium text-sm flex justify-center items-center hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Encrypting & Indexing...
            </>
          ) : (
            <>
              <FilePlus className="w-4 h-4 mr-2" />
              Encrypt & Save
            </>
          )}
        </button>
      </form>
    </div>
  );
}
