import { Routes, Route } from "react-router-dom";
import MainLayout from "../components/layout/Mainlayout";
import Home from "../pages/Home/Home";
import Menu from "../pages/Menu/Menu";
import NotFound from "../pages/NotFound/NotFound";
import Tables from "../pages/Tables/Tables";
import Orders from "../pages/Orders/Orders";
import Reports from "../pages/Reports/Reports";
import QrMenuPage from "../pages/QrMenu/QrMenu";
import Login from "../pages/Login/Login";
import Settings from "../pages/Settings/Settings";
import ProtectedRoute from "./ProtectedRoute"; // 👈 Thêm import này

export default function AppRoutes() {
  return (
    <Routes>
      {/* 1. Trang đăng nhập (Công khai) */}
      <Route path="/login" element={<Login />} />

      {/* 2. Giao diện khách hàng quét QR (Công khai) */}
      <Route path="/qr" element={<QrMenuPage />} />
      <Route path="/qr/:tableId" element={<QrMenuPage />} />
      <Route path="/qr-menu" element={<QrMenuPage />} />
      <Route path="/qr-menu/:tableId" element={<QrMenuPage />} />

      {/* 3. Các trang quản trị (Bắt buộc phải đăng nhập) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/menu" element={<Menu />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>

      {/* Trang 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}