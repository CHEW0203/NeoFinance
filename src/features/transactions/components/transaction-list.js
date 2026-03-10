import { formatDate, formatTransactionAmount } from "@/utils/format";

export function TransactionList({
  transactions,
  isLoading,
  onDelete,
}) {
  if (isLoading) {
    return <p className="text-sm text-slate-500">Loading...</p>;
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-slate-500">No transactions yet.</p>;
  }

  return (
    <>
      {transactions.map((transaction) => (
        <article
          key={transaction.id}
          className="flex flex-col gap-3 rounded-3xl border border-slate-200 px-5 py-4 md:flex-row md:items-center md:justify-between"
        >
          <div>
            <p className="font-medium text-slate-950">{transaction.title}</p>
            <p className="text-sm text-slate-500">
              {transaction.category?.name || "Uncategorized"}
            </p>
            <p className="text-xs text-slate-400">
              {formatDate(transaction.transactionDate)}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <p className="text-sm font-semibold text-slate-700">
              {formatTransactionAmount(transaction.type, transaction.amount)}
            </p>
            <button
              type="button"
              onClick={() => onDelete(transaction.id)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900"
            >
              Delete
            </button>
          </div>
        </article>
      ))}
    </>
  );
}
