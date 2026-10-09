import { z } from "zod";

export const uploadDocumentSchema = z.object({
  id: z.string(), // Opaque document ID
  ciphertext: z.string(), // Base64 encoded ciphertext
  nonce: z.string(), // Base64 encoded nonce
});

export const indexTokensSchema = z.record(
  z.string(), // Deterministic HMAC-SHA-256 token (hex or base64)
  z.array(z.string()) // Array of opaque document IDs
);

export const uploadRequestSchema = z.object({
  document: uploadDocumentSchema,
  indexUpdates: indexTokensSchema,
});

export const searchRequestSchema = z.object({
  tokens: z.array(z.string()),
  operator: z.enum(["EXACT", "AND", "OR"]),
});

export const searchResponseSchema = z.object({
  results: z.record(
    z.string(), // token
    z.array(z.string()) // document IDs
  ),
  finalIds: z.array(z.string()).optional(),
  durationMs: z.number(),
});

export const auditEventSchema = z.object({
  id: z.string(),
  type: z.enum(["UPLOAD", "SEARCH", "ATTACK_SIMULATION"]),
  timestamp: z.string(),
  details: z.any(),
});

export type UploadDocument = z.infer<typeof uploadDocumentSchema>;
export type IndexTokens = z.infer<typeof indexTokensSchema>;
export type UploadRequest = z.infer<typeof uploadRequestSchema>;
export type SearchRequest = z.infer<typeof searchRequestSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type AuditEvent = z.infer<typeof auditEventSchema>;
