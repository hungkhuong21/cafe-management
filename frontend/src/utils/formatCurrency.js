export function formatCurrency(amount) {
  const num = Number(amount) || 0;
  return `${num.toLocaleString("vi-VN")} đ`;
}

export function formatMillion(amount) {
  const num = Number(amount) || 0;
  const value = (num / 1_000_000).toLocaleString("vi-VN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${value} tr`;
}