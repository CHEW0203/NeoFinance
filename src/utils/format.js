export function formatCurrency(amount, currency = "RM") {
  return `${currency} ${Number(amount).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatTransactionAmount(type, amount) {
  const symbol = type === "income" ? "+" : "-";
  return `${symbol} ${formatCurrency(amount)}`;
}

export function formatDate(dateValue) {
  return new Date(dateValue).toLocaleDateString();
}
