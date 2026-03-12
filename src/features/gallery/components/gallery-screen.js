"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { fetchReceipts } from "@/services/receipt-api";
import { formatCurrency, formatDate } from "@/utils/format";

function buildTitle(receipt) {
  if (receipt?.merchant) return receipt.merchant;
  if (receipt?.transaction?.title) return receipt.transaction.title;
  return "Receipt";
}

export function GalleryScreen() {
  const { t } = useLanguage();
  const [receipts, setReceipts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const data = await fetchReceipts();
        if (isMounted) setReceipts(data);
      } catch (requestError) {
        if (isMounted) setError(requestError?.message || "Failed to load receipts.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    load();
    const handler = () => load();
    window.addEventListener("neo:receipts-updated", handler);
    return () => {
      isMounted = false;
      window.removeEventListener("neo:receipts-updated", handler);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t.pages?.gallery || t.gallery?.title || "Gallery"}
          </h1>
          <p className="mt-3 text-sm text-slate-500">
            {t.pages?.galleryDesc || "Saved receipt images will appear here."}
          </p>
        </section>

        {isLoading ? (
          <p className="text-sm text-slate-500">{t.gallery?.loading || "Loading receipts..."}</p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        ) : null}

        {!isLoading && receipts.length === 0 ? (
          <section className="rounded-3xl border-2 border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="text-sm text-slate-600">{t.gallery?.empty || "No receipts yet."}</p>
            <Link
              href="/scan"
              className="mt-4 inline-flex rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
            >
              {t.gallery?.openScan || "Scan a receipt"}
            </Link>
          </section>
        ) : null}

        {receipts.length > 0 ? (
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {receipts.map((receipt) => {
              const amount =
                receipt?.transaction?.amount ?? receipt?.totalAmount ?? null;
              const currency = receipt?.transaction?.account?.currency || receipt?.currency || "RM";
              return (
                <button
                  key={receipt.id}
                  type="button"
                  onClick={() => setSelected(receipt)}
                  className="flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300"
                >
                  <div className="h-40 w-full overflow-hidden bg-slate-100">
                    <img
                      src={receipt.imageUrl}
                      alt={buildTitle(receipt)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                      {buildTitle(receipt)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(receipt.transactionDate || receipt.createdAt)}
                    </p>
                    {amount ? (
                      <p className="text-sm font-semibold text-amber-700">
                        {formatCurrency(amount, currency)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">{t.gallery?.noAmount || "Amount unavailable"}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </section>
        ) : null}
      </div>

      {!selected ? (
        <Link
          href="/scan"
          className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border border-slate-900 bg-amber-300 px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-amber-200"
        >
          {t.gallery?.scanNext || t.scan?.scanReceipt || "Scan next receipt"}
        </Link>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[70vh] overflow-hidden bg-slate-100">
              <img
                src={selected.imageUrl}
                alt={buildTitle(selected)}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{buildTitle(selected)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(selected.transactionDate || selected.createdAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
                >
                  {t.menu?.close || t.common?.cancel || "Close"}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">{t.scan?.amount || "Amount"}</p>
                  <p className="text-sm font-semibold text-amber-700">
                    {selected?.transaction?.amount
                      ? formatCurrency(
                          selected.transaction.amount,
                          selected.transaction?.account?.currency || selected.currency || "RM"
                        )
                      : t.gallery?.noAmount || "Amount unavailable"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold text-slate-500">{t.scan?.category || "Category"}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selected?.transaction?.category?.name || t.pages?.reportUncategorized || "Uncategorized"}
                  </p>
                </div>
              </div>

              {selected?.transaction ? (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/transactions"
                    className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white"
                  >
                    {t.scan?.manualEntry || "Record manually"}
                  </Link>
                  <Link
                    href="/scan"
                    className="rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  >
                    {t.gallery?.openScan || "Scan a receipt"}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
