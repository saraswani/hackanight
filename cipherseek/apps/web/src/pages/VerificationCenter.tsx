import { useState, useEffect } from "react";
import { setSimulatedAttack } from "../api";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, ShieldCheck, Bug, Loader2 } from "lucide-react";

export function VerificationCenter() {
  const [activeAttack, setActiveAttack] = useState<string>("NONE");

  const attackMutation = useMutation({
    mutationFn: (attack: string | null) => setSimulatedAttack(attack),
    onSuccess: (data) => {
      setActiveAttack(data.activeAttack || "NONE");
    }
  });

  const handleAttackChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    attackMutation.mutate(val === "NONE" ? null : val);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Verification Center</h1>
        <p className="text-muted-foreground">Monitor integrity and simulate malicious server behavior.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-border bg-card p-6 rounded-lg space-y-4">
          <div className="flex items-center space-x-3 text-primary">
            <ShieldCheck className="h-6 w-6" />
            <h2 className="text-xl font-semibold">How Verification Works</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            In a Verifiable SSE system, the client computes a deterministic cryptographic commitment (SHA-256 hash) of the expected posting list for every indexed token.
          </p>
          <p className="text-sm text-muted-foreground">
            When performing a search, the untrusted server returns the matching document IDs. The client re-computes the commitment of the returned list and compares it against the locally held trusted reference commitment.
          </p>
          <ul className="text-sm space-y-2 mt-4 text-muted-foreground list-disc list-inside">
            <li><strong>Integrity:</strong> Detects if the server modifies returned document IDs.</li>
            <li><strong>Completeness:</strong> Detects if the server omits matching documents.</li>
            <li><strong>Authenticity:</strong> Detects if the server fabricates non-matching documents.</li>
          </ul>
        </div>

        <div className="border border-destructive/30 bg-destructive/5 p-6 rounded-lg space-y-6">
          <div className="flex items-center space-x-3 text-destructive">
            <Bug className="h-6 w-6" />
            <h2 className="text-xl font-semibold">Simulate Server Attack</h2>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Active Server Behavior</label>
            <select
              value={activeAttack}
              onChange={handleAttackChange}
              disabled={attackMutation.isPending}
              className="w-full bg-background border border-border rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-destructive/50 text-foreground"
            >
              <option value="NONE">Normal (Honest Server)</option>
              <option value="OMIT_RESULT">A. Omit a matching document ID (Completeness Attack)</option>
              <option value="MODIFY_RESULT">B. Modify an existing result ID (Integrity Attack)</option>
              <option value="ADD_FABRICATED">C. Add a fabricated document ID (Authenticity Attack)</option>
              <option value="STALE_LIST">E. Return an empty/stale posting list</option>
              <option value="CORRUPT_CIPHERTEXT">D. Corrupt a stored ciphertext</option>
            </select>
          </div>

          <div className="flex items-start space-x-3 bg-background p-4 rounded-md border border-border">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium text-amber-500">Demo Attack Mode Active</p>
              <p className="text-muted-foreground">
                This changes how the backend API responds to searches. After selecting an attack, go to the <strong>Private Search</strong> or <strong>Document Vault</strong> page to see it detected by the client.
              </p>
            </div>
          </div>

          {attackMutation.isPending && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Applying server configuration...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
