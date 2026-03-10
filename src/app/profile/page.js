"use client";

import { useEffect, useState } from "react";
import { BackButton } from "@/components/back-button";
import { LogoutButton } from "@/components/logout-button";
import { fetchProfile, updateProfile } from "@/services/auth-api";

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  async function loadProfile() {
    setIsLoading(true);
    setError("");
    try {
      const result = await fetchProfile();
      setProfile(result.user);
      setUsername(result.user.username);
    } catch (requestError) {
      setError(requestError.message || "Failed to load profile.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function handleSave(event) {
    event.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);
    try {
      await updateProfile({
        username: username.trim(),
        password: password.trim() || undefined,
      });
      setPassword("");
      setSuccess("Profile updated.");
      await loadProfile();
    } catch (requestError) {
      setError(requestError.message || "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_38%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
        <div className="mx-auto w-full max-w-4xl">
          <BackButton fallbackHref="/" />
          <p className="mt-6 text-sm text-slate-600">Loading profile...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe_0%,#f8fafc_38%,#e2e8f0_100%)] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <BackButton fallbackHref="/" />

        <section className="rounded-[2rem] border border-white/70 bg-white/90 p-8 shadow-[0_24px_70px_-36px_rgba(15,23,42,0.4)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">
            Profile
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950">
            {profile?.username}
          </h1>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Transactions</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {profile?.transactionCount || 0}
            </p>
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSave}>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password (optional, min 8 characters)"
              className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-cyan-600"
            />
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-2xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save profile"}
            </button>
          </form>

          {error ? (
            <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}
          {success ? (
            <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {success}
            </p>
          ) : null}

          <div className="mt-6">
            <LogoutButton />
          </div>
        </section>
      </div>
    </main>
  );
}
