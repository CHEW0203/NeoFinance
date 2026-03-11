"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_COOKIE_NAME,
  SUPPORTED_LANGUAGES,
} from "@/lib/i18n/config";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";

function readCookieLanguage() {
  if (typeof document === "undefined") {
    return DEFAULT_LANGUAGE;
  }
  const key = `${LANGUAGE_COOKIE_NAME}=`;
  const found = document.cookie.split("; ").find((entry) => entry.startsWith(key));
  if (!found) return DEFAULT_LANGUAGE;
  return normalizeLanguage(found.slice(key.length));
}

export function useLanguage() {
  const router = useRouter();
  const [language, setLanguageState] = useState(readCookieLanguage);
  const t = useMemo(() => getDictionary(language), [language]);

  function setLanguage(nextLanguage) {
    const normalized = normalizeLanguage(nextLanguage);
    if (!SUPPORTED_LANGUAGES.includes(normalized)) {
      return;
    }
    const maxAge = 60 * 60 * 24 * 365;
    document.cookie = `${LANGUAGE_COOKIE_NAME}=${normalized}; path=/; max-age=${maxAge}; SameSite=Lax`;
    setLanguageState(normalized);
    router.refresh();
  }

  return {
    language,
    setLanguage,
    t,
  };
}


