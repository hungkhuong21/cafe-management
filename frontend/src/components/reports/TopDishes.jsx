import { Link } from "react-router-dom";
import { formatMillion } from "../../utils/formatCurrency";
import { getImageUrl } from "../../utils/imageUrl";

export default function TopDishes({ dishes = [] }) {
  return (
    <div className="h-full rounded-2xl bg-white shadow-sm">
      <div className="flex items-start justify-between p-5">
        <div>
          <h2 className="font-bold text-stone-900">Món đóng góp doanh thu</h2>
          <p className="text-xs text-stone-500">Xếp hạng trong kỳ</p>
        </div>
        <Link to="/menu" className="text-xs font-semibold text-brand hover:underline">
          Xem chi tiết
        </Link>
      </div>

      {dishes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border-t border-stone-100">
          <span className="text-3xl mb-2">☕</span>
          <p className="text-sm font-semibold text-stone-600">Chưa có món bán ra</p>
          <p className="text-xs text-stone-400 mt-0.5">Không có phát sinh đơn hàng trong khoảng thời gian này</p>
        </div>
      ) : (
        <ul>
          {dishes.map((dish, index) => (
            <li
              key={dish.id || index}
              className="flex items-center gap-4 border-t border-stone-100 px-5 py-3"
            >
              <span
                className={`w-6 text-sm font-bold ${
                  index === 0 ? "text-brand" : "text-stone-400"
                }`}
              >
                #{index + 1}
              </span>
              {dish.image_url ? (
                <img
                  src={getImageUrl(dish.image_url)}
                  alt={dish.name}
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                  onError={(e) => {
                    e.target.style.display = "none";
                    e.target.nextSibling.style.display = "flex";
                  }}
                />
              ) : null}
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-xl ${
                  dish.image_url ? "hidden" : "flex"
                }`}
              >
                {dish.emoji || "☕"}
              </div>
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-stone-900">
                {dish.name}
              </p>
              <p className="hidden text-xs text-stone-400 sm:block">
                {(dish.qty || 0).toLocaleString("vi-VN")} {dish.unit || "ly"}
              </p>
              <p className="w-20 text-right text-sm font-bold text-stone-900">
                {formatMillion(dish.revenue || 0)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}