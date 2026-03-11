"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ft_notifications";
const STORAGE_VERSION_KEY = "ft_notifications_version";
const STORAGE_VERSION = "v5";

const DEFAULT_NOTIFICATIONS = [];

function safeParse(value) {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    const storedVersion = window.localStorage.getItem(STORAGE_VERSION_KEY);

    if (Array.isArray(stored)) {
      setNotifications(stored);
      if (storedVersion !== STORAGE_VERSION) {
        window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
      }
      setReady(true);
      return;
    }

    setNotifications(DEFAULT_NOTIFICATIONS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
    window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
    setReady(true);
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.isRead).length,
    [notifications]
  );

  const persist = useCallback((next) => {
    setNotifications(next);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.localStorage.setItem(STORAGE_VERSION_KEY, STORAGE_VERSION);
  }, []);

  const markAllRead = useCallback(() => {
    const next = notifications.map((item) => ({ ...item, isRead: true }));
    persist(next);
  }, [notifications, persist]);

  return {
    notifications,
    setNotifications: persist,
    markAllRead,
    unreadCount,
    ready,
  };
}
