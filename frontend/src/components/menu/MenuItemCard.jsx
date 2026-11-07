import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Switch from "../common/Switch";
import { formatCurrency } from "../../utils/formatCurrency";
import { getImageUrl } from "../../utils/imageUrl";

const MENU_STATUS = {
  available: { label: "Đang bán", pill: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
  soldout: { label: "Tạm hết", pill: "bg-red-50 text-red-500", dot: "bg-red-500" },
  hidden: { label: "Ẩn khỏi menu", pill: "bg-stone-100 text-stone-600", dot: "bg-stone-400" },
};

export default function MenuItemCard({
  item,
  categoryName,
  onToggle,
  onEdit,
  onDelete,
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  const status = MENU_STATUS[item.status] || MENU_STATUS.available;
  const isOn = item.status === "available";
  const displayImage = getImageUrl(item.image_url || item.image);

  // Reset imgError khi ảnh thay đổi
  useEffect(() => {
    setImgError(false);
  }, [item.image_url, item.image]);

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
    <div className="relative flex gap-4 rounded-2xl bg-white p-3 shadow-sm border border-stone-100 hover:shadow-md transition">
      {/* Ảnh món */}
      {displayImage && !imgError ? (
        <img
          src={displayImage}
          alt={item.name}
          onError={() => setImgError(true)}
          className="h-24 w-24 shrink-0 rounded-xl object-cover bg-stone-50 border border-stone-100"
        />
      ) : (
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-3xl">
          {item.emoji || "☕"}
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] font-bold tracking-wider text-brand uppercase truncate">
            {categoryName}
          </span>

          {/* Menu 3 chấm */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              aria-label="Tùy chọn món"
              title="Tùy chọn"
              className={`flex h-6 w-6 items-center justify-center rounded-lg transition ${
                showMenu
                  ? "bg-stone-200 text-stone-800"
                  : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              }`}
            >
              <MoreHorizontal size={15} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-1 z-30 w-36 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    setShowMenu(false);
                    if (onEdit) onEdit(item);
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
                    if (onDelete) onDelete(item);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                >
                  <Trash2 size={13} className="text-red-500" />
                  <span>Xóa món</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <h3 className="mt-0.5 truncate font-bold text-stone-900 text-sm">{item.name}</h3>
        <p className="text-sm font-bold text-stone-900 mt-0.5">
          {formatCurrency(item.price)}
        </p>

        <div className="mt-auto flex items-center justify-between pt-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${status.pill}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
            {status.label}
          </span>
          <Switch
            checked={isOn}
            onChange={() => onToggle && onToggle()}
            label={`Bật/tắt bán ${item.name}`}
          />
        </div>
      </div>
    </div>
  );
}
