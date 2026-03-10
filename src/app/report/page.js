import { BackButton } from "@/components/back-button";

export default function ReportPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" />
        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Report</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              1 Month
            </button>
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              6 Months
            </button>
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              1 Year
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">
            Detailed report analytics will be expanded here.
          </p>
        </section>
      </div>
    </main>
  );
}
