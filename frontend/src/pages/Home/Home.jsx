import { useState, useEffect } from "react";
import StatCard from "../../components/dashboard/StatCard";
import RevenueChart from "../../components/dashboard/RevenueChart";
import BestSellers from "../../components/dashboard/BestSellers";
import RecentOrders from "../../components/dashboard/RecentOrders";
import QuickOrderModal from "../../components/orders/QuickOrderModal";
import { usePageHeader } from "../../context/PageHeaderContext";
import { getGreeting, formatToday } from "../../utils/date";
import api from "../../services/api";

const INITIAL_STATS = [
  { label: "Doanh thu hôm nay", value: "0 đ", trend: "0%", tone: "orange", icon: "revenue" },
  { label: "Đơn đã nhận", value: "0", trend: "0 đơn", tone: "blue", icon: "orders" },
  { label: "Giá trị trung bình", value: "0 đ", trend: "Hôm nay", tone: "green", icon: "average" },
  { label: "Bàn đang dùng", value: "0 / 0", trend: "0% công suất", tone: "amber", icon: "tables" },
];

export default function Home() {
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);
  const [stats, setStats] = useState(INITIAL_STATS);
  const [refreshKey, setRefreshKey] = useState(0);

  // Hàm load thống kê từ API /api/dashboard/overview
  const fetchOverview = async () => {
    try {
      const res = await api.get("/dashboard/overview");
      if (res.data && res.data.stats) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.warn("Không thể tải overview từ API, dùng dữ liệu mẫu:", err);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [refreshKey]);

  const [displayName, setDisplayName] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem("cf_user"));
      return u?.displayName || "Admin";
    } catch {
      return "Admin";
    }
  });

  useEffect(() => {
    const handleSync = () => {
      try {
        const u = JSON.parse(localStorage.getItem("cf_user"));
        if (u?.displayName) setDisplayName(u.displayName);
      } catch {}
    };
    window.addEventListener("cf_storage_update", handleSync);
    return () => window.removeEventListener("cf_storage_update", handleSync);
  }, []);

  usePageHeader({
    title: `${getGreeting()}, ${displayName} 👋`,
    subtitle: `Tình hình cửa hàng hôm nay • ${formatToday()}`,
    action: {
      label: "Tạo đơn nhanh",
      onClick: () => setIsQuickOrderOpen(true),
    },
  });

  return (
    <div className="space-y-4">
      {/* 4 thẻ thống kê */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Biểu đồ + món bán chạy */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChart refreshKey={refreshKey} />
        </div>
        <BestSellers refreshKey={refreshKey} />
      </div>

      {/* Bảng đơn gần đây */}
      <RecentOrders refreshKey={refreshKey} />

      {/* Modal Tạo đơn nhanh */}
      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        onOrderCreated={() => {
          // Khi tạo đơn mới, kích hoạt reload lại cả overview, chart và recent orders
          setRefreshKey((prev) => prev + 1);
        }}
      />
    </div>
  );
}
