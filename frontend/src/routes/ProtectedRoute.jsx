import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
    // Kiểm tra token hoặc thông tin người dùng trong localStorage
    const isAuthenticated = Boolean(
        localStorage.getItem("token") || localStorage.getItem("cf_user")
    );

    // Chưa đăng nhập -> Chuyển hướng sang trang /login
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    // Đã đăng nhập -> Cho phép hiển thị các trang bên trong
    return <Outlet />;
}