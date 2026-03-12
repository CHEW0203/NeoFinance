import { formatDate, formatTransactionAmount } from "@/utils/format";
import { getLocalizedCategoryLabel } from "@/lib/i18n/category-labels";
import { getLocaleFromLanguage } from "@/lib/i18n";

export function TransactionList({
  transactions,
  isLoading,
  onDelete,
  language = "en",
  colorizeByType = false,
  loadingLabel,
  emptyLabel,
  uncategorizedLabel,
}) {
  const locale = getLocaleFromLanguage(language);

  if (isLoading) {
    return <p className="text-sm text-slate-500">{loadingLabel}</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500">{emptyLabel}</p>;
  }

  return (
    <>
      {transactions.map((transaction) => {
        const isIncome = transaction.type === "income";
        const typeToneClass = isIncome ? "text-emerald-600" : "text-amber-500";

        return (
          <article
            key={transaction.id}
            className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <p className={`font-medium ${colorizeByType ? typeToneClass : "text-slate-950"}`}>
                {transaction.title}
              </p>
              <p className="text-sm text-slate-500">
                {transaction.category?.name
                  ? getLocalizedCategoryLabel(transaction.category.name, language)
                  : uncategorizedLabel}
              </p>
              <p className="text-xs text-slate-400">
                {formatDate(transaction.transactionDate, locale)}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <p
                className={`text-sm font-semibold ${
                  colorizeByType ? typeToneClass : "text-slate-700"
                }`}
              >
                {formatTransactionAmount(transaction.type, transaction.amount)}
              </p>
            </div>
          </article>
        );
      })}
    </>
  );
}
