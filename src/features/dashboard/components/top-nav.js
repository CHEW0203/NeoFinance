"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TransactionList } from "@/features/transactions/components";
import { useLanguage } from "@/hooks/use-language";
import { useNotifications } from "@/lib/use-notifications";
import { logoutUser } from "@/services/auth-api";

export function TopNav({ monthLabel, currentUser, initialLanguage = "en" }) {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage(initialLanguage);
  const { unreadCount, ready: notificationsReady } = useNotifications();
  const badgeLabel = unreadCount >= 9 ? "9+" : `${unreadCount}+`;
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
    if (!searchOpen || !currentUser) return undefined;

    const timer = setTimeout(async () => {
      if (searchAbortRef.current) {
        try {
          searchAbortRef.current.abort();
        } catch {}
      }

      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);

      try {
        const url = searchQuery
          ? `/api/transactions?q=${encodeURIComponent(searchQuery)}&limit=50`
          : "/api/transactions?limit=50";
        const response = await fetch(url, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        const payload = await response.json();
        setSearchResults(payload.data || []);
      } catch (error) {
        if (error?.name === "AbortError") return;
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      if (searchAbortRef.current) {
        try {
          searchAbortRef.current.abort();
        } catch {}
        searchAbortRef.current = null;
      }
    };
  }, [searchQuery, searchOpen, currentUser]);

    useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (searchOpen) {
      document.body.setAttribute("data-search-open", "true");
    } else {
      document.body.removeAttribute("data-search-open");
    }
    return () => {
      document.body.removeAttribute("data-search-open");
    };
  }, [searchOpen]);
  function closeSearch() {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  }

  return (
    <>
      <nav className="relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-2xl leading-none text-slate-800"
          aria-label={t.menu.menu}
        >
          {"\u2261"}
        </button>
        {!searchOpen ? (
        <p className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold tracking-tight text-slate-900">
          {monthLabel}
        </p>
      ) : null}
        <div className="flex items-center gap-3 whitespace-nowrap text-2xl text-slate-800">
          <Link
            href="/notifications"
            aria-label={t.menu.notification}
            title={t.menu.notification}
            className="relative inline-flex h-10 w-10 items-center justify-center"
          >
            <span aria-hidden="true">{"\u{1F514}"}</span>
            {notificationsReady && unreadCount > 0 ? (
              <span
                className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white"
                aria-label={`${badgeLabel} unread notifications`}
              >
                {badgeLabel}
              </span>
            ) : null}
          </Link>
          <Link href="/target" aria-label={t.menu.target || "Target"} title={t.menu.target || "Target"}>
            {"\u{1F3AF}"}
          </Link>
          <Link href="/calendar" aria-label={t.menu.calendar} title={t.menu.calendar}>
            {"\u{1F4C5}"}
          </Link>
        </div>
      </nav>

      {searchOpen ? (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-white pt-20 sm:pt-24">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-4 shadow-xl sm:p-6">
            <div className="flex items-center gap-2 sm:gap-3">
              <input
                aria-label={t.menu.search}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-500"
                placeholder={t.menu.searchPlaceholder}
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={closeSearch}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
              >
                {t.menu.close}
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              <div className="mb-2 text-sm text-slate-500">
                {isSearching ? t.menu.searching : `${searchResults.length} ${t.menu.results}`}
              </div>
              <TransactionList
                transactions={searchResults}
                isLoading={isSearching}
                onDelete={() => {}}
              />
            </div>
          </div>
        </div>
      ) : null}

      {open ? (
        <div className="fixed inset-0 z-50 bg-black/40">
          <aside className="flex h-full w-72 flex-col bg-white p-4 shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">{t.menu.menu}</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-700"
              >
                {t.menu.close}
              </button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              <div className="flex flex-col gap-2">
                {currentUser ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        setSearchOpen(true);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-800"
                    >
                      <span className="text-sm">{"\u{1F50D}"}</span>
                      {t.menu.search}
                    </button>
                    <Link
                      href="/profile"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.common.profile}
                    </Link>
                    <Link
                      href="/scan"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.scan}
                    </Link>
                    <Link
                      href="/gallery"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.gallery}
                    </Link>
                    <Link
                      href="/report"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.report}
                    </Link>
                    <Link
                      href="/recurring"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.recurring || "Recurring"}
                    </Link>
                    <Link
                      href="/streak"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.streak}
                    </Link>
                    <Link
                      href="/notifications"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.menu.notification}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.common.login}
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setOpen(false)}
                      className="rounded-lg border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800"
                    >
                      {t.common.register}
                    </Link>
                  </>
                )}
              </div>

              <section className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  {t.menu.language}
                </p>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`rounded-lg border px-2 py-2 ${
                      language === "en"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("zh")}
                    className={`rounded-lg border px-2 py-2 ${
                      language === "zh"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    {"\u4e2d\u6587"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("ms")}
                    className={`rounded-lg border px-2 py-2 ${
                      language === "ms"
                        ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                        : "border-slate-300 text-slate-700"
                    }`}
                  >
                    BM
                  </button>
                </div>
              </section>
            </div>

            {currentUser ? (
              <button
                type="button"
                onClick={handleLogout}
                className="mt-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left text-xs font-semibold text-slate-800"
              >
                {t.common.logout}
              </button>
            ) : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}







