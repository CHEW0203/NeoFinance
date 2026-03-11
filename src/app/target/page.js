"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { useTransactions } from "@/hooks/use-transactions";
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

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function isSameDay(first, second) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function appendNotification({ title, message }) {
  const now = new Date();
  const existing = safeParse(window.localStorage.getItem(NOTIFICATIONS_KEY), []);
  const next = [
    ...existing,
    {
      id: `target-${now.getTime()}-${Math.floor(Math.random() * 1000)}`,
      title,
      message,
      time: now.toLocaleString(),
      isRead: false,
    },
  ];
  window.localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(next));
  window.localStorage.setItem(NOTIFICATIONS_VERSION_KEY, NOTIFICATIONS_VERSION);
}

function getFriendlyErrorMessage(error, t) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("high demand") || message.includes("quota") || message.includes("rate")) {
    return t?.target?.fallback?.busy || "(._.) Please wait a moment and try again.";
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

export default function TargetPage() {
  const { language, t } = useLanguage();
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

  const lastInteractionRef = useRef(Date.now());
  const idleTriggeredRef = useRef(false);
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
    targetFallback.askTarget || targetCopy.defaultReply || "(._.) How much do you want to spend today?";
  const idleTipFallback =
    targetFallback.idleTip || "(._.) Tip: keep your spending tied to your priorities.";

  const notificationTitles = {
    targetSet: targetNotifications.targetSet || "Target Set",
    halfwayAlert: targetNotifications.halfwayAlert || "Halfway Alert",
    targetReached: targetNotifications.targetReached || "Target Reached",
    overBudget: targetNotifications.overBudget || "Over Budget",
    daySummary: targetNotifications.daySummary || "Day Summary",
  };

  function updatePersonaReply(text) {
    setPersonaReply(text);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PERSONA_REPLY_KEY, text);
    }
  }

  function resolveTimeoutErrorMessage() {
    return targetErrors.requestTimeout || "Request timed out. Please try again.";
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
  const todayKeyValue = todayKey(today);

  const spentToday = useMemo(() => {
    if (!transactions || transactions.length === 0) return 0;
    return transactions.reduce((sum, item) => {
      if (item.type !== "expense") return sum;
      const txnDate = new Date(item.transactionDate);
      if (!isSameDay(txnDate, today)) return sum;
      return sum + Number(item.amount || 0);
    }, 0);
  }, [transactions, today]);

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
          appendNotification({ title: notificationTitles.targetSet, message: text });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback =
            friendly || targetFallback.encourageStart || "(._.) Keep it steady today and watch your spending.";
          appendNotification({ title: notificationTitles.targetSet, message: fallback });
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
          appendNotification({ title: notificationTitles.halfwayAlert, message: text });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback =
            friendly || targetFallback.cautionHalf || "(._.) You are halfway there. Keep it under control.";
          appendNotification({ title: notificationTitles.halfwayAlert, message: fallback });
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
          appendNotification({ title: notificationTitles.targetReached, message: text });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback =
            friendly || targetFallback.targetReached || "(._.) You have reached your target for today.";
          appendNotification({ title: notificationTitles.targetReached, message: fallback });
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
          appendNotification({ title: notificationTitles.overBudget, message: text });
          if (text) updatePersonaReply(text);
        } catch (err) {
          const friendly = getFriendlyErrorMessage(err, t);
          const fallback =
            friendly || targetFallback.overBudget || "(>_<) You are over budget. Pause spending for now.";
          appendNotification({ title: notificationTitles.overBudget, message: fallback });
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
  ]);

  function handleTargetSubmit(event) {
    event.preventDefault();
    if (!targetInput.trim()) return;
    const numeric = Number(targetInput);
    if (Number.isNaN(numeric) || numeric <= 0) {
      setError(targetErrors.invalidTarget || "Please enter a valid target amount.");
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
        appendNotification({ title: notificationTitles.targetSet, message: text });
        if (text) updatePersonaReply(text);
      } catch (err) {
        const friendly = getFriendlyErrorMessage(err, t);
        const fallback =
          friendly || targetFallback.encourageStart || "(._.) Keep it steady today and watch your spending.";
        appendNotification({ title: notificationTitles.targetSet, message: fallback });
        updatePersonaReply(fallback);
      } finally {
        setIsReplying(false);
      }
    }
  }

  async function handleQuestionSubmit(event) {
    event.preventDefault();
    if (!questionInput.trim() || !personaPrompt) return;
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
        setError(targetErrors.questionFailed || "Failed to answer your question.");
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
      window.localStorage.removeItem(TARGET_KEY);
      window.localStorage.removeItem(TARGET_DATE_KEY);
      window.localStorage.removeItem(NOTIFY_STATE_KEY);
    }
    updatePersonaReply(askTargetFallback);
  }

  const showSetup = !personaPrompt;
  const ringColor = isOverBudget ? "#ef4444" : "#22c55e";
  const ringProgress = isOverBudget ? 1 : progressRemaining;
  const remainingDisplay =
    remaining === null
      ? ""
      : remaining < 0
        ? `-${formatCurrency(Math.abs(remaining), "RM")}`
        : formatCurrency(remaining, "RM");

  const confirmTargetLabel = pendingTarget
    ? (targetCopy.confirmTarget || "Confirm RM {amount} for today?").replace(
        "{amount}",
        Number(pendingTarget).toFixed(2)
      )
    : "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col pb-28">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/" />
          {!showSetup ? (
            <Link
              href="/target/change"
              className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-transparent px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-900 hover:text-slate-950"
            >
              {targetCopy.changePersonality || "Change Personality"}
            </Link>
          ) : (
            <div />
          )}
        </div>

        {showSetup ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="max-w-md text-center text-base text-slate-400">
              {targetCopy.setupPrompt || "What kind of person do you want to supervise you?"}
            </p>
          </div>
        ) : (
          <div className="mt-6 flex flex-1 flex-col gap-6">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
              <p>{personaReply || askTargetFallback}</p>
              {isReplying ? (
                <span className="ai-dots" aria-label="Loading">
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                  <span className="ai-dot" />
                </span>
              ) : null}
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
                        className={`text-3xl font-semibold ${
                          remaining !== null && remaining < 0 ? "text-red-500" : "text-emerald-600"
                        }`}
                      >
                        {remainingDisplay}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {remaining !== null && remaining < 0
                          ? targetCopy.overBudget || "Over budget"
                          : targetCopy.remainingToday || "Remaining today"}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-2xl font-semibold text-slate-400">
                        {targetCopy.setTarget || "Set target"}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {targetCopy.dailyLimit || "Daily limit in RM"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <form onSubmit={handleTargetSubmit} className="flex w-full max-w-sm flex-col gap-3">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
                  <span className="text-sm font-semibold text-slate-500">RM</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={targetInput}
                    onChange={(event) => setTargetInput(event.target.value)}
                    placeholder={targetCopy.setTargetPlaceholder || "Set today's target"}
                    className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
                    disabled={Boolean(targetAmount)}
                  />
                  <button
                    type="submit"
                    disabled={Boolean(targetAmount)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {targetCopy.setButton || "Set"}
                  </button>
                </div>

                {pendingTarget ? (
                  <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs text-slate-600 shadow-sm">
                    <span>{confirmTargetLabel}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmTarget}
                        className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {targetCopy.confirm || "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelTarget}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                      >
                        {t?.common?.cancel || "Cancel"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </form>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                {targetAmount ? (
                  <>
                    <span>{targetCopy.spentToday || "Spent today:"} </span>
                    <span className={isOverBudget ? "text-red-500" : "text-slate-400"}>
                      {formatCurrency(spentToday, "RM")}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetTarget}
                      className="text-xs font-semibold text-slate-500 underline underline-offset-2 transition hover:text-slate-700"
                    >
                      {targetCopy.resetTarget || "Reset target"}
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        )}
      </div>

      {showSetup ? null : (
        <form
          onSubmit={handleQuestionSubmit}
          className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white/90 px-4 py-3 backdrop-blur"
        >
          <div className="mx-auto flex w-full max-w-3xl items-center gap-3">
            <input
              type="text"
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              placeholder={
                targetCopy.questionPlaceholder || "If you have any financial questions, ask below."
              }
              className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm outline-none"
              disabled={isQuestionLoading}
            />
            <button
              type="submit"
              disabled={isQuestionLoading || !questionInput.trim()}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              {targetCopy.sendButton || "Send"}
            </button>
          </div>
        </form>
      )}

      {error ? (
        <div className="fixed bottom-20 left-1/2 w-full max-w-md -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isBlocking ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
          <div className="target-loader" aria-label="Loading">
            <span className="target-dot dot-1" />
            <span className="target-dot dot-2" />
            <span className="target-dot dot-3" />
          </div>
        </div>
      ) : null}
    </main>
  );
}


