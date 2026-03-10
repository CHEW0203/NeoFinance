"use client";

import Link from "next/link";
import { useLoginForm } from "@/hooks/use-auth-form";
import { BackButton } from "@/components/back-button";

export function LoginScreen({ nextPath = "/transactions" }) {
  const { form, setForm, error, isSubmitting, submit } = useLoginForm(nextPath);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#f8fafc_35%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/70 bg-white/85 p-8 shadow-[0_28px_70px_-36px_rgba(15,23,42,0.45)] backdrop-blur">
          <BackButton fallbackHref="/" />
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-700">
            NeoFinance Access
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            Login to protect your financial privacy
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
            Your records stay tied to your account so only you can manage budgets,
            transactions, and personal reports.
          </p>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <input
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, username: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, password: event.target.value }))
              }
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-500"
              required
            />

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input
                type="checkbox"
                checked={form.rememberMe}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, rememberMe: event.target.checked }))
                }
                className="h-4 w-4"
              />
              Remember me
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Signing in..." : "Login"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <p className="mt-6 text-sm text-slate-600">
            No account yet?{" "}
            <Link href="/register" className="font-semibold text-indigo-700">
              Register here
            </Link>
          </p>
        </section>

        <aside className="rounded-[2rem] border border-indigo-100 bg-indigo-50/90 p-8 shadow-[0_24px_60px_-30px_rgba(30,64,175,0.45)]">
          <h2 className="text-2xl font-semibold tracking-tight text-indigo-950">
            Why login first?
          </h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-indigo-900">
            <li>Protect sensitive spending history and personal finance trends.</li>
            <li>Keep your report insights private to your own account.</li>
            <li>Enable account-level budgeting and data continuity.</li>
          </ul>
        </aside>
      </div>
    </main>
  );
}
