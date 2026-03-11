import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pickCategoryColor } from "@/lib/category-colors";
import { requireCurrentUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
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

function normalizeCurrency(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return null;
  if (raw === "MYR") return "RM";
  if (raw === "RM") return "RM";
  return raw;
}

function parseDataUrl(dataUrl) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  const mimeType = match[1].toLowerCase();
  const base64Data = match[2];
  if (!ALLOWED_MIME_TYPES.has(mimeType)) return null;
  return { mimeType, base64Data };
}

function sanitizeGeminiText(text) {
  if (!text) return "";
  let cleaned = String(text).trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/```json/g, "").replace(/```/g, "").trim();
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/```/g, "").trim();
  }
  return cleaned;
}

function extractJsonFromText(text) {
  const cleaned = sanitizeGeminiText(text);
  if (!cleaned) return null;
  if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
    return cleaned;
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return cleaned.slice(start, end + 1);
}

function parseAmountCandidate(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") return toPositiveNumber(value);
  const cleaned = String(value).replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  const normalized = cleaned.replace(/,/g, "");
  return toPositiveNumber(normalized);
}

function findTotalAmountFromText(text) {
  const content = String(text || "");
  if (!content) return null;
  const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const totalLines = lines.filter((line) => /total|grand total|amount due|balance/i.test(line));
  const candidates = totalLines.length > 0 ? totalLines : lines;
  let best = null;
  for (const line of candidates) {
    const matches = line.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))/g);
    if (!matches) continue;
    for (const match of matches) {
      const amount = parseAmountCandidate(match);
      if (amount && (!best || amount > best)) {
        best = amount;
      }
    }
  }
  return best;
}

async function callGemini(apiKey, payload) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) {
    const message = data?.error?.message || "Gemini request failed.";
    throw new Error(message);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((part) => part?.text || "").join("\n").trim();
  return text;
}

async function extractOcrText(apiKey, base64Data, mimeType) {
  const prompt = "Extract all readable text from this receipt image. Return plain text only.";
  const payload = {
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0,
    },
  };

  const text = await callGemini(apiKey, payload);
  return sanitizeGeminiText(text);
}

async function extractReceiptData(apiKey, ocrText, categoryNames) {
  const prompt = `
You are a receipt parser.
OCR text:
"""
${ocrText}
"""
Existing expense categories: ${JSON.stringify(categoryNames)}

Return ONLY valid JSON with this shape:
{
  "title": "Short title for the expense",
  "merchant": "Merchant or store name, or null",
  "totalAmount": 12.34,
  "currency": "RM or MYR, or null",
  "date": "YYYY-MM-DD, or null",
  "category": "Use an existing category name if it fits, otherwise suggest a short new category"
}
`;

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2 },
  };

  const text = await callGemini(apiKey, payload);
  const jsonText = extractJsonFromText(text);
  if (!jsonText) return null;
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    return null;
  }
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

function formatReceipt(record) {
  if (!record) return null;
  return {
    id: record.id,
    imageUrl: record.imagePath,
    merchant: record.merchant,
    totalAmount: record.totalAmount,
    currency: record.currency,
    transactionDate: record.transactionDate,
    createdAt: record.createdAt,
    transactionId: record.transactionId,
  };
}

export async function GET(request) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 60), 1), 200);

    const receipts = await prisma.receipt.findMany({
      where: { userId: user.id },
      take: limit,
      orderBy: [{ createdAt: "desc" }],
      include: {
        transaction: {
          include: {
            category: { select: { id: true, name: true, color: true, icon: true, type: true } },
            account: { select: { id: true, name: true, currency: true, type: true } },
          },
        },
      },
    });

    return NextResponse.json({
      data: receipts.map((record) => ({
        ...formatReceipt(record),
        transaction: record.transaction || null,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load receipts.", error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await getAuthenticatedUserWithBaseData();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = parseDataUrl(body?.imageDataUrl);
    if (!parsed) {
      return NextResponse.json(
        { message: "Invalid image payload. Please capture a receipt photo." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(parsed.base64Data, "base64");
    if (!buffer.length) {
      return NextResponse.json({ message: "Invalid image data." }, { status: 400 });
    }
    if (buffer.length > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { message: "Image too large. Please try a smaller photo." },
        { status: 413 }
      );
    }

    const ext = parsed.mimeType === "image/png" ? "png" : parsed.mimeType === "image/webp" ? "webp" : "jpg";
    const fileName = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.${ext}`;
    const receiptDir = path.join(process.cwd(), "public", "receipts", user.id);
    await fs.mkdir(receiptDir, { recursive: true });
    const filePath = path.join(receiptDir, fileName);
    await fs.writeFile(filePath, buffer);
    const imagePath = `/receipts/${user.id}/${fileName}`;

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: "Missing GEMINI_API_KEY in environment variables." },
        { status: 500 }
      );
    }

    const ocrText = await extractOcrText(apiKey, parsed.base64Data, parsed.mimeType);
    if (!ocrText) {
      const saved = await prisma.receipt.create({
        data: {
          imagePath,
          userId: user.id,
        },
      });
      return NextResponse.json(
        { message: "Failed to read the receipt text.", data: { receipt: formatReceipt(saved) } },
        { status: 422 }
      );
    }

    const categoryNames = user.categories
      .filter((item) => item.type === "expense")
      .map((item) => item.name);

    const extracted = await extractReceiptData(apiKey, ocrText, categoryNames);
    const extractedJson = extracted ? JSON.stringify(extracted) : null;

    const merchant = extracted?.merchant ? String(extracted.merchant).trim() : null;
    const title = String(extracted?.title || merchant || "Receipt expense").trim();
    const rawCategory = extracted?.category ? String(extracted.category).trim() : null;
    const categoryName = rawCategory ? normalizeCategoryName("expense", rawCategory) : null;
    const currency = normalizeCurrency(extracted?.currency) || "RM";

    let transactionDate = extracted?.date ? new Date(extracted.date) : new Date();
    if (Number.isNaN(transactionDate.getTime()) || isFutureDate(transactionDate)) {
      transactionDate = new Date();
    }

    let amount = parseAmountCandidate(extracted?.totalAmount);
    if (!amount) {
      amount = findTotalAmountFromText(ocrText);
    }

    if (!amount) {
      const saved = await prisma.receipt.create({
        data: {
          imagePath,
          ocrText,
          extractedJson,
          merchant,
          currency,
          transactionDate,
          userId: user.id,
        },
      });
      return NextResponse.json(
        {
          message: "Unable to detect total amount from the receipt.",
          data: { receipt: formatReceipt(saved) },
        },
        { status: 422 }
      );
    }

    const account = user.accounts[0];
    if (!account) {
      return NextResponse.json({ message: "No account found for that user." }, { status: 400 });
    }

    const defaultCategory =
      user.categories.find((item) => item.type === "expense") || user.categories[0];
    const categoryByName = categoryName
      ? user.categories.find(
          (item) =>
            item.type === "expense" &&
            item.name.trim().toLowerCase() === categoryName.trim().toLowerCase()
        )
      : null;
    if (!categoryName && !defaultCategory) {
      return NextResponse.json({ message: "No category found for that user." }, { status: 400 });
    }

    const existingColors = new Set(user.categories.map((item) => item.color).filter(Boolean));
    const categoryColor = pickCategoryColor(existingColors);

    const result = await prisma.$transaction(async (tx) => {
      let categoryId = categoryByName?.id || null;
      if (!categoryId && categoryName) {
        const createdCategory = await tx.category.create({
          data: {
            name: categoryName,
            type: "expense",
            icon: null,
            color: categoryColor,
            userId: user.id,
          },
          select: { id: true },
        });
        categoryId = createdCategory.id;
      }
      if (!categoryId && defaultCategory) {
        categoryId = defaultCategory.id;
      }
      if (!categoryId) {
        throw new Error("No category found for that user.");
      }

      const createdTransaction = await tx.transaction.create({
        data: {
          title,
          type: "expense",
          amount,
          note: null,
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

      await tx.account.update({
        where: { id: account.id },
        data: {
          balance: { decrement: amount },
        },
      });

      const createdReceipt = await tx.receipt.create({
        data: {
          imagePath,
          ocrText,
          extractedJson,
          merchant,
          totalAmount: amount,
          currency,
          transactionDate,
          userId: user.id,
          transactionId: createdTransaction.id,
        },
      });

      return { transaction: createdTransaction, receipt: createdReceipt };
    });

    return NextResponse.json(
      {
        data: {
          receipt: formatReceipt(result.receipt),
          transaction: result.transaction,
          extracted,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to scan receipt.", error: String(error) },
      { status: 500 }
    );
  }
}
