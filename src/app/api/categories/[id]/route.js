import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";

const PROTECTED_EXPENSE_NAMES = new Set([
  "food",
  "transport",
  "gift",
  "others",
]);

const PROTECTED_INCOME_NAMES = new Set([
  "salary",
  "allowance",
  "bonus",
]);

async function findOrCreateFallbackCategory(tx, userId, type, excludedId) {
  let fallback = await tx.category.findFirst({
    where: {
      userId,
      type,
      isArchived: false,
      name: "Others",
      NOT: { id: excludedId },
    },
    select: { id: true },
  });

  if (!fallback) {
    const colors = await tx.category.findMany({
      where: { userId },
      select: { color: true },
    });
    const usedColors = new Set(colors.map((item) => item.color).filter(Boolean));
    const color = pickCategoryColor(usedColors);
    fallback = await tx.category.create({
      data: {
        name: "Others",
        type,
        source: "system",
        isArchived: false,
        icon: "\u{1F4E6}",
        color,
        userId,
      },
      select: { id: true },
    });
  }

  return fallback.id;
}

export async function DELETE(_request, context) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const params = await context.params;
    const categoryId = String(params?.id || "").trim();
    if (!categoryId) {
      return NextResponse.json({ message: "Category id is required." }, { status: 400 });
    }

    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId: user.id, isArchived: false },
      select: { id: true, type: true, name: true, source: true },
    });
    if (!category) {
      return NextResponse.json({ message: "Category not found." }, { status: 404 });
    }

    const normalizedName = String(category.name || "").trim().toLowerCase();
    const normalizedSource = String(category.source || "user").trim().toLowerCase();
    if (normalizedSource === "ai") {
      return NextResponse.json({ message: "Basic category cannot be deleted." }, { status: 400 });
    }
    const protectedSet =
      category.type === "income" ? PROTECTED_INCOME_NAMES : PROTECTED_EXPENSE_NAMES;
    if (protectedSet.has(normalizedName)) {
      return NextResponse.json({ message: "Basic category cannot be deleted." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const hasTransactions = await tx.transaction.count({
        where: { categoryId: category.id, userId: user.id },
      });
      const hasRecurringRules = await tx.recurringTransaction.count({
        where: { categoryId: category.id, userId: user.id },
      });

      if (hasRecurringRules > 0) {
        const fallbackId = await findOrCreateFallbackCategory(
          tx,
          user.id,
          category.type,
          category.id
        );
        await tx.recurringTransaction.updateMany({
          where: { categoryId: category.id, userId: user.id },
          data: { categoryId: fallbackId },
        });
      }

      if (hasTransactions > 0) {
        await tx.category.update({
          where: { id: category.id },
          data: { isArchived: true },
        });
        return;
      }

      await tx.category.delete({
        where: { id: category.id },
      });
    });

    return NextResponse.json({ message: "Category deleted." });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete category.", error: String(error) },
      { status: 500 }
    );
  }
}
