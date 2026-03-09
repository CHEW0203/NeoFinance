import Link from "next/link";
import { SummaryCard } from "@/features/dashboard/components/summary-card";
import { dashboardHighlights, quickActions } from "@/lib/data/mock-dashboard";

export default function Home() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e8f4ec_0%,#f7f5ef_42%,#f2ede3_100%)] text-slate-900">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 py-10 lg:px-10">
        <header className="flex flex-col gap-8 rounded-[2rem] border border-white/70 bg-white/80 p-8 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] backdrop-blur md:p-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700">
                Finance Tracking and Analysis
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Start with a clear money dashboard before building every feature.
              </h1>
              <p className="max-w-2xl text-base leading-8 text-slate-600 md:text-lg">
                This starter is set up for transaction tracking, budget planning,
                account summaries, and future analytics modules with Next.js and
                Prisma.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href="/dashboard"
                className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Open starter dashboard
              </Link>
              <Link
                href="/transactions"
                className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
              >
                View transaction module
              </Link>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {dashboardHighlights.map((item) => (
              <SummaryCard key={item.label} {...item} />
            ))}
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] bg-slate-950 p-8 text-slate-50 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.6)]">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-emerald-300">
              Suggested build order
            </p>
            <div className="mt-6 grid gap-4">
              {quickActions.map((item, index) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm text-emerald-300">Step {index + 1}</p>
                  <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-slate-300">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6 rounded-[2rem] border border-amber-200 bg-amber-50/90 p-8 shadow-[0_20px_50px_-30px_rgba(146,64,14,0.45)]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-700">
                Initial stack
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-amber-950">
                <li>Next.js App Router for frontend and backend routes</li>
                <li>React components inside feature-based folders</li>
                <li>Prisma ORM with SQLite for easy local startup</li>
                <li>Easy path alias with `@/` from `src`</li>
              </ul>
            </div>
            <div className="rounded-3xl bg-white p-5 text-sm leading-7 text-slate-700">
              Once the basics are stable, we can add authentication, charts,
              recurring transactions, monthly reports, and AI-based insights on
              top of this structure.
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
