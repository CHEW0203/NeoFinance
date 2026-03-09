const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { email: "demo@finance.local" },
  });

  if (existingUser) {
    return;
  }

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@finance.local",
      accounts: {
        create: {
          name: "Main Wallet",
          type: "cash",
          balance: 5500,
        },
      },
      categories: {
        create: [
          { name: "Salary", type: "income", color: "#0f766e" },
          { name: "Food", type: "expense", color: "#b45309" },
          { name: "Utilities", type: "expense", color: "#1d4ed8" },
        ],
      },
    },
    include: {
      accounts: true,
      categories: true,
    },
  });

  const account = user.accounts[0];
  const salaryCategory = user.categories.find((category) => category.name === "Salary");
  const foodCategory = user.categories.find((category) => category.name === "Food");
  const utilitiesCategory = user.categories.find(
    (category) => category.name === "Utilities"
  );

  await prisma.transaction.createMany({
    data: [
      {
        title: "March Salary",
        amount: 5500,
        type: "income",
        transactionDate: new Date("2026-03-01"),
        userId: user.id,
        accountId: account.id,
        categoryId: salaryCategory.id,
      },
      {
        title: "Weekly groceries",
        amount: 240,
        type: "expense",
        transactionDate: new Date("2026-03-03"),
        userId: user.id,
        accountId: account.id,
        categoryId: foodCategory.id,
      },
      {
        title: "Internet bill",
        amount: 129,
        type: "expense",
        transactionDate: new Date("2026-03-05"),
        userId: user.id,
        accountId: account.id,
        categoryId: utilitiesCategory.id,
      },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
