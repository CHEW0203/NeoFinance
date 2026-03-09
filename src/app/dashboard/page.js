import { SummaryCard } from "@/features/dashboard/components/summary-card";
import { dashboardHighlights } from "@/lib/data/mock-dashboard";

export const metadata = {
  title: "Dashboard | Financial Tracker and Analysis",
};

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white lg:px-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8">
          <p className="text-sm uppercase tracking-[0.25em] text-emerald-300">
            Dashboard preview
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Your finance overview starts here
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
            This page is a safe placeholder for your first real dashboard.
            Later we can connect it to Prisma queries and chart components.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {dashboardHighlights.map((item) => (
            <SummaryCard key={item.label} {...item} dark />
          ))}
        </section>
      </div>
    </main>
  );
}
