import { useEffect, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
} from "@/services/transaction-api";

const INITIAL_FORM = {
  title: "",
  amount: "",
  type: "expense",
  note: "",
  transactionDate: "",
};

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  async function loadTransactions() {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchTransactions();
      setTransactions(rows);
    } catch (loadError) {
      setError(loadError.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function submitTransaction(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await createTransaction({
        title: form.title,
        amount: Number(form.amount),
        type: form.type,
        note: form.note || null,
        transactionDate: form.transactionDate || undefined,
      });
      setForm(INITIAL_FORM);
      await loadTransactions();
    } catch (submitError) {
      setError(submitError.message || "Failed to create transaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeTransaction(id) {
    setError("");
    try {
      await deleteTransaction(id);
      await loadTransactions();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete transaction.");
    }
  }

  return {
    transactions,
    isLoading,
    isSubmitting,
    error,
    form,
    setForm,
    submitTransaction,
    removeTransaction,
  };
}
