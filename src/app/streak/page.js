import { BackButton } from "@/components/back-button";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

export default async function StreakPage() {
  const user = await requireCurrentUser();
  const transactions = user
    ? await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { transactionDate: true },
        orderBy: { transactionDate: "desc" },
        take: 120,
      })
    : [];

  const recordDays = new Set(transactions.map((t) => dateKey(t.transactionDate)));
  const cells = [];
  for (let i = 29; i >= 0; i -= 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    const key = dateKey(day);
    cells.push({ key, active: recordDays.has(key), label: day.getDate() });
  }

  let streak = 0;
  for (let i = 0; i < 365; i += 1) {
    const day = new Date();
    day.setDate(day.getDate() - i);
    if (recordDays.has(dateKey(day))) {
      streak += 1;
    } else {
      break;
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <BackButton fallbackHref="/" />
        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Streak</h1>
          <p className="mt-2 text-sm text-slate-600">
            🔥 Current streak: {streak} day{streak === 1 ? "" : "s"}
          </p>

          <div className="mt-5 grid grid-cols-10 gap-2">
            {cells.map((cell) => (
              <div
                key={cell.key}
                className={`flex h-10 items-center justify-center rounded-lg text-xs font-semibold ${
                  cell.active ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-500"
                }`}
                title={cell.key}
              >
                {cell.label}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
