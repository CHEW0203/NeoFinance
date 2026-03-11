import { useEffect, useState } from "react";
import {
  createTransaction,
  deleteTransaction,
  fetchTransactions,
} from "@/services/transaction-api";
import { DEFAULT_LANGUAGE, LANGUAGE_COOKIE_NAME } from "@/lib/i18n/config";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";

const TARGET_KEY = "ft_daily_target";
const PERSONA_KEY = "ft_persona_prompt";
const PERSONA_REPLY_KEY = "ft_persona_reply";
const NOTIFY_STATE_KEY = "ft_target_notify_state";
const NOTIFICATIONS_KEY = "ft_notifications";
const NOTIFICATIONS_VERSION_KEY = "ft_notifications_version";
const NOTIFICATIONS_VERSION = "v5";

const INITIAL_FORM = {
  title: "",
  amount: "",
  type: "expense",
  note: "",
  transactionDate: "",
};

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
  const todayKeyValue = todayKey(today);

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

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);

  async function loadTransactions() {
    setIsLoading(true);
    setError("");
    try {
      const rows = await fetchTransactions();
      setTransactions(rows);
      await checkTargetNotifications(rows);
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
