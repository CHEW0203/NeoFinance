const sampleTransactions = [
  {
    id: 1,
    title: "Salary",
    category: "Income",
    amount: "+ RM 5,500",
  },
  {
    id: 2,
    title: "Groceries",
    category: "Food",
    amount: "- RM 240",
  },
  {
    id: 3,
    title: "Internet bill",
    category: "Utilities",
    amount: "- RM 129",
  },
];

export const metadata = {
  title: "Transactions | Financial Tracker and Analysis",
};

export default function TransactionsPage() {
  return (
    <main className="min-h-screen bg-[#f3efe6] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-5xl rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.25)]">
        <p className="text-sm uppercase tracking-[0.25em] text-emerald-700">
          Transactions module
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          A simple transaction list placeholder
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600">
          This page shows the shape for your transaction records. The next step
          is to replace these sample rows with Prisma data.
        </p>

        <div className="mt-8 space-y-4">
          {sampleTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-3xl border border-slate-200 px-5 py-4"
            >
              <div>
                <p className="font-medium text-slate-950">{transaction.title}</p>
                <p className="text-sm text-slate-500">{transaction.category}</p>
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {transaction.amount}
              </p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
