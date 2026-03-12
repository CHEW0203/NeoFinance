"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocaleFromLanguage } from "@/lib/i18n";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { fetchReceipts } from "@/services/receipt-api";
import { formatCurrency, formatDate } from "@/utils/format";

function buildTitle(receipt, fallbackLabel) {
  if (receipt?.merchant) return receipt.merchant;
  if (receipt?.transaction?.title) return receipt.transaction.title;
  return fallbackLabel;
}

export function GalleryScreen() {
  const { language, t } = useLanguage();
  const locale = getLocaleFromLanguage(language);
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
      } catch {
        if (isMounted) setError(t.gallery.loadFailed);
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
  }, [t.gallery.loadFailed]);

  const receiptTitleLabel = t.gallery.receiptTitle;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_35%,#e8f3ff_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-4xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 p-6 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.45)]">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/40" />
          <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/40" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.pages.gallery || t.gallery.title}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-700">
            {t.pages.galleryDesc}
          </p>
        </section>

        {isLoading ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            {t.gallery.loading}
          </p>
        ) : null}

        {error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
            {error}
          </p>
        ) : null}

        {!isLoading && receipts.length === 0 ? (
          <section className="rounded-3xl border-2 border-dashed border-slate-900 bg-white/95 p-8 text-center shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
            <p className="text-sm font-medium text-slate-600">{t.gallery.empty}</p>
            <Link
              href="/scan"
              className="mt-4 inline-flex rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-bold text-white"
            >
              {t.gallery.openScan}
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
                  className="flex flex-col overflow-hidden rounded-3xl border-2 border-slate-900 bg-white text-left shadow-[0_14px_30px_-24px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:bg-amber-50/30"
                >
                  <div className="h-44 w-full overflow-hidden bg-slate-100">
                    <img
                      src={receipt.imageUrl}
                      alt={buildTitle(receipt, receiptTitleLabel)}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-4">
                    <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                      {buildTitle(receipt, receiptTitleLabel)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(receipt.transactionDate || receipt.createdAt, locale)}
                    </p>
                    {amount ? (
                      <p className="text-sm font-semibold text-amber-600">
                        {formatCurrency(amount, currency)}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500">{t.gallery.noAmount}</p>
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
        className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 rounded-full border-2 border-slate-900 bg-rose-300 px-6 py-3 text-sm font-extrabold text-slate-900 shadow-lg transition hover:bg-rose-200"
      >
          {t.gallery.scanNext || t.scan.scanReceipt}
        </Link>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-slate-900 bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[75vh] overflow-hidden bg-slate-100">
              <img
                src={selected.imageUrl}
                alt={buildTitle(selected, receiptTitleLabel)}
                className="h-full w-full object-contain"
              />
            </div>
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{buildTitle(selected, receiptTitleLabel)}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(selected.transactionDate || selected.createdAt, locale)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-bold text-slate-700"
                >
                  {t.menu.close || t.common.cancel}
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 to-white p-3">
                  <p className="text-xs font-semibold text-slate-500">{t.scan.amount}</p>
                  <p className="text-sm font-semibold text-amber-700">
                    {selected?.transaction?.amount
                      ? formatCurrency(
                          selected.transaction.amount,
                          selected.transaction?.account?.currency || selected.currency || "RM"
                        )
                      : t.gallery.noAmount}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 to-white p-3">
                  <p className="text-xs font-semibold text-slate-500">{t.scan.category}</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {selected?.transaction?.category?.name
                      ? getLocalizedCategoryLabel(selected.transaction.category.name, language)
                      : t.pages.reportUncategorized}
                  </p>
                </div>
              </div>

              {selected?.transaction ? (
                <div className="flex flex-wrap gap-3">
                  <Link
                    href="/transactions"
                    className="rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-bold text-white"
                  >
                    {t.scan.manualEntry}
                  </Link>
                  <Link
                    href="/scan"
                    className="rounded-2xl border-2 border-slate-900 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-amber-100"
                  >
                    {t.gallery.openScan}
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
