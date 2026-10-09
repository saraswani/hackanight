import { useState, useEffect } from "react";
import { getDocument } from "../api";
import { useCrypto } from "../hooks/useCrypto";
import { decryptDocument } from "../crypto";
import { X, Loader2, ShieldCheck } from "lucide-react";

export function DecryptModal({ documentId, onClose }: { documentId: string, onClose: () => void }) {
  const { documentKey } = useCrypto();
  const [loading, setLoading] = useState(true);
  const [plaintext, setPlaintext] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAndDecrypt() {
      if (!documentKey) {
        setError("Document key missing. Cannot decrypt.");
        setLoading(false);
        return;
      }

      try {
        const doc = await getDocument(documentId);
        if (!doc.ciphertext || !doc.nonce) {
          throw new Error("Invalid document format from server");
        }
        
        const decrypted = await decryptDocument(documentKey, doc.ciphertext, doc.nonce);
        setPlaintext(decrypted);
      } catch (err: any) {
        setError("Decryption failed. " + err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAndDecrypt();
  }, [documentId, documentKey]);

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl border border-border shadow-lg rounded-lg overflow-hidden flex flex-col max-h-[85vh]">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-muted/30">
          <h2 className="text-lg font-semibold flex items-center">
            <ShieldCheck className="w-5 h-5 text-primary mr-2" />
            Locally Decrypted Document
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin mb-4" />
              <p>Fetching and decrypting locally...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <pre className="whitespace-pre-wrap font-sans text-sm text-foreground bg-muted p-4 rounded-md border border-border">
                {plaintext}
              </pre>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-border bg-muted/30 text-right">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md font-medium text-sm transition-colors"
          >
            Close Secure Preview
          </button>
        </div>
      </div>
    </div>
  );
}
