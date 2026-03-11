"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";

const PERSONA_KEY = "ft_persona_prompt";
const PERSONA_REPLY_KEY = "ft_persona_reply";

function getFriendlyErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("high demand") || message.includes("quota") || message.includes("rate")) {
    return "(._.) Please wait a moment and try again.";
  }
  return null;
}

async function fetchPersonaMessage(payload) {
  const response = await fetch("/api/personality", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || "Failed to generate response.");
  }

  return data?.text || "";
}

export default function ChangePersonalityPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!input.trim()) return;
    setError("");
    setIsLoading(true);

    try {
      const text = await fetchPersonaMessage({
        persona: input.trim(),
        intent: "ask_target",
      });
      window.localStorage.setItem(PERSONA_KEY, input.trim());
      window.localStorage.setItem(PERSONA_REPLY_KEY, text);
      router.push("/target");
    } catch (err) {
      const friendly = getFriendlyErrorMessage(err);
      setError(err.message || "Failed to update personality.");
      if (friendly) {
        window.localStorage.setItem(PERSONA_REPLY_KEY, friendly);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-3xl flex-col">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/target" />
          <div />
        </div>

        <div className="mt-10 flex flex-1 flex-col items-center justify-center gap-6">
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900">Change Personality</p>
            <p className="mt-2 text-sm text-slate-400">
              Describe the new personality you want to use.
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm"
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="For example: strict but supportive"
              className="flex-1 bg-transparent text-sm text-slate-700 outline-none"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update
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
          <div className="target-loader" aria-label="Loading">
            <span className="target-dot dot-1" />
            <span className="target-dot dot-2" />
            <span className="target-dot dot-3" />
          </div>
        </div>
      ) : null}
    </main>
  );
}
