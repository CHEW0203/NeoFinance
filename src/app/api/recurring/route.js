import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";
import {
  applyDueRecurringTransactionsForUser,
  ensureRecurringEndDate,
  normalizeRecurringDate,
  normalizeRecurringFrequency,
} from "@/lib/recurring";

const VALID_TYPES = new Set(["income", "expense"]);
const EXPENSE_ICONS = [
  "\u{1F35C}",
  "\u2615",
  "\u{1F354}",
  "\u{1F355}",
  "\u{1F6CD}\uFE0F",
  "\u{1F381}",
  "\u{1F68C}",
  "\u{1F3AE}",
  "\u{1F3B5}",
  "\u{1F3E0}",
  "\u{1F4F1}",
  "\u{1F9FE}",
  "\u{1F4E6}",
];
const INCOME_ICONS = [
  "\u{1F4BC}",
  "\u{1F4B0}",
  "\u{1F4B8}",
  "\u{1F3E6}",
  "\u{1F4C8}",
  "\u{1FA99}",
  "\u{1F4B3}",
  "\u{1F9E0}",
  "\u{1F3AF}",
  "\u{1F9FE}",
  "\u{1F6E0}\uFE0F",
  "\u{1F3C6}",
  "\u{1F393}",
  "\u{1F454}",
  "\u{1F4CA}",
  "\u{1F4E6}",
];

function toPositiveNumber(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function toInterval(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return 1;
  return Math.min(parsed, 365);
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

function isOthersCategoryNameSafe(name) {
  const value = String(name || "").trim().toLowerCase();
  if (!value) return false;
  if (isOthersCategoryName(name)) return true;
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

function fallbackCategoryIcon(type, categoryName) {
  const value = String(categoryName || "").toLowerCase();
  if (isOthersCategoryNameSafe(categoryName)) return "\u{1F4E6}";

  if (type === "income") {
    if (value.includes("salary") || value.includes("gaji")) return "\u{1F4BC}";
    if (value.includes("bonus")) return "\u{1F3C6}";
    if (value.includes("allowance")) return "\u{1F4B0}";
    if (value.includes("invest")) return "\u{1F4C8}";
    if (value.includes("refund")) return "\u{1F4B3}";
    return "\u{1F4B0}";
  }

  if (value.includes("drink") || value.includes("coffee") || value.includes("tea")) return "\u2615";
  if (value.includes("food") || value.includes("meal") || value.includes("eat")) return "\u{1F35C}";
  if (value.includes("transport") || value.includes("bus") || value.includes("grab")) return "\u{1F68C}";
  if (value.includes("gift")) return "\u{1F381}";
  if (value.includes("shop")) return "\u{1F6CD}\uFE0F";
  if (value.includes("rent") || value.includes("house")) return "\u{1F3E0}";
  return "\u{1F4E6}";
}

async function suggestCategoryIconWithAI(type, categoryName) {
  const fallback = fallbackCategoryIcon(type, categoryName);
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  const allowedIcons = type === "income" ? INCOME_ICONS : EXPENSE_ICONS;
  const prompt = `
You classify category icons for finance apps.
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
    const cleaned = String(rawText).replace(/```json/g, "").replace(/```/g, "").trim();
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

async function loadRecurringContext() {
  const currentUser = await requireCurrentUser();
  if (!currentUser) return null;

  const user = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      accounts: {
        orderBy: { createdAt: "asc" },
      },
      categories: {
        where: { isArchived: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return user;
}

export async function GET() {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    await applyDueRecurringTransactionsForUser(user.id);

    const userWithMeta = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        accounts: {
          select: { id: true, name: true, currency: true, type: true },
          orderBy: { createdAt: "asc" },
        },
        categories: {
          where: { isArchived: false },
          select: { id: true, name: true, type: true, icon: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    const rules = await prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, type: true, icon: true } },
      },
    });

    return NextResponse.json({
      data: rules,
      accounts: userWithMeta?.accounts || [],
      categories: userWithMeta?.categories || [],
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load recurring transactions.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await loadRecurringContext();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const body = await request.json();
    const title = String(body.title || "").trim();
    const note = body.note ? String(body.note).trim() : null;
    const type = String(body.type || "").trim().toLowerCase();
    const amount = toPositiveNumber(body.amount);
    const frequency = normalizeRecurringFrequency(body.frequency);
    const interval = toInterval(1);
    const startDate = normalizeRecurringDate(body.startDate);
    const endDate = body.endDate ? normalizeRecurringDate(body.endDate) : null;
    const categoryIdInput = String(body.categoryId || "").trim();
    const categoryNameInput = String(body.categoryName || "").trim();

    if (!title) {
      return NextResponse.json({ message: "Title is required." }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json(
        { message: "`type` must be either `income` or `expense`." },
        { status: 400 }
      );
    }
    if (!amount) {
      return NextResponse.json({ message: "Amount must be a positive number." }, { status: 400 });
    }
    if (!startDate) {
      return NextResponse.json({ message: "Start date is required." }, { status: 400 });
    }

    const account = user.accounts[0];
    if (!account) {
      return NextResponse.json({ message: "No account found for this user." }, { status: 400 });
    }

    const categoryById = user.categories.find(
      (item) => item.id === categoryIdInput && String(item.type).toLowerCase() === type
    );
    const categoryByName = categoryNameInput
      ? user.categories.find(
          (item) =>
            String(item.type).toLowerCase() === type &&
            String(item.name || "").trim().toLowerCase() === categoryNameInput.toLowerCase()
        )
      : null;
    const defaultCategory = user.categories.find(
      (item) => String(item.type).toLowerCase() === type
    );

    let categoryId = categoryById?.id || categoryByName?.id || null;

    if (!categoryId && categoryNameInput) {
      const existingColors = new Set(user.categories.map((item) => item.color).filter(Boolean));
      const categoryColor = pickCategoryColor(existingColors);
      const icon = isOthersCategoryNameSafe(categoryNameInput)
        ? "\u{1F4E6}"
        : await suggestCategoryIconWithAI(type, categoryNameInput);

      const createdCategory = await prisma.category.create({
        data: {
          name: categoryNameInput,
          type,
          icon,
          color: categoryColor,
          userId: user.id,
        },
        select: { id: true },
      });
      categoryId = createdCategory.id;
    }

    if (!categoryId) {
      categoryId = defaultCategory?.id || null;
    }

    if (!categoryId) {
      return NextResponse.json(
        { message: "Category is required. Please type or pick one category." },
        { status: 400 }
      );
    }

    const safeEndDate = endDate ? ensureRecurringEndDate(startDate, endDate) : null;
    if (endDate && !safeEndDate) {
      return NextResponse.json(
        { message: "End date must be on or after start date." },
        { status: 400 }
      );
    }

    const created = await prisma.recurringTransaction.create({
      data: {
        title,
        note,
        amount,
        type,
        frequency,
        interval,
        nextRunDate: startDate,
        endDate: safeEndDate,
        isActive: true,
        userId: user.id,
        accountId: account.id,
        categoryId,
      },
      include: {
        account: { select: { id: true, name: true, currency: true } },
        category: { select: { id: true, name: true, type: true, icon: true } },
      },
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create recurring transaction.", error: String(error) },
      { status: 500 }
    );
  }
}
