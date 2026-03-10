"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";

const CATEGORY_ICON_MAP = {
  food: "🍜",
  transport: "🚌",
  gift: "🎁",
  others: "📦",
  salary: "💼",
};

const EXPENSE_ICON_CHOICES = [
  "🍜",
  "☕",
  "🍔",
  "🍕",
  "🛍️",
  "🎁",
  "🚌",
  "🎮",
  "🎵",
  "🏠",
  "📱",
  "🧾",
];

const INCOME_ICON_CHOICES = [
  "💼",
  "💰",
  "💸",
  "🏦",
  "📈",
  "🪙",
  "💳",
  "🧠",
  "🎯",
  "🧾",
  "🛠️",
  "🏆",
  "🎓",
  "👔",
  "📊",
];

function iconForCategory(name, customIcon) {
  if (customIcon) return customIcon;
  const key = String(name || "").toLowerCase();
  if (CATEGORY_ICON_MAP[key]) return CATEGORY_ICON_MAP[key];
  return "🧾";
}

function parseApiError(error, fallback) {
  return error?.message || fallback;
}

export function TransactionScreen({ recordId }) {
  const router = useRouter();

  const [mode, setMode] = useState("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [categories, setCategories] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isBootstrapping, setIsBootstrapping] = useState(Boolean(recordId));

  const [showCategoryCreator, setShowCategoryCreator] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState(EXPENSE_ICON_CHOICES[0]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isEditing = Boolean(recordId);

  const filteredCategories = useMemo(
    () => categories.filter((item) => item.type === mode),
    [categories, mode]
  );
  const customIconChoices = mode === "income" ? INCOME_ICON_CHOICES : EXPENSE_ICON_CHOICES;

  const pageBackgroundClass =
    mode === "income"
      ? "bg-[radial-gradient(circle_at_top,#dff4ff_0%,#bfe8ff_45%,#9fdfff_100%)]"
      : "bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffe790_52%,#ffd158_100%)]";

  async function loadCategoriesAndDefaults() {
    const response = await fetch("/api/transactions?limit=500", {
      cache: "no-store",
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Failed to load transactions.");
    }

    const map = new Map();
    payload.data.forEach((transaction) => {
      const category = transaction.category;
      if (category && !map.has(category.id)) {
        map.set(category.id, {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: CATEGORY_ICON_MAP[String(category.name || "").toLowerCase()] || null,
        });
      }
    });

    const defaults = [
      { id: "default-food", name: "Food", type: "expense", icon: "🍜" },
      { id: "default-transport", name: "Transport", type: "expense", icon: "🚌" },
      { id: "default-gift", name: "Gift", type: "expense", icon: "🎁" },
      { id: "default-others", name: "Others", type: "expense", icon: "📦" },
      { id: "default-salary", name: "Salary", type: "income", icon: "💼" },
    ];

    defaults.forEach((item) => {
      if (![...map.values()].some((row) => row.name.toLowerCase() === item.name.toLowerCase())) {
        map.set(item.id, item);
      }
    });

    setCategories([...map.values()]);
  }

  async function loadRecord(id) {
    const response = await fetch(`/api/transactions/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || "Failed to load record.");
    }
    const row = payload.data;
    setMode(row.type);
    setTitle(row.title || "");
    setAmount(String(row.amount ?? ""));
    setTransactionDate(new Date(row.transactionDate).toISOString().slice(0, 10));
    setSelectedCategoryId(row.categoryId || "");
  }

  useEffect(() => {
    async function bootstrap() {
      setError("");
      try {
        await loadCategoriesAndDefaults();
        if (recordId) {
          await loadRecord(recordId);
        }
      } catch (requestError) {
        setError(parseApiError(requestError, "Failed to initialize form."));
      } finally {
        setIsBootstrapping(false);
      }
    }
    bootstrap();
  }, [recordId]);

  useEffect(() => {
    if (!selectedCategoryId && filteredCategories.length > 0) {
      setSelectedCategoryId(filteredCategories[0].id);
    } else if (
      selectedCategoryId &&
      filteredCategories.length > 0 &&
      !filteredCategories.some((item) => item.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, selectedCategoryId]);

  function openCategoryCreator() {
    setNewCategoryName("");
    setNewCategoryIcon(customIconChoices[0]);
    setShowCategoryCreator(true);
  }

  function confirmCustomCategory() {
    if (!newCategoryName.trim()) return;
    const id = `custom-${Date.now()}`;
    const next = {
      id,
      name: newCategoryName.trim(),
      type: mode,
      icon: newCategoryIcon,
      isCustom: true,
    };
    setCategories((prev) => [...prev, next]);
    setSelectedCategoryId(id);
    setShowCategoryCreator(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedCategoryId) {
      setError("Please select a category.");
      return;
    }

    const category = categories.find((item) => item.id === selectedCategoryId);
    if (!category) {
      setError("Category not found.");
      return;
    }

    const payload = {
      title: title || category.name,
      amount: Number(amount),
      type: mode,
      transactionDate,
      note: null,
      ...(category.isCustom || category.id.startsWith("default-")
        ? { categoryName: category.name }
        : { categoryId: category.id }),
    };

    setIsSaving(true);
    try {
      const endpoint = isEditing ? `/api/transactions/${recordId}` : "/api/transactions";
      const method = isEditing ? "PATCH" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to save record.");
      }

      setSuccess(isEditing ? "Record updated." : "Record added.");
      if (!isEditing) {
        setAmount("");
      }
      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(parseApiError(requestError, "Failed to save record."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!isEditing) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${recordId}`, {
        method: "DELETE",
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to delete record.");
      }
      setShowDeleteConfirm(false);
      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(parseApiError(requestError, "Failed to delete record."));
    } finally {
      setIsDeleting(false);
    }
  }

  if (isBootstrapping) {
    return (
      <main className={`min-h-screen ${pageBackgroundClass} px-4 py-6 text-slate-900 sm:px-6`}>
        <div className="mx-auto w-full max-w-3xl">
          <BackButton fallbackHref="/" preferFallback />
          <p className="mt-6 text-sm text-slate-700">Loading record...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${pageBackgroundClass} px-4 py-6 text-slate-900 sm:px-6`}>
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <header className="flex items-center justify-between">
          <BackButton fallbackHref="/" preferFallback />
          <div className="rounded-2xl border-2 border-slate-900 bg-white p-1">
            <button
              type="button"
              onClick={() => setMode("expense")}
              className={`rounded-xl px-5 py-2 text-lg font-semibold ${
                mode === "expense" ? "bg-amber-300 text-slate-900" : "text-slate-700"
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setMode("income")}
              className={`rounded-xl px-5 py-2 text-lg font-semibold ${
                mode === "income" ? "bg-cyan-300 text-slate-900" : "text-slate-700"
              }`}
            >
              Income
            </button>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-2xl"
              aria-label="Delete record"
              title="Delete record"
            >
              🗑️
            </button>
          ) : (
            <div className="w-8" />
          )}
        </header>

        <section className="rounded-3xl border-2 border-slate-900 bg-white p-5">
          <div className="grid grid-cols-4 gap-4 sm:grid-cols-5">
            <button
              type="button"
              onClick={openCategoryCreator}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-slate-300 bg-slate-100 py-2"
              title="Add custom category"
            >
              <span className="text-2xl">+</span>
              <span className="text-xs font-semibold text-slate-700">Add</span>
            </button>
            {filteredCategories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedCategoryId(item.id)}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-2 text-2xl ${
                  selectedCategoryId === item.id
                    ? "border-slate-900 bg-amber-100"
                    : "border-slate-300 bg-white"
                }`}
                title={item.name}
                aria-label={item.name}
              >
                <span>{iconForCategory(item.name, item.icon)}</span>
                <span className="line-clamp-1 text-xs font-semibold text-slate-700">
                  {item.name}
                </span>
              </button>
            ))}
          </div>
        </section>

        <form
          className="space-y-4 rounded-3xl border-2 border-slate-900 bg-white p-5"
          onSubmit={handleSubmit}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-slate-800"
              required
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="RM amount"
              className="rounded-2xl border border-slate-300 px-4 py-3 text-xl font-semibold outline-none focus:border-slate-800"
              required
            />
          </div>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Record title"
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-slate-800"
          />

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : isEditing ? "Update Record" : "Add Record"}
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {success ? (
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {success}
          </p>
        ) : null}
      </div>

      {showCategoryCreator ? (
        <div className="fixed inset-0 z-40 bg-white">
          <div className={`min-h-screen ${pageBackgroundClass} px-4 py-6 text-slate-900 sm:px-6`}>
            <div className="mx-auto w-full max-w-3xl space-y-5">
              <header className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowCategoryCreator(false)}
                  className="text-3xl leading-none"
                  aria-label="Back"
                >
                  ←
                </button>
                <h2 className="text-3xl font-semibold">New Category</h2>
                <div className="w-8" />
              </header>

              <section className="rounded-3xl border-2 border-slate-900 bg-white p-4">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-900 px-4 py-3">
                  <span className="text-3xl">{newCategoryIcon}</span>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="Tap to enter the name"
                    className="w-full bg-transparent text-lg font-semibold text-slate-700 outline-none"
                  />
                </div>
              </section>

              <section className="rounded-3xl border-2 border-slate-900 bg-white p-4">
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {customIconChoices.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCategoryIcon(icon)}
                      className={`flex h-14 items-center justify-center rounded-2xl border text-2xl ${
                        newCategoryIcon === icon
                          ? "border-slate-900 bg-amber-100"
                          : "border-slate-300 bg-white"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </section>

              <button
                type="button"
                onClick={confirmCustomCategory}
                className="w-full rounded-2xl border-2 border-slate-900 bg-amber-300 px-4 py-3 text-2xl font-semibold text-slate-900"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-900 bg-white p-5">
            <h3 className="text-xl font-semibold text-slate-900">Delete this record?</h3>
            <p className="mt-2 text-sm text-slate-600">
              This action cannot be undone.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
