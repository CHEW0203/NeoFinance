import { formatCurrency } from "@/utils/format";

export function BalancePie({
  totalBalance = 0,
  monthlyExpense = 0,
  currency = "RM",
  labels = {},
}) {
  const balance = totalBalance;
  const spent = Math.max(monthlyExpense, 0);
  const absoluteBalance = Math.abs(balance);
  const total = absoluteBalance + spent;
  const spentPercent = total > 0 ? Math.round((spent / total) * 100) : 0;
  const overspent = balance < 0 || spent > absoluteBalance;

  const gradientStyle = {
    background: overspent
      ? `conic-gradient(#ef4444 ${spentPercent}%, #fca5a5 ${spentPercent}% 100%)`
      : `conic-gradient(#2563eb ${spentPercent}%, #22c55e ${spentPercent}% 100%)`,
  };

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white/95 p-8 shadow-[0_20px_55px_-30px_rgba(15,23,42,0.35)]">
      <div className="relative mx-auto h-56 w-56 rounded-full p-4" style={gradientStyle}>
        <div className="flex h-full w-full items-center justify-center rounded-full bg-white text-center">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
              {labels.balance || "Balance"}
            </p>
            <p
              className={`mt-2 text-2xl font-semibold tracking-tight ${
                overspent ? "text-red-600" : "text-slate-950"
              }`}
            >
              {formatCurrency(balance, currency)}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              {labels.spentThisMonth || "Spent this month:"}
              <span className="block font-semibold text-amber-500">
                {formatCurrency(spent, currency)}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
