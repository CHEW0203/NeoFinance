import Link from "next/link";
import { formatCurrency } from "@/utils/format";

export function BalancePie({
  totalBalance = 0,
  monthlyExpense = 0,
  monthlyIncome = 0,
  currency = "RM",
  labels = {},
  expenseHref = "/report?type=expense",
  incomeHref = "/report?type=income",
}) {
  const balance = totalBalance;
  const expense = Math.max(monthlyExpense, 0);
  const income = Math.max(monthlyIncome, 0);
  const total = expense + income;
  const expensePercent = total > 0 ? Math.round((expense / total) * 100) : 50;
  const incomePercent = Math.max(0, 100 - expensePercent);

  const gradientStyle = {
    background: `conic-gradient(#f6c953 0% ${expensePercent}%, #49b4dc ${expensePercent}% ${expensePercent + incomePercent}%, #f6c953 ${expensePercent + incomePercent}% 100%)`,
  };

  return (
    <section className="w-full rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.35)]">
      <div className="mb-4 grid grid-cols-2 gap-3">
        <Link
          href={expenseHref}
          className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 transition hover:border-amber-300 hover:bg-amber-100"
        >
          <p className="text-sm font-semibold text-amber-700">
            {labels.dayExpense || "Expense"}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(expense, currency)}
          </p>
        </Link>
        <Link
          href={incomeHref}
          className="rounded-2xl border border-cyan-200 bg-cyan-50 px-3 py-2 text-right transition hover:border-cyan-300 hover:bg-cyan-100"
        >
          <p className="text-sm font-semibold text-cyan-700">
            {labels.dayIncome || "Income"}
          </p>
          <p className="text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(income, currency)}
          </p>
        </Link>
      </div>
      <div
        className="relative mx-auto h-60 w-60 rounded-full p-6 sm:h-64 sm:w-64"
        style={gradientStyle}
      >
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              {labels.balance || "Balance"}
            </p>
            <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
              {formatCurrency(balance, currency)}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
