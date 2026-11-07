import React, { useState, useRef, useEffect } from "react";
import { Armchair, MoreHorizontal, QrCode, Pencil, Trash2, CheckCircle, Sparkles, Users } from "lucide-react";

const TABLE_STATUS = {
  free: {
    label: "Trống",
    pill: "bg-emerald-50 text-emerald-600",
    dot: "bg-emerald-500",
    icon: "bg-emerald-50 text-emerald-500",
  },
  occupied: {
    label: "Đang dùng",
    pill: "bg-orange-50 text-brand",
    dot: "bg-brand",
    icon: "bg-orange-50 text-brand",
  },
  cleaning: {
    label: "Chờ dọn",
    pill: "bg-amber-50 text-amber-600",
    dot: "bg-amber-500",
    icon: "bg-amber-50 text-amber-500",
  },
  reserved: {
    label: "Đã đặt",
    pill: "bg-blue-50 text-blue-600",
    dot: "bg-blue-500",
    icon: "bg-blue-50 text-blue-500",
  },
};

export default function TableCard({ table, onShowQr, onEdit, onDelete, onStatusChange }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Fallback status nếu giá trị status chưa có trong config
  const status = TABLE_STATUS[table.status] || TABLE_STATUS.free || {
    label: "Trống",
    dot: "bg-emerald-500",
    pill: "bg-emerald-50 text-emerald-700",
    icon: "bg-emerald-50 text-emerald-600",
  };

  // Đóng dropdown khi bấm ra ngoài
  useEffect(() => {
    if (!showMenu) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showMenu]);

  return (
    <div className="relative rounded-2xl bg-white p-4 shadow-sm border border-stone-100 hover:shadow-md transition">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${status.icon}`}
        >
          <Armchair size={18} />
        </div>

        {/* Nút 3 chấm mở menu chức năng */}
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowMenu((prev) => !prev)}
            aria-label="Tùy chọn bàn"
            title="Tùy chọn bàn"
            className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
              showMenu
                ? "bg-stone-200 text-stone-800"
                : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            }`}
          >
            <MoreHorizontal size={16} />
          </button>

          {/* Popup menu: Thao tác nhanh trạng thái bàn + Chỉnh sửa hoặc Xóa */}
          {showMenu && (
            <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95">
              {table.status === "occupied" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onStatusChange) onStatusChange(table.id, "free");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <CheckCircle size={13} className="text-emerald-600" />
                    <span>Trả bàn (Trống)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onStatusChange) onStatusChange(table.id, "cleaning");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition"
                  >
                    <Sparkles size={13} className="text-amber-600" />
                    <span>Chờ dọn bàn</span>
                  </button>
                  <div className="my-1 border-t border-stone-100" />
                </>
              )}

              {table.status === "cleaning" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onStatusChange) onStatusChange(table.id, "free");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition"
                  >
                    <CheckCircle size={13} className="text-emerald-600" />
                    <span>Đã dọn xong (Trống)</span>
                  </button>
                  <div className="my-1 border-t border-stone-100" />
                </>
              )}

              {table.status === "free" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      if (onStatusChange) onStatusChange(table.id, "occupied");
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-50 transition"
                  >
                    <Users size={13} className="text-brand" />
                    <span>Khách vào (Đang dùng)</span>
                  </button>
                  <div className="my-1 border-t border-stone-100" />
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (onEdit) onEdit(table);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <Pencil size={13} className="text-stone-400 group-hover:text-orange-600" />
                <span>Chỉnh sửa</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowMenu(false);
                  if (onDelete) onDelete(table);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
              >
                <Trash2 size={13} className="text-red-500" />
                <span>Xóa bàn</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <h3 className="mt-3 font-bold text-stone-900">{table.name}</h3>
      <p className="text-xs text-stone-500">
        {table.zone_name || table.zone} • {table.seats || 4} ghế
      </p>

      <div className="mt-4 flex items-center justify-between">
        <span
          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.pill}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <button
          type="button"
          onClick={() => onShowQr(table)}
          aria-label={`Xem mã QR ${table.name}`}
          title="Xem mã QR đặt món"
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-stone-100 text-stone-500 transition-colors hover:bg-orange-50 hover:text-brand"
        >
          <QrCode size={15} />
        </button>
      </div>
    </div>
  );
}
