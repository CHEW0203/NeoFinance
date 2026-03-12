"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  LANGUAGE_EVENT_NAME,
  LANGUAGE_STORAGE_KEY,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/config";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";

function readStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  try {
    const raw = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return normalizeLanguage(raw || DEFAULT_LANGUAGE);
  } catch {
    return DEFAULT_LANGUAGE;
  }
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

export function useLanguage(initialLanguage) {
  const router = useRouter();
  const [language, setLanguageState] = useState(() =>
    normalizeLanguage(
      initialLanguage || readStoredLanguage() || readCookieLanguage() || DEFAULT_LANGUAGE
    )
  );
  const t = useMemo(() => getDictionary(language), [language]);

  useEffect(() => {
    function handleLanguageChanged(event) {
      const fromEvent = normalizeLanguage(event?.detail?.language || "");
      const next = fromEvent || normalizeLanguage(readStoredLanguage() || readCookieLanguage());
      setLanguageState((prev) => (prev === next ? prev : next));
    }

    function handleStorage(event) {
      if (event.key && event.key !== LANGUAGE_STORAGE_KEY) return;
      const next = normalizeLanguage(readStoredLanguage() || readCookieLanguage());
      setLanguageState((prev) => (prev === next ? prev : next));
    }

    window.addEventListener(LANGUAGE_EVENT_NAME, handleLanguageChanged);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(LANGUAGE_EVENT_NAME, handleLanguageChanged);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function setLanguage(nextLanguage) {
    const normalized = normalizeLanguage(nextLanguage);
    if (!SUPPORTED_LANGUAGES.includes(normalized)) {
      return;
    }
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${normalized}; path=/; max-age=${maxAge}; SameSite=Lax`;
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {}
    setLanguageState(normalized);
    window.dispatchEvent(
      new CustomEvent(LANGUAGE_EVENT_NAME, { detail: { language: normalized } })
    );
    router.refresh();
  }

  return {
    language,
    setLanguage,
    t,
  };
}
