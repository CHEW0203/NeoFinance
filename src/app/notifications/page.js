"use client";

import { useMemo, useState } from "react";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { useNotifications } from "@/lib/use-notifications";

export default function NotificationsPage() {
  const { t } = useLanguage();
  const { notifications, setNotifications, markAllRead, deleteAllNotifications } = useNotifications();
  const [deleteMode, setDeleteMode] = useState(false);
  const [activeTab, setActiveTab] = useState("inbox");
  const [selectedIds, setSelectedIds] = useState([]);

  const hasUnread = notifications.some((item) => !item.isRead);
  const hasSelection = selectedIds.length > 0;

  const normalizedNotifications = useMemo(() => {
    return notifications.map((item, index) => ({
      ...item,
      _localId: String(item?.id || `legacy-${index}-${item?.title || ""}-${item?.time || ""}`),
    }));
  }, [notifications]);

  const title = t.pages.notifications;
  const inboxLabel = t.pages.notificationsInbox || "Inbox";
  const storiesLabel = t.pages.notificationsStories || "Stories";
  const markAllReadLabel = t.pages.markAllRead;
  const emptyLabel = t.pages.noNotification;
  const emptyDesc = t.pages.noNotificationDesc || "Activities and system alerts will show up here.";
  const defaultTitle = t.menu.notification;
  const selectDeleteLabel = t.pages.selectDelete;
  const cancelDeleteLabel = t.pages.cancelDelete;
  const deleteSelectedLabel = t.pages.deleteSelected;
  const deleteAllLabel = t.pages.deleteAll;
  const selectedCountLabel = t.pages.selectedCount.replace(
    "{count}",
    String(selectedIds.length)
  );

  function toggleDeleteMode() {
    setDeleteMode((prev) => {
      const next = !prev;
      if (!next) setSelectedIds([]);
      return next;
    });
  }

  function toggleSelection(localId) {
    setSelectedIds((prev) =>
      prev.includes(localId) ? prev.filter((id) => id !== localId) : [...prev, localId]
    );
  }

  function handleDeleteSelected() {
    if (!hasSelection) return;
    const selectedSet = new Set(selectedIds);
    const next = normalizedNotifications
      .filter((item) => !selectedSet.has(item._localId))
      .map(({ _localId, ...item }) => item);
    setNotifications(next);
    setSelectedIds([]);
    if (next.length === 0) {
      setDeleteMode(false);
    }
  }

  function handleDeleteAll() {
    deleteAllNotifications();
    setSelectedIds([]);
    setDeleteMode(false);
  }

  const inboxItems = normalizedNotifications;
  const storyItems = normalizedNotifications.filter((item) => item.kind === "story");

  return (
    <main className="min-h-screen bg-[#f4f4f5] px-4 py-4 text-slate-900 sm:px-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <header className="relative flex items-center justify-center pt-1">
          <div className="absolute left-0 top-0">
            <BackButton fallbackHref="/" />
          </div>
          <h1 className="pt-1 text-4xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        </header>

        <section className="rounded-2xl border-2 border-slate-900 bg-white p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`rounded-xl py-2 text-xl font-bold ${
                activeTab === "inbox" ? "bg-amber-300 text-slate-900" : "text-slate-700"
              }`}
            >
              {inboxLabel}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("stories")}
              className={`rounded-xl py-2 text-xl font-bold ${
                activeTab === "stories" ? "bg-amber-300 text-slate-900" : "text-slate-700"
              }`}
            >
              {storiesLabel}
            </button>
          </div>
        </section>

        {activeTab === "inbox" ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={!hasUnread || deleteMode}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {markAllReadLabel}
                </button>
                <button
                  type="button"
                  onClick={toggleDeleteMode}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                    deleteMode
                      ? "border-rose-300 bg-rose-50 text-rose-700"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {deleteMode ? cancelDeleteLabel : selectDeleteLabel}
                </button>
              </div>
            </section>

            {deleteMode ? (
              <section className="rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-500">{selectedCountLabel}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      disabled={!hasSelection}
                      className="rounded-full border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteSelectedLabel}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteAll}
                      disabled={inboxItems.length === 0}
                      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deleteAllLabel}
                    </button>
                  </div>
                </div>
              </section>
            ) : null}

            {inboxItems.length === 0 ? (
              <section className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-transparent text-center">
                <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-900 text-3xl">
                  {"\u{1F514}"}
                </span>
                <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">{emptyLabel}</p>
                <p className="mt-2 max-w-xs text-lg text-slate-500">{emptyDesc}</p>
              </section>
            ) : (
              <section className="space-y-3 pb-4">
                {inboxItems.map((item) => {
                  const isRead = Boolean(item.isRead);
                  const selected = selectedIds.includes(item._localId);
                  return (
                    <article
                      key={item._localId}
                      className={`rounded-2xl border px-4 py-3 ${
                        isRead
                          ? "border-slate-200 bg-slate-50 text-slate-400"
                          : "border-slate-300 bg-white text-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold ${isRead ? "text-slate-400" : "text-slate-900"}`}>
                            {item.title || defaultTitle}
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
                        {deleteMode ? (
                          <button
                            type="button"
                            onClick={() => toggleSelection(item._localId)}
                            aria-label={selected ? cancelDeleteLabel : selectDeleteLabel}
                            className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition ${
                              selected
                                ? "border-rose-500 bg-rose-500 text-white"
                                : "border-slate-300 bg-white text-transparent"
                            }`}
                          >
                            {"\u2713"}
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </section>
            )}
          </>
        ) : storyItems.length === 0 ? (
          <section className="flex min-h-[55vh] flex-col items-center justify-center rounded-3xl border border-transparent text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border-2 border-slate-900 text-3xl">
              {"\u{1F4D6}"}
            </span>
            <p className="mt-5 text-4xl font-black tracking-tight text-slate-900">{emptyLabel}</p>
            <p className="mt-2 max-w-xs text-lg text-slate-500">{emptyDesc}</p>
          </section>
        ) : (
          <section className="space-y-3 pb-4">
            {storyItems.map((item) => (
              <article key={item._localId} className="rounded-2xl border border-slate-300 bg-white px-4 py-3">
                <p className="text-sm font-semibold text-slate-900">{item.title || defaultTitle}</p>
                {item.message ? <p className="mt-1 text-sm text-slate-600">{item.message}</p> : null}
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
