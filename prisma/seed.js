const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findUnique({
    where: { username: "demo_user" },
  });

  if (existingUser) return;

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
          { name: "Salary", type: "income", source: "system", color: "#0f766e", icon: "\u{1F4BC}" },
          { name: "Food", type: "expense", source: "system", color: "#b45309", icon: "\u{1F354}" },
          { name: "Breakfast", type: "expense", source: "system", color: "#b45309", icon: "\u{1F373}" },
          { name: "Lunch", type: "expense", source: "system", color: "#c2410c", icon: "\u{1F35C}" },
          { name: "Dinner", type: "expense", source: "system", color: "#92400e", icon: "\u{1F37D}\uFE0F" },
          { name: "Transport", type: "expense", source: "system", color: "#334155", icon: "\u{1F68C}" },
          { name: "Gift", type: "expense", source: "system", color: "#be185d", icon: "\u{1F381}" },
          { name: "Others", type: "expense", source: "system", color: "#475569", icon: "\u{1F4E6}" },
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
  const lunchCategory = user.categories.find((category) => category.name === "Lunch");
  const transportCategory = user.categories.find((category) => category.name === "Transport");

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
        title: "Lunch meal",
        amount: 24,
        type: "expense",
        transactionDate: new Date("2026-03-03"),
        userId: user.id,
        accountId: account.id,
        categoryId: lunchCategory.id,
      },
      {
        title: "Bus fare",
        amount: 12.9,
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
