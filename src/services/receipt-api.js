import { apiGet } from "@/services/api-client";

const RECEIPTS_ENDPOINT = "/api/receipts";

export async function fetchReceipts(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const url = search.toString() ? `${RECEIPTS_ENDPOINT}?${search}` : RECEIPTS_ENDPOINT;
  const result = await apiGet(url);
  return result.data || [];
}

export async function scanReceipt(imageDataUrl) {
  const response = await fetch(RECEIPTS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageDataUrl }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Failed to scan receipt.");
    error.data = payload.data || null;
    throw error;
  }
  return payload.data;
}
