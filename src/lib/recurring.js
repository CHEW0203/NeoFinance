import { prisma } from "@/lib/prisma";

export const RECURRING_FREQUENCIES = {
  DAILY: "daily",
  WEEKLY: "weekly",
  MONTHLY: "monthly",
};

const VALID_FREQUENCY_SET = new Set(Object.values(RECURRING_FREQUENCIES));
const MAX_CATCH_UP_RUNS = 400;

function startOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function endOfDay(date = new Date()) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function normalizeRecurringFrequency(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return VALID_FREQUENCY_SET.has(normalized)
    ? normalized
    : RECURRING_FREQUENCIES.MONTHLY;
}

function addRecurringStep(dateValue, frequency, interval = 1) {
  const value = startOfDay(dateValue);
  const step = Math.max(1, Number(interval) || 1);

  if (frequency === RECURRING_FREQUENCIES.DAILY) {
    value.setDate(value.getDate() + step);
    return value;
  }

  if (frequency === RECURRING_FREQUENCIES.WEEKLY) {
    value.setDate(value.getDate() + 7 * step);
    return value;
  }

  value.setMonth(value.getMonth() + step);
  return value;
}

export async function applyDueRecurringTransactionsForUser(userId) {
  if (!userId) return;

  const todayEnd = endOfDay(new Date());
  const dueRules = await prisma.recurringTransaction.findMany({
    where: {
      userId,
      isActive: true,
      nextRunDate: {
        lte: todayEnd,
      },
    },
    select: { id: true },
    orderBy: { nextRunDate: "asc" },
  });

  for (const item of dueRules) {
    await prisma.$transaction(async (tx) => {
      const rule = await tx.recurringTransaction.findFirst({
        where: {
          id: item.id,
          userId,
          isActive: true,
        },
        select: {
          id: true,
          title: true,
          note: true,
          amount: true,
          type: true,
          frequency: true,
          interval: true,
          nextRunDate: true,
          endDate: true,
          accountId: true,
          categoryId: true,
          category: {
            select: {
              type: true,
            },
          },
        },
      });

      if (!rule) return;

      if (
        !rule.category ||
        String(rule.category.type || "").toLowerCase() !== String(rule.type || "").toLowerCase()
      ) {
        await tx.recurringTransaction.update({
          where: { id: item.id },
          data: { isActive: false },
        });
        return;
      }

      let cursor = startOfDay(rule.nextRunDate);
      const ruleEnd = rule.endDate ? endOfDay(rule.endDate) : null;
      const frequency = normalizeRecurringFrequency(rule.frequency);
      const interval = Math.max(1, Number(rule.interval) || 1);

      let processed = 0;
      while (
        cursor <= todayEnd &&
        (!ruleEnd || cursor <= ruleEnd) &&
        processed < MAX_CATCH_UP_RUNS
      ) {
        await tx.transaction.create({
          data: {
            title: rule.title,
            note: rule.note || null,
            amount: rule.amount,
            type: rule.type,
            transactionDate: cursor,
            userId,
            accountId: rule.accountId,
            categoryId: rule.categoryId,
            recurringId: rule.id,
          },
        });

        const balanceDelta = rule.type === "income" ? rule.amount : -rule.amount;
        await tx.account.update({
          where: { id: rule.accountId },
          data: {
            balance: { increment: balanceDelta },
          },
        });

        cursor = addRecurringStep(cursor, frequency, interval);
        processed += 1;
      }

      const updateData = {
        nextRunDate: cursor,
      };

      if ((ruleEnd && cursor > ruleEnd) || processed >= MAX_CATCH_UP_RUNS) {
        updateData.isActive = false;
      }

      await tx.recurringTransaction.update({
        where: { id: rule.id },
        data: updateData,
      });
    });
  }
}

export function normalizeRecurringDate(value) {
  const candidate = value ? new Date(value) : new Date();
  if (Number.isNaN(candidate.getTime())) return null;
  return startOfDay(candidate);
}

export function ensureRecurringEndDate(startDate, endDate) {
  if (!endDate) return null;
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = startOfDay(endDate);
  if (normalizedEnd < normalizedStart) return null;
  return normalizedEnd;
}
