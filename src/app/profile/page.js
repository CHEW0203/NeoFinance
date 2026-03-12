"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { LogoutButton } from "@/components/logout-button";
import { fetchProfile, updateProfile } from "@/services/auth-api";
import { fetchTransactions } from "@/services/transaction-api";
import { useLanguage } from "@/hooks/use-language";
import { formatCurrency } from "@/utils/format";

const LOCALE_BY_LANGUAGE = {
  en: "en-US",
  zh: "zh-CN",
  ms: "ms-MY",
};

function dateValue(date, language) {
  const locale = LOCALE_BY_LANGUAGE[language] || "en-US";
  return new Date(date).toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function ProfilePage() {
  const { t, language } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function loadAll() {
    setIsLoading(true);
    setError("");
    try {
      const [profileResult, txnRows] = await Promise.all([
        fetchProfile(),
        fetchTransactions({ limit: 300 }),
      ]);
      setProfile(profileResult.user);
      setUsername(profileResult.user.username);
      setRows(txnRows || []);
    } catch (requestError) {
      setError(t.profile.loadFailed);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const incomeRows = useMemo(() => {
    return rows
      .filter((item) => item.type === "income")
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [rows]);

  const expenseRows = useMemo(() => {
    return rows
      .filter((item) => item.type === "expense")
      .sort((a, b) => new Date(b.transactionDate) - new Date(a.transactionDate));
  }, [rows]);

  const incomeTotal = useMemo(() => {
    return incomeRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [incomeRows]);

  const expenseTotal = useMemo(() => {
    return expenseRows.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }, [expenseRows]);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await updateProfile({
        username: username.trim(),
        password: password.trim() || undefined,
      });
      setPassword("");
      setSuccess(t.profile.updated);
      await loadAll();
    } catch (requestError) {
      setError(t.profile.updateFailed);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_36%,#e8f3ff_100%)] px-6 py-10 text-slate-900 lg:px-10">
        <div className="mx-auto w-full max-w-5xl">
          <BackButton fallbackHref="/" />
          <p className="mt-6 text-sm text-slate-600">{t.profile.loadingProfile}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_36%,#e8f3ff_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <BackButton fallbackHref="/" />

        <section className="relative overflow-hidden rounded-[2rem] border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 p-8 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.4)]">
          <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/40" />
          <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/40" />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-800">
                {t.profile.title}
              </p>
              <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-950">
                {profile?.username}
              </h1>
              <p className="mt-1 text-sm font-medium text-slate-600">
                {t.profile.memberSince}{" "}
                {profile?.createdAt ? dateValue(profile.createdAt, language) : "-"}
              </p>
            </div>
            <LogoutButton />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {t.profile.transactions}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {profile?.transactionCount || 0}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-200 bg-gradient-to-r from-cyan-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-cyan-700">
                {t.profile.totalIncome}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(incomeTotal, "RM")}
              </p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-amber-700">
                {t.profile.totalExpense}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(expenseTotal, "RM")}
              </p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-700">
                {t.profile.savings}
              </p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">
                {formatCurrency(profile?.savingsAmount || 0, "RM")}
              </p>
            </div>
          </div>

          <form className="mt-6 space-y-4 rounded-3xl border-2 border-slate-900/15 bg-white/85 p-5" onSubmit={handleSave}>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder={t.auth.username}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t.profile.newPassword}
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base outline-none focus:border-cyan-600"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl border-2 border-slate-900 bg-cyan-400 px-5 py-3 text-base font-bold text-slate-900 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? t.profile.saving : t.profile.saveProfile}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}
        </section>

        <section className="grid gap-5 md:grid-cols-2">
          <article className="rounded-3xl border-2 border-slate-900 bg-white/95 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {t.profile.incomeTransactions}
            </h2>
            <div className="mt-3 space-y-2">
              {incomeRows.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-cyan-50/50 to-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{dateValue(row.transactionDate, language)}</p>
                  </div>
                  <p className="text-sm font-semibold text-cyan-700">+{formatCurrency(row.amount, "RM")}</p>
                </div>
              ))}
              {incomeRows.length === 0 ? (
                <p className="text-sm text-slate-500">{t.profile.noIncomeTransactions}</p>
              ) : null}
            </div>
          </article>

          <article className="rounded-3xl border-2 border-slate-900 bg-white/95 p-5 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {t.profile.expenseTransactions}
            </h2>
            <div className="mt-3 space-y-2">
              {expenseRows.slice(0, 8).map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-gradient-to-r from-amber-50/60 to-white px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{row.title}</p>
                    <p className="text-xs text-slate-500">{dateValue(row.transactionDate, language)}</p>
                  </div>
                  <p className="text-sm font-semibold text-amber-700">-{formatCurrency(row.amount, "RM")}</p>
                </div>
              ))}
              {expenseRows.length === 0 ? (
                <p className="text-sm text-slate-500">{t.profile.noExpenseTransactions}</p>
              ) : null}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
