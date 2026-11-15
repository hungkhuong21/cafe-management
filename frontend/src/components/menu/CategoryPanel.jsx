import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Sparkles,
  Coffee,
  CupSoda,
  Cake,
  Zap,
  Tag,
  Wine,
  Flame,
} from "lucide-react";

// Helper gán icon trực quan tương ứng với tên danh mục
const getCategoryIcon = (name) => {
  if (!name) return Tag;
  const lower = name.toLowerCase();
  if (lower.includes("tất cả")) return Sparkles;
  if (lower.includes("best seller") || lower.includes("bán chạy")) return Flame;
  if (lower.includes("cà phê") || lower.includes("cafe")) return Coffee;
  if (lower.includes("trà")) return CupSoda;
  if (lower.includes("sinh tố") || lower.includes("nước ép")) return Wine;
  if (lower.includes("đá xay")) return Zap;
  if (lower.includes("bánh") || lower.includes("ăn nhẹ") || lower.includes("snack")) return Cake;
  return Tag;
};

export default function CategoryPanel({
  categories,
  selectedId,
  onSelect,
  onOpenAddCategory,
  onEditCategory,
  onDeleteCategory,
}) {
  const [activeMenuCatId, setActiveMenuCatId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!activeMenuCatId) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setActiveMenuCatId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeMenuCatId]);

  const catCount = Math.max(0, categories.length - 1);

  return (
    <aside className="flex flex-col rounded-3xl bg-white p-4 shadow-sm lg:w-64 lg:shrink-0 border border-stone-200/70 self-start sticky top-4">
      {/* Header Danh mục */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-1.5">
          <h2 className="font-extrabold text-stone-900 text-sm">Danh mục</h2>
          <span className="text-xs font-bold text-stone-400">({catCount})</span>
        </div>
        <button
          type="button"
          onClick={onOpenAddCategory}
          aria-label="Thêm danh mục"
          className="flex h-7 w-7 items-center justify-center rounded-xl bg-orange-50 text-[#E06D44] hover:bg-[#E06D44] hover:text-white transition shadow-2xs"
          title="Thêm danh mục mới"
        >
          <Plus size={14} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Danh sách danh mục */}
      <ul className="space-y-1">
        {categories.map((c) => {
          const active = c.id === selectedId;
          const isAll = c.id === "all";
          const IconComponent = getCategoryIcon(c.name);

          return (
            <li key={c.id} className="group relative">
              <div
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-xs sm:text-sm transition-all duration-150 cursor-pointer ${
                  active
                    ? "bg-gradient-to-r from-[#E06D44] to-[#C84E29] text-white font-bold shadow-md shadow-orange-500/20"
                    : "text-stone-700 hover:bg-stone-50 font-medium"
                }`}
                onClick={() => onSelect(c.id)}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                  <IconComponent
                    size={16}
                    className={`shrink-0 ${active ? "text-white" : "text-stone-400 group-hover:text-stone-600"}`}
                  />
                  <span className="truncate">{c.name}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  {/* Số lượng món */}
                  <span
                    className={`rounded-lg px-2 py-0.5 text-[11px] font-extrabold transition ${
                      active
                        ? "bg-white/20 text-white"
                        : "bg-stone-100 text-stone-500 group-hover:bg-stone-200/80"
                    }`}
                  >
                    {c.count || 0}
                  </span>

                  {/* Nút 3 chấm cho danh mục cụ thể (không áp dụng cho 'Tất cả' hoặc 'Best Seller') */}
                  {!isAll && !c.isBestSellerSpecial && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuCatId((prev) => (prev === c.id ? null : c.id));
                        }}
                        aria-label="Tùy chọn danh mục"
                        title="Tùy chọn"
                        className={`p-1 rounded-md transition ${
                          active
                            ? "text-white/80 hover:text-white hover:bg-white/20"
                            : "opacity-0 group-hover:opacity-100 text-stone-400 hover:text-stone-700 hover:bg-stone-200/60"
                        }`}
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {/* Dropdown sửa / xóa danh mục */}
                      {activeMenuCatId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1.5 z-40 w-36 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95 text-left"
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuCatId(null);
                              if (onEditCategory) onEditCategory(c);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                          >
                            <Pencil size={13} className="text-stone-400" />
                            <span>Chỉnh sửa</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuCatId(null);
                              if (onDeleteCategory) onDeleteCategory(c);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 size={13} className="text-red-500" />
                            <span>Xóa danh mục</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Nút thêm danh mục mới ở chân danh sách */}
      <button
        type="button"
        onClick={onOpenAddCategory}
        className="w-full mt-3 py-2.5 px-3 border border-dashed border-stone-200 rounded-2xl text-xs font-bold text-stone-500 hover:text-[#E06D44] hover:border-orange-300 hover:bg-orange-50/50 flex items-center justify-center gap-1.5 transition active:scale-98"
      >
        <Plus size={14} />
        <span>Thêm danh mục mới</span>
      </button>
    </aside>
  );
}
