import { apiDelete, apiGet, apiPost } from "@/services/api-client";

const TRANSACTIONS_ENDPOINT = "/api/transactions";

export async function fetchTransactions() {
  const result = await apiGet(TRANSACTIONS_ENDPOINT);
  return result.data || [];
}

export async function createTransaction(payload) {
  const result = await apiPost(TRANSACTIONS_ENDPOINT, payload);
  return result.data;
}

export async function deleteTransaction(id) {
  return apiDelete(`${TRANSACTIONS_ENDPOINT}/${id}`);
}
