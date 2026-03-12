function startOfDay(dateValue) {
  const next = new Date(dateValue);
  next.setHours(0, 0, 0, 0);
  return next;
}

function dateKey(dateValue) {
  return startOfDay(dateValue).toISOString().slice(0, 10);
}

function getDayDiff(fromDate, toDate) {
  const ms = startOfDay(toDate).getTime() - startOfDay(fromDate).getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
}

function buildDailyNetSeries(transactions, days, now = new Date()) {
  const end = startOfDay(now);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));

  const map = new Map();
  for (let i = 0; i < days; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    map.set(dateKey(day), 0);
  }

  for (const row of transactions) {
    const txnDate = new Date(row.transactionDate);
    if (Number.isNaN(txnDate.getTime())) continue;
    if (txnDate < start || txnDate > end) continue;
    const key = dateKey(txnDate);
    const amount = Number(row.amount || 0);
    const signed = row.type === "income" ? amount : -amount;
    map.set(key, (map.get(key) || 0) + signed);
  }

  return Array.from(map.values());
}

function average(values) {
  if (!values.length) return 0;
  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
}

function stddev(values, mean) {
  if (!values.length) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function computeCashflowForecast({ transactions = [], currentBalance = 0, now = new Date() }) {
  const series30 = buildDailyNetSeries(transactions, 30, now);
  const series90 = buildDailyNetSeries(transactions, 90, now);

  const avgDailyNet7Basis = average(series30);
  const avgDailyNet30Basis = average(series90);
  const volatility30 = stddev(series30, avgDailyNet7Basis);

  const forecast7 = currentBalance + avgDailyNet7Basis * 7;
  const forecast30 = currentBalance + avgDailyNet30Basis * 30;

  const confidence = clamp(
    1 - Math.min(1, Math.abs(volatility30) / Math.max(1, Math.abs(avgDailyNet7Basis) + 1)),
    0.2,
    0.95
  );

  return {
    currentBalance,
    forecast7,
    forecast30,
    avgDailyNet7Basis,
    avgDailyNet30Basis,
    confidence,
    basedOnDays: {
      short: 30,
      long: 90,
    },
    generatedAt: new Date(now).toISOString(),
  };
}

export function buildForecastPrompt(forecast, currency = "RM") {
  return [
    `Current balance: ${currency} ${Number(forecast.currentBalance || 0).toFixed(2)}`,
    `Projected 7-day balance: ${currency} ${Number(forecast.forecast7 || 0).toFixed(2)}`,
    `Projected 30-day balance: ${currency} ${Number(forecast.forecast30 || 0).toFixed(2)}`,
    `Average daily net cashflow (30d): ${currency} ${Number(forecast.avgDailyNet7Basis || 0).toFixed(2)}`,
    `Average daily net cashflow (90d): ${currency} ${Number(forecast.avgDailyNet30Basis || 0).toFixed(2)}`,
    `Confidence: ${(Number(forecast.confidence || 0) * 100).toFixed(0)}%`,
  ].join(". ");
}

export function getForecastTrend(forecast) {
  const delta30 = Number(forecast.forecast30 || 0) - Number(forecast.currentBalance || 0);
  if (delta30 > 0) return "up";
  if (delta30 < 0) return "down";
  return "flat";
}

export function canUseTransactionsForForecast(transactions = [], now = new Date()) {
  const cutoff = new Date(startOfDay(now));
  cutoff.setDate(cutoff.getDate() - 90);
  return transactions.some((row) => {
    const txn = new Date(row.transactionDate);
    return !Number.isNaN(txn.getTime()) && txn >= cutoff;
  });
}

export function daysSince(dateValue, now = new Date()) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return null;
  return getDayDiff(parsed, now);
}
