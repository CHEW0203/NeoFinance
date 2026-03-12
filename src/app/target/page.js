"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocaleFromLanguage } from "@/lib/i18n";
import { useTransactions } from "@/hooks/use-transactions";
import { getLocalDateKey } from "@/utils/date-key";
import { formatCurrency } from "@/utils/format";

const PERSONA_KEY = "ft_persona_prompt";
const PERSONA_REPLY_KEY = "ft_persona_reply";
const TARGET_KEY = "ft_daily_target";
const TARGET_DATE_KEY = "ft_daily_target_date";
const NOTIFY_STATE_KEY = "ft_target_notify_state";
const NOTIFICATIONS_KEY = "ft_notifications";
const NOTIFICATIONS_VERSION_KEY = "ft_notifications_version";
const NOTIFICATIONS_VERSION = "v5";
const TIMEOUT_ERROR_CODE = "REQUEST_TIMEOUT";

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function formatCompactCurrency(amount, currency = "RM") {
  const value = Number(amount || 0);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  if (abs >= 1_000_000_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000_000_000)}B`;
  }
  if (abs >= 1_000_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000_000)}M`;
  }
  if (abs >= 10_000) {
    return `${currency} ${sign}${Math.round(abs / 1_000)}K`;
  }
  return formatCurrency(value, currency);
}

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function appendNotification({ title, message, locale }) {
  const now = new Date();
  const existing = safeParse(window.localStorage.getItem(NOTIFICATIONS_KEY), []);
  const next = [
    ...existing,
    {
      id: `target-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      time: now.toLocaleString(locale),
      isRead: false,
    },
  ];
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  window.localStorage.setItem(NOTIFICATIONS_VERSION_KEY, NOTIFICATIONS_VERSION);
}

function getFriendlyErrorMessage(error, t) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("high demand") || message.includes("quota") || message.includes("rate")) {
    return t.target.fallback.busy;
  }
  return null;
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
    throw new Error(data?.error || "");
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

export default function TargetPage() {
  const { language, t } = useLanguage();
  const locale = getLocaleFromLanguage(language);
  const { transactions, isLoading } = useTransactions();
  const [personaPrompt, setPersonaPrompt] = useState("");
  const [personaReply, setPersonaReply] = useState("");
  const [isBlocking, setIsBlocking] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [error, setError] = useState("");
  const [targetInput, setTargetInput] = useState("");
  const [targetAmount, setTargetAmount] = useState(null);
  const [targetDate, setTargetDate] = useState("");
  const [pendingTarget, setPendingTarget] = useState(null);
  const [questionInput, setQuestionInput] = useState("");
  const [isQuestionLoading, setIsQuestionLoading] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(true);

  const lastInteractionRef = useRef(Date.now());
  const idleTriggeredRef = useRef(false);
  const rolloverInFlightRef = useRef(false);
  const latestRef = useRef({
    personaPrompt: "",
    targetAmount: null,
    remaining: null,
    spentToday: 0,
  });

  const targetCopy = t?.target || {};
  const targetErrors = targetCopy.errors || {};
  const targetFallback = targetCopy.fallback || {};
  const targetNotifications = targetCopy.notifications || {};

  const askTargetFallback =
    targetFallback.askTarget || targetCopy.defaultReply;
  const idleTipFallback = targetFallback.idleTip;

  const notificationTitles = {
    targetSet: targetNotifications.targetSet,
    halfwayAlert: targetNotifications.halfwayAlert,
    targetReached: targetNotifications.targetReached,
    overBudget: targetNotifications.overBudget,
    daySummary: targetNotifications.daySummary,
  };

  function updatePersonaReply(text) {
    setPersonaReply(text);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERSONA_REPLY_KEY, text);
    }
  }

  function resolveTimeoutErrorMessage() {
    return targetErrors.requestTimeout;
  }

  async function loadCurrentBalance() {
    try {
      const response = await fetch("/api/accounts/summary", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load balance.");
      }
      const payload = await response.json();
      const nextBalance = Number(payload?.data?.totalBalance);
      if (!Number.isFinite(nextBalance)) {
        throw new Error("Invalid balance.");
      }
      setCurrentBalance(nextBalance);
    } catch {
      setCurrentBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedPersona = window.localStorage.getItem(PERSONA_KEY) || "";
    const storedReply = window.localStorage.getItem(PERSONA_REPLY_KEY) || "";
    const storedTarget = window.localStorage.getItem(TARGET_KEY);
    const storedDate = window.localStorage.getItem(TARGET_DATE_KEY) || "";

    if (storedPersona) {
      setPersonaPrompt(storedPersona);
      setPersonaReply(storedReply);
    }

    if (storedTarget) {
      const parsed = Number(storedTarget);
      if (!Number.isNaN(parsed)) {
        setTargetAmount(parsed);
      }
    }

    setTargetDate(storedDate);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const refresh = () => loadCurrentBalance();
    loadCurrentBalance();

    window.addEventListener("focus", refresh);
    window.addEventListener("neo:transactions-updated", refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("neo:transactions-updated", refresh);
    };
  }, []);

  useEffect(() => {
    latestRef.current = {
      personaPrompt,
      targetAmount,
      remaining: null,
      spentToday: 0,
    };
  }, [personaPrompt, targetAmount]);

  useEffect(() => {
    const handleActivity = () => {
      lastInteractionRef.current = Date.now();
      idleTriggeredRef.current = false;
    };

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("touchstart", handleActivity);

    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
    };
  }, []);

  const today = useMemo(() => new Date(), []);
  const todayKeyValue = getLocalDateKey(today);

  function clearStoredTarget() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TARGET_KEY);
    window.localStorage.removeItem(TARGET_DATE_KEY);
  }

  const spentToday = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((sum, item) => {
      if (item.type !== "expense") return sum;
      const txnDate = new Date(item.transactionDate);
      if (!isSameDay(txnDate, today)) return sum;
      return sum + Number(item.amount || 0);
    }, 0);
  }, [transactions, today]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isLoading) return;
    if (!targetAmount || !targetDate) return;
    if (targetDate >= todayKeyValue) return;
    if (rolloverInFlightRef.current) return;

    rolloverInFlightRef.current = true;
    const spentForTargetDate = (transactions || []).reduce((sum, item) => {
      if (item.type !== "expense") return sum;
      const key = getLocalDateKey(new Date(item.transactionDate));
      if (key !== targetDate) return sum;
      return sum + Number(item.amount || 0);
    }, 0);
    const remainingForTargetDate = Number(targetAmount) - spentForTargetDate;

    (async () => {
      try {
        if (remainingForTargetDate > 0) {
          await fetch("/api/savings/rollover", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              sourceDate: targetDate,
              targetAmount: Number(targetAmount),
              spentAmount: spentForTargetDate,
              remainingAmount: remainingForTargetDate,
            }),
          });
        }
      } catch {
        // best effort: if this fails, it can retry when dashboard/target reloads
      } finally {
        clearStoredTarget();
        setTargetAmount(null);
        setTargetDate("");
        setPendingTarget(null);
        window.dispatchEvent(new Event("neo:target-updated"));
        window.dispatchEvent(new Event("neo:transactions-updated"));
        rolloverInFlightRef.current = false;
      }
    })();
  }, [isLoading, targetAmount, targetDate, todayKeyValue, transactions]);

  const remaining = useMemo(() => {
    if (!targetAmount) return null;
    return Number(targetAmount) - spentToday;
  }, [targetAmount, spentToday]);

  const progressRemaining = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return 0;
    if (remaining === null) return 0;
    const ratio = remaining / targetAmount;
    return Math.min(Math.max(ratio, 0), 1);
  }, [remaining, targetAmount]);

  const isOverBudget = remaining !== null && remaining < 0;

  useEffect(() => {
    latestRef.current = {
      personaPrompt,
      targetAmount,
      remaining,
      spentToday,
    };
  }, [personaPrompt, targetAmount, remaining, spentToday]);

  useEffect(() => {
    if (!personaPrompt) return;
    const interval = setInterval(() => {
      if (!latestRef.current.personaPrompt) return;
      if (isBlocking || isReplying || isQuestionLoading) return;
      if (Date.now() - lastInteractionRef.current < 30000) return;
      if (idleTriggeredRef.current) return;

      idleTriggeredRef.current = true;
      const needsTarget = !latestRef.current.targetAmount;
      const idleIntent = needsTarget ? "ask_target" : "idle_tip";
      setIsReplying(true);
      fetchPersonaMessage(
        {
          persona: latestRef.current.personaPrompt,
          intent: idleIntent,
          target: latestRef.current.targetAmount,
          remaining: latestRef.current.remaining,
          spent: latestRef.current.spentToday,
        },
        language
      )
        .then((text) => {
          if (text) {
            updatePersonaReply(text);
          }
        })
        .catch((err) => {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback = needsTarget ? askTargetFallback : idleTipFallback;
          updatePersonaReply(friendly || fallback);
        })
        .finally(() => {
          setIsReplying(false);
        });
    }, 1000);

    return () => clearInterval(interval);
  }, [personaPrompt, isBlocking, isReplying, isQuestionLoading, language, t, askTargetFallback, idleTipFallback]);

  useEffect(() => {
    if (!targetAmount || !personaPrompt || isLoading) return;
    if (typeof window === "undefined") return;

    const notifyState = safeParse(window.localStorage.getItem(NOTIFY_STATE_KEY), {
      date: todayKeyValue,
      initial: false,
      half: false,
      reached: false,
      over: false,
      end: false,
    });

    if (notifyState.date !== todayKeyValue) {
      notifyState.date = todayKeyValue;
      notifyState.initial = false;
      notifyState.half = false;
      notifyState.reached = false;
      notifyState.over = false;
      notifyState.end = false;
    }

    const updateNotifyState = (nextState) => {
      window.localStorage.setItem(NOTIFY_STATE_KEY, JSON.stringify(nextState));
    };

    const runNotifications = async () => {
      if (!notifyState.initial) {
        notifyState.initial = true;
        updateNotifyState(notifyState);
        try {
          setIsReplying(true);
          const text = await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "encourage_start",
              target: targetAmount,
              remaining,
              spent: spentToday,
            },
            language
          );
          appendNotification({ title: notificationTitles.targetSet, message: text, locale });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback = friendly || targetFallback.encourageStart;
          appendNotification({ title: notificationTitles.targetSet, message: fallback, locale });
          updatePersonaReply(fallback);
        } finally {
          setIsReplying(false);
        }
      }

      if (!notifyState.half && remaining !== null && remaining <= targetAmount * 0.5 && remaining > 0) {
        notifyState.half = true;
        updateNotifyState(notifyState);
        try {
          setIsReplying(true);
          const text = await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "caution_half",
              target: targetAmount,
              remaining,
              spent: spentToday,
            },
            language
          );
          appendNotification({ title: notificationTitles.halfwayAlert, message: text, locale });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback = friendly || targetFallback.cautionHalf;
          appendNotification({ title: notificationTitles.halfwayAlert, message: fallback, locale });
          updatePersonaReply(fallback);
        } finally {
          setIsReplying(false);
        }
      }

      if (!notifyState.reached && remaining !== null && remaining === 0) {
        notifyState.reached = true;
        updateNotifyState(notifyState);
        try {
          setIsReplying(true);
          const text = await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "target_reached",
              target: targetAmount,
              remaining,
              spent: spentToday,
            },
            language
          );
          appendNotification({ title: notificationTitles.targetReached, message: text, locale });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback = friendly || targetFallback.targetReached;
          appendNotification({ title: notificationTitles.targetReached, message: fallback, locale });
          updatePersonaReply(fallback);
        } finally {
          setIsReplying(false);
        }
      }

      if (!notifyState.over && remaining !== null && remaining < 0) {
        notifyState.over = true;
        updateNotifyState(notifyState);
        try {
          setIsReplying(true);
          const text = await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "over_budget",
              target: targetAmount,
              remaining,
              spent: spentToday,
            },
            language
          );
          appendNotification({ title: notificationTitles.overBudget, message: text, locale });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback = friendly || targetFallback.overBudget;
          appendNotification({ title: notificationTitles.overBudget, message: fallback, locale });
          updatePersonaReply(fallback);
        } finally {
          setIsReplying(false);
        }
      }
    };

    runNotifications();
  }, [
    personaPrompt,
    targetAmount,
    remaining,
    spentToday,
    todayKeyValue,
    isLoading,
    language,
    t,
    targetFallback.encourageStart,
    targetFallback.cautionHalf,
    targetFallback.targetReached,
    targetFallback.overBudget,
    notificationTitles.targetSet,
    notificationTitles.halfwayAlert,
    notificationTitles.targetReached,
    notificationTitles.overBudget,
    locale,
  ]);

  function handleTargetSubmit(event) {
    event.preventDefault();
    if (!targetInput.trim()) return;
    const numeric = Number(targetInput);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError(targetErrors.invalidTarget);
      return;
    }

    setError("");
    setPendingTarget(numeric);
  }

  async function handleConfirmTarget() {
    if (!pendingTarget) return;
    const numeric = Number(pendingTarget);

    window.localStorage.setItem(
      NOTIFY_STATE_KEY,
      JSON.stringify({
        date: todayKeyValue,
        initial: true,
        half: false,
        reached: false,
        over: false,
        end: false,
      })
    );

    setTargetAmount(numeric);
    setTargetDate(todayKeyValue);
    window.localStorage.setItem(TARGET_KEY, String(numeric));
    window.localStorage.setItem(TARGET_DATE_KEY, todayKeyValue);
    window.dispatchEvent(new Event("neo:target-updated"));
    setTargetInput("");
    setPendingTarget(null);

    if (personaPrompt) {
      try {
        setIsReplying(true);
        const text = await fetchPersonaMessage(
          {
            persona: personaPrompt,
            intent: "encourage_start",
            target: numeric,
            remaining: numeric - spentToday,
            spent: spentToday,
          },
          language
        );
        appendNotification({ title: notificationTitles.targetSet, message: text, locale });
        if (text) updatePersonaReply(text);
      } catch (err) {
        const friendly = getFriendlyErrorMessage(err, t);
        const fallback = friendly || targetFallback.encourageStart;
        appendNotification({ title: notificationTitles.targetSet, message: fallback, locale });
        updatePersonaReply(fallback);
      } finally {
        setIsReplying(false);
      }
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (!personaPrompt) {
      setError(targetErrors.personalityRequired);
      return;
    }
    if (!questionInput.trim()) return;
    setError("");
    setIsQuestionLoading(true);
    setIsReplying(true);

    try {
      const text = await fetchPersonaMessage(
        {
          persona: personaPrompt,
          intent: "financial_q",
          question: questionInput.trim(),
          target: targetAmount,
          remaining,
          spent: spentToday,
        },
        language
      );
      if (text) updatePersonaReply(text);
      setQuestionInput("");
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      if (friendly) updatePersonaReply(friendly);
      if (err?.code === TIMEOUT_ERROR_CODE) {
        setError(resolveTimeoutErrorMessage());
      } else {
        setError(targetErrors.questionFailed);
      }
    } finally {
      setIsQuestionLoading(false);
      setIsReplying(false);
    }
  }

  function handleCancelTarget() {
    setPendingTarget(null);
  }

  function handleResetTarget() {
    setTargetAmount(null);
    setTargetDate("");
    setPendingTarget(null);
    setTargetInput("");
    setError("");
    if (typeof window !== "undefined") {
      clearStoredTarget();
      window.localStorage.removeItem(NOTIFY_STATE_KEY);
      window.dispatchEvent(new Event("neo:target-updated"));
    }
    updatePersonaReply(askTargetFallback);
  }

  const ringColor = isOverBudget ? "#ef4444" : "#22c55e";
  const ringProgress = isOverBudget ? 1 : progressRemaining;
  const remainingDisplay = remaining === null ? "" : formatCompactCurrency(remaining, "RM");
  const remainingDisplayFull = remaining === null ? "" : formatCurrency(remaining, "RM");

  const confirmTargetLabel = pendingTarget
    ? targetCopy.confirmTarget.replace(
        "{amount}",
        Number(pendingTarget).toFixed(2)
      )
    : "";

  const hasBalanceInfo = Number.isFinite(currentBalance);
  const inputValueNumber = Number(targetInput);
  const targetInputExceedsBalance =
    hasBalanceInfo &&
    Number.isFinite(inputValueNumber) &&
    inputValueNumber > 0 &&
    inputValueNumber > currentBalance;
  const pendingTargetExceedsBalance =
    hasBalanceInfo && pendingTarget !== null && Number(pendingTarget) > currentBalance;

  const exceedsBalanceLabel = pendingTargetExceedsBalance
    ? targetCopy.targetExceedsBalance
        .replace("{target}", Number(pendingTarget).toFixed(2))
        .replace("{balance}", Number(currentBalance).toFixed(2))
    : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_35%,#e8f3ff_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col pb-28">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/" preferFallback />
          <Link
            href="/target/change"
            className="inline-flex items-center gap-2 rounded-full border-2 border-slate-900 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-amber-100"
          >
            {personaPrompt
              ? targetCopy.changePersonality
              : targetCopy.setPersonality}
          </Link>
        </div>

        <div className="mt-6 flex flex-1 flex-col gap-6">
            {!personaPrompt ? (
              <div className="rounded-2xl border-2 border-slate-900 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-800">
                {targetCopy.setupPrompt}
              </div>
            ) : null}
            <div className="relative overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 px-5 py-4 text-sm text-slate-700 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
              <span className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-white/40" />
              <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/40" />
              <div className="relative z-10 flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">{personaReply || askTargetFallback}</p>
              {isReplying ? (
                <span className="ai-dots" aria-label={t.common.loading}>
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </span>
              ) : null}
              </div>
            </div>

            <div className="flex flex-col items-center gap-4">
              <div className="relative flex h-56 w-56 items-center justify-center">
                <div
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `conic-gradient(${ringColor} ${ringProgress * 360}deg, #e2e8f0 0deg)`,
                  }}
                />
                <div className="absolute inset-3 rounded-full bg-white" />
                <div className="relative z-10 text-center">
                  {targetAmount ? (
                    <>
                      <p
                        className={`text-4xl font-extrabold tracking-tight ${
                          remaining !== null && remaining < 0 ? "text-red-500" : "text-emerald-600"
                        }`}
                        title={remainingDisplayFull}
                      >
                        {remainingDisplay}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-500">
                        {remaining !== null && remaining < 0
                          ? targetCopy.overBudget
                          : targetCopy.remainingToday}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-3xl font-bold text-slate-500">
                        {targetCopy.setTarget}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-400">
                        {targetCopy.dailyLimit}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <form onSubmit={handleTargetSubmit} className="flex w-full max-w-md flex-col gap-3 rounded-3xl border-2 border-slate-900 bg-white/95 p-4 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
                  <span className="text-base font-bold text-slate-600">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetInput}
                    onChange={(event) => setTargetInput(event.target.value)}
                    placeholder={targetCopy.setTargetPlaceholder}
                    className="flex-1 bg-transparent text-base font-semibold text-slate-700 outline-none"
                    disabled={Boolean(targetAmount)}
                  />
                  <button
                    type="submit"
                    disabled={Boolean(targetAmount)}
                    className="rounded-full border-2 border-slate-900 bg-cyan-300 px-4 py-2 text-sm font-bold text-slate-900 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {targetCopy.setButton}
                  </button>
                </div>

                <div className="px-1 text-sm">
                  {isBalanceLoading ? (
                    <p className="text-slate-400">...</p>
                  ) : hasBalanceInfo ? (
                    <p className="text-slate-500">
                      {targetCopy.currentBalance + ": "}
                      <span className="font-semibold text-slate-700">
                        {formatCurrency(currentBalance, "RM")}
                      </span>
                    </p>
                  ) : null}
                  {targetInputExceedsBalance ? (
                    <p className="mt-1 font-semibold text-amber-600">
                      {targetCopy.targetExceedsBalance
                        .replace("{target}", Number(inputValueNumber).toFixed(2))
                        .replace("{balance}", Number(currentBalance).toFixed(2))}
                    </p>
                  ) : null}
                </div>

                {pendingTarget ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-amber-50 px-4 py-3 text-sm text-slate-700 shadow-sm">
                    <div className="space-y-1">
                      <p>{confirmTargetLabel}</p>
                      {pendingTargetExceedsBalance ? (
                        <p className="font-semibold text-amber-600">{exceedsBalanceLabel}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmTarget}
                        className="rounded-full border-2 border-slate-900 bg-emerald-300 px-4 py-2 text-sm font-bold text-slate-900"
                      >
                        {targetCopy.confirm}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelTarget}
                        className="rounded-full border-2 border-slate-400 bg-white px-4 py-2 text-sm font-bold text-slate-700"
                      >
                        {t.common.cancel}
                      </button>
                    </div>
                  </div>
                ) : null}
              </form>

              <div className="flex items-center gap-3 text-sm text-slate-500">
                {targetAmount ? (
                  <>
                    <span>{targetCopy.spentToday} </span>
                    <span className={isOverBudget ? "text-red-500" : "text-slate-400"}>
                      {formatCurrency(spentToday, "RM")}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetTarget}
                      className="rounded-full border-2 border-slate-500 bg-white px-4 py-2 text-base font-bold text-slate-700 transition hover:border-slate-900 hover:text-slate-900"
                    >
                      {targetCopy.resetTarget}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
        </div>
      </div>

      <form
        onSubmit={handleQuestionSubmit}
        className="fixed bottom-0 left-0 right-0 border-t-2 border-slate-900/15 bg-white/92 px-4 py-3 backdrop-blur"
      >
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
          <input
            type="text"
            value={questionInput}
            onChange={(event) => setQuestionInput(event.target.value)}
            placeholder={
              personaPrompt
                ? targetCopy.questionPlaceholder
                : targetCopy.setPersonalityFirst
            }
            className="flex-1 rounded-full border-2 border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none focus:border-cyan-500"
            disabled={isQuestionLoading || !personaPrompt}
          />
          <button
            type="submit"
            disabled={isQuestionLoading || !questionInput.trim() || !personaPrompt}
            className="rounded-full border-2 border-slate-900 bg-amber-300 px-4 py-2 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {targetCopy.sendButton}
          </button>
        </div>
      </form>

      {error ? (
        <div className="fixed bottom-20 left-1/2 w-full max-w-md -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isBlocking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
          <div className="target-loader" aria-label={t.common.loading}>
            <span className="target-dot dot-1" />
            <span className="target-dot dot-2" />
            <span className="target-dot dot-3" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
