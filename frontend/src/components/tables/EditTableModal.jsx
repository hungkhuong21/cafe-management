import React, { useState, useEffect } from "react";
import { X, Armchair, Check } from "lucide-react";
import api from "../../services/api";

export default function EditTableModal({
  isOpen,
  onClose,
  table,
  zones = [],
  onTableUpdated,
}) {
  const [name, setName] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [seats, setSeats] = useState("4");
  const [status, setStatus] = useState("free");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && table) {
      setName(table.name || `Bàn ${String(table.number || "").padStart(2, "0")}`);
      // Tìm zoneId
      const currentZoneName = table.zone_name || table.zone;
      const matchedZone = zones.find(
        (z) => (typeof z === "object" ? z.name : z) === currentZoneName
      );
      if (matchedZone) {
        setZoneId(typeof matchedZone === "object" ? String(matchedZone.id) : String(matchedZone));
      } else if (table.zone_id) {
        setZoneId(String(table.zone_id));
      } else if (zones.length > 0) {
        const firstZ = zones[0];
        setZoneId(typeof firstZ === "object" ? String(firstZ.id) : String(firstZ));
      } else {
        setZoneId("");
      }
      setSeats(String(table.seats || 4));
      setStatus(table.status || "free");
      setError("");
    }
  }, [isOpen, table?.id]);

  if (!isOpen || !table) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vui lòng nhập tên bàn!");
      return;
    }
    const seatNum = parseInt(seats, 10);
    if (isNaN(seatNum) || seatNum <= 0) {
      setError("Vui lòng nhập sức chứa (số ghế) hợp lệ lớn hơn 0!");
      return;
    }

    setSubmitting(true);
    setError("");

    // Trích xuất số bàn nếu có (ví dụ "Bàn 08" -> 8), hoặc giữ nguyên số bàn cũ
    const match = name.match(/\d+/);
    const tableNumber = match ? parseInt(match[0], 10) : table.number;

    try {
      const payload = {
        name: name.trim(),
        number: tableNumber || table.number,
        seats: seatNum,
        status: status,
      };

      if (zoneId) {
        payload.zone_id = Number(zoneId);
      }

      const res = await api.put(`/tables/${table.id}`, payload);

      if (onTableUpdated) {
        const updatedData = res.data || {
          ...table,
          name: name.trim(),
          number: tableNumber || table.number,
          seats: seatNum,
          status: status,
          zone_id: zoneId ? Number(zoneId) : table.zone_id,
        };
        onTableUpdated(updatedData);
      }
      onClose();
    } catch (err) {
      console.error("Lỗi cập nhật bàn:", err);
      const data = err.response?.data;
      const errorMsg =
        (typeof data?.error === "object" ? data.error?.message : data?.error) ||
        data?.message ||
        err.message ||
        "Không thể cập nhật bàn. Vui lòng thử lại!";
      setError(Array.isArray(errorMsg) ? errorMsg[0] : errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-stone-100 overflow-hidden animate-in zoom-in-95 my-6">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-stone-100 px-6 py-4 bg-stone-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Armchair className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-base leading-tight">
                Chỉnh sửa thông tin bàn
              </h3>
              <p className="text-[11px] text-stone-500">
                Cập nhật tên, khu vực, sức chứa và trạng thái hoạt động
              </p>
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
          {/* Tên bàn */}
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

          {/* Khu vực */}
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

          {/* Sức chứa */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Sức chứa (số khách tối đa) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max="20"
              placeholder="Ví dụ: 4"
              value={seats}
              onChange={(e) => setSeats(e.target.value)}
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
              required
            />
          </div>

          {/* Trạng thái bàn */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Trạng thái phục vụ
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { value: "free", label: "Trống (Sẵn sàng)", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { value: "occupied", label: "Đang có khách", color: "text-orange-700 bg-orange-50 border-orange-200" },
                { value: "cleaning", label: "Đang dọn bàn", color: "text-amber-700 bg-amber-50 border-amber-200" },
                { value: "reserved", label: "Đã đặt trước", color: "text-blue-700 bg-blue-50 border-blue-200" },
              ].map((st) => (
                <label
                  key={st.value}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                    status === st.value
                      ? `${st.color} font-bold ring-1 ring-stone-300`
                      : "bg-white border-stone-200 text-stone-600 hover:bg-stone-50"
                  }`}
                >
                  <input
                    type="radio"
                    name="edit_table_status"
                    value={st.value}
                    checked={status === st.value}
                    onChange={() => setStatus(st.value)}
                    className="accent-orange-600 h-3.5 w-3.5"
                  />
                  <span>{st.label}</span>
                </label>
              ))}
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
              className="flex-1 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition shadow-md disabled:bg-stone-300 flex items-center justify-center gap-1.5"
            >
              <Check size={15} />
              {submitting ? "Đang lưu..." : "Cập nhật thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

