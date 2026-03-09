"use client";

import { useEffect, useState } from "react";

function formatAmount(type, amount) {
  const symbol = type === "income" ? "+" : "-";
  return `${symbol} RM ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    amount: "",
    type: "expense",
    note: "",
    transactionDate: "",
  });

  async function loadTransactions() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load transactions.");
      }
      setTransactions(payload.data || []);
    } catch (loadError) {
      setError(loadError.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          amount: Number(form.amount),
          type: form.type,
          note: form.note || null,
          transactionDate: form.transactionDate || undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to create transaction.");
      }

      setForm({
        title: "",
        amount: "",
        type: "expense",
        note: "",
        transactionDate: "",
      });
      await loadTransactions();
    } catch (submitError) {
      setError(submitError.message || "Failed to create transaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    setError("");
    try {
      const response = await fetch(`/api/transactions/${id}`, {
        method: "DELETE",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete transaction.");
      }
      await loadTransactions();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete transaction.");
    }
  }

  return (
    <main className="min-h-screen bg-[#f3efe6] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">
          Transactions module
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Manage real transactions
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          This page is now connected to Prisma. You can create and delete
          records directly.
        </p>

        <form
          className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2"
          onSubmit={handleSubmit}
        >
          <input
            type="text"
            placeholder="Title (example: Lunch)"
            value={form.title}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, title: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
            required
          />
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="Amount"
            value={form.amount}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, amount: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
            required
          />
          <select
            value={form.type}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, type: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <input
            type="date"
            value={form.transactionDate}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                transactionDate: event.target.value,
              }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
          />
          <input
            type="text"
            placeholder="Note (optional)"
            value={form.note}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, note: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
          >
            {isSubmitting ? "Saving..." : "Add transaction"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          {isLoading ? <p className="text-sm text-slate-500">Loading...</p> : null}
          {!isLoading && transactions.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          ) : null}
          {transactions.map((transaction) => (
            <article
              key={transaction.id}
              className="flex flex-col gap-3 rounded-3xl border border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium text-slate-950">{transaction.title}</p>
                <p className="text-sm text-slate-500">
                  {transaction.category?.name || "Uncategorized"}
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(transaction.transactionDate).toLocaleDateString()}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-sm font-semibold text-slate-700">
                  {formatAmount(transaction.type, transaction.amount)}
                </p>
                <button
                  type="button"
                  onClick={() => handleDelete(transaction.id)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
