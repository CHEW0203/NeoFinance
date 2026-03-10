"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { formatCurrency } from "@/utils/format";

function getMonthBounds(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return { first, last };
}

function toKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [touchStartX, setTouchStartX] = useState(null);

  useEffect(() => {
    async function loadMonth() {
      const { first, last } = getMonthBounds(currentMonth);
      const query = new URLSearchParams({
        limit: "500",
        from: first.toISOString(),
        to: last.toISOString(),
      });
      const response = await fetch(`/api/transactions?${query.toString()}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (response.ok) {
        setRecords(payload.data || []);
      }
    }
    loadMonth();
  }, [currentMonth]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of records) {
      const key = toKey(item.transactionDate);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    }
    return map;
  }, [records]);

  const monthLabel = currentMonth.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  const { first, last } = getMonthBounds(currentMonth);
  const days = [];
  for (let i = 1; i <= last.getDate(); i += 1) {
    days.push(new Date(first.getFullYear(), first.getMonth(), i));
  }

  const selectedKey = toKey(selectedDate);
  const selectedRecords = grouped.get(selectedKey) || [];

  function goPrev() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  }

  function goNext() {
    setCurrentMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  }

  function onTouchStart(event) {
    setTouchStartX(event.touches[0]?.clientX || null);
  }

  function onTouchEnd(event) {
    if (touchStartX == null) return;
    const endX = event.changedTouches[0]?.clientX || touchStartX;
    const delta = endX - touchStartX;
    if (delta > 40) {
      goPrev();
    } else if (delta < -40) {
      goNext();
    }
    setTouchStartX(null);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" />

        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              ←
            </button>
            <h1 className="text-xl font-semibold">{monthLabel}</h1>
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              →
            </button>
          </div>

          <div
            className="grid grid-cols-7 gap-2"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {days.map((day) => {
              const key = toKey(day);
              const hasRecord = grouped.has(key);
              const selected = key === selectedKey;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`relative rounded-xl border px-2 py-3 text-sm font-semibold ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-800"
                  }`}
                >
                  {day.getDate()}
                  {hasRecord ? (
                    <span className="absolute bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-red-500" />
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            {new Date(selectedDate).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          <div className="mt-4 space-y-3">
            {selectedRecords.length === 0 ? (
              <p className="text-sm text-slate-500">No records for this day.</p>
            ) : null}
            {selectedRecords.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.category?.name || "Others"}
                  </p>
                  <p className="text-sm text-slate-500">{item.title}</p>
                </div>
                <p className="font-semibold text-slate-900">
                  {item.type === "income" ? "+" : "-"}
                  {formatCurrency(item.amount, "RM")}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
