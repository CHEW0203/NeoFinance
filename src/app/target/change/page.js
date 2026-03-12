"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";

const PERSONA_KEY = "ft_persona_prompt";
const PERSONA_REPLY_KEY = "ft_persona_reply";

function getFriendlyErrorMessage(error, t) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("high demand") || message.includes("quota") || message.includes("rate")) {
    return t.target.fallback.busy;
  }
  return null;
}

async function fetchPersonaMessage(payload, language) {
  const response = await fetch("/api/personality", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, language }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "");
  }

  return data?.text || "";
}

export default function ChangePersonalityPage() {
  const router = useRouter();
  const { language, t } = useLanguage();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const targetCopy = t?.target || {};
  const targetErrors = targetCopy.errors || {};

  async function handleSubmit(event) {
    event.preventDefault();
    const persona = input.trim();
    if (!persona) return;
    setError("");
    setIsLoading(true);

    // Always persist personality first so user flow is never blocked by AI network/API issues.
    window.localStorage.setItem(PERSONA_KEY, persona);

    try {
      const text = await fetchPersonaMessage(
        {
          persona,
          intent: "ask_target",
        },
        language
      );
      window.localStorage.setItem(
        PERSONA_REPLY_KEY,
        text || targetCopy.defaultReply
      );
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err, t);
      window.localStorage.setItem(
        PERSONA_REPLY_KEY,
        friendly || targetCopy.defaultReply
      );
      // Keep as warning only; personality is already saved.
      setError(targetErrors.updatePersonalityFallback);
    } finally {
      setIsLoading(false);
      router.push("/target");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#fff5d6_0%,#fff9e8_35%,#e8f3ff_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/target" preferFallback />
          <div />
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-6">
          <section className="relative w-full max-w-2xl overflow-hidden rounded-3xl border-2 border-slate-900 bg-gradient-to-br from-amber-200 via-yellow-100 to-sky-100 p-7 text-center shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]">
            <span className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-white/40" />
            <span className="pointer-events-none absolute -left-6 -bottom-8 h-20 w-20 rounded-full bg-cyan-200/40" />
            <p className="relative z-10 text-2xl font-extrabold tracking-tight text-slate-900">
              {targetCopy.changePersonality}
            </p>
            <p className="relative z-10 mt-2 text-sm font-medium text-slate-700">
              {targetCopy.changePersonalityDesc}
            </p>
          </section>

          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-2xl items-center gap-3 rounded-3xl border-2 border-slate-900 bg-white/95 px-4 py-3 shadow-[0_20px_45px_-28px_rgba(15,23,42,0.45)]"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={targetCopy.personaPlaceholder}
              className="flex-1 bg-transparent text-base font-medium text-slate-700 outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full border-2 border-slate-900 bg-cyan-300 px-5 py-2.5 text-base font-bold text-slate-900 shadow-sm transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {targetCopy.updatePersonality}
            </button>
          </form>
        </div>
      </div>

      {error ? (
        <div className="fixed bottom-20 left-1/2 w-full max-w-md -translate-x-1/2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
          <div className="target-loader" aria-label={t.common.loading}>
            <span className="target-dot dot-1" />
            <span className="target-dot dot-2" />
            <span className="target-dot dot-3" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
