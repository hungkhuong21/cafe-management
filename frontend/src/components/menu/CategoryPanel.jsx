import React, { useState, useRef, useEffect } from "react";
import { Plus, GripVertical, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

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

  return (
    <aside className="flex flex-col rounded-2xl bg-white p-4 shadow-sm lg:w-64 lg:shrink-0 border border-stone-100">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="font-bold text-stone-900">Danh mục</h2>
        <button
          type="button"
          onClick={onOpenAddCategory}
          aria-label="Thêm danh mục"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-50 text-brand hover:bg-orange-100 transition shadow-2xs"
          title="Thêm danh mục mới"
        >
          <Plus size={14} />
        </button>
      </div>

      <ul className="space-y-1">
        {categories.map((c) => {
          const active = c.id === selectedId;
          const isAll = c.id === "all";

          return (
            <li key={c.id} className="group relative">
              <div
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors ${
                  active
                    ? "bg-orange-50 font-semibold text-brand"
                    : "text-stone-600 hover:bg-stone-50"
                }`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(c.id)}
                  className="flex-1 text-left truncate pr-2"
                >
                  {c.name}
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`text-xs ${
                      active ? "text-brand" : "text-stone-400"
                    }`}
                  >
                    {c.count || 0}
                  </span>

                  {/* Nút 3 chấm cho danh mục cụ thể (không áp dụng cho 'Tất cả') */}
                  {!isAll && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuCatId((prev) => (prev === c.id ? null : c.id));
                        }}
                        aria-label="Tùy chọn danh mục"
                        title="Tùy chọn"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition"
                      >
                        <MoreHorizontal size={14} />
                      </button>

                      {/* Dropdown sửa / xóa danh mục */}
                      {activeMenuCatId === c.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-0 top-full mt-1 z-30 w-36 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95"
                        >
                          <button
                            type="button"
                            onClick={() => {
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
                            onClick={() => {
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

      <div className="mt-auto flex gap-2 rounded-xl bg-stone-50 p-3 text-xs text-stone-500">
        <GripVertical size={14} className="mt-0.5 shrink-0 text-stone-400" />
        <p>Kéo thả để sắp xếp thứ tự danh mục trên menu khách hàng.</p>
      </div>
    </aside>
  );
}
