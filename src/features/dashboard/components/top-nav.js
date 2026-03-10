"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/services/auth-api";
import { TransactionList } from "@/features/transactions/components";

export function TopNav({ monthLabel, currentUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef(null);

  async function handleLogout() {
    await logoutUser();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  useEffect(() => {
    // perform live search synchronously while typing
    if (!searchOpen) return;

    async function runSearch(q) {
      if (searchAbortRef.current) {
        try { searchAbortRef.current.abort(); } catch (e) {}
      }
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);
      try {
        const url = q ? `/api/transactions?q=${encodeURIComponent(q)}&limit=200` : "/api/transactions?limit=200";
        const res = await fetch(url, { 
          signal: controller.signal, 
          cache: "no-store",
          credentials: "include"
        });
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        setSearchResults(data.data || []);
      } catch (err) {
        if (err.name === 'AbortError') return;
        console.error("Search error:", err);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }

    runSearch(searchQuery);
    
    return () => {
      if (searchAbortRef.current) {
        try { searchAbortRef.current.abort(); } catch (e) {}
        searchAbortRef.current = null;
      }
    };
  }, [searchQuery, searchOpen]);

  return (
    <>
      <nav className="grid grid-cols-[44px_1fr_64px] items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-2xl leading-none text-slate-800"
          aria-label="Open menu"
        >
          ≡
        </button>
        <p className="pl-3 text-center text-lg font-semibold tracking-tight text-slate-900">
          {monthLabel}
        </p>
        <div className="flex items-center justify-end gap-3 text-2xl text-slate-800">
          <Link href="/notifications" aria-label="Notification" title="Notification">
            🔔
          </Link>
          <Link href="/calendar" aria-label="Calendar" title="Calendar">
            📅
          </Link>
        </div>
      </nav>

      {searchOpen ? (
        <div className="fixed inset-0 z-60 flex items-start justify-center pt-24 bg-black/30">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center gap-3">
              <input
                aria-label="Search transactions"
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder="Search by title, category, amount, or date"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => { setSearchOpen(false); setSearchQuery(""); setSearchResults([]); }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm text-slate-500">{isSearching ? "Searching..." : `${searchResults.length} results`}</div>
              <TransactionList transactions={searchResults} isLoading={isSearching} onDelete={() => {}} showDelete={false} />
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <aside className="flex h-full w-72 flex-col justify-between bg-white p-5 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-lg font-semibold text-slate-900">Menu</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-slate-700"
              >
                Close
              </button>
            </div>

            <div className="flex flex-col gap-3">
              {currentUser ? (
                <>
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setSearchOpen(true); }}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800 flex items-center gap-2 text-left"
                  >
                    <span className="text-base">🔍</span>
                    Search
                  </button>
                  <Link
                    href="/profile"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Profile
                  </Link>
                  <Link
                    href="/scan"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Scan
                  </Link>
                  <Link
                    href="/gallery"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Gallery
                  </Link>
                  <Link
                    href="/report"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Report
                  </Link>
                  <Link
                    href="/streak"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Streak
                  </Link>
                  <Link
                    href="/transactions"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Transactions
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Register
                  </Link>
                </>
              )}
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-800"
              >
                Logout
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
