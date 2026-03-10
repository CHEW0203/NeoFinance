import Link from "next/link";
import { BalancePie } from "@/features/dashboard/components/balance-pie";
import { TopNav } from "@/features/dashboard/components/top-nav";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { formatCurrency } from "@/utils/format";

function categoryIcon(category) {
  if (category?.icon) return category.icon;
  const name = category?.name;
  const value = String(name || "").toLowerCase();
  if (value.includes("salary")) return "💼";
  if (value.includes("allowance")) return "💰";
  if (value.includes("bonus")) return "🏆";
  if (value.includes("income")) return "📈";
  if (value.includes("food")) return "🍜";
  if (value.includes("transport")) return "🚌";
  if (value.includes("gift")) return "🎁";
  if (category?.type === "income") return "💼";
  return "📦";
}

export default async function Home() {
  const snapshot = await getDashboardSnapshot();
  const currentUser = snapshot?.user || null;
  const stats = snapshot?.stats || {
    totalBalance: 0,
    monthlyExpense: 0,
    monthlyIncome: 0,
    currency: "MYR",
  };
  const recentTransactions = snapshot?.recentTransactions || [];
  const plusHref = currentUser ? "/transactions" : "/login?next=/transactions";

  const dateGroups = [];
  const dateMap = new Map();
  for (const row of recentTransactions) {
    const key = new Date(row.transactionDate).toDateString();
    if (!dateMap.has(key)) {
      const group = {
        key,
        label: new Date(row.transactionDate).toLocaleDateString(undefined, {
          weekday: "short",
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        items: [],
      };
      dateMap.set(key, group);
      dateGroups.push(group);
    }
    dateMap.get(key).items.push(row);
  }

  const monthLabel = new Date().toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-10">
      <section className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <TopNav monthLabel={monthLabel} currentUser={currentUser} />

        <div className="flex flex-col items-center justify-center gap-5">
          <BalancePie
            totalBalance={stats.totalBalance}
            monthlyExpense={stats.monthlyExpense}
            currency={stats.currency === "MYR" ? "RM" : stats.currency}
          />

          <Link
            href={plusHref}
            className="relative -top-1 -left-1 flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400 bg-rose-300 text-5xl font-bold leading-none text-white shadow-[0_18px_40px_-20px_rgba(251,113,133,0.8)] transition hover:bg-rose-200"
            aria-label="Add transaction"
            title="Add transaction"
          >
            <span className="relative -top-1">+</span>
          </Link>
        </div>

        <section className="space-y-4 pb-8">
          {dateGroups.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
              No transactions yet. Tap + to add your first record.
            </div>
          ) : null}

          {dateGroups.map((group) => {
            const dayTotal = group.items.reduce((sum, item) => {
              return sum + (item.type === "income" ? item.amount : -item.amount);
            }, 0);

            return (
              <article
                key={group.key}
                className="overflow-hidden rounded-3xl border-2 border-slate-900 bg-white"
              >
                <header className="flex items-center justify-between border-b-2 border-slate-900 px-5 py-4">
                  <p className="text-lg font-semibold text-slate-900">{group.label}</p>
                  <p
                    className={`text-lg font-semibold ${
                      dayTotal < 0 ? "text-amber-500" : "text-emerald-600"
                    }`}
                  >
                    {dayTotal < 0 ? "-" : "+"}
                    {formatCurrency(Math.abs(dayTotal), "RM")}
                  </p>
                </header>
                <div className="divide-y divide-slate-200">
                  {group.items.map((item) => (
                    <Link
                      key={item.id}
                      href={`/transactions?recordId=${item.id}`}
                      className="flex items-center justify-between px-5 py-4 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-xl">
                          {categoryIcon(item.category)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">
                            {item.category?.name || "Others"}
                          </p>
                          <p className="text-sm text-slate-500">{item.title}</p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-slate-900">
                        {item.type === "income" ? "+" : "-"}
                        {formatCurrency(item.amount, "RM")}
                      </p>
                    </Link>
                  ))}
                </div>
              </article>
            );
          })}
        </section>
      </section>
    </main>
  );
}
