/**
 * Chuẩn hóa URL ảnh để hiển thị chính xác trên cả máy tính lẫn điện thoại
 * Nếu là ảnh upload trên backend (/uploads/...) -> thêm prefix http://<host>:5000
 */
export function getImageUrl(url) {
  if (!url || typeof url !== "string") return null;
  let trimmed = url.trim();
  if (!trimmed) return null;

  // Nếu URL cũ có chứa localhost hoặc IP LAN (ví dụ: http://localhost:5000/uploads/...)
  // -> chuẩn hóa về dạng tương đối /uploads/... để luôn trỏ đúng về Render
  if (trimmed.includes("/uploads/")) {
    trimmed = trimmed.substring(trimmed.indexOf("/uploads/"));
  }

  // Nếu là link ảnh online tuyệt đối bên ngoài (Cloudinary, Unsplash, blob, base64...)
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
