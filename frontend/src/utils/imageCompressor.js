/**
 * Nén ảnh tự động ngay trên trình duyệt trước khi lưu vào CSDL
 * Giúp ảnh luôn sắc nét, dung lượng siêu nhẹ (~40KB - 80KB),
 * lưu vĩnh viễn dạng Base64 vào CSDL mà không bị mất khi Render redeploy.
 */
export function compressImage(file, maxWidth = 800, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file) return reject(new Error("Không có file"));

    // Nếu không phải file ảnh
    if (!file.type || !file.type.startsWith("image/")) {
      return reject(new Error("File không đúng định dạng ảnh"));
    }

    const reader = new FileReader();
    reader.onerror = (err) => reject(err);

    reader.onload = (event) => {
      const img = new Image();
      img.onerror = (err) => reject(err);

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          let { width, height } = img;

          // Giữ nguyên tỉ lệ khung hình và giới hạn cạnh tối đa
          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxWidth) / height);
              height = maxWidth;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            return resolve(event.target.result); // Fallback về gốc nếu canvas lỗi
          }

          // Vẽ ảnh lên canvas
          ctx.drawImage(img, 0, 0, width, height);

          // Thử xuất ra WebP (chất lượng cao, dung lượng nhẹ nhất)
          try {
            const webpData = canvas.toDataURL("image/webp", quality);
            if (webpData && webpData.startsWith("data:image/webp")) {
              return resolve(webpData);
            }
          } catch (_) {}

          // Xuất JPEG làm phương án dự phòng chuẩn mọi trình duyệt
          const jpegData = canvas.toDataURL("image/jpeg", quality);
          resolve(jpegData);
        } catch (e) {
          // Nếu có lỗi canvas, fallback về chuỗi base64 gốc
          resolve(event.target.result);
        }
      };

      img.src = event.target.result;
    };

    reader.readAsDataURL(file);
  });
}

