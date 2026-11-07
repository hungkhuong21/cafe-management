import { NavLink, useNavigate } from "react-router-dom";
import {
  Coffee,
  LogOut,
  Settings,
  X,
  LayoutGrid,
  UtensilsCrossed,
  QrCode,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

const NAV_ITEMS = [
  { to: "/", label: "Tổng quan", icon: LayoutGrid },
  { to: "/menu", label: "Menu & danh mục", icon: UtensilsCrossed },
  { to: "/tables", label: "Bàn & mã QR", icon: QrCode },
  { to: "/orders", label: "Đơn hàng", icon: ClipboardList },
  { to: "/reports", label: "Báo cáo", icon: BarChart3 },
];

const DEFAULT_USER = {
  name: "Hùng Khương",
  role: "Quản lý cửa hàng",
  displayName: "Admin",
};

const DEFAULT_STORE = {
  name: "CafeFlow",
  branch: "Nguyễn Huệ • HCM",
};

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  // Lấy thông tin user từ localStorage nếu có
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cf_user")) || DEFAULT_USER;
    } catch {
      return DEFAULT_USER;
    }
  });

  // Lấy thông tin store từ localStorage
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cf_store")) || DEFAULT_STORE;
    } catch {
      return DEFAULT_STORE;
    }
  });

  // Tự động tải thông tin quán từ API /settings khi vào web
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data) {
          const s = {
            name: res.data.name || DEFAULT_STORE.name,
            branch: res.data.branch || DEFAULT_STORE.branch,
            logo: res.data.logo_url || null,
          };
          setStoreInfo(s);
          localStorage.setItem("cf_store", JSON.stringify(s));
        }
      } catch (err) {}
    };
    fetchStore();
  }, []);

  // Tự động đồng bộ ngay khi đổi tên hoặc đổi logo tại Cài đặt
  useEffect(() => {
    const handleSync = () => {
      try {
        const u = JSON.parse(localStorage.getItem("cf_user"));
        if (u) setUser(u);
        const s = JSON.parse(localStorage.getItem("cf_store"));
        if (s) setStoreInfo(s);
      } catch {}
    };
    window.addEventListener("cf_storage_update", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("cf_storage_update", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Đóng menu khi click ngoài
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showMenu]);

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Bỏ qua lỗi mạng khi logout
    }
    localStorage.removeItem("cf_user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleNavClick = () => {
    if (onClose) onClose();
  };

  return (
    <>
      {/* Backdrop mờ khi mở menu trên điện thoại */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Sidebar: Trên desktop cố định bên trái, trên mobile trượt từ bên trái ra */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar p-4 text-stone-300 transition-transform duration-300 ease-in-out md:static md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Logo & Nút đóng menu trên mobile */}
        <div className="flex items-center justify-between px-2 py-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white overflow-hidden">
              {storeInfo?.logo ? (
                <img
                  src={getImageUrl(storeInfo.logo)}
                  alt="logo"
                  className="h-10 w-10 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fb = e.currentTarget.parentElement?.querySelector(".sidebar-fallback-icon");
                    if (fb) fb.classList.remove("hidden");
                  }}
                />
              ) : null}
              <div className={`sidebar-fallback-icon h-10 w-10 items-center justify-center ${storeInfo?.logo ? "hidden" : "flex"}`}>
                <Coffee size={20} />
              </div>
            </div>
            <div>
              <p className="font-bold leading-tight text-white">{storeInfo?.name || DEFAULT_STORE.name}</p>
              <p className="text-xs text-stone-400">{storeInfo?.branch || DEFAULT_STORE.branch}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-stone-400 hover:text-white md:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Menu */}
        <p className="mt-6 mb-2 px-3 text-[11px] font-semibold tracking-wider text-stone-500">
          HOẠT ĐỘNG
        </p>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-sidebar-active text-white"
                    : "hover:bg-sidebar-active/60 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={18} className={isActive ? "text-brand" : ""} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Cài đặt */}
        <div className="mt-4">
          <div className="mb-2 h-px bg-white/10" />
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-sidebar-active text-white"
                  : "hover:bg-sidebar-active/60 hover:text-white"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={18} className={isActive ? "text-brand" : ""} />
                Cài đặt
              </>
            )}
          </NavLink>
        </div>

        {/* Thông tin người dùng + Logout */}
        <div className="mt-auto border-t border-white/10 pt-4 relative" ref={menuRef}>
          {showMenu && (
            <div
              className="absolute bottom-full left-0 right-0 mb-2 mx-1 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "#1e1510", border: "1px solid rgba(255,255,255,0.1)" }}
            >
              <div className="px-4 py-3 border-b border-white/10">
                <p className="text-sm font-semibold text-white">{user.displayName || "Admin"}</p>
                <p className="text-xs text-stone-400 mt-0.5">{user.role}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut size={16} />
                Đăng xuất
              </button>
            </div>
          )}

          {/* User row */}
          <button
            onClick={() => setShowMenu((v) => !v)}
            className="w-full flex items-center gap-3 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors group"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-600 text-sm font-semibold text-white">
              {(user.displayName || "A")[0]}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-semibold leading-tight text-white">
                {user.displayName || "Admin"}
              </p>
              <p className="truncate text-xs text-stone-400">{user.role || "Quản lý cửa hàng"}</p>
            </div>
            <LogOut
              size={16}
              className="text-stone-500 group-hover:text-red-400 transition-colors shrink-0"
            />
          </button>
        </div>
      </aside>
    </>
  );
}
