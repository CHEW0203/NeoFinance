import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/auth/session";
import { normalizeLanguage } from "@/lib/i18n";
import {
  buildForecastPrompt,
  canUseTransactionsForForecast,
  computeCashflowForecast,
  getForecastTrend,
} from "@/lib/cashflow-forecast";
import { applyDueRecurringTransactionsForUser } from "@/lib/recurring";

const LANGUAGE_LABELS = {
  en: "English",
  zh: "Simplified Chinese",
  ms: "Bahasa Melayu",
};

async function buildAiSummary({ forecast, currency, language }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "";

  const basePrompt = `
You are a personal finance assistant.
Given this forecast data, write 2-4 short sentences:
- Explain the trend simply.
- Mention one risk.
- Give two practical action steps.
Keep it concise and concrete.
Data: ${buildForecastPrompt(forecast, currency)}
Trend: ${getForecastTrend(forecast)}
`;

  const prompt =
    language === "en"
      ? basePrompt
      : `${basePrompt}\nReturn final text in ${LANGUAGE_LABELS[language]}.`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 220,
          },
        }),
      }
    );
    if (!response.ok) return "";
    const payload = await response.json().catch(() => ({}));
    const text =
      payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
      payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") ||
      "";
    return String(text || "").trim();
  } catch {
    return "";
  }
}

export async function GET(request) {
  try {
    const user = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized. Please login." }, { status: 401 });
    }

    await applyDueRecurringTransactionsForUser(user.id);

    const url = new URL(request.url);
    const language = normalizeLanguage(url.searchParams.get("lang") || "en");

    const [accounts, transactions] = await Promise.all([
      prisma.account.findMany({
        where: { userId: user.id },
        select: { balance: true, currency: true },
      }),
      prisma.transaction.findMany({
        where: {
          userId: user.id,
          transactionDate: {
            gte: (() => {
              const cutoff = new Date();
              cutoff.setDate(cutoff.getDate() - 120);
              return cutoff;
            })(),
          },
        },
        orderBy: { transactionDate: "desc" },
        select: {
          transactionDate: true,
          amount: true,
          type: true,
        },
      }),
    ]);

    const currentBalance = accounts.reduce((sum, item) => sum + Number(item.balance || 0), 0);
    const currency = accounts[0]?.currency === "MYR" ? "RM" : accounts[0]?.currency || "RM";

    const forecast = computeCashflowForecast({
      transactions,
      currentBalance,
      now: new Date(),
    });

    const hasEnoughData = canUseTransactionsForForecast(transactions, new Date());
    const aiSummary = hasEnoughData
      ? await buildAiSummary({ forecast, currency, language })
      : "";

    return NextResponse.json({
      data: {
        ...forecast,
        currency,
        trend: getForecastTrend(forecast),
        hasEnoughData,
        aiSummary,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to load forecast.", error: String(error) },
      { status: 500 }
    );
  }
}
