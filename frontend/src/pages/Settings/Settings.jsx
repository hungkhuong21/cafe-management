import { useState, useRef, useEffect } from "react";
import {
  Camera,
  Store,
  User,
  Lock,
  Eye,
  EyeOff,
  Save,
  CheckCircle2,
  MapPin,
  Phone,
  Globe,
  Coffee,
  Upload,
} from "lucide-react";
import { usePageHeader } from "../../context/PageHeaderContext";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";
import { compressImage } from "../../utils/imageCompressor";

// ─── Keys ────────────────────────────────────────────────────────────────────
const STORE_KEY = "cf_store";
const USER_KEY = "cf_user";

const defaultStore = {
  name: "CafeFlow",
  branch: "Nguyễn Huệ • HCM",
  address: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
  phone: "028 1234 5678",
  website: "cafeflow.vn",
  logo: null,
};

function readStore() {
  try {
    return { ...defaultStore, ...JSON.parse(localStorage.getItem(STORE_KEY)) };
  } catch {
    return defaultStore;
  }
}

function readUser() {
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY));
    return u || { displayName: "Admin", username: "admin", role: "Quản lý cửa hàng" };
  } catch {
    return { displayName: "Admin", username: "admin", role: "Quản lý cửa hàng" };
  }
}

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ message, onDone }) {
  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-2xl animate-in slide-in-from-bottom-4"
      onAnimationEnd={() => setTimeout(onDone, 2000)}
    >
      <CheckCircle2 size={18} />
      {message}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div className="rounded-3xl bg-white shadow-sm border border-stone-100 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-stone-100 px-6 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-100 text-brand">
          <Icon size={16} />
        </div>
        <h2 className="font-bold text-stone-800 text-sm">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

// ─── Field label ──────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Text input with optional icon ───────────────────────────────────────────
function TextInput({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      {Icon && (
        <Icon size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
      )}
      <input
        className={`w-full rounded-xl border border-stone-200 bg-stone-50 py-2.5 text-sm text-stone-800 placeholder:text-stone-400 focus:border-brand focus:bg-white focus:outline-none transition ${
          Icon ? "pl-9 pr-4" : "px-4"
        }`}
        {...props}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  usePageHeader({
    title: "Cài đặt",
    subtitle: "Quản lý thông tin quán, logo và tài khoản đăng nhập",
  });

  // ── Store state ──────────────────────────────────────────────────────────
  const [store, setStore] = useState(readStore);
  const [storeSaved, setStoreSaved] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef(null);

  // ── User state ───────────────────────────────────────────────────────────
  const [user, setUser] = useState(readUser);
  const [userSaved, setUserSaved] = useState(false);
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [pwError, setPwError] = useState("");

  // Đồng bộ cấu hình quán từ CSDL (GET /settings)
  useEffect(() => {
    const fetchStoreSettings = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data) {
          const d = res.data;
          const loaded = {
            name: d.name || "CafeFlow",
            branch: d.branch || "Nguyễn Huệ • HCM",
            address: d.address || "",
            phone: d.phone || "",
            website: d.website || "",
            logo: d.logo_url || null,
          };
          setStore(loaded);
          localStorage.setItem(STORE_KEY, JSON.stringify(loaded));
        }
      } catch (err) {
        console.warn("Lỗi tải thông tin quán từ API:", err);
      }
    };
    fetchStoreSettings();
  }, []);

  // Đồng bộ thông tin user từ GET /auth/me
  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await api.get("/auth/me");
        if (res.data?.data) {
          const u = res.data.data;
          setUser((prev) => ({
            ...prev,
            displayName: u.displayName || prev.displayName,
            username: u.username || prev.username,
            role: u.role || prev.role,
          }));
        }
      } catch (err) {
        // Nếu chưa đăng nhập thì dùng local fallback
      }
    };
    fetchMe();
  }, []);

  // ── Logo upload (Nén chuẩn nét, dung lượng nhẹ, lưu vĩnh viễn vào CSDL) ──
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingLogo(true);
      // Nén logo kích thước chuẩn 500px, chất lượng cao, dung lượng ~30KB
      const compressedLogo = await compressImage(file, 500, 0.85);
      setStore((s) => ({ ...s, logo: compressedLogo }));

      // Dự phòng upload lên backend
      const formData = new FormData();
      formData.append("logo", file);
      api.post("/settings/upload-logo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      }).catch(() => {});
    } catch (err) {
      console.error("Lỗi nén logo:", err);
      const reader = new FileReader();
      reader.onload = (ev) => {
        setStore((s) => ({ ...s, logo: ev.target.result }));
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingLogo(false);
    }
  };

  // ── Save store (Lưu vào CSDL bảng store_settings) ─────────────────────────
  const handleSaveStore = async () => {
    try {
      const res = await api.put("/settings", {
        name: store.name,
        branch: store.branch,
        address: store.address,
        phone: store.phone,
        website: store.website,
        logo_url: store.logo,
      });

      const saved = res.data || store;
      const updated = {
        name: saved.name || store.name,
        branch: saved.branch || store.branch,
        address: saved.address || store.address,
        phone: saved.phone || store.phone,
        website: saved.website || store.website,
        logo: saved.logo_url !== undefined ? saved.logo_url : store.logo,
      };

      localStorage.setItem(STORE_KEY, JSON.stringify(updated));
      setStore(updated);
      setStoreSaved(true);
      window.dispatchEvent(new Event("cf_storage_update"));
    } catch (err) {
      console.warn("Lỗi lưu thông tin quán vào CSDL:", err);
      // Fallback lưu local nếu mất mạng
      localStorage.setItem(STORE_KEY, JSON.stringify(store));
      setStoreSaved(true);
      window.dispatchEvent(new Event("cf_storage_update"));
    }
  };

  // ── Save user ────────────────────────────────────────────────────────────
  const handleSaveUser = async () => {
    setPwError("");

    // 1. Cập nhật tên hiển thị qua PATCH /auth/profile
    if (user.displayName && user.displayName.trim()) {
      try {
        await api.patch("/auth/profile", {
          display_name: user.displayName.trim(),
        });
      } catch (err) {
        console.warn("Lỗi cập nhật profile:", err);
      }
    }

    // 2. Chỉ đổi mật khẩu khi có nhập ô "Mật khẩu mới"
    // Nếu để trống ô mật khẩu mới và xác nhận -> giữ nguyên mật khẩu cũ, không đổi
    const isChangingPassword = Boolean(passwords.next && passwords.next.trim());

    if (isChangingPassword) {
      if (!passwords.current) {
        setPwError("Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu.");
        return;
      }
      if (passwords.next.length < 6) {
        setPwError("Mật khẩu mới phải có ít nhất 6 ký tự.");
        return;
      }
      if (passwords.next !== passwords.confirm) {
        setPwError("Mật khẩu xác nhận không khớp.");
        return;
      }

      try {
        await api.patch("/auth/change-password", {
          username: user.username || "admin",
          current_password: passwords.current,
          new_password: passwords.next,
        });
      } catch (err) {
        const data = err.response?.data;
        const msg =
          data?.error?.message ||
          data?.message ||
          "Đổi mật khẩu thất bại. Kiểm tra lại mật khẩu hiện tại!";
        setPwError(Array.isArray(msg) ? msg[0] : msg);
        return;
      }
    }

    const updated = {
      ...user,
      displayName: user.displayName.trim(),
      role: "Quản lý cửa hàng",
    };
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
    setUser(updated);
    setPasswords({ current: "", next: "", confirm: "" });
    setUserSaved(true);
    window.dispatchEvent(new Event("cf_storage_update"));
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">

      {/* ══ 1. THÔNG TIN QUÁN ════════════════════════════════════════════════ */}
      <Section title="Thông tin quán" icon={Store}>
        {/* Logo */}
        <div className="mb-6 flex items-center gap-5">
          <div className="relative shrink-0">
            {store.logo ? (
              <img
                src={getImageUrl(store.logo)}
                alt="Logo quán"
                className="h-24 w-24 rounded-2xl object-cover border-2 border-stone-200 shadow"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".main-logo-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`main-logo-fallback flex h-24 w-24 items-center justify-center rounded-2xl bg-orange-50 border-2 border-dashed border-orange-200 text-brand ${store.logo ? "hidden" : "flex"}`}>
              <Coffee size={36} />
            </div>
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white shadow-lg hover:opacity-90 transition disabled:opacity-50"
              title="Đổi logo"
            >
              <Camera size={13} />
            </button>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
          </div>

          <div className="flex-1">
            <p className="text-sm font-semibold text-stone-800">Logo quán</p>
            <p className="text-xs text-stone-400 mt-0.5">PNG, JPG, WEBP · tối đa 5MB · nên dùng hình vuông</p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={uploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-xl border border-stone-200 px-3 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-50 transition disabled:opacity-50"
              >
                <Upload size={12} />
                {uploadingLogo ? "Đang tải ảnh lên..." : "Tải lên"}
              </button>
              {store.logo && (
                <button
                  type="button"
                  onClick={() => setStore((s) => ({ ...s, logo: null }))}
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
                >
                  Xóa logo
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Fields */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tên quán">
            <TextInput
              icon={Store}
              placeholder="Tên quán cà phê..."
              value={store.name}
              onChange={(e) => setStore((s) => ({ ...s, name: e.target.value }))}
            />
          </Field>

          <Field label="Chi nhánh / Tên ngắn">
            <TextInput
              placeholder="VD: Nguyễn Huệ • HCM"
              value={store.branch}
              onChange={(e) => setStore((s) => ({ ...s, branch: e.target.value }))}
            />
          </Field>

          <Field label="Địa chỉ">
            <TextInput
              icon={MapPin}
              placeholder="Địa chỉ đầy đủ..."
              value={store.address}
              onChange={(e) => setStore((s) => ({ ...s, address: e.target.value }))}
            />
          </Field>

          <Field label="Số điện thoại">
            <TextInput
              icon={Phone}
              placeholder="028 xxxx xxxx"
              value={store.phone}
              onChange={(e) => setStore((s) => ({ ...s, phone: e.target.value }))}
            />
          </Field>

          <Field label="Website">
            <TextInput
              icon={Globe}
              placeholder="cafeflow.vn"
              value={store.website}
              onChange={(e) => setStore((s) => ({ ...s, website: e.target.value }))}
            />
          </Field>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSaveStore}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 transition"
          >
            <Save size={15} />
            Lưu thông tin quán
          </button>
        </div>
      </Section>

      {/* ══ 2. TÀI KHOẢN ADMIN ══════════════════════════════════════════════ */}
      <Section title="Tài khoản Admin" icon={User}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Tên hiển thị">
            <TextInput
              icon={User}
              placeholder="Tên hiển thị..."
              value={user.displayName || ""}
              onChange={(e) => setUser((u) => ({ ...u, displayName: e.target.value }))}
            />
          </Field>

          <Field label="Tên đăng nhập">
            <TextInput
              placeholder="username..."
              value={user.username || "admin"}
              onChange={(e) => setUser((u) => ({ ...u, username: e.target.value }))}
            />
          </Field>
        </div>

        {/* Đổi mật khẩu */}
        <div className="mt-6 rounded-2xl border border-stone-100 bg-stone-50 p-5">
          <div className="mb-4 flex items-center gap-2">
            <Lock size={15} className="text-stone-400" />
            <p className="text-sm font-bold text-stone-700">Đổi mật khẩu</p>
            <span className="text-xs text-stone-400">(bỏ trống nếu không muốn đổi)</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { key: "current", label: "Mật khẩu hiện tại" },
              { key: "next", label: "Mật khẩu mới" },
              { key: "confirm", label: "Xác nhận mật khẩu" },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="mb-1.5 block text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  {label}
                </label>
                <div className="relative">
                  <input
                    type={showPw[key] ? "text" : "password"}
                    placeholder="••••••••"
                    value={passwords[key]}
                    onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-4 pr-9 text-sm text-stone-800 placeholder:text-stone-300 focus:border-brand focus:outline-none transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => ({ ...s, [key]: !s[key] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition"
                  >
                    {showPw[key] ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pwError && <p className="mt-3 text-xs font-medium text-red-500">{pwError}</p>}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={handleSaveUser}
            className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-semibold text-white shadow hover:opacity-90 transition"
          >
            <Save size={15} />
            Lưu tài khoản
          </button>
        </div>
      </Section>

      {/* ══ 3. PREVIEW SIDEBAR ══════════════════════════════════════════════ */}
      <Section title="Xem trước Sidebar" icon={Coffee}>
        <p className="mb-4 text-xs text-stone-400">Thông tin hiển thị ở thanh điều hướng bên trái</p>
        <div className="inline-flex items-center gap-3 rounded-2xl bg-[#1a1108] px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white overflow-hidden">
            {store.logo ? (
              <img
                src={getImageUrl(store.logo)}
                alt="logo"
                className="h-10 w-10 object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  const fallback = e.currentTarget.parentElement?.querySelector(".sidebar-preview-fallback");
                  if (fallback) fallback.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={`sidebar-preview-fallback h-10 w-10 items-center justify-center ${store.logo ? "hidden" : "flex"}`}>
              <Coffee size={20} />
            </div>
          </div>
          <div>
            <p className="font-bold leading-tight text-white text-sm">{store.name || "CafeFlow"}</p>
            <p className="text-xs text-stone-400">{store.branch || "Chi nhánh"}</p>
          </div>
        </div>
      </Section>

      {/* Toast */}
      {storeSaved && <Toast message="Đã lưu thông tin quán!" onDone={() => setStoreSaved(false)} />}
      {userSaved && <Toast message="Đã lưu tài khoản!" onDone={() => setUserSaved(false)} />}
    </div>
  );
}
