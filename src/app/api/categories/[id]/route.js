import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";

const PROTECTED_EXPENSE_NAMES = new Set([
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "drinks",
  "food",
  "transport",
  "shopping",
  "gift",
  "rent",
  "utilities",
  "health",
  "others",
]);

const PROTECTED_INCOME_NAMES = new Set([
  "salary",
  "allowance",
  "bonus",
  "freelance",
  "investment",
  "refund",
  "others",
]);

async function findOrCreateFallbackCategory(tx, userId, type, excludedId) {
  let fallback = await tx.category.findFirst({
    where: {
      userId,
      type,
      NOT: { id: excludedId },
    },
    orderBy: { createdAt: "asc" },
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
      where: { id: categoryId, userId: user.id },
      select: { id: true, type: true, name: true },
    });
    if (!category) {
      return NextResponse.json({ message: "Category not found." }, { status: 404 });
    }

    const normalizedName = String(category.name || "").trim().toLowerCase();
    const protectedSet =
      category.type === "income" ? PROTECTED_INCOME_NAMES : PROTECTED_EXPENSE_NAMES;
    if (protectedSet.has(normalizedName)) {
      return NextResponse.json({ message: "Basic category cannot be deleted." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      const hasTransactions = await tx.transaction.count({
        where: { categoryId: category.id, userId: user.id },
      });

      if (hasTransactions > 0) {
        const fallbackId = await findOrCreateFallbackCategory(
          tx,
          user.id,
          category.type,
          category.id
        );
        await tx.transaction.updateMany({
          where: { categoryId: category.id, userId: user.id },
          data: { categoryId: fallbackId },
        });
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
