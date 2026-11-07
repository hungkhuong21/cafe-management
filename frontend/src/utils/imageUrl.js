/**
 * Chuẩn hóa URL ảnh để hiển thị chính xác trên cả máy tính lẫn điện thoại
 * Nếu là ảnh upload trên backend (/uploads/...) -> thêm prefix http://<host>:5000
 */
export function getImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Nếu là link tuyệt đối (http, https, blob, base64 data)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("blob:") ||
    trimmed.startsWith("data:")
  ) {
    return trimmed;
  }

  // Tự động tải ảnh upload từ Backend Render
  const rawApi =
    import.meta.env.VITE_API_URL ||
    "https://cafe-management-api-un5y.onrender.com/api";
  const hostBase = rawApi.replace(/\/api\/?$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${hostBase}${cleanPath}`;
}
