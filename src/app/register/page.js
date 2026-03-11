"use client";

import { useState } from "react";
import Link from "next/link";
import { useRegisterForm } from "@/hooks/use-auth-form";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";

export default function RegisterPage() {
  const { t } = useLanguage();
  const { form, setForm, error, isSubmitting, submit } = useRegisterForm({
    passwordMismatch: t.auth.passwordMismatch,
    passwordTooShort: t.auth.passwordTooShort,
    registerFailed: t.auth.registerFailed,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f8fafc_35%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
        <BackButton fallbackHref="/login" />
        <p className="text-lg font-semibold uppercase tracking-[0.28em] text-emerald-700">
          {t.auth.createTitle}
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          {t.auth.createDesc}
        </h1>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <input
            type="text"
            placeholder={t.auth.username}
            value={form.username}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, username: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[13px] outline-none focus:border-emerald-600 md:col-span-2"
            required
          />
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder={t.auth.passwordHint}
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-[13px] outline-none focus:border-emerald-600"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
              aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
              title={showPassword ? t.auth.hidePassword : t.auth.showPassword}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3L21 21M10.58 10.58A2 2 0 0013.42 13.42M9.88 4.24A10.94 10.94 0 0112 4c7 0 10 8 10 8a15.9 15.9 0 01-4.12 5.06M6.61 6.61C3.97 8.42 2 12 2 12a15.9 15.9 0 004.12 5.06A10.94 10.94 0 0012 20c1.61 0 3.09-.31 4.39-.87"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 12S5 4 12 4s10 8 10 8-3 8-10 8S2 12 2 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder={t.auth.confirmPassword}
              value={form.confirmPassword}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 pr-12 text-[13px] outline-none focus:border-emerald-600"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-slate-800"
              aria-label={
                showConfirmPassword ? t.auth.hideConfirmPassword : t.auth.showConfirmPassword
              }
              title={
                showConfirmPassword ? t.auth.hideConfirmPassword : t.auth.showConfirmPassword
              }
            >
              {showConfirmPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M3 3L21 21M10.58 10.58A2 2 0 0013.42 13.42M9.88 4.24A10.94 10.94 0 0112 4c7 0 10 8 10 8a15.9 15.9 0 01-4.12 5.06M6.61 6.61C3.97 8.42 2 12 2 12a15.9 15.9 0 004.12 5.06A10.94 10.94 0 0012 20c1.61 0 3.09-.31 4.39-.87"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M2 12S5 4 12 4s10 8 10 8-3 8-10 8S2 12 2 12Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              )}
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {isSubmitting ? t.auth.creatingAccount : t.auth.createAccount}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-[13px] text-slate-600">
          {t.auth.hasAccount}{" "}
          <Link href="/login" className="font-semibold text-emerald-700">
            {t.auth.loginHere}
          </Link>
        </p>
      </div>
    </main>
  );
}
