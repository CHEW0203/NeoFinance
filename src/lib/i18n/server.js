import { cookies } from "next/headers";
import { LANGUAGE_COOKIE_NAME, DEFAULT_LANGUAGE } from "@/lib/i18n/config";
import { getDictionary, normalizeLanguage } from "@/lib/i18n";

export async function getServerLanguage() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(LANGUAGE_COOKIE_NAME)?.value;
  return normalizeLanguage(cookieValue || DEFAULT_LANGUAGE);
}

export async function getServerDictionary() {
  const language = await getServerLanguage();
  return {
    language,
    t: getDictionary(language),
  };
}
