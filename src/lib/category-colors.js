const CATEGORY_COLOR_PALETTE = [
  "#0081e2",
  "#00a2ff",
  "#0ea5e9",
  "#06b6d4",
  "#00c2d1",
  "#14b8a6",
  "#10b981",
  "#22c55e",
  "#84cc16",
  "#eab308",
  "#f59e0b",
  "#f97316",
  "#ea580c",
  "#ef4444",
  "#f43f5e",
  "#ec4899",
  "#d946ef",
  "#8b5cf6",
  "#7c3aed",
  "#6366f1",
];

export function pickCategoryColor(existingColors = new Set()) {
  const used = new Set(
    Array.from(existingColors || [])
      .filter(Boolean)
      .map((color) => String(color).toLowerCase())
  );

  for (const color of CATEGORY_COLOR_PALETTE) {
    if (!used.has(color.toLowerCase())) {
      return color;
    }
  }

  let index = used.size;
  for (let i = 0; i < 360; i += 1) {
    const hue = Math.round((index * 137.5) % 360);
    const color = `hsl(${hue}, 80%, 45%)`;
    if (!used.has(color.toLowerCase())) {
      return color;
    }
    index += 1;
  }

  return "#64748b";
}
