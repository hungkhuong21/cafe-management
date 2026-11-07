import { useState, useEffect } from "react";
import { formatCurrency } from "../../utils/formatCurrency";
import api from "../../services/api";

export default function RevenueChart({ refreshKey }) {
  const [data, setData] = useState([]);
  const [growth, setGrowth] = useState("+0%");
  const [loading, setLoading] = useState(false);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard/revenue-chart");
      if (res.data && res.data.chartData && res.data.chartData.length > 0) {
        setData(res.data.chartData);
        setGrowth(res.data.growthPercent || "+0%");
      }
    } catch (err) {
      console.warn("Không thể tải biểu đồ doanh thu từ API, dùng dữ liệu mặc định:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChartData();
  }, [refreshKey]);

  // Tìm mức doanh thu cao nhất để scale chiều cao cột
  const maxRevenue = Math.max(
    ...data.flatMap((d) => [Number(d.today) || 0, Number(d.yesterday) || 0]),
    1 // Tránh chia cho 0 nếu chưa có doanh thu
  );

  const isPositive = growth.startsWith("+");

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-stone-900">Doanh thu theo giờ</h2>
          <p className="text-xs text-stone-500">So với cùng kỳ hôm qua</p>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            isPositive
              ? "bg-emerald-50 text-emerald-600"
              : "bg-rose-50 text-rose-600"
          }`}
        >
          {growth}
        </span>
      </div>

      {/* Chú thích */}
      <div className="mt-4 flex gap-2 text-xs font-medium">
        <span className="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-brand">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Hôm nay
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-stone-600">
          <span className="h-1.5 w-1.5 rounded-full bg-stone-400" /> Hôm qua
        </span>
      </div>

      {/* Biểu đồ cột */}
      <div className="mt-6 flex justify-between gap-1 sm:gap-2">
        {data.map((d) => {
          const yesterdayHeight = ((Number(d.yesterday) || 0) / maxRevenue) * 100;
          const todayHeight = ((Number(d.today) || 0) / maxRevenue) * 100;

          return (
            <div key={d.hour} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-44 w-full items-end justify-center gap-1">
                {/* Cột Hôm qua */}
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-stone-200 transition-all duration-500"
                  style={{
                    height: `${yesterdayHeight > 0 ? Math.max(yesterdayHeight, 3) : 0}%`,
                  }}
                  title={`Hôm qua ${d.hour}: ${formatCurrency(d.yesterday || 0)}`}
                />
                {/* Cột Hôm nay */}
                <div
                  className="w-2 sm:w-2.5 rounded-t bg-brand transition-all duration-500"
                  style={{
                    height: `${todayHeight > 0 ? Math.max(todayHeight, 3) : 0}%`,
                  }}
                  title={`Hôm nay ${d.hour}: ${formatCurrency(d.today || 0)}`}
                />
              </div>
              <span className="text-[10px] sm:text-[11px] text-stone-400">
                {d.hour}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
