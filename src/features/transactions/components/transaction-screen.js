"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { useLanguage } from "@/hooks/use-language";
import { getLocalDateKey } from "@/utils/date-key";

const ICONS = {
  FOOD: "\u{1F354}",
  SNACK: "\u{1F36A}",
  DRINKS: "\u{1F964}",
  TRANSPORT: "\u{1F68C}",
  SHOPPING: "\u{1F6CD}\uFE0F",
  GIFT: "\u{1F381}",
  RENT: "\u{1F3E0}",
  UTILITIES: "\u{1F4A1}",
  HEALTH: "\u{1F48A}",
  SALARY: "\u{1F4BC}",
  ALLOWANCE: "\u{1F4B0}",
  BONUS: "\u{1F3C6}",
  FREELANCE: "\u{1F4BB}",
  INVESTMENT: "\u{1F4C8}",
  REFUND: "\u{1F4B3}",
  BOX: "\u{1F4E6}",
  PIZZA: "\u{1F355}",
  TAXI: "\u{1F695}",
  PHONE: "\u{1F4F1}",
  GAME: "\u{1F3AE}",
  MUSIC: "\u{1F3B5}",
  BANK: "\u{1F3E6}",
  COIN: "\u{1FA99}",
  CHART: "\u{1F4CA}",
  TARGET: "\u{1F3AF}",
  EDU: "\u{1F393}",
  TRASH: "\u{1F5D1}\uFE0F",
};

const BASE_EXPENSE_CATEGORIES = [
  { key: "food", name: "Food", icon: ICONS.FOOD },
  { key: "snack", name: "Snack", icon: ICONS.SNACK },
  { key: "drinks", name: "Drinks", icon: ICONS.DRINKS },
  { key: "transport", name: "Transport", icon: ICONS.TRANSPORT },
  { key: "shopping", name: "Shopping", icon: ICONS.SHOPPING },
  { key: "gift", name: "Gift", icon: ICONS.GIFT },
  { key: "rent", name: "Rent", icon: ICONS.RENT },
  { key: "utilities", name: "Utilities", icon: ICONS.UTILITIES },
  { key: "health", name: "Health", icon: ICONS.HEALTH },
  { key: "others", name: "Others", icon: ICONS.BOX },
];

const BASE_INCOME_CATEGORIES = [
  { key: "salary", name: "Salary", icon: ICONS.SALARY },
  { key: "allowance", name: "Allowance", icon: ICONS.ALLOWANCE },
  { key: "bonus", name: "Bonus", icon: ICONS.BONUS },
  { key: "freelance", name: "Freelance", icon: ICONS.FREELANCE },
  { key: "investment", name: "Investment", icon: ICONS.INVESTMENT },
  { key: "refund", name: "Refund", icon: ICONS.REFUND },
  { key: "others", name: "Others", icon: ICONS.BOX },
];

const PROTECTED_EXPENSE_NAMES = new Set(
  BASE_EXPENSE_CATEGORIES.map((item) => item.name.toLowerCase())
);
const PROTECTED_INCOME_NAMES = new Set(
  BASE_INCOME_CATEGORIES.map((item) => item.name.toLowerCase())
);

const EXPENSE_ICON_CHOICES = [
  ICONS.FOOD,
  ICONS.SNACK,
  ICONS.DRINKS,
  ICONS.PIZZA,
  ICONS.TRANSPORT,
  ICONS.TAXI,
  ICONS.SHOPPING,
  ICONS.GIFT,
  ICONS.RENT,
  ICONS.UTILITIES,
  ICONS.HEALTH,
  ICONS.PHONE,
  ICONS.GAME,
  ICONS.MUSIC,
  ICONS.BOX,
];

const INCOME_ICON_CHOICES = [
  ICONS.SALARY,
  ICONS.ALLOWANCE,
  ICONS.BONUS,
  ICONS.FREELANCE,
  ICONS.INVESTMENT,
  ICONS.REFUND,
  ICONS.BANK,
  ICONS.COIN,
  ICONS.CHART,
  ICONS.TARGET,
  ICONS.EDU,
  ICONS.BOX,
];

const LOCALIZED_BASE_LABELS = {
  en: {
    food: "Food",
    snack: "Snack",
    drinks: "Drinks",
    transport: "Transport",
    shopping: "Shopping",
    gift: "Gift",
    rent: "Rent",
    utilities: "Utilities",
    health: "Health",
    others: "Others",
    salary: "Salary",
    allowance: "Allowance",
    bonus: "Bonus",
    freelance: "Freelance",
    investment: "Investment",
    refund: "Refund",
  },
  zh: {
    food: "\u98df\u7269",
    snack: "\u96f6\u98df",
    drinks: "\u996e\u6599",
    transport: "\u4ea4\u901a",
    shopping: "\u8d2d\u7269",
    gift: "\u793c\u7269",
    rent: "\u623f\u79df",
    utilities: "\u6c34\u7535",
    health: "\u533b\u7597",
    others: "\u5176\u4ed6",
    salary: "\u85aa\u8d44",
    allowance: "\u6d25\u8d34",
    bonus: "\u5956\u91d1",
    freelance: "\u517c\u804c",
    investment: "\u6295\u8d44",
    refund: "\u9000\u6b3e",
  },
  ms: {
    food: "Makanan",
    snack: "Snek",
    drinks: "Minuman",
    transport: "Pengangkutan",
    shopping: "Membeli-belah",
    gift: "Hadiah",
    rent: "Sewa",
    utilities: "Utiliti",
    health: "Kesihatan",
    others: "Lain-lain",
    salary: "Gaji",
    allowance: "Elaun",
    bonus: "Bonus",
    freelance: "Freelance",
    investment: "Pelaburan",
    refund: "Pulangan",
  },
};

const LEGACY_HIDDEN_EXPENSE_NAMES = new Set(["breakfast", "lunch", "dinner"]);

function parseApiError(error, fallback) {
  return error?.message || fallback;
}

function normalizeName(value) {
  return String(value || "").trim().toLowerCase();
}

function isCorruptIcon(icon) {
  const value = String(icon || "");
  if (!value) return true;
  if (value.includes("?")) return true;
  if (!/\p{Extended_Pictographic}/u.test(value)) return true;
  return false;
}

function sanitizeIcon(icon) {
  return isCorruptIcon(icon) ? "" : String(icon);
}

function getBaseForType(type) {
  return type === "income" ? BASE_INCOME_CATEGORIES : BASE_EXPENSE_CATEGORIES;
}

function getLocalizedBaseName(language, key, fallback) {
  return LOCALIZED_BASE_LABELS[language]?.[key] || fallback;
}

function isProtectedCategory(type, name) {
  const normalized = normalizeName(name);
  return type === "income"
    ? PROTECTED_INCOME_NAMES.has(normalized)
    : PROTECTED_EXPENSE_NAMES.has(normalized);
}

function buildCategoryRows(rawRows) {
  const rows = [];
  const present = { expense: new Set(), income: new Set() };

  for (const row of rawRows) {
    const safeType = row.type === "income" ? "income" : "expense";
    const rowName = String(row.name || "").trim();
    if (safeType === "expense" && LEGACY_HIDDEN_EXPENSE_NAMES.has(normalizeName(rowName))) {
      continue;
    }
    const baseCatalog = getBaseForType(safeType);
    const match = baseCatalog.find((base) => normalizeName(base.name) === normalizeName(rowName));
    const item = {
      ...row,
      name: rowName,
      type: safeType,
      icon: sanitizeIcon(row.icon) || match?.icon || ICONS.BOX,
      baseKey: match?.key || null,
      isDefault: Boolean(match || isProtectedCategory(safeType, row.name)),
      isCustom: false,
    };
    rows.push(item);
    present[item.type].add(normalizeName(item.name));
  }

  for (const base of BASE_EXPENSE_CATEGORIES) {
    if (!present.expense.has(normalizeName(base.name))) {
      rows.push({
        id: `default-expense-${base.key}`,
        name: base.name,
        type: "expense",
        icon: base.icon,
        baseKey: base.key,
        isDefault: true,
        isCustom: false,
      });
    }
  }

  for (const base of BASE_INCOME_CATEGORIES) {
    if (!present.income.has(normalizeName(base.name))) {
      rows.push({
        id: `default-income-${base.key}`,
        name: base.name,
        type: "income",
        icon: base.icon,
        baseKey: base.key,
        isDefault: true,
        isCustom: false,
      });
    }
  }

  return rows;
}

export function TransactionScreen({ recordId }) {
  const router = useRouter();
  const { language, t } = useLanguage();

  const [mode, setMode] = useState("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionDate, setTransactionDate] = useState(getLocalDateKey(new Date()));
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
  const [showDeleteCategoryConfirm, setShowDeleteCategoryConfirm] = useState(false);

  const isEditing = Boolean(recordId);
  const todayDate = getLocalDateKey(new Date());

  const filteredCategories = useMemo(
    () => categories.filter((item) => item.type === mode),
    [categories, mode]
  );
  const selectedCategory = categories.find((item) => item.id === selectedCategoryId) || null;
  const canDeleteSelectedCategory = Boolean(
    selectedCategory &&
      (selectedCategory.isCustom ||
        (!selectedCategory.isDefault &&
          !isProtectedCategory(selectedCategory.type, selectedCategory.name)))
  );
  const customIconChoices = mode === "income" ? INCOME_ICON_CHOICES : EXPENSE_ICON_CHOICES;
  const pageBackgroundClass =
    mode === "income"
      ? "bg-[radial-gradient(circle_at_top,#dff4ff_0%,#bfe8ff_45%,#9fdfff_100%)]"
      : "bg-[radial-gradient(circle_at_top,#fff7d6_0%,#ffe790_52%,#ffd158_100%)]";

  async function loadCategoriesAndDefaults() {
    const response = await fetch("/api/categories", { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || t.transactions.loadCategoriesFailed);
    }
    setCategories(buildCategoryRows(payload.data || []));
  }

  async function loadRecord(id) {
    const response = await fetch(`/api/transactions/${id}`, { cache: "no-store" });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.message || t.transactions.loadRecordFailed);
    }
    const row = payload.data;
    setMode(row.type === "income" ? "income" : "expense");
    setTitle(row.title || "");
    setAmount(String(row.amount ?? ""));
    setTransactionDate(getLocalDateKey(new Date(row.transactionDate)));
    setSelectedCategoryId(row.categoryId || "");
  }

  useEffect(() => {
    async function bootstrap() {
      setError("");
      try {
        await loadCategoriesAndDefaults();
        if (recordId) await loadRecord(recordId);
      } catch (requestError) {
        setError(parseApiError(requestError, t.transactions.initFailed));
      } finally {
        setIsBootstrapping(false);
      }
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId]);

  useEffect(() => {
    if (!isEditing) return;
    if (!selectedCategoryId && filteredCategories.length > 0) {
      setSelectedCategoryId(filteredCategories[0].id);
      return;
    }
    if (
      selectedCategoryId &&
      filteredCategories.length > 0 &&
      !filteredCategories.some((item) => item.id === selectedCategoryId)
    ) {
      setSelectedCategoryId(filteredCategories[0].id);
    }
  }, [filteredCategories, selectedCategoryId, isEditing]);

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
      baseKey: null,
      isDefault: false,
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

    const category = selectedCategoryId
      ? categories.find((item) => item.id === selectedCategoryId)
      : null;
    if (selectedCategoryId && !category) {
      setError(t.transactions.categoryNotFound);
      return;
    }
    if (!title.trim() && !category) {
      setError("Please enter a title.");
      return;
    }

    const payload = {
      title: title.trim() || category?.name || "",
      amount: Number(amount),
      type: mode,
      transactionDate,
      note: null,
      ...(category
        ? category.id.startsWith("default-") || category.isCustom
          ? { categoryName: category.name, categoryIcon: category.icon || null }
          : { categoryId: category.id }
        : {}),
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
        throw new Error(result.message || t.transactions.saveFailed);
      }
      setSuccess(isEditing ? t.transactions.recordUpdated : t.transactions.recordAdded);
      if (!isEditing) setAmount("");
      window.dispatchEvent(new Event("neo:transactions-updated"));
      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(parseApiError(requestError, t.transactions.saveFailed));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteConfirmed() {
    if (!isEditing) return;
    setIsDeleting(true);
    setError("");
    try {
      const response = await fetch(`/api/transactions/${recordId}`, { method: "DELETE" });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || t.transactions.deleteFailed);
      }
      setShowDeleteConfirm(false);
      window.dispatchEvent(new Event("neo:transactions-updated"));
      router.push("/");
      router.refresh();
    } catch (requestError) {
      setError(parseApiError(requestError, t.transactions.deleteFailed));
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleDeleteCategoryConfirmed() {
    if (!selectedCategoryId || !canDeleteSelectedCategory) return;
    const category = categories.find((item) => item.id === selectedCategoryId);
    if (!category) return;

    if (String(category.id).startsWith("custom-")) {
      setCategories((prev) => prev.filter((item) => item.id !== category.id));
      setShowDeleteCategoryConfirm(false);
      setSelectedCategoryId("");
      return;
    }

    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok) {
        const message = payload.message || t.transactions.deleteCategoryFailed;
        if (message.includes("Basic category cannot be deleted")) {
          setShowDeleteCategoryConfirm(false);
          return;
        }
        throw new Error(message);
      }
      setShowDeleteCategoryConfirm(false);
      setSelectedCategoryId("");
      await loadCategoriesAndDefaults();
    } catch (requestError) {
      setError(parseApiError(requestError, t.transactions.deleteCategoryFailed));
      setShowDeleteCategoryConfirm(false);
    }
  }

  if (isBootstrapping) {
    return (
      <main className={`min-h-screen ${pageBackgroundClass} px-4 py-6 text-slate-900 sm:px-6`}>
        <div className="mx-auto w-full max-w-3xl">
          <BackButton fallbackHref="/" preferFallback />
          <p className="mt-6 text-sm text-slate-700">{t.transactions.loadingRecord}</p>
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
              {t.transactions.expense}
            </button>
            <button
              type="button"
              onClick={() => setMode("income")}
              className={`rounded-xl px-5 py-2 text-lg font-semibold ${
                mode === "income" ? "bg-cyan-300 text-slate-900" : "text-slate-700"
              }`}
            >
              {t.transactions.income}
            </button>
          </div>

          {isEditing ? (
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="text-2xl"
              aria-label={t.transactions.deleteRecord}
              title={t.transactions.deleteRecord}
            >
              {ICONS.TRASH}
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
              title={t.transactions.addCustomCategory}
            >
              <span className="text-2xl">+</span>
              <span className="text-xs font-semibold text-slate-700">{t.transactions.add}</span>
            </button>

            {filteredCategories.map((item) => {
              const selected = selectedCategoryId === item.id;
              const selectedClass =
                mode === "income"
                  ? "border-slate-900 bg-cyan-100"
                  : "border-slate-900 bg-amber-100";
              const label = item.baseKey
                ? getLocalizedBaseName(language, item.baseKey, item.name)
                : item.name;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(item.id)}
                  className={`flex flex-col items-center justify-center gap-1 rounded-2xl border py-2 text-2xl ${
                    selected ? selectedClass : "border-slate-300 bg-white"
                  }`}
                  title={label}
                >
                  <span>{sanitizeIcon(item.icon) || ICONS.BOX}</span>
                  <span className="line-clamp-1 text-xs font-semibold text-slate-700">{label}</span>
                </button>
              );
            })}
          </div>

          {canDeleteSelectedCategory ? (
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteCategoryConfirm(true)}
                className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700"
              >
                {t.transactions.deleteCategory}
              </button>
            </div>
          ) : null}
        </section>

        <form className="space-y-4 rounded-3xl border-2 border-slate-900 bg-white p-5" onSubmit={handleSubmit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="date"
              value={transactionDate}
              onChange={(event) => setTransactionDate(event.target.value)}
              max={todayDate}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-slate-800"
              required
            />
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={t.transactions.amountPlaceholder}
              className="rounded-2xl border border-slate-300 px-4 py-3 text-xl font-semibold outline-none focus:border-slate-800"
              required
            />
          </div>

          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder={t.transactions.recordTitle}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none focus:border-slate-800"
          />

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-2xl bg-cyan-500 px-4 py-3 text-lg font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? t.transactions.saving : isEditing ? t.transactions.updateRecord : t.transactions.addRecord}
          </button>
        </form>

        {error ? (
          <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
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
                  aria-label={t.common.back}
                >
                  {"\u2190"}
                </button>
                <h2 className="text-3xl font-semibold">{t.transactions.newCategory}</h2>
                <div className="w-8" />
              </header>

              <section className="rounded-3xl border-2 border-slate-900 bg-white p-4">
                <div className="flex items-center gap-3 rounded-2xl border-2 border-slate-900 px-4 py-3">
                  <span className="text-3xl">{newCategoryIcon}</span>
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder={t.transactions.enterCategoryName}
                    className="w-full bg-transparent text-lg font-semibold text-slate-700 outline-none"
                  />
                </div>
              </section>

              <section className="rounded-3xl border-2 border-slate-900 bg-white p-4">
                <div className="max-h-72 overflow-y-auto">
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {customIconChoices.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => setNewCategoryIcon(icon)}
                        className={`flex h-14 items-center justify-center rounded-2xl border text-2xl ${
                          newCategoryIcon === icon
                            ? mode === "income"
                              ? "border-slate-900 bg-cyan-100"
                              : "border-slate-900 bg-amber-100"
                            : "border-slate-300 bg-white"
                        }`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <button
                type="button"
                onClick={confirmCustomCategory}
                className="w-full rounded-2xl border-2 border-slate-900 bg-amber-300 px-4 py-3 text-2xl font-semibold text-slate-900"
              >
                {t.common.ok}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-900 bg-white p-5">
            <h3 className="text-xl font-semibold text-slate-900">{t.transactions.deleteRecordTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.transactions.deleteRecordDesc}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirmed}
                disabled={isDeleting}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 font-semibold text-white disabled:opacity-60"
              >
                {t.common.ok}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showDeleteCategoryConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-3xl border-2 border-slate-900 bg-white p-5">
            <h3 className="text-xl font-semibold text-slate-900">{t.transactions.deleteCategoryTitle}</h3>
            <p className="mt-2 text-sm text-slate-600">{t.transactions.deleteCategoryDesc}</p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteCategoryConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 font-semibold text-slate-700"
              >
                {t.common.cancel}
              </button>
              <button
                type="button"
                onClick={handleDeleteCategoryConfirmed}
                className="flex-1 rounded-2xl bg-rose-500 px-4 py-2 font-semibold text-white"
              >
                {t.common.ok}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
