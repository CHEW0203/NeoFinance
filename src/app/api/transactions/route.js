import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEMO_EMAIL = "demo@finance.local";
const VALID_TYPES = new Set(["income", "expense"]);

function toPositiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }
  return number;
}

async function getDemoUser() {
  return prisma.user.findUnique({
    where: { email: DEMO_EMAIL },
    include: {
      accounts: {
        orderBy: { createdAt: "asc" },
      },
      categories: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function GET(request) {
  try {
    const user = await getDemoUser();
    if (!user) {
      return NextResponse.json(
        {
          message: "Demo user not found. Run `npm run db:seed` first.",
        },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 100);
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");

    const where = {
      userId: user.id,
      ...(type && VALID_TYPES.has(type) ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
    });

    return NextResponse.json({
      data: transactions,
      count: transactions.length,
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load transactions.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getDemoUser();
    if (!user) {
      return NextResponse.json(
        { message: "Demo user not found. Run `npm run db:seed` first." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const type = String(body.type || "").trim().toLowerCase();
    const note = body.note ? String(body.note).trim() : null;
    const amount = toPositiveNumber(body.amount);
    const transactionDate = body.transactionDate
      ? new Date(body.transactionDate)
      : new Date();

    if (!title) {
      return NextResponse.json({ message: "`title` is required." }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { message: "`type` must be either `income` or `expense`." },
        { status: 400 }
      );
    }
    if (!amount) {
      return NextResponse.json(
        { message: "`amount` must be a positive number." },
        { status: 400 }
      );
    }
    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json(
        { message: "`transactionDate` must be a valid date." },
        { status: 400 }
      );
    }

    const account =
      user.accounts.find((item) => item.id === body.accountId) || user.accounts[0];
    if (!account) {
      return NextResponse.json(
        { message: "No account found for that user." },
        { status: 400 }
      );
    }

    const defaultCategory =
      user.categories.find((item) => item.type === type) || user.categories[0];
    const category =
      user.categories.find((item) => item.id === body.categoryId) || defaultCategory;
    if (!category) {
      return NextResponse.json(
        { message: "No category found for this user." },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      const created = await tx.transaction.create({
        data: {
          title,
          type,
          amount,
          note: note || null,
          transactionDate,
          userId: user.id,
          accountId: account.id,
          categoryId: category.id,
        },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true } },
          category: { select: { id: true, name: true, type: true, color: true } },
        },
      });

      const balanceDelta = type === "income" ? amount : -amount;
      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { increment: balanceDelta },
        },
      });

      return created;
    });

    return NextResponse.json({ data: transaction }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create transaction.", error: String(error) },
      { status: 500 }
    );
  }
}
