import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyDueRecurringTransactionsForUser } from "@/lib/recurring";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDashboardSnapshot() {
  const user = await requireCurrentUser();
  if (!user) {
    return null;
  }
  await applyDueRecurringTransactionsForUser(user.id);
  const monthStart = startOfMonth();

  const userWithData = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      username: true,
      accounts: {
        select: {
          id: true,
          name: true,
          balance: true,
          currency: true,
        },
      },
      savingsVault: {
        select: {
          amount: true,
        },
      },
      transactions: {
        where: {
          transactionDate: {
            gte: monthStart,
          },
        },
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        take: 500,
        select: {
          id: true,
          type: true,
          amount: true,
          title: true,
          transactionDate: true,
          category: {
            select: {
              name: true,
              type: true,
              icon: true,
            },
          },
        },
      },
    },
  });

  if (!userWithData) {
    return null;
  }

  const totalBalance = userWithData.accounts.reduce(
    (sum, account) => sum + account.balance,
    0
  );

  const monthlyTransactions = userWithData.transactions;

  const monthlyIncome = monthlyTransactions
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + row.amount, 0);

  const monthlyExpense = monthlyTransactions
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + row.amount, 0);

  return {
    user: {
      id: userWithData.id,
      username: userWithData.username,
    },
    stats: {
      totalBalance,
      monthlyIncome,
      monthlyExpense,
      currency: userWithData.accounts[0]?.currency || "MYR",
      savingsBalance: Number(userWithData.savingsVault?.amount || 0),
    },
    recentTransactions: monthlyTransactions,
  };
}
