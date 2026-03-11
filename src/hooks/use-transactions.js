import { useEffect, useRef, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
} from "@/services/transaction-api";
import { getLocalDateKey } from "@/utils/date-key";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME } from "@/lib/i18n/config";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";

const TARGET_KEY = "ft_daily_target";
const PERSONA_KEY = "ft_persona_prompt";
const PERSONA_REPLY_KEY = "ft_persona_reply";
const NOTIFY_STATE_KEY = "ft_target_notify_state";
const NOTIFICATIONS_KEY = "ft_notifications";
const NOTIFICATIONS_VERSION_KEY = "ft_notifications_version";
const NOTIFICATIONS_VERSION = "v5";
const STREAK_STATE_KEY = "ft_streak_state";
const STREAK_MILESTONES = [50, 100, 150, 200];

const INITIAL_FORM = {
  title: "",
  amount: "",
  type: "expense",
  note: "",
  transactionDate: "",
};

function parseDateKey(key) {
  if (!key) return null;
  const parts = String(key).split("-").map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function addUtcDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
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

function readCookieLanguage() {
  if (typeof document === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const key = `${LANGUAGE_COOKIE_NAME}=`;
  const found = document.cookie.split("; ").find((entry) => entry.startsWith(key));
  if (!found) return DEFAULT_LANGUAGE;
  return normalizeLanguage(found.slice(key.length));
}

async function fetchPersonaMessage(payload, language) {
  const response = await fetch("/api/personality", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, language }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Failed to generate response.");
  }

  return data?.text || "";
}

async function checkTargetNotifications(rows) {
  if (typeof window === "undefined") return;

  const targetValue = Number(window.localStorage.getItem(TARGET_KEY));
  if (!targetValue || Number.isNaN(targetValue)) return;

  const personaPrompt = window.localStorage.getItem(PERSONA_KEY) || "";
  const language = readCookieLanguage();
  const t = getDictionary(language);
  const targetFallback = t?.target?.fallback || {};
  const targetNotifications = t?.target?.notifications || {};
  const notificationTitles = {
    halfwayAlert: targetNotifications.halfwayAlert || "Halfway Alert",
    targetReached: targetNotifications.targetReached || "Target Reached",
    overBudget: targetNotifications.overBudget || "Over Budget",
  };

  const today = new Date();
  const todayKeyValue = getLocalDateKey(today);

  const spentToday = rows.reduce((sum, item) => {
    if (item.type !== "expense") return sum;
    const txnDate = new Date(item.transactionDate);
    if (!isSameDay(txnDate, today)) return sum;
    return sum + Number(item.amount || 0);
  }, 0);

  const remaining = targetValue - spentToday;

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

  if (notifyState.reached === undefined && notifyState.zero) {
    notifyState.reached = true;
  }
  if (notifyState.reached === undefined) notifyState.reached = false;
  if (notifyState.over === undefined) notifyState.over = false;

  const updateNotifyState = (nextState) => {
    window.localStorage.setItem(NOTIFY_STATE_KEY, JSON.stringify(nextState));
  };

  if (!notifyState.half && remaining <= targetValue * 0.5 && remaining > 0) {
    notifyState.half = true;
    updateNotifyState(notifyState);

    try {
      const text = personaPrompt
        ? await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "caution_half",
              target: targetValue,
              remaining,
              spent: spentToday,
            },
            language
          )
        : targetFallback.cautionHalf || "(._.) You are halfway there. Keep it under control.";
      appendNotification({ title: notificationTitles.halfwayAlert, message: text });
      if (text) window.localStorage.setItem(PERSONA_REPLY_KEY, text);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      const fallback = friendly || targetFallback.cautionHalf || "(._.) You are halfway there. Keep it under control.";
      appendNotification({ title: notificationTitles.halfwayAlert, message: fallback });
      window.localStorage.setItem(PERSONA_REPLY_KEY, fallback);
    }
  }

  if (!notifyState.reached && remaining === 0) {
    notifyState.reached = true;
    updateNotifyState(notifyState);

    try {
      const text = personaPrompt
        ? await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "target_reached",
              target: targetValue,
              remaining,
              spent: spentToday,
            },
            language
          )
        : targetFallback.targetReached || "(._.) You have reached your target for today.";
      appendNotification({ title: notificationTitles.targetReached, message: text });
      if (text) window.localStorage.setItem(PERSONA_REPLY_KEY, text);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      const fallback = friendly || targetFallback.targetReached || "(._.) You have reached your target for today.";
      appendNotification({ title: notificationTitles.targetReached, message: fallback });
      window.localStorage.setItem(PERSONA_REPLY_KEY, fallback);
    }
  }

  if (!notifyState.over && remaining < 0) {
    notifyState.over = true;
    updateNotifyState(notifyState);

    try {
      const text = personaPrompt
        ? await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent: "over_budget",
              target: targetValue,
              remaining,
              spent: spentToday,
            },
            language
          )
        : targetFallback.overBudget || "(>_<) You are over budget. Pause spending for now.";
      appendNotification({ title: notificationTitles.overBudget, message: text });
      if (text) window.localStorage.setItem(PERSONA_REPLY_KEY, text);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      const fallback = friendly || targetFallback.overBudget || "(>_<) You are over budget. Pause spending for now.";
      appendNotification({ title: notificationTitles.overBudget, message: fallback });
      window.localStorage.setItem(PERSONA_REPLY_KEY, fallback);
    }
  }
}

async function checkStreakNotifications(rows) {
  if (typeof window === "undefined") return;

  const personaPrompt = window.localStorage.getItem(PERSONA_KEY) || "";
  const language = readCookieLanguage();
  const t = getDictionary(language);
  const streakCopy = t?.streak || {};
  const streakFallback = streakCopy.fallback || {};
  const streakNotifications = streakCopy.notifications || {};
  const notificationTitles = {
    continue: streakNotifications.streakContinue || "Streak Update",
    break: streakNotifications.streakBreak || "Streak Reset",
    milestone: streakNotifications.streakMilestone || "Streak Milestone",
  };

  const today = new Date();
  const todayKeyValue = getLocalDateKey(today);
  const todayDate = parseDateKey(todayKeyValue);
  if (!todayDate) return;
  const yesterdayDate = addUtcDays(todayDate, -1);
  const yesterdayKeyValue = getLocalDateKey(yesterdayDate);

  const recordDays = new Set(rows.map((record) => getLocalDateKey(new Date(record.transactionDate))));

  const storedState = safeParse(window.localStorage.getItem(STREAK_STATE_KEY), {
    lastChecked: "",
    current: 0,
  });

  if (!storedState.lastChecked) {
    const initState = { lastChecked: yesterdayKeyValue, current: 0 };
    window.localStorage.setItem(STREAK_STATE_KEY, JSON.stringify(initState));
    return;
  }

  if (storedState.lastChecked === todayKeyValue) return;

  const lastCheckedDate = parseDateKey(storedState.lastChecked);
  if (!lastCheckedDate) {
    const resetState = { lastChecked: yesterdayKeyValue, current: 0 };
    window.localStorage.setItem(STREAK_STATE_KEY, JSON.stringify(resetState));
    return;
  }

  if (lastCheckedDate.getTime() > todayDate.getTime()) {
    const resetState = { lastChecked: yesterdayKeyValue, current: 0 };
    window.localStorage.setItem(STREAK_STATE_KEY, JSON.stringify(resetState));
    return;
  }

  let cursor = addUtcDays(lastCheckedDate, 1);
  const end = addUtcDays(todayDate, -1);
  if (cursor.getTime() > end.getTime()) {
    return;
  }

  let streak = Number(storedState.current) || 0;
  const results = [];

  while (cursor.getTime() <= end.getTime()) {
    const key = getLocalDateKey(cursor);
    const success = recordDays.has(key);
    if (success) {
      streak += 1;
      const milestone = STREAK_MILESTONES.includes(streak);
      results.push({ key, success: true, milestone, streak });
    } else {
      const previousStreak = streak;
      streak = 0;
      results.push({ key, success: false, previousStreak });
    }
    cursor = addUtcDays(cursor, 1);
  }

  window.localStorage.setItem(
    STREAK_STATE_KEY,
    JSON.stringify({ lastChecked: todayKeyValue, current: streak })
  );

  for (const result of results) {
    const isMilestone = result.success && result.milestone;
    const intent = result.success
      ? isMilestone
        ? "streak_milestone"
        : "streak_continue"
      : "streak_break";
    const title = result.success
      ? isMilestone
        ? notificationTitles.milestone
        : notificationTitles.continue
      : notificationTitles.break;

    let fallback = "";
    if (result.success) {
      if (isMilestone) {
        fallback = (streakFallback.streakMilestone || "(^_^) Amazing! You hit a {count}-day streak!").replace(
          "{count}",
          String(result.streak)
        );
      } else {
        fallback = streakFallback.streakContinue || "(^_^) Nice! You kept your streak going.";
      }
    } else {
      fallback =
        streakFallback.streakBreak || "(._.) It's okay to miss a day. Let's start again tomorrow.";
    }

    try {
      const text = personaPrompt
        ? await fetchPersonaMessage(
            {
              persona: personaPrompt,
              intent,
              streak: result.streak || 0,
              milestone: isMilestone ? result.streak : undefined,
              previousStreak: result.previousStreak || 0,
            },
            language
          )
        : fallback;
      appendNotification({ title, message: text || fallback });
      const reply = text || fallback;
      if (reply) window.localStorage.setItem(PERSONA_REPLY_KEY, reply);
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      const reply = friendly || fallback;
      appendNotification({ title, message: reply });
      window.localStorage.setItem(PERSONA_REPLY_KEY, reply);
    }
  }
}

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const transactionsRef = useRef([]);

  useEffect(() => {
    transactionsRef.current = transactions;
  }, [transactions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer = null;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now);
      nextMidnight.setHours(24, 0, 5, 0);
      const delay = Math.max(1000, nextMidnight.getTime() - now.getTime());
      timer = setTimeout(async () => {
        await checkStreakNotifications(transactionsRef.current);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  async function loadTransactions() {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchTransactions({ limit: 200 });
      setTransactions(rows);
      await checkTargetNotifications(rows);
      await checkStreakNotifications(rows);
    } catch (loadError) {
      setError(loadError.message || "Failed to load transactions.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadTransactions();
  }, []);

  async function submitTransaction(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");
    try {
      await createTransaction({
        title: form.title,
        amount: Number(form.amount),
        type: form.type,
        note: form.note || null,
        transactionDate: form.transactionDate || undefined,
      });
      setForm(INITIAL_FORM);
      await loadTransactions();
    } catch (submitError) {
      setError(submitError.message || "Failed to create transaction.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeTransaction(id) {
    setError("");
    try {
      await deleteTransaction(id);
      await loadTransactions();
    } catch (deleteError) {
      setError(deleteError.message || "Failed to delete transaction.");
    }
  }

  return {
    transactions,
    isLoading,
    isSubmitting,
    error,
    form,
    setForm,
    submitTransaction,
    removeTransaction,
  };
}






