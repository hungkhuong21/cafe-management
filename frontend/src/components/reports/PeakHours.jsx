const DEFAULT_HOURS = [
  { range: "08:00 — 10:00", orders: 0 },
  { range: "12:00 — 14:00", orders: 0 },
  { range: "19:00 — 21:00", orders: 0 },
];

export default function PeakHours({ hours: externalHours }) {
  const hours = externalHours && externalHours.length > 0 ? externalHours : DEFAULT_HOURS;
  const max = Math.max(...hours.map((h) => h.orders), 1);

  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-bold text-stone-900">Khung giờ cao điểm</h2>
      <p className="text-xs text-stone-500">Đơn hàng trung bình</p>

      <ul className="mt-5 space-y-5">
        {hours.map((h) => {
          const top = h.orders === max; // khung giờ đông nhất tô màu cam
          return (
            <li key={h.range}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-stone-800">{h.range}</span>
                <span className="text-xs text-stone-400">{h.orders} đơn</span>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-stone-100">
                <div
                  className={`h-full rounded-full ${top ? "bg-brand" : "bg-sidebar"}`}
                  style={{ width: `${(h.orders / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}