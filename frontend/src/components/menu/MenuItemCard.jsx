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
    <div className="group relative flex gap-3.5 rounded-3xl bg-white p-3.5 border border-stone-200/80 shadow-xs hover:border-orange-300 hover:shadow-lg hover:shadow-orange-500/5 transition-all duration-200">
      {/* Ảnh món bo góc lớn, zoom nhẹ khi hover */}
      {displayImage && !imgError ? (
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/60 shadow-2xs">
          <img
            src={displayImage}
            alt={item.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-108"
          />
        </div>
      ) : (
        <div className="flex h-28 w-28 shrink-0 items-center justify-center rounded-2xl bg-stone-100/90 border border-stone-200/60 text-3xl select-none text-stone-400 group-hover:scale-105 transition-transform duration-300">
          {item.emoji || "☕"}
        </div>
      )}

      {/* Thông tin món */}
      <div className="flex min-w-0 flex-1 flex-col justify-between py-0.5">
        <div>
          {/* Hàng 1: Badge danh mục & Cụm nút thao tác */}
          <div className="flex items-center justify-between gap-1">
            <span className="inline-block max-w-[130px] truncate rounded-lg bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 border border-orange-200/50">
              {categoryName || item.categoryName || "Thực đơn"}
            </span>

            <div className="flex items-center gap-1" ref={menuRef}>
              {/* Nút sửa nhanh 1-click */}
              <button
                type="button"
                onClick={() => onEdit && onEdit(item)}
                aria-label="Chỉnh sửa món"
                title="Chỉnh sửa món"
                className="flex h-6 w-6 items-center justify-center rounded-lg text-stone-400 hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <Pencil size={13} />
              </button>

              {/* Nút tùy chọn 3 chấm */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="Tùy chọn khác"
                  title="Tùy chọn khác"
                  className={`flex h-6 w-6 items-center justify-center rounded-lg transition ${
                    showMenu
                      ? "bg-stone-200 text-stone-800"
                      : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  }`}
                >
                  <MoreHorizontal size={14} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-36 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95">
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
          </div>

          {/* Tên món */}
          <h3
            className="mt-1 line-clamp-2 font-extrabold text-stone-900 text-sm leading-snug break-words group-hover:text-orange-950 transition-colors"
            title={item.name}
          >
            {item.name}
          </h3>

          {/* Giá tiền */}
          <p className="text-sm sm:text-base font-black text-[#E06D44] mt-0.5 tracking-tight">
            {formatCurrency(item.price)}
          </p>
        </div>

        {/* Chân card: Trạng thái & Công tắc bật/tắt bán */}
        <div className="mt-2 flex items-center justify-between border-t border-stone-100/80 pt-2">
          <span
            className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.pill}`}
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
