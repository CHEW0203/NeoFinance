"use client";

import Link from "next/link";
import { useRegisterForm } from "@/hooks/use-auth-form";
import { BackButton } from "@/components/back-button";

export default function RegisterPage() {
  const { form, setForm, error, isSubmitting, submit } = useRegisterForm();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#dcfce7_0%,#f8fafc_35%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.45)] backdrop-blur">
        <BackButton fallbackHref="/login" />
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-700">
          Create NeoFinance Account
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
          Register and start your private finance journey
        </h1>

        <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={submit}>
          <input
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, username: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 md:col-span-2"
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 characters)"
            value={form.password}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, password: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            required
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={form.confirmPassword}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))
            }
            className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60 md:col-span-2"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <p className="mt-6 text-sm text-slate-600">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-emerald-700">
            Login here
          </Link>
        </p>
      </div>
    </main>
  );
}
