import Link from "next/link";
import { formatCurrency } from "@/utils/format";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function formatCompactCurrency(amount, currency = "RM") {
  const value = Number(amount || 0);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000_000)}M`;
  }
  if (abs >= 10_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000)}K`;
  }
  return formatCurrency(value, currency);
}

export function BalancePie({
  totalBalance = 0,
  monthlyExpense = 0,
  monthlyIncome = 0,
  savingsBalance = 0,
  currency = "RM",
  labels = {},
  expenseHref = "/report?type=expense",
  incomeHref = "/report?type=income",
  budgetBar = null,
  forecastWidget = null,
}) {
  const balance = totalBalance;
  const expense = Math.max(monthlyExpense, 0);
  const income = Math.max(monthlyIncome, 0);
  const total = expense + income;
  const expensePercent = total > 0 ? Math.round((expense / total) * 100) : 50;
  const incomePercent = Math.max(0, 100 - expensePercent);
  const capacity = Math.max(income, expense, Math.abs(balance) + expense, 1);
  const liquidLevel = clamp(balance <= 0 ? 0.06 : balance / capacity, 0.06, 0.95);
  const fullBalanceLabel = formatCurrency(balance, currency);
  const compactBalanceLabel = formatCompactCurrency(balance, currency);
  const isLongBalanceLabel = compactBalanceLabel.length >= 9;

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
            {labels.dayExpense}
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
            {labels.dayIncome}
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
        {forecastWidget ? <div className="absolute -right-2 -top-2 z-10">{forecastWidget}</div> : null}
        <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-cyan-100 bg-white text-center">
          <div
            className="liquid-fill absolute inset-x-0 bottom-0 z-0 transition-[height] duration-700"
            style={{ height: `${Math.round(liquidLevel * 100)}%` }}
            aria-hidden="true"
          >
            <span className="liquid-surface liquid-surface-a" />
            <span className="liquid-surface liquid-surface-b" />
          </div>
          <div className="relative z-10 px-3 py-3">
            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">{labels.balance}</p>
            <p
              className={`mx-auto mt-2 max-w-[11rem] whitespace-nowrap font-bold leading-none tracking-tight text-slate-950 ${
                isLongBalanceLabel
                  ? "text-[clamp(1.1rem,3.35vw,1.78rem)]"
                  : "text-[clamp(1.5rem,4.7vw,2.35rem)]"
              }`}
              title={fullBalanceLabel}
            >
              {compactBalanceLabel}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-3 flex justify-center">
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-800">
          {labels.savings + ": " + formatCurrency(savingsBalance, currency)}
        </div>
      </div>
      {budgetBar ? <div className="mt-4">{budgetBar}</div> : null}
    </section>
  );
}
