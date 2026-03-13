import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";
import { applyDueRecurringTransactionsForUser } from "@/lib/recurring";

const VALID_TYPES = new Set(["income", "expense"]);
const EXPENSE_CATEGORY_ALIAS_TO_FOOD = new Set(["breakfast", "lunch", "dinner"]);

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

function normalizeCategoryName(type, value) {
  const name = String(value || "").trim();
  if (!name) return name;
  if (type !== "expense") return name;
  return EXPENSE_CATEGORY_ALIAS_TO_FOOD.has(name.toLowerCase()) ? "Food" : name;
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

function normalizeCategoryIconForName(type, categoryName, icon) {
  if (isOthersCategoryName(categoryName)) {
    return "\u{1F4E6}";
  }
  return icon ? String(icon).trim() : null;
}

function isValidEmojiIcon(icon) {
  const value = String(icon || "").trim();
  if (!value) return false;
  return /\p{Extended_Pictographic}/u.test(value);
}

function inferIconFromText(type, text) {
  const value = String(text || "").toLowerCase();
  if (type === "income") {
    if (value.includes("salary")) return "\u{1F4BC}";
    if (value.includes("bonus")) return "\u{1F3C6}";
    if (value.includes("invest")) return "\u{1F4C8}";
    if (value.includes("refund")) return "\u{1F4B3}";
    return "\u{1F4B0}";
  }
  if (value.includes("iphone") || value.includes("mobile") || value.includes("phone") || value.includes("smartphone") || value.includes("android") || value.includes("手机")) {
    return "\u{1F4F1}";
  }
  if (value.includes("ipad") || value.includes("tablet")) return "\u{1F4F1}";
  if (value.includes("laptop") || value.includes("macbook") || value.includes("computer")) {
    return "\u{1F4BB}";
  }
  if (value.includes("food") || value.includes("meal") || value.includes("eat")) return "\u{1F354}";
  if (value.includes("drink") || value.includes("coffee") || value.includes("tea")) return "\u2615";
  if (value.includes("transport") || value.includes("grab") || value.includes("taxi") || value.includes("bus")) return "\u{1F68C}";
  if (value.includes("gift")) return "\u{1F381}";
  if (value.includes("rent") || value.includes("house")) return "\u{1F3E0}";
  return "\u{1F4E6}";
}

function shouldForceMobileDeviceCategory(type, title, matchedCategoryName = "") {
  if (type !== "expense") return false;
  const value = String(title || "").toLowerCase();
  const isPhoneLike =
    value.includes("iphone") ||
    value.includes("mobile") ||
    value.includes("phone") ||
    value.includes("smartphone") ||
    value.includes("android") ||
    value.includes("手机");
  if (!isPhoneLike) return false;
  const normalizedMatched = String(matchedCategoryName || "").trim().toLowerCase();
  const broadCategoryNames = new Set([
    "shopping",
    "shop",
    "others",
    "other",
    "misc",
    "miscellaneous",
    "food",
    "transport",
    "gift",
    "rent",
    "utilities",
    "health",
  ]);
  return broadCategoryNames.has(normalizedMatched) || !normalizedMatched;
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
        where: { isArchived: false },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

// ==========================================
// AI Helper: Gemini 2.5 Flash Auto-Categorization
// ==========================================
async function detectCategoryWithAI(title, userCategories, transactionType) {
  const apiKey = process.env.GEMINI_API_KEY; 
  if (!apiKey) {
    console.error("[AI System] Missing GEMINI_API_KEY in environment variables.");
    return null; 
  }

  // Filter existing categories based on transaction type
  const availableCategories = userCategories
    .filter(c => c.type === transactionType)
    .map(c => ({ id: c.id, name: c.name }));

  const prompt = `
    You are a smart financial categorizer for personal finance.
    Transaction Title: "${title}"
    Type: ${transactionType}
    Existing Categories: ${JSON.stringify(availableCategories)}

    Instruction:
    1. Return "existing" only when one existing category is a strong, precise match.
    2. If it is specific (brand/product/object) and existing categories are too broad (e.g. shopping/others), return "new" with a specific category name.
    3. For "new", choose one suitable emoji icon. You are NOT restricted to a fixed icon list.
    4. Avoid generic names like "Shopping" when title gives specific intent.
    5. MUST output ONLY a valid JSON object. No text or markdown.

    Output format MUST be exactly one of these:
    {"type": "existing", "id": "category_id_here"}
    OR
    {"type": "new", "name": "Category Name", "icon": "icon_here"}
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 } 
      })
    });

    const data = await response.json();
    
    if (data.error) {
       console.error("[AI System] Google API Error:", data.error.message);
       return null;
    }

    let aiTextResult = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!aiTextResult) return null;

    // Sanitize potential markdown wrappers from AI response
    if (aiTextResult.startsWith("```json")) {
      aiTextResult = aiTextResult.replace(/```json/g, "").replace(/```/g, "").trim();
    } else if (aiTextResult.startsWith("```")) {
      aiTextResult = aiTextResult.replace(/```/g, "").trim();
    }

    const aiDecision = JSON.parse(aiTextResult);
    if (aiDecision?.type === "existing" && aiDecision?.id) {
      return { type: "existing", id: String(aiDecision.id).trim() };
    }
    if (aiDecision?.type === "new" && aiDecision?.name) {
      const normalizedName = String(aiDecision.name).trim();
      if (!normalizedName) return null;
      const candidateIcon = String(aiDecision.icon || "").trim();
      return {
        type: "new",
        name: normalizedName,
        icon: isValidEmojiIcon(candidateIcon)
          ? candidateIcon
          : inferIconFromText(transactionType, `${title} ${normalizedName}`),
      };
    }
    return null;

  } catch (error) {
    console.error("[AI System] Failed to parse AI response or network error:", error);
    return null;
  }
}
// ==========================================

export async function GET(request) {
  try {
    const user = await getAuthenticatedUserWithBaseData();
    if (!user) {
      return NextResponse.json(
        { message: "Unauthorized. Please login." },
        { status: 401 }
      );
    }
    await applyDueRecurringTransactionsForUser(user.id);

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 50), 1), 500);
    const type = searchParams.get("type");
    const categoryId = searchParams.get("categoryId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    const q = searchParams.get("q")?.trim();

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

    if (!q) {
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
    }

    const include = {
      account: { select: { id: true, name: true, currency: true, type: true } },
      category: { select: { id: true, name: true, type: true, color: true, icon: true } },
    };

    const titleMatches = await prisma.transaction.findMany({
      where: { ...where, title: { contains: q } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    const categoryMatches = await prisma.transaction.findMany({
      where: { ...where, category: { name: { contains: q } } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    const noteMatches = await prisma.transaction.findMany({
      where: { ...where, note: { contains: q } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    const numeric = Number(String(q).replace(/[^0-9.-]/g, ""));
    const amountMatches = Number.isFinite(numeric)
      ? await prisma.transaction.findMany({
          where: { ...where, amount: numeric },
          take: limit,
          orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
          include,
        })
      : [];

    const parsedDate = new Date(q);
    let dateMatches = [];
    if (!Number.isNaN(parsedDate.getTime())) {
      const start = new Date(parsedDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(parsedDate);
      end.setHours(23, 59, 59, 999);
      dateMatches = await prisma.transaction.findMany({
        where: { ...where, transactionDate: { gte: start, lte: end } },
        take: limit,
        orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
        include,
      });
    }

    const byId = new Map();
    const pushResults = (arr, priority) => {
      for (const item of arr || []) {
        if (!byId.has(item.id)) {
          byId.set(item.id, { ...item, _priority: priority });
        }
      }
    };

    pushResults(titleMatches, 1);
    pushResults(categoryMatches, 2);
    pushResults(noteMatches, 3);
    pushResults(amountMatches, 4);
    pushResults(dateMatches, 5);

    const merged = Array.from(byId.values())
      .sort((a, b) => {
        if (a._priority !== b._priority) {
          return a._priority - b._priority;
        }
        return new Date(b.transactionDate) - new Date(a.transactionDate);
      })
      .map(({ _priority, ...item }) => item)
      .slice(0, limit);

    if (merged.length > 0) {
      return NextResponse.json({ data: merged, count: merged.length });
    }

    try {
      const tokens = q.split(/\s+/).filter(Boolean);
      if (tokens.length > 0) {
        function escapeLike(s) {
          return String(s).replace(/([%_\\])/g, "\\$1");
        }
        const params = [user.id];
        const tokenClauses = tokens.map((token) => {
          const cleaned = escapeLike(token);
          const pattern = `%${cleaned.split("").join("%")}%`;
          params.push(pattern, pattern, pattern);
          return `(t."title" LIKE ? ESCAPE '\\' OR t."note" LIKE ? ESCAPE '\\' OR c."name" LIKE ? ESCAPE '\\')`;
        });

        const whereSql = tokenClauses.join(" AND ");
        const sql = `SELECT t.*, c.id as category_id, c.name as category_name, c.type as category_type, c.color as category_color, c.icon as category_icon, a.id as account_id, a.name as account_name, a.currency as account_currency, a.type as account_type FROM "Transaction" t LEFT JOIN "Account" a ON t."accountId" = a.id LEFT JOIN "Category" c ON t."categoryId" = c.id WHERE t."userId" = ? AND (${whereSql}) ORDER BY t."transactionDate" DESC, t."createdAt" DESC LIMIT ${limit}`;

        const rows = await prisma.$queryRawUnsafe(sql, ...params);
        const mapped = (rows || []).map((r) => ({
          id: r.id,
          title: r.title,
          note: r.note,
          amount: r.amount,
          type: r.type,
          transactionDate: r.transactionDate,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          userId: r.userId,
          accountId: r.accountId,
          categoryId: r.categoryId,
          account: r.account_id ? { id: r.account_id, name: r.account_name, currency: r.account_currency, type: r.account_type } : null,
          category: r.category_id
            ? {
                id: r.category_id,
                name: r.category_name,
                type: r.category_type,
                color: r.category_color,
                icon: r.category_icon,
              }
            : null,
        }));
        if (mapped.length > 0) {
          return NextResponse.json({ data: mapped, count: mapped.length });
        }
      }
    } catch (err) {
      console.error("Fuzzy search fallback failed:", String(err));
    }

    return NextResponse.json({ data: [], count: 0 });
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
    let categoryName = body.categoryName ? String(body.categoryName).trim() : null;
    let categoryIcon = body.categoryIcon ? String(body.categoryIcon).trim() : null;
    let bodyCategoryId = body.categoryId; 
    let newCategorySource = categoryName ? "user" : null;
    
    const amount = toPositiveNumber(body.amount);
    const transactionDate = body.transactionDate ? new Date(body.transactionDate) : new Date();

    if (!title) {
      return NextResponse.json({ message: "`title` is required." }, { status: 400 });
    }
    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ message: "`type` must be either `income` or `expense`." }, { status: 400 });
    }
    if (!amount) {
      return NextResponse.json({ message: "`amount` must be a positive number." }, { status: 400 });
    }
    if (Number.isNaN(transactionDate.getTime())) {
      return NextResponse.json({ message: "`transactionDate` must be a valid date." }, { status: 400 });
    }
    if (isFutureDate(transactionDate)) {
      return NextResponse.json({ message: "`transactionDate` cannot be in the future." }, { status: 400 });
    }

    categoryName = categoryName ? normalizeCategoryName(type, categoryName) : categoryName;
    categoryIcon = normalizeCategoryIconForName(type, categoryName, categoryIcon);

    const account = user.accounts.find((item) => item.id === body.accountId) || user.accounts[0];
    if (!account) {
      return NextResponse.json({ message: "No account found for that user." }, { status: 400 });
    }

    // ==========================================
    // AI Auto-Categorization Intercept
    // Triggered only if the user did not manually select a category
    // ==========================================
    if (!bodyCategoryId && !categoryName) {
      console.log(`[AI System] Processing categorization for title: "${title}"`);
      const aiResult = await detectCategoryWithAI(title, user.categories, type);
      
      if (aiResult) {
        if (aiResult.type === "existing" && aiResult.id) {
          const matched = user.categories.find((item) => item.id === aiResult.id);
          if (shouldForceMobileDeviceCategory(type, title, matched?.name)) {
            categoryName = "Mobile Device";
            categoryIcon = "\u{1F4F1}";
            newCategorySource = "ai";
            console.log("[AI System] Overrode broad existing category with specific AI category: Mobile Device");
          } else {
            bodyCategoryId = aiResult.id;
            console.log(`[AI System] Successfully matched existing Category ID: ${bodyCategoryId}`);
          }
        } else if (aiResult.type === "new" && aiResult.name && aiResult.icon) {
          categoryName = normalizeCategoryName(type, aiResult.name);
          if (shouldForceMobileDeviceCategory(type, title, categoryName)) {
            categoryName = "Mobile Device";
            categoryIcon = "\u{1F4F1}";
          } else {
            categoryIcon = normalizeCategoryIconForName(type, categoryName, aiResult.icon);
          }
          newCategorySource = "ai";
          console.log(`[AI System] Successfully generated new Category: ${categoryName} ${categoryIcon}`);
        }
      }
    }
    // ==========================================

    // Fallback logic if AI fails or user provided inputs
    const defaultCategory = user.categories.find((item) => item.type === type) || user.categories[0];
    const categoryById = user.categories.find((item) => item.id === bodyCategoryId); 
    const categoryByName = categoryName
      ? user.categories.find(
          (item) => item.type === type && item.name.toLowerCase() === categoryName.toLowerCase()
        )
      : null;

    const selectedCategory = categoryById || categoryByName || defaultCategory;
    const existingColors = new Set(user.categories.map((item) => item.color).filter(Boolean));
    const categoryColor = pickCategoryColor(existingColors);

    const transaction = await prisma.$transaction(async (tx) => {
      let categoryId = categoryById?.id || categoryByName?.id || null;
      
      // Create new category if generated by AI or custom input
      if (!categoryId && categoryName) {
        const createdCategory = await tx.category.create({
          data: {
            name: categoryName,
            type,
            source: newCategorySource === "ai" ? "ai" : "user",
            icon: normalizeCategoryIconForName(type, categoryName, categoryIcon),
            color: categoryColor,
            userId: user.id,
          },
          select: { id: true },
        });
        categoryId = createdCategory.id;
      } else if (
        categoryByName &&
        isOthersCategoryName(categoryByName.name) &&
        String(categoryByName.icon || "").trim() !== "\u{1F4E6}"
      ) {
        await tx.category.update({
          where: { id: categoryByName.id },
          data: { icon: "\u{1F4E6}" },
        });
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

