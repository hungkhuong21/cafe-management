import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import api from "../../services/api";

const ORDER_STATUS = {
  new: { label: "Mới", className: "bg-blue-50 text-blue-600" },
  brewing: { label: "Đang pha", className: "bg-amber-50 text-amber-600" },
  done: { label: "Đã xong", className: "bg-emerald-50 text-emerald-600" },
  served: { label: "Đã phục vụ", className: "bg-stone-100 text-stone-600" },
};

const HEADERS = ["MÃ ĐƠN", "KHU VỰC", "SỐ LƯỢNG", "TỔNG TIỀN", "TRẠNG THÁI"];

export default function RecentOrders({ refreshKey = 0 }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const res = await api.get("/dashboard/recent-orders?limit=5");
        setOrders(res.data || []);
      } catch (err) {
        console.warn("Lỗi tải đơn hàng gần đây:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, [refreshKey]);

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="flex items-center justify-between p-5">
        <div>
          <h2 className="font-bold text-stone-900">Đơn hàng gần đây</h2>
          <p className="text-xs text-stone-500">Cập nhật trực tiếp</p>
        </div>
        <Link
          to="/orders"
          className="flex items-center gap-2 text-sm font-semibold text-stone-800 hover:text-brand"
        >
          <ArrowRight size={16} />
          Xem tất cả đơn
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-stone-50 text-[11px] font-semibold tracking-wider text-stone-500">
            <tr>
              {HEADERS.map((h) => (
                <th key={h} className="px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400 text-xs">
                  Đang tải đơn hàng...
                </td>
              </tr>
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-stone-400 text-xs">
                  Chưa có đơn hàng nào hôm nay
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const status = ORDER_STATUS[order.status] || {
                  label: order.status,
                  className: "bg-stone-100 text-stone-600",
                };
                const totalItems = (order.items || []).reduce(
                  (sum, i) => sum + (i.quantity || 1),
                  0
                );
                return (
                  <tr key={order.id} className="hover:bg-stone-50/60">
                    <td className="px-5 py-4 font-bold text-stone-900">
                      {order.code || `#CF-${order.id}`}
                    </td>
                    <td className="px-5 py-4 text-stone-600">
                      {order.table_name || (order.table_id ? `Bàn ${order.table_id}` : "Mang đi")}
                    </td>
                    <td className="px-5 py-4 text-stone-600">{totalItems} món</td>
                    <td className="px-5 py-4 font-semibold text-stone-900">
                      {formatCurrency(Number(order.total_amount || 0))}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}
                      >
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}