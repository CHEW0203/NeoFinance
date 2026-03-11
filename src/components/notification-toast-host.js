"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";

const STORAGE_KEY = "ft_notifications";
const TOAST_DURATION = 15000;

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function readNotifications() {
  if (typeof window === "undefined") return [];
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return safeParse(stored, []);
}

function playBeep() {
  if (typeof window === "undefined") return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.04;

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + 0.15);
    oscillator.onended = () => {
      context.close();
    };
  } catch (error) {
    // Ignore autoplay or unsupported errors.
  }
}

export function NotificationToastHost() {
  const router = useRouter();
  const { t } = useLanguage();
  const [queue, setQueue] = useState([]);
  const [active, setActive] = useState(null);
  const lastCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const initial = readNotifications();
    lastCountRef.current = initial.length;

    const checkForNew = () => {
      const list = readNotifications();
      if (list.length < lastCountRef.current) {
        lastCountRef.current = list.length;
        return;
      }
      if (list.length === lastCountRef.current) return;

      const incoming = list.slice(lastCountRef.current).filter((item) => !item?.isRead);
      lastCountRef.current = list.length;
      if (incoming.length > 0) {
        setQueue((prev) => [...prev, ...incoming]);
      }
    };

    const interval = setInterval(checkForNew, 1000);
    const handleStorage = (event) => {
      if (event.key === STORAGE_KEY) {
        checkForNew();
      }
    };

    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (active || queue.length === 0) return;
    setActive(queue[0]);
    setQueue((prev) => prev.slice(1));
  }, [active, queue]);

  useEffect(() => {
    if (!active) return;
    playBeep();
    const timer = setTimeout(() => {
      setActive(null);
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return null;

  const title = active.title || t?.pages?.newNotification || "New notification";
  const message = active.message || "";

  function handleCancel() {
    setActive(null);
  }

  function handleDetails() {
    setActive(null);
    router.push("/notifications");
  }

  return (
    <div className="fixed left-1/2 top-4 z-50 w-[min(92vw,560px)] -translate-x-1/2">
      <div
        role="status"
        aria-live="polite"
        className="toast-bar flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50/95 px-4 py-3 text-slate-900 shadow-lg backdrop-blur"
      >
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          {message ? <p className="mt-1 text-xs text-slate-600">{message}</p> : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-400"
          >
            {t?.common?.cancel || "Cancel"}
          </button>
          <button
            type="button"
            onClick={handleDetails}
            className="rounded-full border border-sky-200 bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700 transition hover:border-sky-400"
          >
            {t?.common?.details || "Details"}
          </button>
        </div>
      </div>
    </div>
  );
}
