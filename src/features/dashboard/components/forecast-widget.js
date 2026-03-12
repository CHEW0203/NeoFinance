"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { formatCurrency } from "@/utils/format";

function trendColor(trend) {
  if (trend === "up") return "text-emerald-700";
  if (trend === "down") return "text-rose-700";
  return "text-slate-700";
}

export function ForecastWidget({ labels = {}, language = "en" }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  async function loadForecast() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/forecast?lang=${encodeURIComponent(language)}`, {
        cache: "no-store",
        credentials: "include",
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || labels.loadFailed);
      }
      setData(payload.data || null);
    } catch {
      setError(labels.loadFailed);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }

  function openModal() {
    setOpen(true);
    if (!data && !isLoading) {
      loadForecast();
    }
  }

  const modal = open ? (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/55 px-4">
      <div className="w-full max-w-md rounded-3xl border-2 border-slate-900 bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_42%,#e8f3ff_100%)] p-5 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-extrabold tracking-tight text-slate-900">{labels.title}</h3>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-full border-2 border-slate-900 bg-white px-3 py-1 text-xs font-bold text-slate-700"
          >
            {labels.close}
          </button>
        </div>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-500">{labels.loading}</p>
        ) : error ? (
          <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        ) : data ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-rose-700">
                  {labels.weekAhead}
                </p>
                <p className={`mt-1 text-xl font-bold ${trendColor(data.trend)}`}>
                  {formatCurrency(data.forecast7, data.currency || "RM")}
                </p>
              </div>
              <div className="rounded-2xl border border-violet-300 bg-violet-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
                  {labels.monthAhead}
                </p>
                <p className={`mt-1 text-xl font-bold ${trendColor(data.trend)}`}>
                  {formatCurrency(data.forecast30, data.currency || "RM")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-cyan-300 bg-cyan-50 p-3">
              <p className="text-xs text-slate-500">
                {labels.currentBalance + ": "}
                <span className="font-semibold text-slate-800">
                  {formatCurrency(data.currentBalance, data.currency || "RM")}
                </span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {labels.confidence + ": "}
                <span className="font-semibold text-slate-700">
                  {Math.round(Number(data.confidence || 0) * 100)}%
                </span>
              </p>
            </div>

            <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {data.aiSummary || labels.fallback}
            </p>

            <button
              type="button"
              onClick={loadForecast}
              className="w-full rounded-xl border-2 border-slate-900 bg-amber-300 px-3 py-2 text-sm font-bold text-slate-900 transition hover:bg-amber-200"
            >
              {labels.refresh}
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{labels.empty}</p>
        )}
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border-2 border-slate-900 bg-gradient-to-br from-rose-300 via-amber-200 to-cyan-200 text-base font-black text-fuchsia-800 shadow-[0_10px_20px_-10px_rgba(15,23,42,0.65)] transition hover:scale-105"
        aria-label={labels.openButton}
        title={labels.openButton}
      >
        {"\u2726"}
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
