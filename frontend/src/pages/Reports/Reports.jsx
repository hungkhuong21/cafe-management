import { useState, useEffect, useCallback } from "react";
import { Download } from "lucide-react";
import { usePageHeader } from "../../context/PageHeaderContext";
import StatCard from "../../components/dashboard/StatCard";
import TrendChart from "../../components/reports/TrendChart";
import RevenueDonut from "../../components/reports/RevenueDonut";
import TopDishes from "../../components/reports/TopDishes";
import PeakHours from "../../components/reports/PeakHours";
import DateRangePicker from "../../components/reports/DateRangePicker";
import api from "../../services/api";
import { downloadCsv } from "../../utils/exportCSV";

// Helper lấy ngày YYYY-MM-DD theo giờ địa phương
const pad = (n) => String(n).padStart(2, "0");
const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const getInitialRange = () => {
  const now = new Date();
  const todayStr = toYMD(now);
  return {
    label: "Hôm nay",
    fromDate: todayStr,
    toDate: todayStr,
  };
};

export default function Reports() {
  const [selectedRange, setSelectedRange] = useState(getInitialRange);
  const [groupBy, setGroupBy] = useState("day");

  // Dữ liệu từ API / Tính toán thực tế
  const [stats, setStats] = useState([
    { label: "Tổng doanh thu", value: "0 đ", trend: "0%", tone: "orange", icon: "Wallet" },
    { label: "Tổng đơn hàng", value: "0", trend: "0 đơn", tone: "blue", icon: "FileText" },
    { label: "Lợi nhuận ước tính", value: "0 đ", trend: "34,5% biên lợi nhuận", tone: "green", icon: "TrendingUp" },
  ]);
  const [trendData, setTrendData] = useState([]);
  const [trendSubtitle, setTrendSubtitle] = useState("");
  const [revenueComparison, setRevenueComparison] = useState(null);
  const [categoryGroups, setCategoryGroups] = useState([]);
  const [topDishes, setTopDishes] = useState([]);
  const [peakHours, setPeakHours] = useState([
    { range: "08:00 — 10:00", orders: 0 },
    { range: "12:00 — 14:00", orders: 0 },
    { range: "19:00 — 21:00", orders: 0 },
  ]);
  const [loading, setLoading] = useState(false);

  // Tính toán báo cáo trực tiếp từ danh sách đơn thực tế (nếu backend chưa restart hoặc endpoint /reports bị 404)
  const computeFromOrders = (orders, fromDate, toDate, currentGroupBy) => {
    // Lọc đơn trong khoảng ngày
    const filteredOrders = orders.filter((o) => {
      if (!o.created_at) return false;
      const orderDate = toYMD(new Date(o.created_at));
      return orderDate >= fromDate && orderDate <= toDate && o.status !== "cancelled";
    });

    // 1. Thống kê
    let totalRevenue = 0;
    const totalOrdersCount = filteredOrders.length;

    // Map món và nhóm
    const dishMap = {};
    const catMap = {
      "Cà phê": 0,
      "Trà & Trà sữa": 0,
      "Bánh & Ăn nhẹ": 0,
      "Khác": 0,
    };

    // Khung giờ
    let morningCount = 0;
    let lunchCount = 0;
    let eveningCount = 0;

    // Biểu đồ theo giờ nếu cùng 1 ngày (Hôm nay/Hôm qua)
    const hourlyMap = {};
    for (let h = 8; h <= 22; h++) {
      hourlyMap[h] = 0;
    }

    // Biểu đồ theo ngày nếu nhiều ngày
    const dailyMap = {};

    filteredOrders.forEach((o) => {
      const orderDate = new Date(o.created_at);
      const hr = orderDate.getHours();

      // Đếm khung giờ
      if (hr >= 8 && hr <= 10) morningCount++;
      if (hr >= 11 && hr <= 14) lunchCount++;
      if (hr >= 18 && hr <= 21) eveningCount++;

      const isPaid = o.payment_method || o.status === "done";
      let orderTotal = 0;

      (o.items || []).forEach((item) => {
        const itemTotal = Number(item.unit_price || 0) * Number(item.quantity || 1);
        orderTotal += itemTotal;

        if (isPaid) {
          // Gom món bán chạy
          if (!dishMap[item.name]) {
            dishMap[item.name] = { name: item.name, qty: 0, revenue: 0 };
          }
          dishMap[item.name].qty += Number(item.quantity || 1);
          dishMap[item.name].revenue += itemTotal;

          // Phân loại nhóm sơ bộ theo tên món
          const lowerName = item.name.toLowerCase();
          if (lowerName.includes("cà phê") || lowerName.includes("cafe") || lowerName.includes("espresso") || lowerName.includes("cold brew") || lowerName.includes("bạc xỉu")) {
            catMap["Cà phê"] += itemTotal;
          } else if (lowerName.includes("trà") || lowerName.includes("matcha") || lowerName.includes("tea")) {
            catMap["Trà & Trà sữa"] += itemTotal;
          } else if (lowerName.includes("bánh") || lowerName.includes("croissant") || lowerName.includes("tiramisu") || lowerName.includes("sandwich")) {
            catMap["Bánh & Ăn nhẹ"] += itemTotal;
          } else {
            catMap["Khác"] += itemTotal;
          }
        }
      });

      // Nếu đơn có total_amount từ API backend
      if (orderTotal === 0 && o.total_amount) {
        orderTotal = Number(o.total_amount);
      }

      if (isPaid) {
        totalRevenue += orderTotal;
        if (hr >= 8 && hr <= 22) {
          hourlyMap[hr] += orderTotal;
        }

        const dateKey = toYMD(orderDate);
        dailyMap[dateKey] = (dailyMap[dateKey] || 0) + orderTotal;
      }
    });

    // Format tiền triệu
    const formatMillionStr = (val) => {
      if (val >= 1000000) {
        return `${(val / 1000000).toFixed(1).replace(".", ",")} tr`;
      }
      return `${val.toLocaleString("vi-VN")} đ`;
    };

    const profit = Math.round(totalRevenue * 0.345);

    setStats([
      {
        label: "Tổng doanh thu",
        value: formatMillionStr(totalRevenue),
        raw_value: totalRevenue,
        trend: totalRevenue > 0 ? "↑ Doanh thu thực tế" : "Chưa có doanh thu",
        tone: "orange",
        icon: "Wallet",
      },
      {
        label: "Tổng đơn hàng",
        value: `${totalOrdersCount}`,
        raw_value: totalOrdersCount,
        trend: `${totalOrdersCount} đơn trong kỳ`,
        tone: "blue",
        icon: "FileText",
      },
      {
        label: "Lợi nhuận ước tính",
        value: formatMillionStr(profit),
        raw_value: profit,
        trend: "34,5% biên lợi nhuận",
        tone: "green",
        icon: "TrendingUp",
      },
    ]);

    // Top món
    const topList = Object.values(dishMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((d, idx) => ({
        id: idx + 1,
        name: d.name,
        qty: d.qty,
        unit: "ly",
        revenue: d.revenue,
        emoji: ["☕", "🍵", "🧊", "🥪", "🍰"][idx % 5],
      }));
    setTopDishes(topList);

    // Tỷ trọng nhóm
    const PALETTE = [
      { stroke: "stroke-brand", dot: "bg-brand" },
      { stroke: "stroke-emerald-600", dot: "bg-emerald-600" },
      { stroke: "stroke-amber-500", dot: "bg-amber-500" },
      { stroke: "stroke-stone-400", dot: "bg-stone-400" },
    ];
    if (totalRevenue === 0) {
      setCategoryGroups([
        { name: "Chưa có doanh thu", percent: 100, stroke: "stroke-stone-200", dot: "bg-stone-300" },
      ]);
    } else {
      const catList = Object.entries(catMap)
        .filter(([_, rev]) => rev > 0)
        .map(([name, rev], idx) => ({
          name,
          percent: Math.round((rev / totalRevenue) * 100) || 1,
          revenue: rev,
          stroke: PALETTE[idx % PALETTE.length].stroke,
          dot: PALETTE[idx % PALETTE.length].dot,
        }));
      setCategoryGroups(catList.length > 0 ? catList : [{ name: "Khác", percent: 100, stroke: "stroke-brand", dot: "bg-brand" }]);
    }

    // Khung giờ
    setPeakHours([
      { range: "08:00 — 10:00", orders: morningCount },
      { range: "12:00 — 14:00", orders: lunchCount },
      { range: "19:00 — 21:00", orders: eveningCount },
    ]);

    // Biểu đồ theo groupBy
    const allPaidOrders = orders.filter(
      (o) => o.status !== "cancelled" && (o.payment_method || o.status === "done")
    );

    if (currentGroupBy === "year") {
      const currentYear = new Date().getFullYear();
      const years = [currentYear - 2, currentYear - 1, currentYear];
      const yearPoints = years.map((y) => {
        let rev = 0;
        let ordCount = 0;
        allPaidOrders.forEach((o) => {
          if (!o.created_at) return;
          const orderYear = new Date(o.created_at).getFullYear();
          if (orderYear === y) {
            rev += Number(o.total_amount || 0);
            ordCount++;
          }
        });
        return {
          label: `${y}`,
          full_label: `Năm ${y}`,
          raw_value: rev,
          value: Number((rev / 1000000).toFixed(2)),
          orders: ordCount,
        };
      });

      const enriched = yearPoints.map((pt, i) => {
        const prevRaw = i > 0 ? yearPoints[i - 1].raw_value : 0;
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((pt.raw_value - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (pt.raw_value > 0) {
          diffPercent = 100;
        }
        return {
          ...pt,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
        };
      });

      const totalCur = enriched.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = enriched.reduce((s, d) => s + d.prev_raw_value, 0);
      setTrendSubtitle("Xu hướng theo các năm • triệu đồng");
      setTrendData(enriched);
      setRevenueComparison({
        total_current: totalCur,
        total_previous: totalPrev,
        growth_percent: totalPrev > 0 ? Number((((totalCur - totalPrev) / totalPrev) * 100).toFixed(1)) : 0,
      });
    } else if (currentGroupBy === "month") {
      // 12 tháng gần nhất (từ 11 tháng trước đến tháng này)
      const now = new Date();
      const monthBuckets = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        monthBuckets.push({
          key: `${y}-${pad(m)}`,
          label: `Th${m}`,
          full_label: `Tháng ${m}/${y}`,
          raw_value: 0,
          orders: 0,
        });
      }

      allPaidOrders.forEach((o) => {
        if (!o.created_at) return;
        const d = new Date(o.created_at);
        const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
        const bucket = monthBuckets.find((b) => b.key === key);
        if (bucket) {
          bucket.raw_value += Number(o.total_amount || 0);
          bucket.orders++;
        }
      });

      const enriched = monthBuckets.map((b, i) => {
        const prevRaw = i > 0 ? monthBuckets[i - 1].raw_value : 0;
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((b.raw_value - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (b.raw_value > 0) {
          diffPercent = 100;
        }
        return {
          label: b.label,
          full_label: b.full_label,
          value: Number((b.raw_value / 1000000).toFixed(2)),
          raw_value: b.raw_value,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
          orders: b.orders,
        };
      });

      const totalCur = enriched.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = enriched.reduce((s, d) => s + d.prev_raw_value, 0);
      setTrendSubtitle("12 tháng gần nhất • triệu đồng");
      setTrendData(enriched);
      setRevenueComparison({
        total_current: totalCur,
        total_previous: totalPrev,
        growth_percent: totalPrev > 0 ? Number((((totalCur - totalPrev) / totalPrev) * 100).toFixed(1)) : 0,
      });
    } else if (currentGroupBy === "week") {
      // 8 tuần gần nhất
      const now = new Date();
      const weekBuckets = [];
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        weekBuckets.push({
          label: `T${8 - i}`,
          full_label: `Tuần ${8 - i} gần nhất`,
          startTime: new Date(d.getFullYear(), d.getMonth(), d.getDate() - 6).getTime(),
          endTime: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime(),
          raw_value: 0,
          orders: 0,
        });
      }

      allPaidOrders.forEach((o) => {
        if (!o.created_at) return;
        const time = new Date(o.created_at).getTime();
        const bucket = weekBuckets.find((b) => time >= b.startTime && time <= b.endTime);
        if (bucket) {
          bucket.raw_value += Number(o.total_amount || 0);
          bucket.orders++;
        }
      });

      const enriched = weekBuckets.map((b, i) => {
        const prevRaw = i > 0 ? weekBuckets[i - 1].raw_value : 0;
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((b.raw_value - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (b.raw_value > 0) {
          diffPercent = 100;
        }
        return {
          label: b.label,
          full_label: b.full_label,
          value: Number((b.raw_value / 1000000).toFixed(2)),
          raw_value: b.raw_value,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
          orders: b.orders,
        };
      });

      const totalCur = enriched.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = enriched.reduce((s, d) => s + d.prev_raw_value, 0);
      setTrendSubtitle("8 tuần gần nhất • triệu đồng");
      setTrendData(enriched);
      setRevenueComparison({
        total_current: totalCur,
        total_previous: totalPrev,
        growth_percent: totalPrev > 0 ? Number((((totalCur - totalPrev) / totalPrev) * 100).toFixed(1)) : 0,
      });
    } else {
      // groupBy === "day"
      if (fromDate === toDate) {
        // 1 ngày: hiển thị 8h - 22h
        const chartPoints = Object.keys(hourlyMap).map((h) => ({
          label: `${h}h`,
          full_label: `${pad(h)}:00 — ${pad(Number(h) + 1)}:00`,
          value: Number((hourlyMap[h] / 1000000).toFixed(2)),
          raw_value: hourlyMap[h],
          prev_raw_value: 0,
          prev_value: 0,
          diff_percent: hourlyMap[h] > 0 ? 100 : 0,
          orders: 0,
        }));
        setTrendSubtitle("Theo khung giờ hôm nay (8h — 22h) • triệu đồng");
        setTrendData(chartPoints);
        setRevenueComparison({
          total_current: totalRevenue,
          total_previous: 0,
          growth_percent: totalRevenue > 0 ? 100 : 0,
        });
      } else {
        // Nhiều ngày: hiển thị theo ngày
        const dates = Object.keys(dailyMap).sort();
        const chartPoints = dates.map((d, i) => {
          const [_, m, day] = d.split("-");
          const curVal = dailyMap[d];
          const prevVal = i > 0 ? dailyMap[dates[i - 1]] : 0;
          let diffPercent = 0;
          if (prevVal > 0) {
            diffPercent = Number((((curVal - prevVal) / prevVal) * 100).toFixed(1));
          } else if (curVal > 0) {
            diffPercent = 100;
          }
          return {
            label: `${day}/${m}`,
            full_label: `Ngày ${day}/${m}`,
            value: Number((curVal / 1000000).toFixed(2)),
            raw_value: curVal,
            prev_raw_value: prevVal,
            prev_value: Number((prevVal / 1000000).toFixed(2)),
            diff_percent: diffPercent,
            orders: 0,
          };
        });
        setTrendSubtitle(`${dates.length || 7} ngày • triệu đồng`);
        setTrendData(
          chartPoints.length > 0
            ? chartPoints
            : [{ label: "Hôm nay", value: Number((totalRevenue / 1000000).toFixed(2)), raw_value: totalRevenue }]
        );
        const totalCur = chartPoints.reduce((s, d) => s + d.raw_value, 0);
        const totalPrev = chartPoints.reduce((s, d) => s + d.prev_raw_value, 0);
        setRevenueComparison({
          total_current: totalCur,
          total_previous: totalPrev,
          growth_percent: totalPrev > 0 ? Number((((totalCur - totalPrev) / totalPrev) * 100).toFixed(1)) : 0,
        });
      }
    }
  };

  // Tải dữ liệu từ API Báo cáo
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    const fromDate = selectedRange?.fromDate || toYMD(new Date());
    const toDate = selectedRange?.toDate || toYMD(new Date());
    const params = { fromDate, toDate };

    try {
      // Gọi đồng thời cả /reports và /orders dự phòng
      const [overviewRes, revenueRes, catRes, topRes, peakRes, allOrdersRes] =
        await Promise.all([
          api.get("/reports/overview", { params }).catch(() => null),
          api.get("/reports/revenue", { params: { ...params, groupBy } }).catch(() => null),
          api.get("/reports/revenue-by-category", { params }).catch(() => null),
          api.get("/reports/top-products", { params: { ...params, limit: 5 } }).catch(() => null),
          api.get("/reports/peak-hours", { params }).catch(() => null),
          api.get("/orders").catch(() => null),
        ]);

      // Nếu backend có endpoint /reports và trả về thành công
      if (overviewRes?.data?.stats) {
        setStats(overviewRes.data.stats);
        if (revenueRes?.data?.data) {
          setTrendData(revenueRes.data.data);
          setTrendSubtitle(revenueRes.data.subtitle || "");
          setRevenueComparison(revenueRes.data.comparison || null);
        }
        if (catRes?.data) setCategoryGroups(catRes.data);
        if (topRes?.data) setTopDishes(topRes.data);
        if (peakRes?.data) setPeakHours(peakRes.data);
      } else if (allOrdersRes?.data) {
        // Fallback: Tính toán trực tiếp từ dữ liệu đơn hàng thực tế
        computeFromOrders(allOrdersRes.data, fromDate, toDate, groupBy);
      }
    } catch (err) {
      console.warn("Lỗi tải báo cáo:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedRange?.fromDate, selectedRange?.toDate, groupBy]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // Xử lý xuất file báo cáo CSV
  const handleExport = async () => {
    try {
      const fromDate = selectedRange?.fromDate || toYMD(new Date());
      const toDate = selectedRange?.toDate || toYMD(new Date());

      const res = await api.get("/reports/export", {
        params: { fromDate, toDate },
        responseType: "blob",
      });

      const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `bao-cao-doanh-thu-${fromDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      // Fallback: xuất bằng frontend
      const displayPeriod = selectedRange?.label || `${selectedRange?.fromDate} - ${selectedRange?.toDate}`;
      downloadCsv("bao-cao-doanh-thu.csv", [
        ["BÁO CÁO DOANH THU", displayPeriod],
        [],
        ["Chỉ số", "Giá trị", "Ghi chú"],
        ...stats.map((s) => [s.label, s.value, s.trend]),
        [],
        ["Doanh thu theo thời gian"],
        ...trendData.map((d) => [d.label, `${d.value} tr`]),
        [],
        ["Món bán chạy", "Số lượng", "Doanh thu (đồng)"],
        ...topDishes.map((d) => [d.name, `${d.qty} ${d.unit}`, d.revenue]),
        [],
        ["Khung giờ", "Số đơn"],
        ...peakHours.map((h) => [h.range, h.orders]),
      ]);
    }
  };

  usePageHeader({
    title: "Báo cáo doanh thu",
    subtitle: "Phân tích hiệu quả kinh doanh và xu hướng bán hàng",
    extra: (
      <DateRangePicker
        selectedRange={selectedRange}
        onSelectRange={setSelectedRange}
      />
    ),
    action: { label: "Xuất báo cáo", icon: Download, onClick: handleExport },
  });

  return (
    <div className={`space-y-4 transition-opacity duration-200 ${loading ? "opacity-75" : "opacity-100"}`}>
      {/* 3 Thẻ thống kê doanh thu, đơn hàng, lợi nhuận */}
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Biểu đồ xu hướng + Cơ cấu doanh thu */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TrendChart
            data={trendData}
            subtitle={trendSubtitle}
            comparison={revenueComparison}
            range={groupBy}
            onRangeChange={setGroupBy}
          />
        </div>
        <RevenueDonut groups={categoryGroups} />
      </div>

      {/* Top món bán chạy + Khung giờ cao điểm */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <TopDishes dishes={topDishes} />
        </div>
        <PeakHours hours={peakHours} />
      </div>
    </div>
  );
}
