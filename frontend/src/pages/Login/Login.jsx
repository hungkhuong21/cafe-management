import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Coffee, Lock, User } from "lucide-react";
import api from "../../services/api";
import { getImageUrl } from "../../utils/imageUrl";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", password: "", remember: false });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoError, setLogoError] = useState(false);

  // Đồng bộ Logo và Tên quán từ cài đặt (giống Sidebar & QrMenu)
  const [storeInfo, setStoreInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cf_store")) || null;
    } catch {
      return null;
    }
  });

  const storeName = storeInfo?.name || "CafeFlow";
  const storeLogo = storeInfo?.logo || null;
  const storeTagline = storeInfo?.branch
    ? `${storeInfo.branch} • Quản lý quán cà phê`
    : "Hệ thống quản lý quán cà phê";

  // Tải cấu hình quán từ backend nếu chưa có
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await api.get("/settings");
        if (res.data) {
          const s = {
            name: res.data.name || "CafeFlow",
            branch: res.data.branch || "Nguyễn Huệ • HCM",
            logo: res.data.logo_url || null,
          };
          setStoreInfo(s);
          localStorage.setItem("cf_store", JSON.stringify(s));
        }
      } catch {}
    };
    fetchStore();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
    setError("");
  };

  useEffect(() => {
  const token = localStorage.getItem("token") || localStorage.getItem("cf_user");
  if (token) {
    navigate("/", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username.trim() || !form.password.trim()) {
      setError("Vui lòng nhập đầy đủ tài khoản và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await api.post("/auth/login", {
        username: form.username.trim(),
        password: form.password,
      });

      if (res.data?.success) {
        if (res.data.token) {
          localStorage.setItem("token", res.data.token);
        }
        localStorage.setItem(
          "cf_user",
          JSON.stringify({
            username: res.data.user.username,
            displayName: res.data.user.displayName || "Admin",
            role: res.data.user.role || "Quản lý cửa hàng",
          })
        );
        navigate("/");
      }
    } catch (err) {
      console.warn("Lỗi đăng nhập:", err, err.response?.data);
      const data = err.response?.data;
      const errorObj = data?.error;
      const errorMsg =
        (typeof errorObj === "object" ? errorObj?.message : errorObj) ||
        data?.message ||
        err.message ||
        "Lỗi kết nối máy chủ!";
      setError(Array.isArray(errorMsg) ? errorMsg[0] : String(errorMsg));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF9F6] flex items-center justify-center px-4">
      {/* Background decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #E06D44, transparent)" }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-15"
          style={{ background: "radial-gradient(circle, #2E2018, transparent)" }}
        />
        <div
          className="absolute top-1/2 left-10 w-48 h-48 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #E06D44, transparent)" }}
        />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl px-10 py-12">
          {/* Logo đồng nhất với Sidebar */}
          <div className="flex flex-col items-center mb-10">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden"
              style={{ background: "linear-gradient(135deg, #E06D44, #c8522e)" }}
            >
              {storeLogo && !logoError ? (
                <img
                  src={getImageUrl(storeLogo)}
                  alt={storeName}
                  className="w-full h-full object-cover"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Coffee className="w-8 h-8 text-white" />
              )}
            </div>
            <h1 className="text-3xl font-bold" style={{ color: "#2E2018" }}>
              {storeName}
            </h1>
            <p className="text-sm mt-1" style={{ color: "#9e8c7e" }}>
              {storeTagline}
            </p>
          </div>

          {/* Title */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold" style={{ color: "#2E2018" }}>
              Đăng nhập
            </h2>
            <p className="text-sm mt-1" style={{ color: "#9e8c7e" }}>
              Chào mừng trở lại! Vui lòng nhập thông tin.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#2E2018" }}
              >
                Tài khoản
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9e8c7e]">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Nhập tên đăng nhập..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "#e8e0d8",
                    background: "#faf8f5",
                    color: "#2E2018",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#E06D44")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8e0d8")}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label
                className="block text-sm font-medium mb-2"
                style={{ color: "#2E2018" }}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9e8c7e]">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-11 pr-11 py-3 rounded-xl border text-sm outline-none transition-all"
                  style={{
                    borderColor: "#e8e0d8",
                    background: "#faf8f5",
                    color: "#2E2018",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#E06D44")}
                  onBlur={(e) => (e.target.style.borderColor = "#e8e0d8")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#9e8c7e] hover:text-[#E06D44] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-[#E06D44]"
                />
                <span className="text-sm" style={{ color: "#6b5c50" }}>
                  Nhớ tài khoản
                </span>
              </label>
              <button
                type="button"
                className="text-sm font-medium transition-colors hover:opacity-80"
                style={{ color: "#E06D44" }}
              >
                Quên mật khẩu?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all duration-200 shadow-lg disabled:opacity-70"
              style={{
                background: loading
                  ? "#c8522e"
                  : "linear-gradient(135deg, #E06D44, #c8522e)",
              }}
              onMouseEnter={(e) => {
                if (!loading) e.target.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)";
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Đang đăng nhập...
                </span>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#9e8c7e" }}>
          © {new Date().getFullYear()} {storeName} · Hệ thống quản lý quán cà phê
        </p>
      </div>
    </div>
  );
}

