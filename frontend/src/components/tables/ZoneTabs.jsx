import { useState, useRef, useEffect } from "react";
import { Pencil, Trash2, MoreHorizontal } from "lucide-react";

export default function ZoneTabs({
  tabs = [],
  selectedId,
  onSelect,
  active,
  onChange,
  onEditZone,
  onDeleteZone,
}) {
  const currentActive = active !== undefined ? active : selectedId;
  const handleSelect = onChange || onSelect || (() => {});
  const [openMenuId, setOpenMenuId] = useState(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!openMenuId) return;
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openMenuId]);

  return (
    <div className="inline-flex flex-wrap gap-1 rounded-xl bg-stone-200/70 p-1">
      {tabs.map((tab) => {
        const isTabActive = tab.id === currentActive;
        const isAll = tab.id === "all";
        const canManage = !isAll && (onEditZone || onDeleteZone);

        return (
          <div
            key={tab.id}
            className="relative flex items-center"
            ref={openMenuId === tab.id ? menuRef : null}
          >
            {/* Tab Button */}
            <button
              type="button"
              onClick={() => handleSelect(tab.id)}
              className={`rounded-lg text-xs font-semibold transition-colors ${
                canManage ? "pl-3 pr-1 py-1.5" : "px-3 py-1.5"
              } ${
                isTabActive
                  ? "bg-white text-stone-900 shadow-sm"
                  : "text-stone-500 hover:text-stone-800"
              }`}
            >
              {tab.label}{" "}
              <span className="ml-0.5 text-stone-400">{tab.count}</span>
            </button>

            {/* Nút 3 chấm cho khu vực (không áp dụng cho tab "Tất cả") */}
            {canManage && (
              <>
                <button
                  type="button"
                  title="Sửa / Xóa khu vực"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMenuId((prev) => (prev === tab.id ? null : tab.id));
                  }}
                  className={`mx-0.5 flex h-5 w-5 items-center justify-center rounded-md transition ${
                    isTabActive
                      ? "text-stone-500 hover:bg-stone-100"
                      : "text-stone-400 hover:text-stone-700"
                  }`}
                >
                  <MoreHorizontal size={12} />
                </button>

                {/* Dropdown menu Sửa / Xóa */}
                {openMenuId === tab.id && (
                  <div className="absolute left-0 top-full mt-1 z-40 w-44 rounded-2xl bg-white p-1.5 shadow-xl border border-stone-200/80 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onEditZone) onEditZone(tab);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-orange-50 hover:text-orange-600 transition"
                    >
                      <Pencil size={13} className="text-stone-400" />
                      <span>Sửa tên khu vực</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuId(null);
                        if (onDeleteZone) onDeleteZone(tab);
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition"
                    >
                      <Trash2 size={13} className="text-red-500" />
                      <span>Xóa khu vực</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
