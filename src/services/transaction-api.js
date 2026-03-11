import { apiDelete, apiGet, apiPost } from "@/services/api-client";

const TRANSACTIONS_ENDPOINT = "/api/transactions";

export async function fetchTransactions(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    search.set(key, String(value));
  });
  const url = search.toString() ? `${TRANSACTIONS_ENDPOINT}?${search}` : TRANSACTIONS_ENDPOINT;
  const result = await apiGet(url);
  return result.data || [];
}

export async function createTransaction(payload) {
  const result = await apiPost(TRANSACTIONS_ENDPOINT, payload);
  return result.data;
}

export async function deleteTransaction(id) {
  return apiDelete(`${TRANSACTIONS_ENDPOINT}/${id}`);
}

