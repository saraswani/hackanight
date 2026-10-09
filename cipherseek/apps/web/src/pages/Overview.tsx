import { useCrypto } from "../hooks/useCrypto";
import { AlertCircle, KeyRound, Loader2, Database, ShieldAlert, Zap } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { checkHealth, resetDemo } from "../api";
import { useEffect, useState } from "react";

export function Overview() {
  const { isInitialized, initializeKeys, resetKeys } = useCrypto();
  const queryClient = useQueryClient();
  const [health, setHealth] = useState<string>("checking");

  useEffect(() => {
    checkHealth()
      .then(() => setHealth("online"))
      .catch(() => setHealth("offline"));
  }, []);

  const resetMutation = useMutation({
    mutationFn: resetDemo,
    onSuccess: () => {
      resetKeys();
      queryClient.invalidateQueries();
      alert("Demo data reset successfully.");
    },
    onError: () => {
      alert("Failed to reset demo data.");
    }
  });

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">CipherSeek Overview</h1>
        <p className="text-muted-foreground">
          A Verifiable Searchable Symmetric Encryption (SSE) engine demonstrating how organizations can search confidential documents on an untrusted cloud server without exposing plaintext.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-border p-6 rounded-lg bg-card">
          <div className="flex items-center space-x-3 mb-4">
            <KeyRound className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Cryptographic Keys</h2>
          </div>
          {isInitialized ? (
            <div className="space-y-4">
              <div className="p-3 bg-green-500/10 text-green-600 rounded flex items-start space-x-2 border border-green-500/20">
                <ShieldAlert className="h-5 w-5 mt-0.5 shrink-0" />
                <p className="text-sm">
                  Keys are generated and stored securely in memory. Do not refresh the page or keys will be lost.
                </p>
              </div>
              <button 
                onClick={resetKeys}
                className="px-4 py-2 bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground rounded font-medium text-sm transition-colors border border-destructive/20"
              >
                Destroy Session Keys
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                No keys present. You must generate session keys to encrypt documents or perform searches.
              </p>
              <button 
                onClick={initializeKeys}
                className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded font-medium text-sm transition-colors"
              >
                Generate Session Keys
              </button>
            </div>
          )}
        </div>

        <div className="border border-border p-6 rounded-lg bg-card">
          <div className="flex items-center space-x-3 mb-4">
            <Database className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold">Backend Status</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">API Server:</span>
              {health === "checking" && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              {health === "online" && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-green-500/10 text-green-600 border border-green-500/20">Online</span>}
              {health === "offline" && <span className="px-2 py-0.5 rounded text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">Offline</span>}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              To start a new demonstration, reset the server database to its initial state.
            </p>
            <button 
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
              className="px-4 py-2 bg-muted text-foreground hover:bg-muted/80 rounded font-medium text-sm transition-colors border border-border flex items-center"
            >
              {resetMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Zap className="h-4 w-4 mr-2" />
              Reset Demo Server State
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
