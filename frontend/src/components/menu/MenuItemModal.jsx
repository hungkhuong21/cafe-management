import React, { useState, useRef, useEffect } from "react";
import { X, Utensils, Camera } from "lucide-react";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";
import { compressImage } from "../../utils/imageCompressor";

export default function MenuItemModal({
  isOpen,
  onClose,
  categories,
  onMenuItemCreated,
  itemToEdit = null,
}) {
  // 1. Thông tin cơ bản
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // 2. Hình ảnh món
  const [imageUrl, setImageUrl] = useState("");
  const [imagePreview, setImagePreview] = useState("");

  // 3. Giá & Khuyến mãi
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");

  // 4. Mô tả món
  const [description, setDescription] = useState("");

  // 5. Trạng thái & Hiển thị
  const [status, setStatus] = useState("available"); // 'available' | 'soldout' | 'hidden'
  const [showOnQr, setShowOnQr] = useState(true);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (itemToEdit) {
      setName(itemToEdit.name || "");
      setCategoryId(itemToEdit.category_id || itemToEdit.category || "");
      setPrice(itemToEdit.price !== undefined ? String(itemToEdit.price) : "");
      setPromoPrice(itemToEdit.promo_price ? String(itemToEdit.promo_price) : "");
      setDescription(itemToEdit.description || "");
      setStatus(itemToEdit.status || "available");
      setShowOnQr(itemToEdit.show_on_qr !== false);
      const img = itemToEdit.image_url || itemToEdit.image || "";
      setImageUrl(img);
      setImagePreview(getImageUrl(img) || img);
      setError("");
    } else {
      setName("");
      setCategoryId("");
      setPrice("");
      setPromoPrice("");
      setDescription("");
      setStatus("available");
      setShowOnQr(true);
      setImageUrl("");
      setImagePreview("");
      setError("");
    }
  }, [itemToEdit, isOpen]);

  if (!isOpen) return null;

  // Xử lý chọn ảnh từ máy tính (nén chuẩn sắc nét, lưu vĩnh viễn vào CSDL)
  const handleImageFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      setError("");

      // 1. Nén ảnh sang Base64 chuẩn WebP/JPEG, kích thước 800px (~40-70KB)
      // Lưu thẳng vào CSDL PostgreSQL để ảnh không bao giờ bị mất khi Render redeploy
      const compressedB64 = await compressImage(file, 800, 0.82);
      setImagePreview(compressedB64);
      setImageUrl(compressedB64);

      // 2. Dự phòng upload thêm lên server
      const formData = new FormData();
      formData.append("image", file);
      api.post("/menu-items/upload-image", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).catch(() => {});
    } catch (err) {
      console.warn("Lỗi nén ảnh, dùng FileReader gốc:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImagePreview(ev.target.result);
        setImageUrl(ev.target.result);
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên món!");
      return;
    }
    if (!categoryId) {
      setError("Vui lòng chọn danh mục cho món!");
      return;
    }
    if (!price || Number(price) <= 0) {
      setError("Vui lòng nhập giá bán hợp lệ!");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        category_id: Number(categoryId) || categoryId,
        description: description !== undefined ? description.trim() : null,
        price: Number(price),
        promo_price: promoPrice ? Number(promoPrice) : null,
        image_url: imageUrl || imagePreview || null,
        status,
        show_on_qr: showOnQr,
      };

      if (itemToEdit) {
        await api.put(`/menu-items/${itemToEdit.id}`, payload);
      } else {
        await api.post("/menu-items", payload);
      }

      if (onMenuItemCreated) onMenuItemCreated();
      onClose();
    } catch (err) {
      console.warn("Lỗi lưu món:", err);
      const msg = err.response?.data?.message || err.message || "Lỗi khi lưu món!";
      setError(Array.isArray(msg) ? msg[0] : msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {itemToEdit ? "Chỉnh sửa món" : "Thêm món mới"}
              </h3>
              <p className="text-[11px] text-stone-500">
                {itemToEdit
                  ? "Cập nhật thông tin món, giá bán và hình ảnh"
                  : "Điền đầy đủ thông tin để thêm món vào thực đơn quán"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-xs px-6 py-2.5 font-medium border-b border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* PHẦN 1: TÊN MÓN & DANH MỤC */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Tên món <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Cà phê muối, Trà đào cam sả..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Thuộc danh mục <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white text-stone-800"
                required
              >
                <option value="">-- Chọn danh mục --</option>
                {categories
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* PHẦN 2: HÌNH ẢNH MÓN */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Hình ảnh món
            </label>
            <div className="flex items-center gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-24 h-24 rounded-2xl border-2 border-dashed border-stone-300 hover:border-orange-500 cursor-pointer flex flex-col items-center justify-center bg-stone-50 overflow-hidden relative group shrink-0 transition shadow-2xs"
              >
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-white text-[10px] font-bold">
                      Đổi ảnh
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-5 h-5 text-stone-400 group-hover:text-orange-500 mb-1" />
                    <span className="text-[10px] text-stone-500 font-medium text-center px-1">
                      {uploadingImage ? "Đang tải..." : "Tải ảnh lên"}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-stone-500 space-y-1">
                <p className="font-medium text-stone-700">Định dạng hỗ trợ: JPG, PNG, WebP</p>
                <p>Khuyên dùng ảnh vuông tỉ lệ 1:1, dung lượng dưới 5MB để hiển thị rõ nét trên Menu QR.</p>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* PHẦN 3: GIÁ BÁN & GIÁ KHUYẾN MÃI */}
          <div className="pt-2 border-t border-stone-100 grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Giá bán (VNĐ) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="Ví dụ: 45000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Giá khuyến mãi (nếu có)
              </label>
              <input
                type="number"
                placeholder="Ví dụ: 39000"
                value={promoPrice}
                onChange={(e) => setPromoPrice(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
              />
            </div>
          </div>

          {/* PHẦN 4: MÔ TẢ MÓN */}
          <div className="pt-2 border-t border-stone-100">
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mô tả món
            </label>
            <textarea
              rows={2}
              placeholder="Nguyên liệu, hương vị đặc trưng..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-s px-6 py-3.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400"
            />
          </div>

          {/* PHẦN 5: TRẠNG THÁI & HIỂN THỊ */}
          <div className="pt-2 border-t border-stone-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Trạng thái bán
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white font-medium"
                >
                  <option value="available">🟢 Đang bán (Available)</option>
                  <option value="soldout">🔴 Hết hàng (Sold out)</option>
                  <option value="hidden">⚪ Tạm ẩn (Hidden)</option>
                </select>
              </div>

              <div className="pt-2 sm:pt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnQr}
                    onChange={(e) => setShowOnQr(e.target.checked)}
                    className="rounded border-stone-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-stone-800 block">Hiển thị trên Menu QR</span>
                    <span className="text-[10px] text-stone-500">Khách quét mã sẽ thấy món này</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="pt-4 border-t border-stone-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-xl border border-stone-200 text-xs font-bold text-stone-600 hover:bg-stone-50 transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300"
            >
              {submitting
                ? "Đang lưu..."
                : itemToEdit
                ? "Cập nhật món"
                : "Thêm món vào thực đơn"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
