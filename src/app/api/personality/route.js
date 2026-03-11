import { NextResponse } from "next/server";
import { normalizeLanguage } from "@/lib/i18n";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const DISALLOWED_PATTERN = /(18\+|nsfw|explicit|adult|sexual|erotic|porn|fetish|onlyfans)/i;
const LANGUAGE_LABELS = {
  en: "English",
  zh: "Simplified Chinese",
  ms: "Bahasa Melayu",
};

function formatAmount(value) {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return "RM 0.00";
  }
  return `RM ${Number(value).toFixed(2)}`;
}

function buildUserPrompt({ persona, intent, target, remaining, spent, question, streak, milestone, previousStreak, report }) {
  const targetText = formatAmount(target);
  const remainingText = formatAmount(remaining);
  const spentText = formatAmount(spent);
  const streakValue = Number.isFinite(Number(streak)) ? Number(streak) : 0;
  const milestoneValue = Number.isFinite(Number(milestone)) ? Number(milestone) : 0;
  const previousStreakValue = Number.isFinite(Number(previousStreak)) ? Number(previousStreak) : 0;
  const reportText = String(report || "").trim();

  switch (intent) {
    case "ask_target":
      return `Personality: ${persona}. Write one short English line asking the user what today's spending target is, and add a gentle encouragement to set a realistic amount.`;
    case "encourage_start":
      return `Personality: ${persona}. Write one short English encouragement about staying within today's target of ${targetText}.`;
    case "caution_half":
      return `Personality: ${persona}. Write one short English warning that the user has used about half their target. Remaining: ${remainingText}.`;
    case "target_reached":
      return `Personality: ${persona}. Write one short English line telling the user they have reached their target. Remaining: ${remainingText}.`;
    case "over_budget":
      return `Personality: ${persona}. Write one short English line telling the user they are over budget. Remaining is ${remainingText}.`;
    case "day_end":
      return `Personality: ${persona}. Write one short English end-of-day encouragement. Target: ${targetText}. Spent: ${spentText}.`;
    case "idle_tip":
      return `Personality: ${persona}. Write one short English financial tip for today.`;
    case "financial_q":
      return `Personality: ${persona}. Answer the user's question in 2-4 concise sentences and include at least two practical tips. Keep it friendly and specific. Question: ${question}`;
    case "streak_continue":
      return `Personality: ${persona}. Write one short English encouragement about keeping a ${streakValue}-day streak. Keep it upbeat and supportive.`;
    case "streak_break":
      return `Personality: ${persona}. Write one short English comforting line that the user missed a day and their ${previousStreakValue}-day streak ended. Encourage restarting tomorrow.`;
    case "streak_milestone":
      return `Personality: ${persona}. Write one short English celebration for reaching a ${milestoneValue}-day streak and encourage staying consistent.`;
    case "report_summary":
      return `Personality: ${persona}. Write 3-5 sentences with clear, practical spending advice and two actionable next steps based on this report: ${reportText}`;
    default:
      return `Personality: ${persona}. Write one short English line in that personality.`;
  }
}

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: "Missing GEMINI_API_KEY." }, { status: 500 });
  }

  const body = await request.json();
  const persona = String(body?.persona || "").trim();
  const intent = String(body?.intent || "").trim();
  const question = String(body?.question || "").trim();
  const language = normalizeLanguage(body?.language || "en");

  if (!persona) {
    return NextResponse.json({ error: "Personality is required." }, { status: 400 });
  }

  if (DISALLOWED_PATTERN.test(persona)) {
    return NextResponse.json({ error: "The personality you described is not compliant." }, { status: 400 });
  }

  const isReportSummary = intent === "report_summary";
  const isLongForm = isReportSummary || intent === "financial_q";
  const maxLength = isReportSummary ? 650 : isLongForm ? 450 : 140;

  const baseSystemPrompt = isReportSummary
    ? "You create a detailed reply of 3-5 sentences with clear, practical spending advice. Start with one fitting emoticon. Keep it under 650 characters. Stay in character and include two actionable suggestions. No explicit or adult content. No extra explanation."
    : isLongForm
    ? "You create a concise but detailed reply of 2-4 sentences. Start with one fitting emoticon. Keep it under 450 characters. Stay in character but always provide helpful, relevant information. No explicit or adult content. No extra explanation."
    : "You create a single short English reply. Start with one fitting emoticon. Keep it under 140 characters. Stay in character but always provide helpful, relevant information. No explicit or adult content. No extra explanation.";

  const systemPrompt =
    language === "en"
      ? baseSystemPrompt
      : `${baseSystemPrompt} Then translate the final reply into ${LANGUAGE_LABELS[language]}. Keep the emoticon at the start. Return only the translated text. Keep it under ${maxLength} characters in the target language. No labels or quotation marks.`;

  const userPrompt = buildUserPrompt({
    persona,
    intent,
    question,
    target: body?.target,
    remaining: body?.remaining,
    spent: body?.spent,
    streak: body?.streak,
    milestone: body?.milestone,
    previousStreak: body?.previousStreak,
    report: body?.report,
  });

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    return NextResponse.json({ error: errorPayload?.error?.message || "Failed to generate response." }, { status: 500 });
  }

  const payload = await response.json();
  const text =
    payload?.candidates?.[0]?.content?.parts?.[0]?.text ||
    payload?.candidates?.[0]?.content?.parts?.map((part) => part.text).join("") ||
    "";

  if (!text) {
    return NextResponse.json({ error: "Empty response from model." }, { status: 500 });
  }

  return NextResponse.json({ text });
}









