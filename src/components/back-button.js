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
      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950"
    >
      <span aria-hidden="true">{"\u2190"}</span>
      {t.common.back}
    </button>
  );
}
