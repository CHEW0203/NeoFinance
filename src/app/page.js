import Link from "next/link";
import { BalancePie } from "@/features/dashboard/components/balance-pie";
import { TopNav } from "@/features/dashboard/components/top-nav";
import { getDashboardSnapshot } from "@/lib/dashboard-data";
import { getLocaleFromLanguage } from "@/lib/i18n";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getServerDictionary } from "@/lib/i18n/server";
import { formatCurrency } from "@/utils/format";

const ICONS = {
  BREAKFAST: "\u{1F373}",
  LUNCH: "\u{1F35C}",
  DINNER: "\u{1F37D}\uFE0F",
  FOOD: "\u{1F354}",
  SNACK: "\u{1F36A}",
  DRINKS: "\u{1F964}",
  TRANSPORT: "\u{1F68C}",
  GIFT: "\u{1F381}",
  SHOPPING: "\u{1F6CD}\uFE0F",
  RENT: "\u{1F3E0}",
  UTILITIES: "\u{1F4A1}",
  HEALTH: "\u{1F48A}",
  SALARY: "\u{1F4BC}",
  ALLOWANCE: "\u{1F4B0}",
  BONUS: "\u{1F3C6}",
  FREELANCE: "\u{1F4BB}",
  INVESTMENT: "\u{1F4C8}",
  REFUND: "\u{1F4B3}",
  BOX: "\u{1F4E6}",
};

function isCorruptIcon(icon) {
  const value = String(icon || "");
  if (!value) return true;
  if (value.includes("?")) return true;
  if (!/\p{Extended_Pictographic}/u.test(value)) return true;
  return false;
}

function categoryIcon(category) {
  const rawIcon = String(category?.icon || "");
  if (!isCorruptIcon(rawIcon)) return rawIcon;

  const value = String(category?.name || "").toLowerCase();
  if (value.includes("breakfast")) return ICONS.BREAKFAST;
  if (value.includes("lunch")) return ICONS.LUNCH;
  if (value.includes("dinner")) return ICONS.DINNER;
  if (value.includes("food")) return ICONS.FOOD;
  if (value.includes("snack")) return ICONS.SNACK;
  if (value.includes("drink")) return ICONS.DRINKS;
  if (value.includes("transport")) return ICONS.TRANSPORT;
  if (value.includes("gift")) return ICONS.GIFT;
  if (value.includes("shopping")) return ICONS.SHOPPING;
  if (value.includes("rent")) return ICONS.RENT;
  if (value.includes("utility")) return ICONS.UTILITIES;
  if (value.includes("health")) return ICONS.HEALTH;
  if (value.includes("salary")) return ICONS.SALARY;
  if (value.includes("allowance")) return ICONS.ALLOWANCE;
  if (value.includes("bonus")) return ICONS.BONUS;
  if (value.includes("freelance")) return ICONS.FREELANCE;
  if (value.includes("investment")) return ICONS.INVESTMENT;
  if (value.includes("refund")) return ICONS.REFUND;
  if (category?.type === "income") return ICONS.SALARY;
  return ICONS.BOX;
}

export default async function Home() {
  const { language, t } = await getServerDictionary();
  const locale = getLocaleFromLanguage(language);
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
        label: new Date(row.transactionDate).toLocaleDateString(locale, {
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

  const monthLabel = new Date().toLocaleDateString(locale, {
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
            monthlyIncome={stats.monthlyIncome}
            currency={stats.currency === "MYR" ? "RM" : stats.currency}
            labels={t.dashboard}
            expenseHref="/report?type=expense"
                      incomeHregit status
                      git add .
                  git commit -m "Restore stable NeoFinance codebase"
git push origin main --force-with-leasegit statusf="/report?type=income"
          />

          <Link
            href={plusHref}
            className="relative -top-1 -left-1 flex h-16 w-16 items-center justify-center rounded-full border-2 border-rose-400 bg-rose-300 text-5xl font-bold leading-none text-white shadow-[0_18px_40px_-20px_rgba(251,113,133,0.8)] transition hover:bg-rose-200"
            aria-label={t.dashboard.addTransaction}
            title={t.dashboard.addTransaction}
          >
            <span className="relative -top-1">+</span>
          </Link>
        </div>

        <section className="space-y-4 pb-8">
          {dateGroups.length === 0 ? (
            <div className="rounded-3xl border border-slate-300 bg-white p-5 text-center text-sm text-slate-500">
              {t.dashboard.noTransactions}
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
                            {item.category?.name
                              ? getLocalizedCategoryLabel(item.category.name, language)
                              : t.dashboard.others}
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
