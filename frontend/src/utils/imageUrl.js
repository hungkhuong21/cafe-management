/**
 * Chuẩn hóa URL ảnh để hiển thị chính xác trên cả máy tính lẫn điện thoại
 * Nếu là ảnh upload trên backend (/uploads/...) -> thêm prefix http://<host>:5000
 */
export function getImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // 1. Nếu là data URI (Base64), blob URL, hoặc inline SVG -> trả về ngay lập tức
  if (
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // 2. Nếu là link online tuyệt đối bên ngoài (Unsplash, Cloudinary, Imgur, CDN...)
  if (
    (trimmed.startsWith("http://") || trimmed.startsWith("https://")) &&
    !trimmed.includes("localhost") &&
    !trimmed.includes("127.0.0.1") &&
    !trimmed.includes("onrender.com/uploads")
  ) {
    return trimmed;
  }

  // 3. Nếu là file upload (/uploads/...) hoặc link localhost cũ
  if (trimmed.includes("/uploads/")) {
    trimmed = trimmed.substring(trimmed.indexOf("/uploads/"));
  }

  // Tự động tải ảnh upload từ Backend Render
  const rawApi =
    import.meta.env.VITE_API_URL ||
    "https://cafe-management-api-un5y.onrender.com/api";
  const hostBase = rawApi.replace(/\/api\/?$/, "");
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;

  return `${hostBase}${cleanPath}`;
}
