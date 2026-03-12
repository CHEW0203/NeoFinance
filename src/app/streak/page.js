import { BackButton } from "@/components/back-button";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { getLocaleFromLanguage } from "@/lib/i18n";
import { getServerDictionary } from "@/lib/i18n/server";
import Link from "next/link";

function pad(value) {
  return String(value).padStart(2, "0");
}

function dateKey(date) {
  const value = new Date(date);
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function parseMonthParam(monthParam) {
  if (!monthParam || !/^\d{4}-\d{2}$/.test(monthParam)) return null;
  const [yearRaw, monthRaw] = monthParam.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
}

function monthParamValue(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export default async function StreakPage({ searchParams }) {
  const { t, language } = await getServerDictionary();
  const locale = getLocaleFromLanguage(language);
  const params = await searchParams;
  const currentMonth = parseMonthParam(params?.month) || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const user = await requireCurrentUser();

  const transactions = user
    ? await prisma.transaction.findMany({
        where: { userId: user.id },
        select: { createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 365,
      })
    : [];

  // Streak is based on the day the record was created, not back-dated transactionDate.
  const recordDays = new Set(transactions.map((record) => dateKey(record.createdAt)));
  const today = new Date();
  const todayKey = dateKey(today);
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

  const monthStart = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const monthEnd = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  const daysInMonth = monthEnd.getDate();
  const leadingEmpty = (monthStart.getDay() + 6) % 7;

  const calendarCells = [];
  for (let i = 0; i < leadingEmpty; i += 1) {
    calendarCells.push({ kind: "empty", key: `empty-${i}` });
  }

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const day = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNumber);
    const key = dateKey(day);
    calendarCells.push({
      kind: "day",
      key,
      label: dayNumber,
      active: recordDays.has(key),
      today: key === todayKey,
    });
  }

  const previousMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  const monthLabel = currentMonth.toLocaleDateString(locale, { month: "long", year: "numeric" });

  const mondayBase = new Date(Date.UTC(2024, 0, 1));
  const weekLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(mondayBase.getTime() + index * 24 * 60 * 60 * 1000).toLocaleDateString(locale, {
      weekday: "short",
      timeZone: "UTC",
    })
  );

  return (
    <main className="min-h-screen bg-[#fff8dc] px-4 py-5 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex items-center justify-start">
          <BackButton fallbackHref="/" />
        </div>

        <section className="relative overflow-hidden rounded-[2rem] border-2 border-slate-900 bg-gradient-to-b from-[#ffd45a] via-[#ffcf4f] to-[#f9c943] px-5 pb-8 pt-5 shadow-[0_20px_45px_-26px_rgba(15,23,42,0.5)]">
          <h1 className="text-center text-3xl font-black tracking-tight text-slate-900">
            {t.pages.streakChallenge || t.pages.streak}
          </h1>
          <div className="mt-7 text-center">
            <p className="text-8xl font-black leading-none text-white [text-shadow:3px_3px_0_#1f2937]">
              {streak}
            </p>
            <p className="mt-1 text-3xl">{"\u{1F525}"}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">
              {streak === 1 ? t.pages.day : t.pages.days}
            </p>
          </div>

          <span className="pointer-events-none absolute left-8 top-20 text-3xl opacity-80">{"\u{1F342}"}</span>
          <span className="pointer-events-none absolute right-10 top-24 text-3xl opacity-80">{"\u{1F342}"}</span>
          <span className="pointer-events-none absolute left-16 top-36 text-2xl opacity-70">{"\u{1F343}"}</span>
          <span className="pointer-events-none absolute right-20 top-44 text-2xl opacity-70">{"\u{1F343}"}</span>
        </section>

        <section className="overflow-hidden rounded-[1.8rem] border-2 border-slate-900 bg-white shadow-[0_16px_35px_-24px_rgba(15,23,42,0.55)]">
          <header className="bg-sky-500 px-5 py-3 text-center text-xl font-bold text-white">
            {t.pages.streakStartToday || "Start from today!"}
          </header>

          <div className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <Link
                href={`/streak?month=${monthParamValue(previousMonth)}`}
                className="rounded-full p-1 text-2xl font-bold text-slate-700 hover:bg-slate-100"
                aria-label={t.common.back}
              >
                {"\u2039"}
              </Link>
              <p className="text-3xl font-extrabold text-slate-900">{monthLabel}</p>
              <Link
                href={`/streak?month=${monthParamValue(nextMonth)}`}
                className="rounded-full p-1 text-2xl font-bold text-slate-700 hover:bg-slate-100"
                aria-label={t.common.details}
              >
                {"\u203A"}
              </Link>
            </div>

            <div className="grid grid-cols-7 gap-y-3 text-center">
              {weekLabels.map((label, index) => (
                <p key={`week-${index}`} className="text-sm font-bold uppercase text-slate-700">
                  {label}
                </p>
              ))}

              {calendarCells.map((cell) => (
                cell.kind === "empty" ? (
                  <div key={cell.key} className="h-10" />
                ) : (
                  <div key={cell.key} className="flex h-10 items-center justify-center">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-lg font-extrabold ${
                        cell.active && cell.today
                          ? "bg-rose-700 text-white"
                          : cell.active
                            ? "bg-rose-300 text-white"
                            : cell.today
                              ? "border-2 border-rose-400 text-slate-900"
                              : "text-slate-300"
                      }`}
                      title={cell.key}
                    >
                      {cell.label}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        </section>

        <Link
          href="/transactions"
          className="block rounded-full border-2 border-slate-900 bg-rose-400 px-5 py-4 text-center text-2xl font-extrabold text-white shadow-[0_16px_30px_-24px_rgba(15,23,42,0.55)] transition hover:bg-rose-300"
        >
          {t.pages.recordDirectly || t.transactions?.addRecord || "Record Directly"}
        </Link>

        <section className="rounded-2xl border border-rose-100 bg-white/80 px-4 py-3 text-center text-sm text-slate-600">
          {"\u{1F525}"} {t.pages.currentStreak}: {streak} {streak === 1 ? t.pages.day : t.pages.days}
        </section>
      </div>
    </main>
  );
}
