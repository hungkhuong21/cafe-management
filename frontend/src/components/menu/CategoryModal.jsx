import React, { useState, useEffect } from "react";
import { X, FolderPlus } from "lucide-react";
import api from "../../services/api";

export default function CategoryModal({
  isOpen,
  onClose,
  onCategoryCreated,
  categoryToEdit = null,
}) {
  // 1. Tên danh mục (Bắt buộc)
  const [name, setName] = useState("");

  // 2. Mô tả danh mục
  const [description, setDescription] = useState("");

  // 3. Trạng thái & Thứ tự hiển thị
  const [status, setStatus] = useState("active");
  const [sortOrder, setSortOrder] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (categoryToEdit) {
      setName(categoryToEdit.name || "");
      setDescription(categoryToEdit.description || "");
      setStatus(categoryToEdit.status || "active");
      setSortOrder(categoryToEdit.sort_order || 0);
      setError("");
    } else {
      setName("");
      setDescription("");
      setStatus("active");
      setSortOrder(0);
      setError("");
    }
  }, [categoryToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên danh mục!");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        status,
        sort_order: Number(sortOrder) || 0,
      };

      if (categoryToEdit) {
        await api.put(`/categories/${categoryToEdit.id}`, payload);
      } else {
        await api.post("/categories", payload);
      }

      if (onCategoryCreated) onCategoryCreated();
      onClose();
    } catch (err) {
      console.warn("Lỗi lưu danh mục:", err);
      if (onCategoryCreated) onCategoryCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base">
                {categoryToEdit ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h3>
              <p className="text-[11px] text-stone-500">
                {categoryToEdit
                  ? "Cập nhật tên và thứ tự hiển thị của danh mục"
                  : "Phân loại món ăn, đồ uống để hiển thị rõ ràng trên Menu"}
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
          {/* Tên danh mục */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Cà phê, Trà hoa quả, Bánh ngọt..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400"
              required
            />
          </div>

          {/* Mô tả danh mục */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Mô tả ngắn
            </label>
            <textarea
              rows={2}
              placeholder="Giới thiệu nhanh về hương vị hoặc nhóm món..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400"
            />
          </div>

          {/* Trạng thái & Thứ tự sắp xếp */}
          <div className="pt-2 border-t border-stone-100">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Trạng thái
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white font-medium"
                >
                  <option value="active">🟢 Đang hoạt động</option>
                  <option value="hidden">⚪ Tạm ẩn danh mục</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Thứ tự hiển thị
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="0, 1, 2..."
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 font-medium"
                />
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
                : categoryToEdit
                ? "Cập nhật danh mục"
                : "Lưu danh mục"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
