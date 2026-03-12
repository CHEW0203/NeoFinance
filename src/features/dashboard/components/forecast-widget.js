"use client";

import { useState } from "react";
import { formatCurrency } from "@/utils/format";

function trendColor(trend) {
  if (trend === "up") return "text-emerald-700";
  if (trend === "down") return "text-rose-700";
  return "text-slate-700";
}

export function ForecastWidget({ labels = {}, language = "en" }) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);

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
        throw new Error(payload.message || "Failed to load forecast.");
      }
      setData(payload.data || null);
    } catch (requestError) {
      setError(requestError.message || "Failed to load forecast.");
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

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-cyan-200 bg-cyan-50 text-base font-black text-cyan-700 shadow-sm transition hover:border-cyan-300 hover:bg-cyan-100"
        aria-label={labels.openButton || "Open forecast"}
        title={labels.openButton || "Open forecast"}
      >
        ✦
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-slate-900">
                {labels.title || "Cashflow Forecast"}
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {labels.close || "Close"}
              </button>
            </div>

            {isLoading ? (
              <p className="mt-4 text-sm text-slate-500">{labels.loading || "Loading forecast..."}</p>
            ) : error ? (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            ) : data ? (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-cyan-700">
                      {labels.weekAhead || "7 days"}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${trendColor(data.trend)}`}>
                      {formatCurrency(data.forecast7, data.currency || "RM")}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">
                      {labels.monthAhead || "30 days"}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${trendColor(data.trend)}`}>
                      {formatCurrency(data.forecast30, data.currency || "RM")}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">
                    {(labels.currentBalance || "Current balance") + ": "}
                    <span className="font-semibold text-slate-800">
                      {formatCurrency(data.currentBalance, data.currency || "RM")}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {(labels.confidence || "Confidence") + ": "}
                    <span className="font-semibold text-slate-700">
                      {Math.round(Number(data.confidence || 0) * 100)}%
                    </span>
                  </p>
                </div>

                <p className="rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                  {data.aiSummary || labels.fallback || "Forecast generated from your recent cashflow pattern."}
                </p>

                <button
                  type="button"
                  onClick={loadForecast}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  {labels.refresh || "Refresh forecast"}
                </button>
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">{labels.empty || "No forecast data yet."}</p>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
