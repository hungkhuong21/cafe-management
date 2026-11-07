export function formatCurrency(amount) {
  return `${amount.toLocaleString("vi-VN")}đ`;
}

export function formatMillion(amount) {
  const value = (amount / 1_000_000).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value} tr`;
}