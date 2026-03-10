import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export async function getDashboardSnapshot() {
  const user = await requireCurrentUser();
  if (!user) {
    return null;
  }

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
      transactions: {
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        take: 30,
        select: {
          id: true,
          type: true,
          amount: true,
          title: true,
          transactionDate: true,
          category: {
            select: {
              name: true,
              icon: true,
              type: true,
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

  const monthlyTransactions = userWithData.transactions.filter(
    (row) => row.transactionDate >= startOfMonth()
  );

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
    },
    recentTransactions: userWithData.transactions,
  };
}
