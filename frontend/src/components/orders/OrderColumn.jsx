import { useState } from "react";
import OrderCard from "./OrderCard";

export default function OrderColumn({
  column,
  orders,
  count,
  now,
  nextTitle,
  onAdvance,
  onMoveOrder,
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const orderIdStr = e.dataTransfer.getData("text/plain");
    if (!orderIdStr) return;
    const orderId = Number(orderIdStr);
    if (orderId && onMoveOrder) {
      onMoveOrder(orderId, column.id);
    }
  };

  return (
    <section
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex min-h-[26rem] flex-col rounded-2xl p-3 transition-all duration-200 border ${
        isDragOver
          ? "bg-orange-50/70 border-orange-400 border-dashed ring-2 ring-orange-300 scale-[1.01]"
          : "bg-[#EFEBE4]/75 border-transparent"
      }`}
    >
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${column.dot}`} />
          <h2 className="text-sm font-bold text-stone-800">{column.title}</h2>
        </div>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-stone-600 shadow-2xs">
          {count !== undefined ? count : orders.length}
        </span>
      </div>

      {/* Hiệu ứng drop slot khi kéo đơn qua */}
      {isDragOver && (
        <div className="mb-3 rounded-xl border-2 border-dashed border-orange-400 bg-white/80 p-3 text-center text-xs font-bold text-orange-600 animate-pulse">
          + Thả đơn vào đây ({column.title})
        </div>
      )}

      <div className="flex-1 space-y-3">
        {orders.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-stone-300/80 p-4 text-center">
            <p className="text-xs font-medium text-stone-400">Chưa có đơn nào</p>
            <p className="mt-1 text-[11px] text-stone-400">Kéo đơn vào đây</p>
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              column={column}
              now={now}
              nextTitle={nextTitle}
              onAdvance={onAdvance}
              onMoveOrder={onMoveOrder}
            />
          ))
        )}
      </div>
    </section>
  );
}
