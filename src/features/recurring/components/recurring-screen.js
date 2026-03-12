"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocaleFromLanguage } from "@/lib/i18n";
import {
  getLocalizedCategoryLabel,
  toCanonicalCategoryName,
} from "@/lib/i18n/category-labels";
import { getLocalDateKey } from "@/utils/date-key";
import { formatCurrency } from "@/utils/format";

const TYPE_OPTIONS = ["expense", "income"];
const FREQUENCY_OPTIONS = ["daily", "weekly", "monthly"];

function formatRuleDate(value, locale) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function safeMessage(error, fallback) {
  return fallback;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function FieldLabel({ children }) {
  return (
    <p className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
      {children}
    </p>
  );
}

export function RecurringScreen() {
  const { language, t } = useLanguage();
  const locale = getLocaleFromLanguage(language);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState("");

  const [form, setForm] = useState(() => ({
    title: "",
    note: "",
    amount: "",
    type: "expense",
    frequency: "monthly",
    startDate: getLocalDateKey(new Date()),
    categoryName: "",
  }));

  const filteredCategories = useMemo(
    () => categories.filter((item) => String(item.type).toLowerCase() === form.type),
    [categories, form.type]
  );

  const categoryOptions = useMemo(() => {
    return filteredCategories
      .map((item) => String(item.name || "").trim())
      .filter(Boolean)
      .map((rawName) => ({
        rawName,
        label: getLocalizedCategoryLabel(rawName, language),
      }));
  }, [filteredCategories, language]);

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/recurring", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.recurring.loadFailed);
      }
      const nextRules = payload.data || [];
      const nextCategories = payload.categories || [];

      setRules(nextRules);
      setCategories(nextCategories);
    } catch (requestError) {
      setError(safeMessage(requestError, t.recurring.loadFailed));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = toPositiveNumber(form.amount);
    if (!amount) {
      setError(t.recurring.amountInvalid);
      return;
    }
    if (!form.title.trim()) {
      setError(t.recurring.titleRequired);
      return;
    }
    const normalizedCategoryName = toCanonicalCategoryName(form.categoryName.trim());
    if (!normalizedCategoryName) {
      setError(t.recurring.selectCategory);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          note: form.note.trim() || null,
          amount,
          type: form.type,
          frequency: form.frequency,
          startDate: form.startDate,
          categoryName: normalizedCategoryName,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.recurring.createFailed);
      }

      setForm((prev) => ({
        ...prev,
        title: "",
        note: "",
        amount: "",
        categoryName: "",
      }));
      setSuccess(t.recurring.createdActive);
      await loadData();
      window.dispatchEvent(new Event("neo:transactions-updated"));
    } catch (requestError) {
      setError(safeMessage(requestError, t.recurring.createFailed));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleRule(rule, shouldResume) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/recurring/${rule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: shouldResume ? "resume" : "pause" }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.recurring.updateFailed);
      }
      setRules((prev) => prev.map((item) => (item.id === rule.id ? payload.data : item)));
      setSuccess(
        shouldResume
          ? t.recurring.resumed
          : t.recurring.paused
      );
    } catch (requestError) {
      setError(safeMessage(requestError, t.recurring.updateFailed));
    }
  }

  async function deleteRule(ruleId) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/recurring/${ruleId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || t.recurring.deleteFailed);
      }
      setRules((prev) => prev.filter((item) => item.id !== ruleId));
      setSuccess(t.recurring.deleted);
      setPendingDeleteId("");
    } catch (requestError) {
      setError(safeMessage(requestError, t.recurring.deleteFailed));
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff6da_0%,#eef7ff_36%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 p-6 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)]">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/45" />
          <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/45" />
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            {t.recurring.title}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-700">
            {t.recurring.description}
          </p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border-2 border-slate-900 bg-white/95 p-5 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.4)]"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-amber-50 to-white p-3 sm:col-span-2">
              <FieldLabel>{t.recurring.titleLabel}</FieldLabel>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={t.recurring.titlePlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-sky-50 to-white p-3">
              <FieldLabel>{t.recurring.amountLabel}</FieldLabel>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder={t.recurring.amountPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-rose-50 to-white p-3">
              <FieldLabel>{t.recurring.typeLabel}</FieldLabel>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item === "income"
                      ? t.transactions.income
                      : t.transactions.expense}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-cyan-50 to-white p-3">
              <FieldLabel>{t.recurring.categoryLabel}</FieldLabel>
              <input
                type="text"
                list="recurring-category-options"
                value={form.categoryName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryName: event.target.value }))
                }
                placeholder={t.recurring.categoryPlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
              <datalist id="recurring-category-options">
                {categoryOptions.map((item) => (
                  <option key={item.rawName} value={item.label} />
                ))}
              </datalist>
              {categoryOptions.length ? (
                <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {categoryOptions.map((item) => {
                    const isActive =
                      toCanonicalCategoryName(form.categoryName).toLowerCase() ===
                      toCanonicalCategoryName(item.rawName).toLowerCase();
                    return (
                      <button
                        key={item.rawName}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, categoryName: item.label }))}
                        className={
                          isActive
                            ? "rounded-full border-2 border-slate-900 bg-amber-300 px-3 py-1 text-xs font-bold text-slate-900"
                            : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-900"
                        }
                      >
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-1.5 text-xs text-slate-500">
                {t.recurring.categoryHint}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-indigo-50 to-white p-3">
              <FieldLabel>{t.recurring.frequencyLabel}</FieldLabel>
              <select
                value={form.frequency}
                onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              >
                {FREQUENCY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item === "daily"
                      ? t.recurring.daily
                      : item === "weekly"
                      ? t.recurring.weekly
                      : t.recurring.monthly}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-emerald-50 to-white p-3 sm:col-span-2">
              <FieldLabel>{t.recurring.startDateLabel}</FieldLabel>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {t.recurring.startDateHint}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-rose-50 to-white p-3 sm:col-span-2">
              <FieldLabel>{t.recurring.noteLabel}</FieldLabel>
              <input
                type="text"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder={t.recurring.notePlaceholder}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl border-2 border-slate-900 bg-gradient-to-r from-cyan-400 to-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:brightness-105 disabled:opacity-60"
          >
            {isSubmitting
              ? t.recurring.creating
              : t.recurring.createButton}
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
            {success}
          </p>
        ) : null}

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.4)]">
          <h2 className="text-lg font-extrabold tracking-tight text-slate-900">
            {t.recurring.listTitle}
          </h2>

          {isLoading ? (
            <p className="mt-3 text-sm text-slate-500">{t.recurring.loading}</p>
          ) : rules.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {t.recurring.empty}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <article
                  key={rule.id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-r from-white to-sky-50 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-slate-900">{rule.title}</p>
                      <p className="text-sm text-slate-500">
                        {rule.type === "income"
                          ? t.transactions.income
                          : t.transactions.expense}{" "}
                        | {formatCurrency(rule.amount, rule.account?.currency || "RM")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.frequency === "daily"
                          ? t.recurring.daily
                          : rule.frequency === "weekly"
                          ? t.recurring.weekly
                          : t.recurring.monthly}
                      </p>
                      <p className="text-xs text-slate-500">
                        {t.recurring.nextRun + ": " + formatRuleDate(rule.nextRunDate, locale)}
                      </p>
                      {rule.note ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {t.recurring.notePreviewLabel + ": " + rule.note}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        rule.isActive
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-slate-200 bg-white text-slate-600"
                      }`}
                    >
                      {rule.isActive
                        ? t.recurring.active
                        : t.recurring.pausedLabel}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule, !rule.isActive)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      {rule.isActive
                        ? t.recurring.pause
                        : t.recurring.resume}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(rule.id)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                    >
                      {t.recurring.delete}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {pendingDeleteId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-900 bg-white p-5 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.45)]">
            <h3 className="text-lg font-extrabold text-slate-900">
              {t.recurring.deleteConfirmTitle}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t.recurring.deleteConfirmDesc}
            </p>
            <div className="mt-4 flex gap-3">
              <button
                type="button"
                onClick={() => setPendingDeleteId("")}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={() => deleteRule(pendingDeleteId)}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-400"
              >
                {t.common.ok}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
