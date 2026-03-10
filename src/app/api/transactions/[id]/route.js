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

async function loadContext(userId, transactionId) {
  const [transaction, user] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      include: {
        accounts: { orderBy: { createdAt: "asc" } },
        categories: { orderBy: { createdAt: "asc" } },
      },
    }),
  ]);
  return { transaction, user };
}

export async function GET(_request, context) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = String(resolvedParams?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Transaction id is required." }, { status: 400 });
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id,
        userId: currentUser.id,
      },
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, type: true, color: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
    }

    return NextResponse.json({ data: transaction });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load transaction.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function PATCH(request, context) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const resolvedParams = await context.params;
    const id = String(resolvedParams?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Transaction id is required." }, { status: 400 });
    }

    const { transaction: existing, user } = await loadContext(currentUser.id, id);
    if (!existing || !user) {
      return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
    }

    const body = await request.json();
    const title = String(body.title || existing.title).trim();
    const type = String(body.type || existing.type).trim().toLowerCase();
    const note =
      body.note === undefined ? existing.note : body.note ? String(body.note).trim() : null;
    const amount = toPositiveNumber(body.amount ?? existing.amount);
    const transactionDate = body.transactionDate
      ? new Date(body.transactionDate)
      : existing.transactionDate;
    const categoryName = body.categoryName
      ? String(body.categoryName).trim()
      : null;

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
      user.accounts.find((item) => item.id === body.accountId) ||
      user.accounts.find((item) => item.id === existing.accountId) ||
      user.accounts[0];
    if (!account) {
      return NextResponse.json({ message: "No account found for this user." }, { status: 400 });
    }

    const defaultCategory = user.categories.find((item) => item.type === type);
    const categoryById =
      user.categories.find((item) => item.id === body.categoryId) ||
      user.categories.find((item) => item.id === existing.categoryId) ||
      null;
    const categoryByName = categoryName
      ? user.categories.find(
          (item) =>
            item.type === type && item.name.toLowerCase() === categoryName.toLowerCase()
        )
      : null;
    const selectedCategory = categoryById || categoryByName || defaultCategory || null;

    const updated = await prisma.$transaction(async (tx) => {
      let categoryId = categoryById?.id || categoryByName?.id || null;
      if (!categoryId && categoryName) {
        const createdCategory = await tx.category.create({
          data: {
            name: categoryName,
            type,
            userId: currentUser.id,
          },
          select: { id: true },
        });
        categoryId = createdCategory.id;
      }
      if (!categoryId && selectedCategory) {
        categoryId = selectedCategory.id;
      }

      const oldDelta = existing.type === "income" ? existing.amount : -existing.amount;
      const newDelta = type === "income" ? amount : -amount;

      if (existing.accountId === account.id) {
        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: newDelta - oldDelta },
          },
        });
      } else {
        await tx.account.update({
          where: { id: existing.accountId },
          data: {
            balance: { increment: -oldDelta },
          },
        });
        await tx.account.update({
          where: { id: account.id },
          data: {
            balance: { increment: newDelta },
          },
        });
      }

      return tx.transaction.update({
        where: { id: existing.id },
        data: {
          title,
          type,
          amount,
          note,
          transactionDate,
          accountId: account.id,
          categoryId,
        },
        include: {
          account: { select: { id: true, name: true, currency: true, type: true } },
          category: { select: { id: true, name: true, type: true, color: true } },
        },
      });
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update transaction.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request, context) {
  try {
    const currentUser = await requireCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }

    const resolvedParams = await context.params;
    const id = String(resolvedParams?.id || "").trim();
    if (!id) {
      return NextResponse.json({ message: "Transaction id is required." }, { status: 400 });
    }

    const existing = await prisma.transaction.findFirst({
      where: {
        id,
        userId: currentUser.id,
      },
      select: {
        id: true,
        amount: true,
        type: true,
        accountId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: "Transaction not found." }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      const balanceRollback = existing.type === "income" ? -existing.amount : existing.amount;

      await tx.transaction.delete({
        where: { id: existing.id },
      });

      await tx.account.update({
        where: { id: existing.accountId },
        data: {
          balance: { increment: balanceRollback },
        },
      });
    });

    return NextResponse.json({ message: "Transaction deleted." });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete transaction.", error: String(error) },
      { status: 500 }
    );
  }
}
