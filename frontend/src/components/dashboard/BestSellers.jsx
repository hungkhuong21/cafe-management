import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { formatCurrency } from "../../utils/formatCurrency";
import { getImageUrl } from "../../utils/imageUrl";
import api from "../../services/api";

export default function BestSellers({ refreshKey = 0 }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        const res = await api.get("/dashboard/top-products?limit=3");
        setItems(res.data || []);
      } catch (err) {
        console.warn("Lỗi tải món bán chạy:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTopProducts();
  }, [refreshKey]);

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-bold text-stone-900">Món bán chạy</h2>
          <p className="text-xs text-stone-500">Top 3 hôm nay</p>
        </div>
        <Link to="/menu" className="text-xs font-semibold text-brand hover:underline">
          Xem tất cả
        </Link>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-stone-400">
          Đang tải món bán chạy...
        </div>
      ) : items.length === 0 ? (
        <div className="py-8 text-center text-xs text-stone-400">
          Chưa có đơn hàng nào hôm nay
        </div>
      ) : (
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.id || item.name} className="flex items-center gap-3">
              {item.image_url ? (
                <img
                  src={getImageUrl(item.image_url)}
                  alt={item.name}
                  className="h-12 w-12 rounded-xl object-cover border border-stone-100"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-stone-100 text-2xl">
                  {item.emoji || "☕"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-stone-900">{item.name}</p>
                <p className="text-xs text-stone-500">{item.sold}</p>
              </div>
              <p className="text-sm font-bold text-stone-900">{formatCurrency(item.price)}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
