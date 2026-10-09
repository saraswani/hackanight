import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "../api";
import { ShieldCheck, Server, Eye, EyeOff } from "lucide-react";

export function PrivacyAudit() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit"],
    queryFn: getAuditLog,
    refetchInterval: 5000, // Refresh every 5s
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Privacy Audit Console</h1>
          <p className="text-muted-foreground">View actual server-observable events in real-time.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border border-border p-5 rounded-lg bg-card">
          <h3 className="font-semibold text-lg flex items-center mb-3">
            <Eye className="w-5 h-5 mr-2 text-destructive" />
            What the Server CAN See
          </h3>
          <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
            <li>Opaque document IDs (UUIDs)</li>
            <li>Encrypted document sizes (reveals approximate length)</li>
            <li>Number of tokens in the index</li>
            <li>Number of results matching a query token</li>
            <li>Frequency and timing of queries (Access Patterns)</li>
            <li>When the same (opaque) token is queried multiple times</li>
          </ul>
        </div>
        <div className="border border-border p-5 rounded-lg bg-card">
          <h3 className="font-semibold text-lg flex items-center mb-3">
            <EyeOff className="w-5 h-5 mr-2 text-green-500" />
            What the Server CANNOT See
          </h3>
          <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
            <li>Plaintext document contents</li>
            <li>Plaintext search keywords</li>
            <li>Cryptographic keys (AES or HMAC)</li>
            <li>Which words correspond to which tokens</li>
            <li>Whether multiple tokens mean the same thing</li>
          </ul>
        </div>
      </div>

      <div className="border border-border rounded-lg bg-card overflow-hidden">
        <div className="px-4 py-3 bg-muted/50 border-b border-border flex items-center text-sm font-medium">
          <Server className="w-4 h-4 mr-2" />
          Live Server Logs
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted text-muted-foreground text-xs uppercase">
              <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">Event Type</th>
                <th className="px-4 py-2">Details (No Secrets)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Loading logs...</td></tr>
              ) : logs?.length === 0 ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">No events recorded.</td></tr>
              ) : (
                logs?.map((log: any) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      <span className={`px-2 py-1 rounded text-xs ${
                        log.type === 'UPLOAD' ? 'bg-blue-500/10 text-blue-500' :
                        log.type === 'SEARCH' ? 'bg-green-500/10 text-green-500' :
                        log.type.includes('ATTACK') ? 'bg-destructive/10 text-destructive' :
                        'bg-muted text-foreground'
                      }`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground break-all">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
