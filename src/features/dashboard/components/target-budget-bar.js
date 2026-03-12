"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/hooks/use-language";
import { formatCurrency } from "@/utils/format";

const TARGET_KEY = "ft_daily_target";
const TARGET_DATE_KEY = "ft_daily_target_date";

function todayKey(date = new Date()) {
  return date.toLocaleDateString("en-CA");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function mixColor(from, to, ratio) {
  const t = clamp(ratio, 0, 1);
  const r = Math.round(from.r + (to.r - from.r) * t);
  const g = Math.round(from.g + (to.g - from.g) * t);
  const b = Math.round(from.b + (to.b - from.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function TargetBudgetBar({ isAuthenticated = false }) {
  const { t } = useLanguage();
  const [targetAmount, setTargetAmount] = useState(null);
  const [spentToday, setSpentToday] = useState(0);
  const [isLoading, setIsLoading] = useState(isAuthenticated);
  const rolloverInFlightRef = useRef(false);

  function clearStoredTarget() {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(TARGET_KEY);
    window.localStorage.removeItem(TARGET_DATE_KEY);
  }

  function readStoredTarget() {
    if (typeof window === "undefined") return null;
    const amount = Number(window.localStorage.getItem(TARGET_KEY));
    const date = window.localStorage.getItem(TARGET_DATE_KEY) || "";
    if (!Number.isFinite(amount) || amount <= 0 || !date) return null;
    return { amount, date };
  }

  async function processRolloverIfNeeded(storedTarget, rows) {
    if (!storedTarget) return null;
    const today = todayKey();
    if (storedTarget.date === today) {
      return storedTarget;
    }

    if (rolloverInFlightRef.current) {
      return null;
    }

    rolloverInFlightRef.current = true;
    try {
      const spentForStoredDate = rows.reduce((sum, item) => {
        if (item.type !== "expense") return sum;
        const key = todayKey(new Date(item.transactionDate));
        if (key !== storedTarget.date) return sum;
        return sum + Number(item.amount || 0);
      }, 0);

      const remaining = storedTarget.amount - spentForStoredDate;
      if (remaining > 0) {
        await fetch("/api/savings/rollover", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            sourceDate: storedTarget.date,
            targetAmount: storedTarget.amount,
            spentAmount: spentForStoredDate,
            remainingAmount: remaining,
          }),
        });
      }

      clearStoredTarget();
      window.dispatchEvent(new Event("neo:target-updated"));
      window.dispatchEvent(new Event("neo:transactions-updated"));
      return null;
    } catch {
      return storedTarget;
    } finally {
      rolloverInFlightRef.current = false;
    }
  }

  async function syncTargetAndSpent() {
    const storedTarget = readStoredTarget();

    try {
      const response = await fetch("/api/transactions?limit=500", {
        cache: "no-store",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to load transactions");
      const payload = await response.json();
      const rows = payload?.data || [];

      const today = todayKey();
      const spent = rows.reduce((sum, item) => {
        if (item.type !== "expense") return sum;
        const key = todayKey(new Date(item.transactionDate));
        if (key !== today) return sum;
        return sum + Number(item.amount || 0);
      }, 0);
      setSpentToday(spent);

      const activeTarget = await processRolloverIfNeeded(storedTarget, rows);
      setTargetAmount(activeTarget?.amount || null);
    } catch {
      setSpentToday(0);
      setTargetAmount(storedTarget?.date === todayKey() ? storedTarget.amount : null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    const syncAll = () => {
      syncTargetAndSpent();
    };

    syncAll();

    const interval = window.setInterval(syncAll, 2000);
    const onFocus = syncAll;
    const onVisibility = () => {
      if (document.visibilityState === "visible") syncAll();
    };
    const onStorage = syncAll;
    const onTargetUpdated = syncAll;
    const onTxnUpdated = syncAll;

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("storage", onStorage);
    window.addEventListener("neo:target-updated", onTargetUpdated);
    window.addEventListener("neo:transactions-updated", onTxnUpdated);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("neo:target-updated", onTargetUpdated);
      window.removeEventListener("neo:transactions-updated", onTxnUpdated);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const usageRatio = useMemo(() => {
    if (!targetAmount || targetAmount <= 0) return 0;
    return clamp(spentToday / targetAmount, 0, 1);
  }, [spentToday, targetAmount]);

  if (!isAuthenticated) {
    return (
      <Link
        href="/login?next=/target"
        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-semibold text-slate-700 shadow-sm"
      >
        {t.target.setTarget}
      </Link>
    );
  }

  if (targetAmount === null) {
    return (
      <Link
        href="/target"
        className="w-full rounded-2xl border border-cyan-200 bg-cyan-50 px-4 py-3 text-center text-sm font-semibold text-cyan-900 shadow-sm transition hover:bg-cyan-100"
      >
        {t.target.setTargetPlaceholder}
      </Link>
    );
  }

  const remaining = targetAmount - spentToday;
  const remainingColor = remaining < 0 ? "text-rose-600" : "text-slate-900";
  const remainingRatio = clamp(1 - usageRatio, 0, 1);
  const remainingPercent = `${remainingRatio * 100}%`;
  const remainingBarColor = mixColor(
    { r: 34, g: 197, b: 94 },
    { r: 239, g: 68, b: 68 },
    usageRatio
  );

  return (
    <Link
      href="/target"
      className="block w-full rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-slate-300"
    >
      <div className="mb-2 flex items-center justify-between text-sm font-semibold">
        <span className="text-slate-600">
          {t.target.setTarget}: {formatCurrency(targetAmount, "RM")}
        </span>
        <span className={remainingColor}>
          {t.target.remainingToday}: {isLoading ? "..." : `${remaining < 0 ? "-" : ""}${formatCurrency(Math.abs(remaining), "RM")}`}
        </span>
      </div>

      <div
        className="h-3 w-full overflow-hidden rounded-full"
        style={{
          backgroundColor: "#ffffff",
          border: "1px solid #e2e8f0",
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: remainingPercent,
            backgroundColor: remainingBarColor,
          }}
        />
      </div>
    </Link>
  );
}
