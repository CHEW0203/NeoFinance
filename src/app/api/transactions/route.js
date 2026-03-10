import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";

const VALID_TYPES = new Set(["income", "expense"]);

function toPositiveNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }
  return number;
}

function isFutureDate(dateValue) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  return dateValue > endOfToday;
}

async function getAuthenticatedUserWithBaseData() {
  const currentUser = await requireCurrentUser();
  if (!currentUser) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: currentUser.id },
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
    const user = await getAuthenticatedUserWithBaseData();
    if (!user) {
      return NextResponse.json(
        {
          message: "Unauthorized. Please login.",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 500);
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;

    const where = {
      userId: user.id,
      ...(type && VALID_TYPES.has(type) ? { type } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(fromDate || toDate
        ? {
            transactionDate: {
              ...(fromDate && !Number.isNaN(fromDate.getTime()) ? { gte: fromDate } : {}),
              ...(toDate && !Number.isNaN(toDate.getTime()) ? { lte: toDate } : {}),
            },
          }
        : {}),
    };

    const transactions = await prisma.transaction.findMany({
      where,
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, type: true, color: true, icon: true } },
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
    const user = await getAuthenticatedUserWithBaseData();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const type = String(body.type || "").trim().toLowerCase();
    const note = body.note ? String(body.note).trim() : null;
    const categoryName = body.categoryName
      ? String(body.categoryName).trim()
      : null;
    const categoryIcon = body.categoryIcon
      ? String(body.categoryIcon).trim()
      : null;
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
    if (isFutureDate(transactionDate)) {
      return NextResponse.json(
        { message: "`transactionDate` cannot be in the future." },
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
    const categoryById = user.categories.find((item) => item.id === body.categoryId);
    const categoryByName = categoryName
      ? user.categories.find(
          (item) =>
            item.type === type && item.name.toLowerCase() === categoryName.toLowerCase()
        )
      : null;
    const selectedCategory = categoryById || categoryByName || defaultCategory;
    if (!selectedCategory && !categoryName) {
      return NextResponse.json(
        { message: "No category found for this user." },
        { status: 400 }
      );
    }

    const transaction = await prisma.$transaction(async (tx) => {
      let categoryId = categoryById?.id || categoryByName?.id || null;
      if (!categoryId && categoryName) {
        const createdCategory = await tx.category.create({
          data: {
            name: categoryName,
            type,
            icon: categoryIcon || null,
            userId: user.id,
          },
          select: { id: true },
        });
        categoryId = createdCategory.id;
      }
      if (!categoryId) {
        categoryId = selectedCategory.id;
      }

      const created = await tx.transaction.create({
        data: {
          title,
          type,
          amount,
          note: note || null,
          transactionDate,
          userId: user.id,
          accountId: account.id,
          categoryId,
        },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true } },
          category: { select: { id: true, name: true, type: true, color: true, icon: true } },
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
