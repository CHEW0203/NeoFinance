const CATEGORY_LABELS = {
  food: { en: "Food", zh: "\u98df\u7269", ms: "Makanan" },
  breakfast: { en: "Breakfast", zh: "\u65e9\u9910", ms: "Sarapan" },
  lunch: { en: "Lunch", zh: "\u5348\u9910", ms: "Makan Tengah Hari" },
  dinner: { en: "Dinner", zh: "\u665a\u9910", ms: "Makan Malam" },
  snack: { en: "Snack", zh: "\u96f6\u98df", ms: "Snek" },
  drinks: { en: "Drinks", zh: "\u996e\u6599", ms: "Minuman" },
  transport: { en: "Transport", zh: "\u4ea4\u901a", ms: "Pengangkutan" },
  shopping: { en: "Shopping", zh: "\u8d2d\u7269", ms: "Membeli-belah" },
  gift: { en: "Gift", zh: "\u793c\u7269", ms: "Hadiah" },
  rent: { en: "Rent", zh: "\u623f\u79df", ms: "Sewa" },
  utilities: { en: "Utilities", zh: "\u6c34\u7535", ms: "Utiliti" },
  health: { en: "Health", zh: "\u533b\u7597", ms: "Kesihatan" },
  others: { en: "Others", zh: "\u5176\u4ed6", ms: "Lain-lain" },
  salary: { en: "Salary", zh: "\u85aa\u8d44", ms: "Gaji" },
  allowance: { en: "Allowance", zh: "\u6d25\u8d34", ms: "Elaun" },
  bonus: { en: "Bonus", zh: "\u5956\u91d1", ms: "Bonus" },
  freelance: { en: "Freelance", zh: "\u517c\u804c", ms: "Freelance" },
  investment: { en: "Investment", zh: "\u6295\u8d44", ms: "Pelaburan" },
  refund: { en: "Refund", zh: "\u9000\u6b3e", ms: "Pulangan" },
};

export function getLocalizedCategoryLabel(name, language = "en") {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return "";
  const entry = CATEGORY_LABELS[key];
  if (!entry) return String(name);
  return entry[language] || entry.en || String(name);
}

export function toCanonicalCategoryName(name) {
  const raw = String(name || "").trim();
  if (!raw) return "";
  const lowered = raw.toLowerCase();

  for (const [key, labels] of Object.entries(CATEGORY_LABELS)) {
    if (key === lowered) return labels.en || raw;
    if (
      Object.values(labels)
        .map((label) => String(label || "").trim().toLowerCase())
        .includes(lowered)
    ) {
      return labels.en || raw;
    }
  }

  return raw;
}
