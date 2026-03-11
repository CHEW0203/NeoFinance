"use client";

import { useEffect, useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { useTransactions } from "@/hooks/use-transactions";
import { pickCategoryColor } from "@/lib/category-colors";
import { formatCurrency } from "@/utils/format";

const PERSONA_KEY = "ft_persona_prompt";
const TIMEOUT_ERROR_CODE = "REQUEST_TIMEOUT";

function startOfDay(date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function clampNumber(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  if (normalized.length !== 6) return null;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  if ([r, g, b].some((value) => Number.isNaN(value))) return null;
  return { r, g, b };
}

function rgbToHsl(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / delta + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h /= 6;
  }

  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  const hn = (h % 360) / 360;
  const sn = s / 100;
  const ln = l / 100;
  if (sn === 0) {
    const value = Math.round(ln * 255);
    return { r: value, g: value, b: value };
  }

  const q = ln < 0.5 ? ln * (1 + sn) : ln + sn - ln * sn;
  const p = 2 * ln - q;
  const hueToRgb = (t) => {
    let temp = t;
    if (temp < 0) temp += 1;
    if (temp > 1) temp -= 1;
    if (temp < 1 / 6) return p + (q - p) * 6 * temp;
    if (temp < 1 / 2) return q;
    if (temp < 2 / 3) return p + (q - p) * (2 / 3 - temp) * 6;
    return p;
  };

  return {
    r: Math.round(hueToRgb(hn + 1 / 3) * 255),
    g: Math.round(hueToRgb(hn) * 255),
    b: Math.round(hueToRgb(hn - 1 / 3) * 255),
  };
}

function brightenColor(color) {
  const trimmed = String(color || "").trim();
  if (!trimmed) return trimmed;

  let hsl = null;
  let alpha = null;
  let isHex = false;

  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length !== 6) return trimmed;
    const rgb = hexToRgb(hex);
    if (!rgb) return trimmed;
    hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    isHex = true;
  } else {
    const hslMatch = trimmed.match(
      /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i
    );
    if (!hslMatch) return trimmed;
    hsl = {
      h: Number(hslMatch[1]),
      s: Number(hslMatch[2]),
      l: Number(hslMatch[3]),
    };
    alpha = hslMatch[4];
  }

  if (!hsl || [hsl.h, hsl.s, hsl.l].some((value) => Number.isNaN(value))) return trimmed;

  const nextSaturation = clampNumber(hsl.s + 30, 85, 100);
  let nextLightness = clampNumber(hsl.l + 22, 58, 78);
  if (nextLightness > 74) nextLightness = 72;

  if (isHex) {
    const rgb = hslToRgb(hsl.h, nextSaturation, nextLightness);
    const toHex = (value) => value.toString(16).padStart(2, "0");
    return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
  }

  if (alpha === undefined) {
    return `hsl(${hsl.h}, ${nextSaturation}%, ${nextLightness}%)`;
  }
  return `hsla(${hsl.h}, ${nextSaturation}%, ${nextLightness}%, ${alpha})`;
}

const VIVID_FALLBACK_PALETTE = [
  "#0081e2",
  "#00b3ff",
  "#00f0ff",
  "#00d084",
  "#22e06b",
  "#a3ff12",
  "#ffd400",
  "#ff9f1c",
  "#ff5d5d",
  "#ff2d85",
  "#ff6ad5",
  "#b54bff",
  "#7c5cff",
  "#00c2ff",
];

function getUniqueBrightColor(color, usedColors, index) {
  let candidate = brightenColor(color);
  const normalizedUsed = usedColors || new Set();
  const palette = VIVID_FALLBACK_PALETTE;
  let paletteIndex = index % palette.length;
  let attempts = 0;

  while (!candidate || normalizedUsed.has(String(candidate).toLowerCase())) {
    candidate = palette[paletteIndex % palette.length];
    paletteIndex += 1;
    attempts += 1;
    if (attempts > palette.length) {
      const hue = Math.round((index * 137.5 + attempts * 29) % 360);
      candidate = `hsl(${hue}, 85%, 55%)`;
    }
    if (attempts > palette.length + 8) {
      break;
    }
  }

  if (candidate) {
    normalizedUsed.add(String(candidate).toLowerCase());
  }
  return candidate || color;
}

function applyColorAlpha(color, alpha = 0.08) {
  const trimmed = String(color || "").trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("#")) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (hex.length !== 6) return trimmed;
    const rgb = hexToRgb(hex);
    if (!rgb) return trimmed;
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
  }

  const hslMatch = trimmed.match(
    /^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/i
  );
  if (hslMatch) {
    const hue = Number(hslMatch[1]);
    const saturation = Number(hslMatch[2]);
    const lightness = Number(hslMatch[3]);
    if ([hue, saturation, lightness].some((value) => Number.isNaN(value))) return trimmed;
    return `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
  }

  return trimmed;
}

function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
}

function describeArc(centerX, centerY, radius, startAngle, endAngle) {
  const start = polarToCartesian(centerX, centerY, radius, endAngle);
  const end = polarToCartesian(centerX, centerY, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return [
    `M ${centerX} ${centerY}`,
    `L ${start.x} ${start.y}`,
    `A ${radius} ${radius} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`,
    "Z",
  ].join(" ");
}

function buildSummaryPoints(totalSpent, topCategory, avgPerDay, transactionCount, t) {
  if (!totalSpent) return [];
  const points = [];
  points.push(`${t?.pages?.reportTotal || "Total spent"}: ${formatCurrency(totalSpent, "RM")}`);
  if (topCategory) {
    points.push(
      `${t?.pages?.reportTopCategory || "Top category"}: ${topCategory.name} (${topCategory.percent.toFixed(0)}%)`
    );
  }
  points.push(
    `${t?.pages?.reportAvgDaily || "Avg per day"}: ${formatCurrency(avgPerDay, "RM")}`
  );
  points.push(
    `${t?.pages?.reportTransactionCount || "Transactions"}: ${transactionCount}`
  );
  return points;
}

async function fetchPersonaMessage(payload, language) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("/api/personality", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...payload, language }),
      signal: controller.signal,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || "Failed to generate response.");
    }

    return data?.text || "";
  } catch (error) {
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timed out.");
      timeoutError.code = TIMEOUT_ERROR_CODE;
      throw timeoutError;
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export default function ReportPage() {
  const { language, t } = useLanguage();
  const { transactions, isLoading, error } = useTransactions();
  const [range, setRange] = useState("month");
  const [personaPrompt, setPersonaPrompt] = useState("");
  const [summaryAdvice, setSummaryAdvice] = useState("");
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedPersona = window.localStorage.getItem(PERSONA_KEY) || "";
    setPersonaPrompt(storedPersona);
  }, []);

  const rangeLabel = useMemo(() => {
    if (range === "month") return t?.pages?.month1 || "1 Month";
    if (range === "half") return t?.pages?.month6 || "6 Months";
    return t?.pages?.year1 || "1 Year";
  }, [range, t]);

  const rangeStart = useMemo(() => {
    const now = new Date();
    if (range === "month") {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 1);
      return startOfDay(start);
    }
    if (range === "half") {
      const start = new Date(now);
      start.setMonth(start.getMonth() - 6);
      return startOfDay(start);
    }
    const start = new Date(now);
    start.setFullYear(start.getFullYear() - 1);
    return startOfDay(start);
  }, [range]);

  const rangeDays = useMemo(() => {
    const now = new Date();
    const diff = now.getTime() - rangeStart.getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [rangeStart]);

  const expenseRows = useMemo(() => {
    return (transactions || [])
      .filter((item) => item.type === "expense")
      .filter((item) => new Date(item.transactionDate) >= rangeStart);
  }, [transactions, rangeStart]);

  const categoryData = useMemo(() => {
    const map = new Map();
    expenseRows.forEach((item) => {
      const category = item.category || {};
      const id = category.id || `uncat-${item.id}`;
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: category.name || t?.pages?.reportUncategorized || "Uncategorized",
          color: category.color || "",
          total: 0,
          items: [],
        });
      }
      const entry = map.get(id);
      entry.total += Number(item.amount || 0);
      entry.items.push(item);
    });

    const usedColors = new Set();
    return Array.from(map.values()).map((entry) => {
      let color = entry.color ? String(entry.color) : "";
      if (!color || usedColors.has(color.toLowerCase())) {
        color = pickCategoryColor(usedColors);
      }
      usedColors.add(String(color).toLowerCase());
      return {
        ...entry,
        color,
        items: entry.items.sort(
          (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
        ),
      };
    });
  }, [expenseRows, t]);

  const totalSpent = useMemo(() => {
    return categoryData.reduce((sum, item) => sum + item.total, 0);
  }, [categoryData]);

  const summaryItems = useMemo(() => {
    if (!totalSpent) return [];
    const baseItems = categoryData
      .map((item) => ({
        ...item,
        percent: clampNumber((item.total / totalSpent) * 100, 0, 100),
      }))
      .sort((a, b) => b.total - a.total);
    const usedColors = new Set();
    return baseItems.map((item, index) => {
      const displayColor = getUniqueBrightColor(item.color, usedColors, index);
      return {
        ...item,
        color: displayColor,
        displayColor,
      };
    });
  }, [categoryData, totalSpent]);

  const pieSegments = useMemo(() => {
    if (!summaryItems.length) return [];
    let startAngle = 0;
    return summaryItems.map((item) => {
      const angle = (item.percent / 100) * 360;
      const endAngle = startAngle + angle;
      const path = describeArc(110, 110, 90, startAngle, endAngle);
      const segment = { ...item, path };
      startAngle = endAngle;
      return segment;
    });
  }, [summaryItems]);

  const topCategory = summaryItems[0] || null;
  const avgPerDay = totalSpent ? totalSpent / rangeDays : 0;

  const summaryPoints = useMemo(
    () => buildSummaryPoints(totalSpent, topCategory, avgPerDay, expenseRows.length, t),
    [totalSpent, topCategory, avgPerDay, expenseRows.length, t]
  );

  const reportContext = useMemo(() => {
    if (!totalSpent) return "";
    const topList = summaryItems
      .slice(0, 4)
      .map((item) => `${item.name}: ${formatCurrency(item.total, "RM")} (${item.percent.toFixed(0)}%)`)
      .join("; ");
    return `Period: ${rangeLabel}. Total: ${formatCurrency(totalSpent, "RM")}. Top categories: ${topList}.`; 
  }, [summaryItems, totalSpent, rangeLabel]);

  useEffect(() => {
    if (!totalSpent) {
      setSummaryAdvice(t?.pages?.reportNoData || "No expenses found for this period.");
      return;
    }
    if (!personaPrompt) {
      setSummaryAdvice(t?.pages?.reportNeedPersona || "Set a personality to get AI advice.");
      return;
    }

    setIsSummaryLoading(true);
    fetchPersonaMessage(
      {
        persona: personaPrompt,
        intent: "report_summary",
        report: reportContext,
      },
      language
    )
      .then((text) => {
        setSummaryAdvice(text || "");
      })
      .catch(() => {
        setSummaryAdvice(t?.pages?.reportSummaryFallback || "Review your top categories and plan next month wisely.");
      })
      .finally(() => {
        setIsSummaryLoading(false);
      });
  }, [personaPrompt, reportContext, language, totalSpent, t]);

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (!questionInput.trim()) return;
    if (!personaPrompt) return;

    setIsQuestionLoading(true);
    try {
      const text = await fetchPersonaMessage(
        {
          persona: personaPrompt,
          intent: "financial_q",
          question: `${questionInput.trim()} Context: ${reportContext}`.trim(),
        },
        language
      );
      setAnswerText(text || "");
      setQuestionInput("");
    } catch (error) {
      setAnswerText(t?.pages?.reportQuestionFailed || "Failed to answer. Please try again.");
    } finally {
      setIsQuestionLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-5xl space-y-6 pb-24">
        <BackButton fallbackHref="/" />

        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">{t?.pages?.report || "Report"}</h1>
              <p className="mt-1 text-sm text-slate-500">{t?.pages?.reportDesc || ""}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setRange("month")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  range === "month"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                {t?.pages?.month1 || "1 Month"}
              </button>
              <button
                type="button"
                onClick={() => setRange("half")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  range === "half"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                {t?.pages?.month6 || "6 Months"}
              </button>
              <button
                type="button"
                onClick={() => setRange("year")}
                className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                  range === "year"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 text-slate-700"
                }`}
              >
                {t?.pages?.year1 || "1 Year"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t?.pages?.reportSummaryTitle || "Spending Summary"}</h2>
            {isLoading ? (
              <p className="mt-4 text-sm text-slate-400">{t?.pages?.reportLoading || "Loading report..."}</p>
            ) : summaryItems.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {t?.pages?.reportNoData || "No expenses found for this period."}
              </p>
            ) : (
              <div className="mt-5 flex flex-col gap-6">
                <div className="flex flex-col items-center gap-4 sm:flex-row">
                  <svg viewBox="0 0 220 220" className="h-56 w-56">
                    {pieSegments.map((segment) => (
                      <path key={segment.id} d={segment.path} fill={segment.displayColor} />
                    ))}
                    <circle cx="110" cy="110" r="54" fill="white" />
                    <text x="110" y="110" textAnchor="middle" dominantBaseline="middle" className="fill-slate-800 text-sm">
                      {formatCurrency(totalSpent, "RM")}
                    </text>
                  </svg>
                  <div className="flex-1 space-y-2">
                    {summaryItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm text-slate-600">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="rounded-full px-2.5 py-[3px] text-[10px] font-semibold text-white shadow-sm"
                            style={{ backgroundColor: item.displayColor }}
                          >
                            {item.name}
                          </button>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="w-[56px] text-center text-slate-500 tabular-nums">{item.percent.toFixed(0)}%</span>
                          <span className="font-semibold text-slate-800 tabular-nums">
                            {formatCurrency(item.total, "RM")}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700">
                  {summaryPoints.map((point) => (
                    <div key={point} className="flex items-start gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-400" />
                      <span>{point}</span>
                    </div>
                  ))}
                  <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    {isSummaryLoading
                      ? t?.pages?.reportAiLoading || "Generating advice..."
                      : summaryAdvice}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">{t?.pages?.reportDetailsTitle || "Category Breakdown"}</h2>
            {isLoading ? (
              <p className="mt-4 text-sm text-slate-400">{t?.pages?.reportLoading || "Loading report..."}</p>
            ) : summaryItems.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                {t?.pages?.reportNoData || "No expenses found for this period."}
              </p>
            ) : (
              <div className="mt-4 space-y-4">
                {summaryItems.map((category) => (
                  <div
                    key={category.id}
                    className="rounded-2xl border-4 border-slate-200 p-4"
                    style={{
                      borderColor: category.displayColor,
                      backgroundColor: applyColorAlpha(category.displayColor, 0.08),
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 shrink-0 rounded-[4px] ring-1 ring-slate-200" style={{ backgroundColor: category.displayColor }} />
                        <span className="text-sm font-semibold text-slate-900">{category.name}</span>
                      </div>
                      <div className="text-sm font-semibold text-slate-700">
                        {formatCurrency(category.total, "RM")} ({category.percent.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {category.items.map((item) => (
                        <div key={item.id} className="flex items-center justify-between text-xs text-slate-600">
                          <div>
                            <p className="font-semibold text-slate-700">{item.title}</p>
                            <p className="text-[11px] text-slate-400">
                              {new Date(item.transactionDate).toLocaleDateString()}
                            </p>
                          </div>
                          <span className="font-semibold text-slate-800">
                            {formatCurrency(item.amount, "RM")}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {answerText ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-700 shadow-sm">
            <p className="font-semibold text-slate-900">{t?.pages?.reportAiAnswer || "AI Answer"}</p>
            <p className="mt-2">{answerText}</p>
          </section>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
      </div>

      <form
        onSubmit={handleQuestionSubmit}
        className="fixed bottom-0 left-0 right-0 border-t-2 border-slate-300 bg-white/90 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <input
            type="text"
            value={questionInput}
            onChange={(event) => setQuestionInput(event.target.value)}
            placeholder={
              t?.pages?.reportAskPlaceholder || "Ask the AI about your spending..."
            }
            className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none"
            disabled={isQuestionLoading}
          />
          <button
            type="submit"
            disabled={isQuestionLoading || !questionInput.trim() || !personaPrompt}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t?.pages?.reportAskButton || "Ask"}
          </button>
        </div>
      </form>
    </main>
  );
}











































