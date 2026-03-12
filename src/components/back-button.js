"use client";

import { useRouter } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";

export function BackButton({ fallbackHref = "/", preferFallback = false }) {
  const router = useRouter();
  const { t } = useLanguage();

  function handleBack() {
    if (preferFallback) {
      router.push(fallbackHref);
      return;
    }
    if (window.history.length > 1) {
      router.back();
      return;
    }
    router.push(fallbackHref);
  }

  return (
    <button
      type="button"
      onClick={handleBack}
      className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950"
      aria-label={t.common.back}
    >
      <span aria-hidden="true">{"\u2190"}</span>
    </button>
  );
}
