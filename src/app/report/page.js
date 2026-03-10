import { BackButton } from "@/components/back-button";
import { getServerDictionary } from "@/lib/i18n/server";

export default async function ReportPage() {
  const { t } = await getServerDictionary();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" />
        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">{t.pages.report}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              {t.pages.month1}
            </button>
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              {t.pages.month6}
            </button>
            <button type="button" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold">
              {t.pages.year1}
            </button>
          </div>
          <p className="mt-4 text-sm text-slate-500">{t.pages.reportDesc}</p>
        </section>
      </div>
    </main>
  );
}
