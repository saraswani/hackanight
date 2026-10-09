import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "../api";
import { BarChart, Activity, Timer } from "lucide-react";
import { useMemo } from "react";

export function Benchmarks() {
  const { data: logs } = useQuery({
    queryKey: ["audit"],
    queryFn: getAuditLog,
    refetchInterval: 5000,
  });

  const stats = useMemo(() => {
    if (!logs) return null;
    const searches = logs.filter((l: any) => l.type === 'SEARCH');
    const uploads = logs.filter((l: any) => l.type === 'UPLOAD');
    
    const avgSearchTime = searches.length 
      ? searches.reduce((acc: number, curr: any) => acc + curr.details.durationMs, 0) / searches.length 
      : 0;

    return {
      totalSearches: searches.length,
      totalUploads: uploads.length,
      avgSearchTime: avgSearchTime.toFixed(2),
    };
  }, [logs]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Benchmarks & Metrics</h1>
      <p className="text-muted-foreground">Performance metrics of cryptographic operations and API latency.</p>

      {stats ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-border p-6 rounded-lg bg-card">
            <div className="flex items-center space-x-2 mb-2 text-primary">
              <Activity className="h-5 w-5" />
              <h3 className="font-semibold">Total Uploads</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalUploads}</p>
            <p className="text-sm text-muted-foreground mt-1">Encrypted documents</p>
          </div>
          
          <div className="border border-border p-6 rounded-lg bg-card">
            <div className="flex items-center space-x-2 mb-2 text-primary">
              <BarChart className="h-5 w-5" />
              <h3 className="font-semibold">Total Searches</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalSearches}</p>
            <p className="text-sm text-muted-foreground mt-1">Queries executed</p>
          </div>

          <div className="border border-border p-6 rounded-lg bg-card">
            <div className="flex items-center space-x-2 mb-2 text-primary">
              <Timer className="h-5 w-5" />
              <h3 className="font-semibold">Avg Search Latency</h3>
            </div>
            <p className="text-3xl font-bold">{stats.avgSearchTime} ms</p>
            <p className="text-sm text-muted-foreground mt-1">Server processing time</p>
          </div>
        </div>
      ) : (
        <p>Loading metrics...</p>
      )}

      <div className="border border-border p-6 rounded-lg bg-card space-y-4">
        <h3 className="font-semibold text-lg">System Characteristics</h3>
        <ul className="text-sm space-y-2 text-muted-foreground list-disc list-inside">
          <li><strong>Encryption:</strong> AES-256-GCM via Web Crypto API (Hardware accelerated when available).</li>
          <li><strong>Token Generation:</strong> HMAC-SHA-256.</li>
          <li><strong>Commitments:</strong> SHA-256 hash of deterministically sorted document ID arrays.</li>
          <li><strong>Client Overhead:</strong> High during indexing (computes HMACs for all unique tokens).</li>
          <li><strong>Server Overhead:</strong> Low (simple key-value lookup for opaque tokens).</li>
        </ul>
      </div>
    </div>
  );
}
