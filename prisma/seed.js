const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { username: "demo_user" },
  });

  if (existingUser) {
    return;
  }

  const passwordHash = await bcrypt.hash("demo12345", 12);

  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      username: "demo_user",
      passwordHash,
      occupation: "working",
      salaryRange: "RM 4,000 - RM 5,999",
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
          { name: "Salary", type: "income", color: "#0f766e", icon: "💼" },
          { name: "Food", type: "expense", color: "#b45309", icon: "🍜" },
          { name: "Transport", type: "expense", color: "#334155", icon: "🚌" },
          { name: "Gift", type: "expense", color: "#be185d", icon: "🎁" },
          { name: "Others", type: "expense", color: "#475569", icon: "📦" },
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
  const transportCategory = user.categories.find(
    (category) => category.name === "Transport"
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
        title: "Bus fare",
        amount: 129,
        type: "expense",
        transactionDate: new Date("2026-03-05"),
        userId: user.id,
        accountId: account.id,
        categoryId: transportCategory.id,
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
