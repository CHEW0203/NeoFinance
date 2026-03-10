"use client";

import Link from "next/link";
import { useTransactions } from "@/hooks/use-transactions";
import {
  TransactionForm,
  TransactionList,
} from "@/features/transactions/components";
import { BackButton } from "@/components/back-button";

export default function TransactionsPage() {
  const {
    transactions,
    isLoading,
    isSubmitting,
    error,
    form,
    setForm,
    submitTransaction,
    removeTransaction,
  } = useTransactions();

  return (
    <main className="min-h-screen bg-[#f3efe6] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <BackButton fallbackHref="/" preferFallback />
          <Link
            href="/profile"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
          >
            View profile
          </Link>
        </div>
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

        <TransactionForm
          form={form}
          setForm={setForm}
          isSubmitting={isSubmitting}
          onSubmit={submitTransaction}
        />

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-8 space-y-4">
          <TransactionList
            transactions={transactions}
            isLoading={isLoading}
            onDelete={removeTransaction}
          />
        </div>
      </div>
    </main>
  );
}
