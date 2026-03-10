export function TransactionForm({
  form,
  setForm,
  isSubmitting,
  onSubmit,
}) {
  return (
    <form
      className="mt-8 grid gap-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-2"
      onSubmit={onSubmit}
    >
      <input
        type="text"
        placeholder="Title (example: Lunch)"
        value={form.title}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, title: event.target.value }))
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
        required
      />
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Amount"
        value={form.amount}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, amount: event.target.value }))
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
        required
      />
      <select
        value={form.type}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, type: event.target.value }))
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
      >
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input
        type="date"
        value={form.transactionDate}
        onChange={(event) =>
          setForm((prev) => ({
            ...prev,
            transactionDate: event.target.value,
          }))
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500"
      />
      <input
        type="text"
        placeholder="Note (optional)"
        value={form.note}
        onChange={(event) =>
          setForm((prev) => ({ ...prev, note: event.target.value }))
        }
        className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-slate-500 md:col-span-2"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 md:col-span-2"
      >
        {isSubmitting ? "Saving..." : "Add transaction"}
      </button>
    </form>
  );
}
