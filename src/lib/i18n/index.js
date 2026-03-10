import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from "@/lib/i18n/config";
import { translations } from "@/lib/i18n/translations";

const LOCALE_MAP = {
  en: "en-US",
  zh: "zh-CN",
  ms: "ms-MY",
};

export function normalizeLanguage(value) {
  const candidate = String(value || "").toLowerCase();
  return SUPPORTED_LANGUAGES.includes(candidate) ? candidate : DEFAULT_LANGUAGE;
}

export function getDictionary(language) {
  const normalized = normalizeLanguage(language);
  return translations[normalized] || translations[DEFAULT_LANGUAGE];
}

export function getLocaleFromLanguage(language) {
  const normalized = normalizeLanguage(language);
  return LOCALE_MAP[normalized] || LOCALE_MAP[DEFAULT_LANGUAGE];
}
