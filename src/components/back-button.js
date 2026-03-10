"use client";

import { useRouter } from "next/navigation";

export function BackButton({ fallbackHref = "/", preferFallback = false }) {
  const router = useRouter();

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
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950"
    >
      <span aria-hidden="true">←</span>
      Back
    </button>
  );
}
