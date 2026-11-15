import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, Pencil, Trash2, Flame } from "lucide-react";
import Switch from "../common/Switch";
import { formatCurrency } from "../../utils/formatCurrency";
import { getImageUrl } from "../../utils/imageUrl";

const MENU_STATUS = {
  available: { label: "Đang bán", pill: "bg-emerald-50 text-emerald-600 border border-emerald-200/60", dot: "bg-emerald-500" },
  soldout: { label: "Tạm hết", pill: "bg-red-50 text-red-500 border border-red-200/60", dot: "bg-red-500" },
  hidden: { label: "Ẩn khỏi menu", pill: "bg-stone-100 text-stone-600 border border-stone-200/60", dot: "bg-stone-400" },
};

export default function MenuItemCard({
  item,
  categoryName,
  onToggle,
  onEdit,
  onDelete,
  onToggleBestSeller,
  viewMode = "grid", // 'grid' | 'list'
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);

  const status = MENU_STATUS[item.status] || MENU_STATUS.available;
  const isOn = item.status === "available";
  const displayImage = getImageUrl(item.image_url || item.image);

  // Tính toán giá khuyến mãi & phần trăm giảm giá
  const originalPrice = Number(item.price) || 0;
  const promoPrice = item.promo_price ? Number(item.promo_price) : null;
  const hasDiscount = promoPrice !== null && promoPrice > 0 && promoPrice < originalPrice;
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - promoPrice) / originalPrice) * 100)
    : 0;
  const finalPrice = hasDiscount ? promoPrice : originalPrice;

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

  // =========================================================================
  // VIEW MODE: LIST (Dạng danh sách hàng ngang gọn gàng)
  // =========================================================================
  if (viewMode === "list") {
    return (
      <div className="group flex items-center justify-between gap-3.5 rounded-2xl bg-white p-3 border border-stone-200/80 shadow-xs hover:border-orange-300 hover:shadow-md transition-all">
        {/* Ảnh nhỏ linh hoạt */}
        <div className="relative h-14 w-14 sm:h-16 sm:w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 border border-stone-200/60">
          {displayImage && !imgError ? (
            <img
              src={displayImage}
              alt={item.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover object-center"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xl select-none text-stone-400">
              {item.emoji || "☕"}
            </div>
          )}
          {hasDiscount && (
            <span className="absolute top-1 left-1 rounded bg-red-600 px-1 py-0.2 text-[8px] font-black text-white">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Thông tin chính */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-extrabold text-stone-900 text-sm truncate" title={item.name}>
              {item.name}
            </h3>
            <span className="rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 border border-orange-200/50 shrink-0">
              {categoryName || item.categoryName || "Thực đơn"}
            </span>
            {item.is_best_seller && (
              <button
                type="button"
                onClick={() => onToggleBestSeller && onToggleBestSeller(item)}
                className="rounded-md bg-gradient-to-r from-amber-500 to-[#D95D39] px-1.5 py-0.5 text-[8.5px] font-black text-white flex items-center gap-0.5 shrink-0 shadow-2xs hover:opacity-90 transition"
                title="Bấm để bật/tắt Best Seller"
              >
                <Flame size={10} className="fill-amber-200 text-amber-200" />
                Best Seller
              </button>
            )}
          </div>
          {item.description && (
            <p className="text-[11px] text-stone-400 truncate mt-0.5">{item.description}</p>
          )}
        </div>

        {/* Giá tiền */}
        <div className="text-right shrink-0">
          <p className="text-sm font-black text-[#E06D44] tracking-tight">
            {formatCurrency(finalPrice)}
          </p>
          {hasDiscount && (
            <p className="text-[11px] text-stone-400 line-through">
              {formatCurrency(originalPrice)}
            </p>
          )}
        </div>

        {/* Trạng thái & Toggle */}
        <div className="flex items-center gap-3 shrink-0">
          <span
            className={`hidden sm:flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${status.pill}`}
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

        {/* Cụm nút thao tác */}
        <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
          <button
            type="button"
            onClick={() => onEdit && onEdit(item)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-orange-50 hover:text-orange-600 transition"
            title="Chỉnh sửa món"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete && onDelete(item)}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 transition"
            title="Xóa món"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW MODE: GRID (Dạng Card Dọc sang trọng, ảnh tự co giãn thích ứng mọi màn hình)
  // =========================================================================
  return (
    <div className="group relative flex flex-col justify-between rounded-3xl bg-white p-3 sm:p-3.5 border border-stone-200/80 shadow-xs hover:border-orange-300 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-200">
      <div>
        {/* 1. KHU VỰC ẢNH MÓN: TỈ LỆ VUÔNG 1:1 CHUẨN F&B (HIỂN THỊ TRỌN VẸN 100% ẢNH TẢI LÊN) */}
        <div className="relative w-full aspect-square overflow-hidden rounded-2xl bg-stone-100 border border-stone-200/60 shadow-2xs">
          {displayImage && !imgError ? (
            <img
              src={displayImage}
              alt={item.name}
              onError={() => setImgError(true)}
              className="h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-stone-100 text-4xl select-none text-stone-400">
              {item.emoji || "☕"}
            </div>
          )}

          {/* Badge giảm giá góc trên bên trái */}
          {hasDiscount && (
            <span className="absolute top-2 left-2 rounded-lg bg-red-600 px-2 py-0.5 text-[10px] font-black text-white shadow-sm tracking-wide">
              -{discountPercent}%
            </span>
          )}

          {/* Badge Best Seller góc trên bên phải (bấm để toggle nhanh) */}
          {item.is_best_seller && (
            <button
              type="button"
              onClick={() => onToggleBestSeller && onToggleBestSeller(item)}
              title="Đang là Best Seller (Bấm để gỡ nhãn)"
              className="absolute top-2 right-2 rounded-lg bg-gradient-to-r from-amber-500 via-orange-500 to-[#D95D39] px-2.5 py-0.5 text-[9.5px] font-black text-white shadow-sm flex items-center gap-1 border border-amber-300/40 uppercase tracking-wide hover:scale-105 transition active:scale-95 cursor-pointer"
            >
              <Flame size={11} className="fill-amber-200 text-amber-200" />
              Best Seller
            </button>
          )}

          {/* Lớp phủ khi tạm hết / tạm ẩn */}
          {!isOn && (
            <div className="absolute inset-0 bg-black/45 flex items-center justify-center backdrop-blur-[1px]">
              <span className="text-[11px] font-black tracking-wider text-white bg-stone-900/95 px-3 py-1 rounded-xl uppercase shadow-md">
                {item.status === "hidden" ? "Tạm ẩn" : "Tạm hết"}
              </span>
            </div>
          )}
        </div>

        {/* 2. NỘI DUNG THÔNG TIN MÓN */}
        <div className="mt-3">
          {/* Hàng: Tên danh mục (đầy đủ, không bị co rút) & Cụm nút thao tác */}
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-block truncate max-w-[220px] rounded-lg bg-orange-50 px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-orange-700 border border-orange-200/50">
              {categoryName || item.categoryName || "Thực đơn"}
            </span>

            {/* Cụm nút thao tác Sửa / Menu 3 chấm */}
            <div className="flex items-center gap-1 shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={() => onEdit && onEdit(item)}
                aria-label="Chỉnh sửa món"
                title="Chỉnh sửa món"
                className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-orange-50 hover:text-orange-600 transition"
              >
                <Pencil size={13} />
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowMenu((prev) => !prev)}
                  aria-label="Tùy chọn khác"
                  title="Tùy chọn khác"
                  className={`flex h-7 w-7 items-center justify-center rounded-lg transition ${
                    showMenu
                      ? "bg-stone-200 text-stone-800"
                      : "text-stone-400 hover:bg-stone-100 hover:text-stone-600"
                  }`}
                >
                  <MoreHorizontal size={14} />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        if (onEdit) onEdit(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <Pencil size={13} className="text-stone-400 group-hover:text-orange-600" />
                      <span>Chỉnh sửa món</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        if (onToggleBestSeller) onToggleBestSeller(item);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition"
                    >
                      <Flame size={13} className="text-amber-500 fill-amber-500" />
                      <span>{item.is_best_seller ? "Bỏ nhãn Best Seller" : "Đặt làm Best Seller"}</span>
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
                      <span>Xóa món này</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tên món hiển thị lớn, rõ ràng */}
          <h3
            className="mt-1.5 font-extrabold text-stone-900 text-sm sm:text-base leading-snug line-clamp-1 group-hover:text-orange-950 transition-colors"
            title={item.name}
          >
            {item.name}
          </h3>

          {/* Mô tả món nếu có */}
          {item.description ? (
            <p className="mt-0.5 text-xs text-stone-400 line-clamp-1 leading-tight">
              {item.description}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-stone-300 italic line-clamp-1">
              Hương vị thơm ngon, chuẩn vị
            </p>
          )}

          {/* Giá tiền & Giảm giá */}
          <div className="mt-2.5 flex items-baseline gap-2 flex-wrap">
            <span className="text-base sm:text-lg font-black text-[#E06D44] tracking-tight">
              {formatCurrency(finalPrice)}
            </span>
            {hasDiscount && (
              <>
                <span className="text-xs text-stone-400 line-through font-medium">
                  {formatCurrency(originalPrice)}
                </span>
                <span className="rounded-md bg-red-50 border border-red-200/60 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600 leading-none">
                  -{discountPercent}%
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 3. CHÂN CARD: TRẠNG THÁI & CÔNG TẮC BẬT/TẮT BÁN */}
      <div className="mt-3 flex items-center justify-between border-t border-stone-100/90 pt-2.5">
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
  );
}
