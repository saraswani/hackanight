import type { SearchRequest, SearchResponse, UploadRequest } from "shared";

const API_BASE = "http://localhost:3001/api";

export async function checkHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function uploadDocumentAndIndex(payload: UploadRequest) {
  const res = await fetch(`${API_BASE}/documents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocumentList() {
  const res = await fetch(`${API_BASE}/documents`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getDocument(id: string) {
  const res = await fetch(`${API_BASE}/documents/${id}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function performSearch(payload: SearchRequest): Promise<SearchResponse> {
  const res = await fetch(`${API_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getAuditLog() {
  const res = await fetch(`${API_BASE}/audit`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resetDemo() {
  const res = await fetch(`${API_BASE}/demo/reset`, { method: "POST" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function setSimulatedAttack(attackType: string | null) {
  const res = await fetch(`${API_BASE}/demo/attack`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attackType }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
