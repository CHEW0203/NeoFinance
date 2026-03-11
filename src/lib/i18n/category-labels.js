const CATEGORY_LABELS = {
  food: { en: "Food", zh: "食物", ms: "Makanan" },
  breakfast: { en: "Breakfast", zh: "早餐", ms: "Sarapan" },
  lunch: { en: "Lunch", zh: "午餐", ms: "Makan Tengah Hari" },
  dinner: { en: "Dinner", zh: "晚餐", ms: "Makan Malam" },
  snack: { en: "Snack", zh: "零食", ms: "Snek" },
  drinks: { en: "Drinks", zh: "饮料", ms: "Minuman" },
  transport: { en: "Transport", zh: "交通", ms: "Pengangkutan" },
  shopping: { en: "Shopping", zh: "购物", ms: "Membeli-belah" },
  gift: { en: "Gift", zh: "礼物", ms: "Hadiah" },
  rent: { en: "Rent", zh: "房租", ms: "Sewa" },
  utilities: { en: "Utilities", zh: "水电", ms: "Utiliti" },
  health: { en: "Health", zh: "医疗", ms: "Kesihatan" },
  others: { en: "Others", zh: "其他", ms: "Lain-lain" },
  salary: { en: "Salary", zh: "薪资", ms: "Gaji" },
  allowance: { en: "Allowance", zh: "津贴", ms: "Elaun" },
  bonus: { en: "Bonus", zh: "奖金", ms: "Bonus" },
  freelance: { en: "Freelance", zh: "兼职", ms: "Freelance" },
  investment: { en: "Investment", zh: "投资", ms: "Pelaburan" },
  refund: { en: "Refund", zh: "退款", ms: "Pulangan" },
};

export function getLocalizedCategoryLabel(name, language = "en") {
  const key = String(name || "").trim().toLowerCase();
  if (!key) return "";
  const entry = CATEGORY_LABELS[key];
  if (!entry) return String(name);
  return entry[language] || entry.en || String(name);
}
