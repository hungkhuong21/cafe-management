// Dùng địa chỉ trong .env nếu có, không thì dùng địa chỉ đang mở
const BASE_URL = import.meta.env.VITE_PUBLIC_URL || window.location.origin;

export function getTableQrUrl(tableId) {
  return `${BASE_URL}/qr-menu?table=${tableId}`;
}