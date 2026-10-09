import { computePostingListCommitment } from "../crypto";

// Store trusted reference commitments locally in memory (in a real app, in IndexedDB encrypted or derived)
export const trustedCommitments: Record<string, string> = {}; // Mapping of token -> SHA-256 hash

export function saveTrustedCommitment(token: string, commitment: string) {
  trustedCommitments[token] = commitment;
}

export function getTrustedCommitment(token: string) {
  return trustedCommitments[token];
}

export async function verifyPostingList(token: string, documentIds: string[]): Promise<{
  verified: boolean;
  reason?: string;
  expectedCommitment?: string;
  actualCommitment?: string;
}> {
  const trusted = getTrustedCommitment(token);
  if (!trusted) {
    // If we have no trusted commitment, but the server returned a list, it's either a token we never indexed,
    // or we lost our state. The threat model says we rebuild trusted state or we reject.
    if (documentIds.length > 0) {
      return { verified: false, reason: "No trusted commitment found for token, but server returned results (Fabrication or State Loss)." };
    }
    // If list is empty and we don't have it, it's correct.
    return { verified: true };
  }

  const computed = await computePostingListCommitment(documentIds);

  if (trusted === computed) {
    return { verified: true, expectedCommitment: trusted, actualCommitment: computed };
  }

  return {
    verified: false,
    reason: "Commitment mismatch. The server list is missing items, modified, or has fabricated IDs.",
    expectedCommitment: trusted,
    actualCommitment: computed
  };
}
