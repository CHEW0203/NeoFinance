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

    // If no search query, return all transactions
    if (!q) {
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
    }

    // Search logic with relevance scoring
    const include = {
      account: { select: { id: true, name: true, currency: true, type: true } },
      category: { select: { id: true, name: true, type: true, color: true } },
    };

    // Priority 1: Title contains query (exact or partial)
    const titleMatches = await prisma.transaction.findMany({
      where: { ...where, title: { contains: q } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    // Priority 2: Category name contains query
    const categoryMatches = await prisma.transaction.findMany({
      where: { ...where, category: { name: { contains: q } } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    // Priority 3: Note contains query
    const noteMatches = await prisma.transaction.findMany({
      where: { ...where, note: { contains: q } },
      take: limit,
      orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
      include,
    });

    // Priority 4: Amount matches (after removing non-numeric characters)
    const numeric = Number(String(q).replace(/[^0-9.-]/g, ""));
    const amountMatches = Number.isFinite(numeric)
      ? await prisma.transaction.findMany({
          where: { ...where, amount: numeric },
          take: limit,
          orderBy: [{ transactionDate: "desc" }, { createdAt: "desc" }],
          include,
        })
      : [];

    // Priority 5: Date matches
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

    // Merge results by ID, preserving priority order
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

    // Sort by priority, then by date
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

    // Fallback: fuzzy search using raw SQL for typos
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
        const sql = `SELECT t.*, c.id as category_id, c.name as category_name, c.type as category_type, c.color as category_color, a.id as account_id, a.name as account_name, a.currency as account_currency, a.type as account_type FROM "Transaction" t LEFT JOIN "Account" a ON t."accountId" = a.id LEFT JOIN "Category" c ON t."categoryId" = c.id WHERE t."userId" = ? AND (${whereSql}) ORDER BY t."transactionDate" DESC, t."createdAt" DESC LIMIT ${limit}`;

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
          category: r.category_id ? { id: r.category_id, name: r.category_name, type: r.category_type, color: r.category_color } : null,
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
