import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";

const VALID_TYPES = new Set(["income", "expense"]);

const EXPENSE_ICONS = [
  "\u{1F354}",
  "\u{1F36A}",
  "\u{1F964}",
  "\u{1F68C}",
  "\u{1F6CD}\uFE0F",
  "\u{1F381}",
  "\u{1F3E0}",
  "\u{1F4A1}",
  "\u{1F48A}",
  "\u{1F4E6}",
  "\u{1F355}",
  "\u{1F695}",
  "\u{1F4F1}",
  "\u{1F3AE}",
  "\u{1F3B5}",
];
const INCOME_ICONS = [
  "\u{1F4BC}",
  "\u{1F4B0}",
  "\u{1F3C6}",
  "\u{1F4BB}",
  "\u{1F4C8}",
  "\u{1F4B3}",
  "\u{1F4E6}",
  "\u{1F3E6}",
  "\u{1FA99}",
  "\u{1F4CA}",
  "\u{1F3AF}",
  "\u{1F393}",
];

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

function isOthersCategoryName(name) {
  const value = String(name || "").trim().toLowerCase();
  if (!value) return false;
  return (
    value === "other" ||
    value === "others" ||
    value === "lain-lain" ||
    value === "lain lain" ||
    value.includes("other") ||
    value.includes("lain") ||
    value.includes("其他") ||
    value.includes("其它")
  );
}

function fallbackCategoryIcon(type, name) {
  const value = String(name || "").toLowerCase();
  if (isOthersCategoryName(name)) return "\u{1F4E6}";
  if (type === "income") {
    if (value.includes("salary")) return "\u{1F4BC}";
    if (value.includes("bonus")) return "\u{1F3C6}";
    if (value.includes("allowance")) return "\u{1F4B0}";
    if (value.includes("invest")) return "\u{1F4C8}";
    if (value.includes("refund")) return "\u{1F4B3}";
    return "\u{1F4B0}";
  }

  if (value.includes("drink") || value.includes("beverage") || value.includes("coffee") || value.includes("tea")) {
    return "\u{1F964}";
  }
  if (value.includes("food") || value.includes("meal") || value.includes("dinner") || value.includes("lunch")) {
    return "\u{1F354}";
  }
  if (value.includes("snack")) return "\u{1F36A}";
  if (value.includes("transport") || value.includes("grab") || value.includes("taxi") || value.includes("bus")) {
    return "\u{1F68C}";
  }
  if (value.includes("gift")) return "\u{1F381}";
  if (value.includes("shop")) return "\u{1F6CD}\uFE0F";
  if (value.includes("rent") || value.includes("house")) return "\u{1F3E0}";
  if (value.includes("utility") || value.includes("electric") || value.includes("water")) return "\u{1F4A1}";
  if (value.includes("health") || value.includes("medical")) return "\u{1F48A}";
  if (
    value.includes("swim") ||
    value.includes("swimming") ||
    value.includes("sport") ||
    value.includes("sports") ||
    value.includes("gym") ||
    value.includes("fitness") ||
    value.includes("exercise") ||
    value.includes("workout") ||
    value.includes("run") ||
    value.includes("jog")
  ) {
    return "\u{1F48A}";
  }
  return "\u{1F4E6}";
}

function forcedKeywordIcon(type, name) {
  if (isOthersCategoryName(name)) return "\u{1F4E6}";

  const value = String(name || "").toLowerCase();
  if (type === "income") return null;

  if (
    value.includes("swim") ||
    value.includes("swimming") ||
    value.includes("sport") ||
    value.includes("sports") ||
    value.includes("gym") ||
    value.includes("fitness") ||
    value.includes("exercise") ||
    value.includes("workout") ||
    value.includes("run") ||
    value.includes("jog")
  ) {
    return "\u{1F48A}";
  }

  if (
    value.includes("fuel") ||
    value.includes("petrol") ||
    value.includes("gas") ||
    value.includes("shell") ||
    value.includes("esso") ||
    value.includes("caltex")
  ) {
    return "\u{1F68C}";
  }

  return null;
}

async function suggestCategoryIconWithAI(type, categoryName) {
  const forced = forcedKeywordIcon(type, categoryName);
  if (forced) return forced;

  const fallback = fallbackCategoryIcon(type, categoryName);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const allowedIcons = type === "income" ? INCOME_ICONS : EXPENSE_ICONS;
  const prompt = `
You classify category icons.
Category name: "${String(categoryName || "").trim()}"
Type: ${type}
Allowed icons: ${JSON.stringify(allowedIcons)}
Return ONLY JSON: {"icon":"<one_allowed_icon>"}
`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 },
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleaned = String(rawText)
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    const icon = String(parsed?.icon || "").trim();
    if (allowedIcons.includes(icon)) {
      return icon;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

async function loadContext(userId, transactionId) {
  const [transaction, user] = await Promise.all([
    prisma.transaction.findFirst({
      where: { id: transactionId, userId },
      include: {
        account: { select: { id: true, name: true, currency: true, type: true } },
        category: { select: { id: true, name: true, type: true, color: true, icon: true } },
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
        category: { select: { id: true, name: true, type: true, color: true, icon: true } },
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
    const categoryIcon = body.categoryIcon
      ? String(body.categoryIcon).trim()
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

    const activeCategories = user.categories.filter((item) => !item.isArchived);
    const defaultCategory = activeCategories.find((item) => item.type === type);
    const existingCategory =
      user.categories.find((item) => item.id === existing.categoryId) || null;
    const categoryById = body.categoryId
      ? activeCategories.find((item) => item.id === body.categoryId) || null
      : null;
    const categoryByName = categoryName
      ? activeCategories.find(
          (item) =>
            item.type === type && item.name.toLowerCase() === categoryName.toLowerCase()
        )
      : null;
    const selectedCategory = categoryName ? categoryByName || null : categoryById || null;
    const existingColors = new Set(activeCategories.map((item) => item.color).filter(Boolean));
    const categoryColor = pickCategoryColor(existingColors);

    const updated = await prisma.$transaction(async (tx) => {
      let categoryId = categoryById?.id || categoryByName?.id || null;
      let resolvedCategoryIcon = categoryIcon || null;
      if (isOthersCategoryName(categoryName)) {
        resolvedCategoryIcon = "\u{1F4E6}";
      }
      if (!resolvedCategoryIcon && categoryName) {
        resolvedCategoryIcon = await suggestCategoryIconWithAI(type, categoryName);
      }

      if (!categoryId && categoryName) {
        const createdCategory = await tx.category.create({
          data: {
            name: categoryName,
            type,
            source: "user",
            icon: resolvedCategoryIcon,
            color: categoryColor,
            userId: currentUser.id,
          },
          select: { id: true },
        });
        categoryId = createdCategory.id;
      } else if (
        categoryByName &&
        resolvedCategoryIcon &&
        String(categoryByName.icon || "").trim() !== resolvedCategoryIcon
      ) {
        await tx.category.update({
          where: { id: categoryByName.id },
          data: { icon: resolvedCategoryIcon },
        });
      }
      if (!categoryId && existingCategory) {
        categoryId = existingCategory.id;
      }
      if (!categoryId && selectedCategory) {
        categoryId = selectedCategory.id;
      }
      if (!categoryId && defaultCategory) {
        categoryId = defaultCategory.id;
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
          category: { select: { id: true, name: true, type: true, color: true, icon: true } },
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


