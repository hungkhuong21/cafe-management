import React, { useState } from "react";
import { X, Armchair, QrCode } from "lucide-react";
import api from "../../services/api";

export default function AddTableModal({ isOpen, onClose, zones = [], onTableCreated }) {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [seats, setSeats] = useState("4");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active"); // 'active' (Hoạt động) | 'maintenance' (Bảo trì)
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên bàn!");
      return;
    }
    if (!zoneId) {
      setError("Vui lòng chọn khu vực!");
      return;
    }
    if (!seats || Number(seats) <= 0) {
      setError("Vui lòng nhập sức chứa hợp lệ!");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await api.post("/tables", {
        name: name.trim(),
        zone_id: Number(zoneId) || 1,
        seats: Number(seats) || 4,
        description: description.trim() || undefined,
        status: status === "maintenance" ? "cleaning" : "free",
      });

      // Reset form
      setName("");
      setZoneId("");
      setSeats("4");
      setDescription("");
      setStatus("active");

      if (onTableCreated) onTableCreated();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Không thể thêm bàn mới. Vui lòng thử lại!");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-100 overflow-hidden animate-in zoom-in-95 my-6">
        
        {/* Header Modal - Cùng tone màu sáng ấm với trang trước */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">Thêm bàn mới</h3>
              <p className="text-[11px] text-stone-500">Thiết lập số bàn, khu vực và tạo mã QR phục vụ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-stone-400 hover:bg-stone-200/70 hover:text-stone-700 transition"
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
          {/* Tên bàn * */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Tên bàn <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Ví dụ: Bàn 01"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400 transition"
              required
            />
          </div>

          {/* Khu vực * */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Khu vực <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={zoneId}
                onChange={(e) => setZoneId(e.target.value)}
                className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 bg-white text-stone-800 appearance-none cursor-pointer"
                required
              >
                <option value="" className="text-stone-400">
                  Chọn khu vực
                </option>
                {zones.map((z, idx) => (
                  <option
                    key={typeof z === "object" ? z.id : idx}
                    value={typeof z === "object" ? z.id : idx + 1}
                  >
                    {typeof z === "object" ? z.name : z}
                  </option>
                ))}
              </select>
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400 text-xs">
                ▼
              </div>
            </div>
          </div>

          {/* Sức chứa * */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sức chứa <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="Ví dụ: 4"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
              required
            />
            <p className="text-[11px] text-stone-400 mt-1 font-medium">
              Số lượng khách tối đa của bàn
            </p>
          </div>

          {/* Mô tả */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Mô tả
            </label>
            <textarea
              rows={2}
              placeholder="Ví dụ: Bàn gần cửa sổ, có ổ cắm điện..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800 placeholder-stone-400"
            />
          </div>

          {/* Trạng thái */}
          <div className="pt-1">
            <label className="block text-xs font-semibold text-stone-700 mb-2">
              Trạng thái
            </label>
            <div className="flex items-center gap-6 text-xs text-stone-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="table_status"
                  value="active"
                  checked={status === "active"}
                  onChange={() => setStatus("active")}
                  className="accent-orange-600 h-4 w-4"
                />
                <span className="font-medium">Hoạt động</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="table_status"
                  value="maintenance"
                  checked={status === "maintenance"}
                  onChange={() => setStatus("maintenance")}
                  className="accent-orange-600 h-4 w-4"
                />
                <span className="font-medium">Bảo trì</span>
              </label>
            </div>
          </div>

          {/* Box Tạo mã QR tự động (Tone sáng kem ấm cùng màu với toàn bộ app) */}
          <div className="bg-[#FAF8F5] border border-orange-100 rounded-2xl p-3.5 flex items-center justify-between mt-2">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-orange-100/70 flex items-center justify-center text-orange-600">
                <QrCode className="w-4 h-4" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-stone-900">Tạo mã QR tự động</h5>
                <p className="text-[11px] text-stone-500">
                  Hệ thống tự tạo mã QR riêng sau khi lưu bàn
                </p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-[11px] font-bold">
              Tự động
            </span>
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
              {submitting ? "Đang lưu..." : "Lưu bàn mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
