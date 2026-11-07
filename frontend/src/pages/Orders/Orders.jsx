import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { MapPin, Search, Volume2, VolumeX, Plus, CalendarDays, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { usePageHeader } from "../../context/PageHeaderContext";
import OrderColumn from "../../components/orders/OrderColumn";
import QuickOrderModal from "../../components/orders/QuickOrderModal";
import api from "../../services/api";
import { playOrderSound, isOrderSoundEnabled, setOrderSoundEnabled } from "../../utils/sound";

const ORDER_COLUMNS = [
  { id: "new", title: "Đơn mới", dot: "bg-blue-500", pill: "bg-blue-50 text-blue-600" },
  { id: "preparing", title: "Đang chuẩn bị", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-600" },
  { id: "ready", title: "Đang dùng", dot: "bg-emerald-50 text-emerald-600" },
  { id: "done", title: "Hoàn tất", dot: "bg-stone-400", pill: "bg-stone-200/80 text-stone-600" },
];

const NEXT_STATUS = { new: "preparing", preparing: "ready", ready: "done" };

const getOrderPlace = (order) => {
  if (!order.tableId && !order.tableName) return "Mang đi";
  if (order.tableName) return order.tableName;
  return `Bàn ${String(order.tableId).padStart(2, "0")}`;
};

const getOrderZone = (order) =>
  order.tableId ? order.zoneName || "Tại quán" : "takeaway";

const ZONES = ["Tầng trệt", "Lầu 1", "Sân vườn"];

const ZONE_OPTIONS = [
  { value: "all", label: "Tất cả khu vực" },
  ...ZONES.map((z) => ({ value: z, label: z })),
  { value: "takeaway", label: "Mang đi" },
];

// Helper: trả về chuỗi "YYYY-MM-DD" theo giờ địa phương
const toLocalDateStr = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const todayStr = () => toLocalDateStr(new Date());

const QUICK_DATES = [
  { label: "Hôm nay", getValue: () => todayStr() },
  {
    label: "Hôm qua",
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return toLocalDateStr(d);
    },
  },
  {
    label: "7 ngày",
    getValue: () => {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return toLocalDateStr(d);
    },
  },
];

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now);
  const [zone, setZone] = useState("all");
  const [query, setQuery] = useState("");
  const [soundOn, setSoundOn] = useState(isOrderSoundEnabled);
  const [isQuickOrderOpen, setIsQuickOrderOpen] = useState(false);

  usePageHeader({
    title: "Quản lý đơn hàng",
    subtitle: "Theo dõi luồng phục vụ theo thời gian thực",
    action: {
      label: "Tạo đơn nhanh",
      onClick: () => setIsQuickOrderOpen(true),
    },
  });

  // Lắng nghe thay đổi âm thanh từ các tab khác
  useEffect(() => {
    const onSoundChange = (e) => {
      if (e.detail?.enabled !== undefined) setSoundOn(e.detail.enabled);
    };
    window.addEventListener("cf_order_sound_change", onSoundChange);
    return () => window.removeEventListener("cf_order_sound_change", onSoundChange);
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setOrderSoundEnabled(next);
    if (next) {
      playOrderSound();
    }
  };

  // Bộ lọc theo ngày: mặc định hôm nay; "all" = tất cả ngày
  const [dateFilter, setDateFilter] = useState(todayStr());
  const [quickMode, setQuickMode] = useState("Hôm nay"); // label của QUICK_DATES đang chọn

  // Tải danh sách đơn thực tế từ Database
  const fetchOrders = useCallback(async () => {
    try {
      const res = await api.get("/orders");
      const data = res.data || [];
      const mapped = data.map((o) => ({
        id: o.id,
        code: o.code ? o.code.replace("#", "") : `CF-${o.id}`,
        status: o.status || "new",
        tableId: o.table_id,
        tableName: o.table_name || null,
        note: o.note || "",
        createdAt: o.created_at ? new Date(o.created_at).getTime() : Date.now(),
        doneAt: o.done_at ? new Date(o.done_at).getTime() : undefined,
        payment:
          o.payment_method === "cash"
            ? "Tiền mặt"
            : o.payment_method === "transfer"
            ? "Chuyển khoản"
            : "Chưa thanh toán",
        items: (o.items || []).map((i) => ({
          name: i.name,
          qty: i.quantity || 1,
          price: Number(i.unit_price || 0),
          note: i.note || "",
        })),
      }));
      setOrders(mapped);
    } catch (err) {
      console.warn("Không thể tải đơn hàng từ API:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Tự động làm mới mỗi 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
      fetchOrders();
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchOrders]);

  const visibleOrders = useMemo(() => {
    const q = query.trim().toLowerCase().replace("#", "");
    return orders.filter((o) => {
      // Lọc khu vực
      if (zone !== "all" && getOrderZone(o) !== zone) return false;
      // Lọc theo ngày (so sánh phần date của createdAt)
      if (dateFilter) {
        // Nếu quickMode là "7 ngày": lọc từ dateFilter đến hôm nay
        if (quickMode === "7 ngày") {
          const oDate = toLocalDateStr(o.createdAt);
          if (oDate < dateFilter || oDate > todayStr()) return false;
        } else {
          if (toLocalDateStr(o.createdAt) !== dateFilter) return false;
        }
      }
      // Lọc tìm kiếm
      if (
        q &&
        !String(o.id).includes(q) &&
        !getOrderPlace(o).toLowerCase().includes(q) &&
        !(o.items || []).some((item) => item.name.toLowerCase().includes(q))
      )
        return false;
      return true;
    });
  }, [orders, zone, query, dateFilter, quickMode]);

  const handleAdvance = async (orderId) => {
    const target = orders.find((o) => o.id === orderId);
    if (!target) return;
    const next = NEXT_STATUS[target.status];
    if (!next) return;

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: next } : o))
    );

    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: next,
        payment_method: target?.payment === "Chuyển khoản" ? "transfer" : "cash",
      });
      fetchOrders();
    } catch (err) {
      console.warn("Lỗi cập nhật trạng thái đơn:", err);
    }
  };

  // Kéo thả đơn sang cột bất kỳ
  const handleMoveOrder = async (orderId, newStatus) => {
    const target = orders.find((o) => o.id === orderId);
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await api.patch(`/orders/${orderId}/status`, {
        status: newStatus,
        payment_method: target?.payment === "Chuyển khoản" ? "transfer" : "cash",
      });
      fetchOrders();
    } catch (err) {
      console.warn("Lỗi chuyển cột đơn hàng:", err);
    }
  };

  const countByStatus = useMemo(() => {
    const counts = { new: 0, preparing: 0, ready: 0, done: 0 };
    visibleOrders.forEach((o) => {
      if (counts[o.status] !== undefined) counts[o.status]++;
    });
    return counts;
  }, [visibleOrders]);

  return (
    <div className="space-y-4">
      {/* ============================================================== */}
      {/* THANH ĐIỀU KHIỂN & BỘ LỌC                                       */}
      {/* ============================================================== */}
      <div className="flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm">
        {/* Hàng 1: Âm báo + Bộ lọc ngày nhanh + Input ngày */}
        <div className="flex flex-wrap items-center gap-2 justify-between">
          {/* Âm báo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleToggleSound}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50/80 text-[#E06D44] hover:bg-orange-100 transition"
              title={soundOn ? "Đang bật âm báo (Bấm để tắt hoặc thử tiếng chuông)" : "Đã tắt âm báo (Bấm để bật)"}
            >
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} className="text-stone-400" />}
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold text-stone-900 leading-tight">
                  {soundOn ? "Âm báo đơn mới đang bật" : "Âm báo đơn mới đang tắt"}
                </h4>
                {soundOn && (
                  <button
                    type="button"
                    onClick={() => playOrderSound()}
                    className="inline-flex items-center gap-1 rounded-md bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600 hover:bg-orange-50 hover:text-brand transition cursor-pointer"
                    title="Bấm để nghe thử tiếng chuông báo"
                  >
                    <Play size={9} className="fill-current" />
                    <span>Thử chuông</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5 font-medium">
                Tự làm mới mỗi 5 giây
              </p>
            </div>
          </div>

          {/* Bộ lọc ngày nhanh + input ngày */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Nút lùi/tiến ngày */}
            <button
              type="button"
              title="Ngày trước"
              onClick={() => {
                const d = new Date(dateFilter + "T00:00:00");
                d.setDate(d.getDate() - 1);
                const s = toLocalDateStr(d);
                setDateFilter(s);
                setQuickMode("");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition shadow-2xs"
            >
              <ChevronLeft size={15} />
            </button>

            {/* Các nút nhanh: Hôm nay / Hôm qua / 7 ngày */}
            {QUICK_DATES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  const val = q.getValue();
                  setDateFilter(val);
                  setQuickMode(q.label);
                }}
                className={`h-8 rounded-lg border px-3 text-xs font-semibold transition shadow-2xs ${
                  quickMode === q.label
                    ? "border-[#E06D44] bg-[#E06D44] text-white"
                    : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
                }`}
              >
                {q.label}
              </button>
            ))}

            {/* Input chọn ngày cụ thể */}
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs relative">
              <CalendarDays size={14} className="text-[#E06D44]" />
              <span>
                {dateFilter
                  ? new Date(dateFilter + "T00:00:00").toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })
                  : "Chọn ngày"}
              </span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => {
                  setDateFilter(e.target.value);
                  setQuickMode("");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              />
            </label>

            <button
              type="button"
              title="Ngày sau"
              onClick={() => {
                const d = new Date(dateFilter + "T00:00:00");
                d.setDate(d.getDate() + 1);
                const s = toLocalDateStr(d);
                setDateFilter(s);
                setQuickMode("");
              }}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50 transition shadow-2xs"
            >
              <ChevronRight size={15} />
            </button>

            {/* Nút xem tất cả */}
            <button
              type="button"
              onClick={() => { setDateFilter(""); setQuickMode(""); }}
              className={`h-8 rounded-lg border px-3 text-xs font-semibold transition shadow-2xs ${
                !dateFilter
                  ? "border-[#E06D44] bg-[#E06D44] text-white"
                  : "border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
              }`}
            >
              Tất cả
            </button>
          </div>
        </div>

        {/* Hàng 2: Lọc khu vực + Tìm đơn */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Nút dropdown Tất cả khu vực bo tròn pill */}
          <div className="relative">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-stone-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50 transition shadow-2xs">
              <MapPin size={15} className="text-stone-500" />
              <span>
                {ZONE_OPTIONS.find((z) => z.value === zone)?.label || "Tất cả khu vực"}
              </span>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                className="absolute inset-0 cursor-pointer opacity-0"
              >
                {ZONE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {/* Ô Tìm đơn bo tròn pill */}
          <div className="relative">
            <Search
              size={15}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
            />
            <input
              type="text"
              placeholder="Tìm đơn"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-36 sm:w-44 rounded-2xl border border-stone-200/90 bg-white py-2 pl-9 pr-3 text-xs font-medium text-stone-800 placeholder-stone-400 focus:border-brand focus:outline-none transition shadow-2xs"
            />
          </div>

          {/* Tổng đơn hiển thị */}
          <span className="ml-auto text-xs text-stone-400 font-medium">
            {visibleOrders.length} đơn
            {dateFilter && quickMode !== "7 ngày" && (
              <> • {new Date(dateFilter + "T00:00:00").toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit" })}</>
            )}
            {quickMode === "7 ngày" && <> • 7 ngày qua</>}
          </span>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 4 CỘT TRẠNG THÁI KANBAN (Đơn mới, Đang chuẩn bị, Sẵn sàng,...)  */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        {ORDER_COLUMNS.map((col) => {
          const colOrders = visibleOrders.filter((o) => o.status === col.id);
          return (
            <OrderColumn
              key={col.id}
              column={col}
              orders={colOrders}
              count={countByStatus[col.id] || 0}
              onMoveOrder={handleMoveOrder}
              onAdvance={handleAdvance}
              now={now}
            />
          );
        })}
      </div>

      {/* Modal Tạo đơn tại quầy khi nhấn nút cam trên Header */}
      <QuickOrderModal
        isOpen={isQuickOrderOpen}
        onClose={() => setIsQuickOrderOpen(false)}
        onOrderCreated={() => {
          fetchOrders();
        }}
      />
    </div>
  );
}
