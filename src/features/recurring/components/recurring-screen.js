"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocalDateKey } from "@/utils/date-key";
import { formatCurrency } from "@/utils/format";

const TYPE_OPTIONS = ["expense", "income"];
const FREQUENCY_OPTIONS = ["daily", "weekly", "monthly"];

function formatRuleDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
}

function safeMessage(error, fallback) {
  return error?.message || fallback;
}

function toPositiveNumber(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function FieldLabel({ children }) {
  return (
    <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
      {children}
    </p>
  );
}

export function RecurringScreen() {
  const { t } = useLanguage();
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

  const categoryOptions = useMemo(
    () =>
      filteredCategories
        .map((item) => String(item.name || "").trim())
        .filter(Boolean),
    [filteredCategories]
  );

  async function loadData() {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch("/api/recurring", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to load recurring transactions.");
      }
      const nextRules = payload.data || [];
      const nextCategories = payload.categories || [];

      setRules(nextRules);
      setCategories(nextCategories);
    } catch (requestError) {
      setError(safeMessage(requestError, "Failed to load recurring transactions."));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const amount = toPositiveNumber(form.amount);
    if (!amount) {
      setError(t.recurring?.amountInvalid || "Amount must be greater than 0.");
      return;
    }
    if (!form.title.trim()) {
      setError(t.recurring?.titleRequired || "Title is required.");
      return;
    }
    if (!form.categoryName.trim()) {
      setError(t.recurring?.selectCategory || "Please select or type a category.");
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
          categoryName: form.categoryName.trim(),
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to create recurring transaction.");
      }

      setForm((prev) => ({
        ...prev,
        title: "",
        note: "",
        amount: "",
        categoryName: "",
      }));
      setSuccess(t.recurring?.createdActive || "Recurring transaction created and activated.");
      await loadData();
      window.dispatchEvent(new Event("neo:transactions-updated"));
    } catch (requestError) {
      setError(safeMessage(requestError, "Failed to create recurring transaction."));
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
        throw new Error(payload.message || "Failed to update recurring transaction.");
      }
      setRules((prev) => prev.map((item) => (item.id === rule.id ? payload.data : item)));
      setSuccess(
        shouldResume
          ? t.recurring?.resumed || "Recurring transaction resumed."
          : t.recurring?.paused || "Recurring transaction paused."
      );
    } catch (requestError) {
      setError(safeMessage(requestError, "Failed to update recurring transaction."));
    }
  }

  async function deleteRule(ruleId) {
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/recurring/${ruleId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Failed to delete recurring transaction.");
      }
      setRules((prev) => prev.filter((item) => item.id !== ruleId));
      setSuccess(t.recurring?.deleted || "Recurring transaction deleted.");
      setPendingDeleteId("");
    } catch (requestError) {
      setError(safeMessage(requestError, "Failed to delete recurring transaction."));
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" preferFallback />

        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t.recurring?.title || "Recurring Transactions"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {t.recurring?.description ||
              "Automatically create salary, rent, utilities, and other repeating records."}
          </p>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-3xl border border-slate-300 bg-white p-5 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <FieldLabel>{t.recurring?.titleLabel || "Title"}</FieldLabel>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder={t.recurring?.titlePlaceholder || "Title (example: Salary)"}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <FieldLabel>{t.recurring?.amountLabel || "Amount"}</FieldLabel>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={form.amount}
                onChange={(event) => setForm((prev) => ({ ...prev, amount: event.target.value }))}
                placeholder={t.recurring?.amountPlaceholder || "Amount"}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
                required
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <FieldLabel>{t.recurring?.typeLabel || "Type"}</FieldLabel>
              <select
                value={form.type}
                onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
              >
                {TYPE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item === "income"
                      ? t.transactions?.income || "Income"
                      : t.transactions?.expense || "Expense"}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <FieldLabel>{t.recurring?.categoryLabel || "Category"}</FieldLabel>
              <input
                type="text"
                list="recurring-category-options"
                value={form.categoryName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, categoryName: event.target.value }))
                }
                placeholder={t.recurring?.categoryPlaceholder || "Type category or choose suggestion"}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
              />
              <datalist id="recurring-category-options">
                {categoryOptions.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>
              {categoryOptions.length ? (
                <div className="mt-2 flex max-h-24 flex-wrap gap-2 overflow-y-auto">
                  {categoryOptions.map((name) => {
                    const isActive = form.categoryName.trim().toLowerCase() === name.toLowerCase();
                    return (
                      <button
                        key={name}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, categoryName: name }))}
                        className={
                          isActive
                            ? "rounded-full border border-cyan-300 bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-900"
                            : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-cyan-200 hover:bg-cyan-50 hover:text-cyan-900"
                        }
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              ) : null}
              <p className="mt-1.5 text-xs text-slate-500">
                {t.recurring?.categoryHint ||
                  "You can type your own category. AI will try to match a suitable icon."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <FieldLabel>{t.recurring?.frequencyLabel || "Frequency"}</FieldLabel>
              <select
                value={form.frequency}
                onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value }))}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-slate-800"
              >
                {FREQUENCY_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item === "daily"
                      ? t.recurring?.daily || "Daily"
                      : item === "weekly"
                      ? t.recurring?.weekly || "Weekly"
                      : t.recurring?.monthly || "Monthly"}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <FieldLabel>{t.recurring?.startDateLabel || "Start date"}</FieldLabel>
              <input
                type="date"
                value={form.startDate}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, startDate: event.target.value }))
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
                required
              />
              <p className="mt-1.5 text-xs text-slate-500">
                {t.recurring?.startDateHint ||
                  "This rule starts from the selected date. No end date is required."}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:col-span-2">
              <FieldLabel>{t.recurring?.noteLabel || "Note (optional)"}</FieldLabel>
              <input
                type="text"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder={t.recurring?.notePlaceholder || "Note (optional)"}
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-slate-800"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:opacity-60"
          >
            {isSubmitting
              ? t.recurring?.creating || "Creating..."
              : t.recurring?.createButton || "Create recurring transaction"}
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}

        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            {t.recurring?.listTitle || "Your recurring rules"}
          </h2>

          {isLoading ? (
            <p className="mt-3 text-sm text-slate-500">{t.recurring?.loading || "Loading..."}</p>
          ) : rules.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              {t.recurring?.empty || "No recurring transactions yet."}
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {rules.map((rule) => (
                <article key={rule.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{rule.title}</p>
                      <p className="text-sm text-slate-500">
                        {rule.type === "income"
                          ? t.transactions?.income || "Income"
                          : t.transactions?.expense || "Expense"}{" "}
                        | {formatCurrency(rule.amount, rule.account?.currency || "RM")}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {rule.frequency === "daily"
                          ? t.recurring?.daily || "Daily"
                          : rule.frequency === "weekly"
                          ? t.recurring?.weekly || "Weekly"
                          : t.recurring?.monthly || "Monthly"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {(t.recurring?.nextRun || "Next run") + ": " + formatRuleDate(rule.nextRunDate)}
                      </p>
                      {rule.note ? (
                        <p className="mt-1 text-xs text-slate-500">
                          {(t.recurring?.notePreviewLabel || "Note") + ": " + rule.note}
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
                        ? t.recurring?.active || "Active"
                        : t.recurring?.pausedLabel || "Paused"}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRule(rule, !rule.isActive)}
                      className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                    >
                      {rule.isActive
                        ? t.recurring?.pause || "Pause"
                        : t.recurring?.resume || "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(rule.id)}
                      className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700"
                    >
                      {t.recurring?.delete || "Delete"}
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
          <div className="w-full max-w-sm rounded-3xl border border-slate-300 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">
              {t.recurring?.deleteConfirmTitle || "Delete this recurring transaction?"}
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              {t.recurring?.deleteConfirmDesc || "You can create it again later if needed."}
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
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-semibold text-white"
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
