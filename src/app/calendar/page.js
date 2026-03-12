"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/back-button";
import { formatCurrency } from "@/utils/format";
import { useLanguage } from "@/hooks/use-language";
import { getLocaleFromLanguage } from "@/lib/i18n";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getLocalDateKey } from "@/utils/date-key";

function getMonthBounds(baseDate) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  return { first, last };
}

function toKey(date) {
  return getLocalDateKey(new Date(date));
}

export default function CalendarPage() {
  const { language, t } = useLanguage();
  const locale = getLocaleFromLanguage(language);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [records, setRecords] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [touchStartX, setTouchStartX] = useState(null);
  const pickerRef = useRef(null);

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

  const monthLabel = currentMonth.toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const pickerValue = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(currentMonth.getDate()).padStart(2, "0")}`;

  const { first, last } = getMonthBounds(currentMonth);
  const days = [];
  for (let i = 1; i <= last.getDate(); i += 1) {
    days.push(new Date(first.getFullYear(), first.getMonth(), i));
  }
  const leadingEmpty = first.getDay();
  const dayCells = [
    ...Array.from({ length: leadingEmpty }, (_, index) => ({
      key: `empty-${index}`,
      day: null,
    })),
    ...days.map((day) => ({ key: toKey(day), day })),
  ];
  const sundayBase = new Date(Date.UTC(2024, 0, 7));
  const weekLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(sundayBase.getTime() + index * 24 * 60 * 60 * 1000).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "UTC",
    })
  );

  const selectedKey = toKey(selectedDate);
  const selectedRecords = grouped.get(selectedKey) || [];

  function goPrev() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  }

  function goNext() {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
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

  function openPicker() {
    if (!pickerRef.current) return;
    if (typeof pickerRef.current.showPicker === "function") {
      pickerRef.current.showPicker();
      return;
    }
    pickerRef.current.click();
  }

  function onPickDate(event) {
    const value = String(event.target.value || "").trim();
    if (!value) return;
    const picked = new Date(value);
    if (Number.isNaN(picked.getTime())) return;
    setCurrentMonth(new Date(picked.getFullYear(), picked.getMonth(), 1));
    setSelectedDate(picked);
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6da_0%,#eef7ff_38%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="rounded-3xl border-2 border-slate-900 bg-white/95 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrev}
              className="rounded-full border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black transition hover:bg-amber-100"
            >
              {"\u2190"}
            </button>

            <button
              type="button"
              onClick={openPicker}
              className="rounded-2xl border-2 border-slate-900 bg-amber-200 px-4 py-2 text-lg font-extrabold tracking-tight transition hover:bg-amber-300"
              title={t.menu.calendar}
            >
              {monthLabel}
            </button>
            <input
              ref={pickerRef}
              type="date"
              value={pickerValue}
              onChange={onPickDate}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
            />

            <button
              type="button"
              onClick={goNext}
              className="rounded-full border-2 border-slate-900 bg-white px-3 py-2 text-sm font-black transition hover:bg-sky-100"
            >
              {"\u2192"}
            </button>
          </div>

          <div
            className="rounded-2xl border border-slate-200 bg-gradient-to-b from-sky-50 to-white p-3"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <div className="mb-2 grid grid-cols-7 gap-2">
              {weekLabels.map((label, index) => (
                <p key={`${label}-${index}`} className="text-center text-xs font-black uppercase text-slate-500">
                  {label}
                </p>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {dayCells.map((cell) => {
                if (!cell.day) {
                  return <div key={cell.key} className="h-11 rounded-xl bg-transparent" />;
                }
                const day = cell.day;
                const key = toKey(day);
                const hasRecord = grouped.has(key);
                const selected = key === selectedKey;
                return (
                  <button
                    type="button"
                    key={key}
                    onClick={() => setSelectedDate(day)}
                    className={`relative h-11 rounded-xl border text-sm font-bold transition ${
                      selected
                        ? "border-slate-900 bg-amber-300 text-slate-900 shadow-sm"
                        : "border-slate-200 bg-white text-slate-800 hover:border-sky-300 hover:bg-sky-50"
                    }`}
                  >
                    {day.getDate()}
                    {hasRecord ? (
                      <span className="absolute bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rose-500" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-6 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            {new Date(selectedDate).toLocaleDateString(locale, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </h2>
          <div className="mt-4 space-y-3">
            {selectedRecords.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                {t.pages.noRecordsForDay}
              </p>
            ) : null}
            {selectedRecords.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-sky-50 px-4 py-3"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    {item.category?.name
                      ? getLocalizedCategoryLabel(item.category.name, language)
                      : t.dashboard.others}
                  </p>
                  <p className="text-sm text-slate-500">{item.title}</p>
                </div>
                <p className={`font-semibold ${item.type === "income" ? "text-emerald-600" : "text-amber-500"}`}>
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
