"use client";

import { useState } from "react";
import Link from "next/link";
import { useLoginForm } from "@/hooks/use-auth-form";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";

export function LoginScreen({ nextPath = "/transactions" }) {
  const { t } = useLanguage();
  const { form, setForm, error, isSubmitting, submit } = useLoginForm(nextPath, {
    loginFailed: t.auth.loginFailed,
  });
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_35%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-2xl">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur">
          <BackButton fallbackHref="/" />
          <p className="text-lg font-semibold uppercase tracking-[0.28em] text-indigo-700">
            {t.auth.access}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
            {t.auth.loginTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[13px] leading-6 text-slate-600">{t.auth.loginDesc}</p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <input
              type="text"
              placeholder={t.auth.username}
              value={form.username}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[13px] outline-none focus:border-indigo-500"
              required
            />
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder={t.auth.password}
                value={form.password}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, password: event.target.value }))
                }
                className={`w-full appearance-none rounded-2xl border border-slate-300 bg-white px-4 py-3 text-[13px] outline-none focus:border-indigo-500 ${
                  form.password ? "pr-12" : ""
                }`}
                required
                autoComplete="current-password"
              />
              {form.password ? (
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
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-[13px] text-slate-600">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))
                }
                className="h-4 w-4"
              />
              {t.auth.rememberMe}
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-[13px] font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? t.auth.signingIn : t.common.login}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <p className="mt-6 text-[13px] text-slate-600">
            {t.auth.noAccount}{" "}
            <Link href="/register" className="font-semibold text-indigo-700">
              {t.auth.registerHere}
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
