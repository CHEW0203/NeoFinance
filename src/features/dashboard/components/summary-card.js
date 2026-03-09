export function SummaryCard({
  label,
  value,
  change,
  description,
  dark = false,
}) {
  return (
    <article
      className={`rounded-[1.75rem] p-5 ${
        dark
          ? "border border-white/10 bg-white/5 text-white"
          : "border border-slate-200 bg-slate-50 text-slate-950"
      }`}
    >
      <p
        className={`text-sm ${
          dark ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {label}
      </p>
      <h3 className="mt-3 text-3xl font-semibold tracking-tight">{value}</h3>
      <p
        className={`mt-2 text-sm font-medium ${
          dark ? "text-emerald-300" : "text-emerald-700"
        }`}
      >
        {change}
      </p>
      <p
        className={`mt-4 text-sm leading-7 ${
          dark ? "text-slate-300" : "text-slate-600"
        }`}
      >
        {description}
      </p>
    </article>
  );
}
