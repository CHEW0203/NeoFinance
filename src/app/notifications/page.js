"use client";

import { BackButton } from "@/components/back-button";
import { useNotifications } from "@/lib/use-notifications";

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications();
  const hasUnread = notifications.some((item) => !item.isRead);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff_0%,#eef2ff_35%,#e2e8f0_100%)] px-4 py-6 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex items-center justify-between">
          <BackButton fallbackHref="/" />
          <button
            type="button"
            onClick={markAllRead}
            disabled={!hasUnread}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-900 hover:text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Read All Message
          </button>
        </div>

        <section className="rounded-3xl border border-slate-300 bg-white p-6">
          <h1 className="text-2xl font-semibold text-slate-900">Notifications</h1>
          {notifications.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No notification yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {notifications.map((item) => {
                const isRead = Boolean(item.isRead);
                return (
                  <div
                    key={item.id || `${item.title}-${item.time}`}
                    className={`rounded-2xl border px-4 py-3 ${
                      isRead
                        ? "border-slate-200 bg-slate-50 text-slate-400"
                        : "border-slate-300 bg-white text-slate-900"
                    }`}
                  >
                    <p className={`text-sm font-semibold ${isRead ? "text-slate-400" : "text-slate-900"}`}>
                      {item.title || "Notification"}
                    </p>
                    {item.message ? (
                      <p className={`mt-1 text-sm ${isRead ? "text-slate-400" : "text-slate-600"}`}>
                        {item.message}
                      </p>
                    ) : null}
                    {item.time ? (
                      <p className={`mt-2 text-xs ${isRead ? "text-slate-300" : "text-slate-400"}`}>
                        {item.time}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
