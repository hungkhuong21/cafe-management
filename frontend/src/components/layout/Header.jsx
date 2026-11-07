import { Plus, Bell, Menu } from "lucide-react";
import { useHeaderState } from "../../context/PageHeaderContext";

export default function Header({ onToggleMenu }) {
  const { title = "CafeFlow", subtitle, extra, action } = useHeaderState();
  const ActionIcon = action?.icon ?? Plus; // không truyền icon thì dùng dấu "+"

  return (
    <header className="flex items-center justify-between border-b border-stone-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onToggleMenu}
          aria-label="Mở menu"
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100 md:hidden transition"
        >
          <Menu size={20} />
        </button>
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-stone-900 leading-tight">{title}</h1>
          {subtitle && <p className="text-xs sm:text-sm text-stone-500 line-clamp-1">{subtitle}</p>}
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {extra}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="flex items-center gap-1.5 sm:gap-2 rounded-xl bg-brand px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white transition-opacity hover:opacity-90 shadow-xs"
          >
            <ActionIcon size={16} />
            <span className="hidden sm:inline">{action.label}</span>
          </button>
        )}
        <button
          type="button"
          aria-label="Thông báo"
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-stone-100 text-stone-600 hover:bg-stone-200"
        >
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
}