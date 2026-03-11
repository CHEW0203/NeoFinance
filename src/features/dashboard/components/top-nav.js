"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { logoutUser } from "@/services/auth-api";
import { useNotifications } from "@/lib/use-notifications";

export function TopNav({ monthLabel, currentUser }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const badgeLabel = unreadCount >= 9 ? "9+" : `${unreadCount}+`;

  async function handleLogout() {
    await logoutUser();
    setOpen(false);
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <nav className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-2xl leading-none text-slate-800"
          aria-label="Open menu"
        >
          {"\u2261"}
        </button>
        <p className="text-lg font-semibold tracking-tight text-slate-900">{monthLabel}</p>
        <div className="flex items-center gap-3 text-2xl text-slate-800">
          <Link
            href="/notifications"
            aria-label="Notification"
            title="Notification"
            className="relative inline-flex h-10 w-10 items-center justify-center"
          >
            <span aria-hidden="true">{"\u{1F514}"}</span>
            {unreadCount > 0 ? (
              <span
                className="absolute right-0 top-0 flex h-5 min-w-[1.25rem] -translate-y-1/2 translate-x-1/2 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white"
                aria-label={`${badgeLabel} unread notifications`}
              >
                {badgeLabel}
              </span>
            ) : null}
          </Link>
          <Link href="/target" aria-label="Target" title="Target">
            {"\u{1F3AF}"}
          </Link>
          <Link href="/calendar" aria-label="Calendar" title="Calendar">
            {"\u{1F4C5}"}
          </Link>
        </div>
      </nav>

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
                    href="/notifications"
                    onClick={() => setOpen(false)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800"
                  >
                    Notifications
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
