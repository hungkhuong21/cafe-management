import React, { useState } from "react";
import { ArrowRight, StickyNote, GripVertical } from "lucide-react";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatTime, timeAgo } from "../../utils/date";

const NEXT_STATUS = { new: "preparing", preparing: "ready", ready: "done" };

const getOrderPlace = (order) => {
  if (!order.tableId && !order.tableName) return "Mang đi";
  if (order.tableName) return order.tableName;
  return `Bàn ${String(order.tableId).padStart(2, "0")}`;
};

const orderTotal = (order) =>
  (order.items || []).reduce(
    (sum, i) => sum + (i.qty || i.quantity || 1) * (i.price || i.unit_price || 0),
    0
  );

export default function OrderCard({
  order,
  column,
  now,
  nextTitle,
  onAdvance,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const isDone = order.status === "done";
  const canAdvance = Boolean(NEXT_STATUS[order.status]);
  const itemCount = order.items.reduce((sum, i) => sum + i.qty, 0);

  const handleDragStart = (e) => {
    e.dataTransfer.setData("text/plain", String(order.id));
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      title="Kéo thả sang cột trạng thái khác"
      className={`group rounded-2xl bg-white p-3.5 shadow-2xs border border-stone-100 transition-all duration-150 cursor-grab active:cursor-grabbing select-none hover:shadow-md hover:border-orange-200/90 ${
        isDragging
          ? "opacity-30 scale-95 ring-2 ring-orange-500 rotate-1 shadow-lg"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5">
            <GripVertical
              size={13}
              className="text-stone-300 group-hover:text-orange-500 transition-colors shrink-0"
            />
            <p className="font-bold text-stone-900 text-sm">#{order.code}</p>
          </div>
          <p className="text-[11px] text-stone-400 pl-4">
            {isDone ? formatTime(new Date(order.doneAt)) : timeAgo(order.createdAt, now)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${column.pill}`}>
            {getOrderPlace(order)}
          </span>
          {order.zoneName && order.tableId && (
            <span className="text-[10px] font-semibold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200/50">
              {order.zoneName}
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-1 text-xs text-stone-600 pl-1">
        {isDone ? (
          <p>
            {itemCount} món • {order.payment}
          </p>
        ) : (
          order.items.map((i, idx) => (
            <div key={idx} className="leading-tight">
              <span className="font-medium text-stone-800">
                {i.qty} × {i.name}
              </span>
              {i.note && (
                <span className="block text-[10px] font-semibold text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 mt-0.5 w-fit border border-amber-200/50">
                  ↳ {i.note}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      {order.note && (
        <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/80 border border-amber-100/70 px-2.5 py-2 text-xs text-amber-700">
          <StickyNote size={13} className="mt-0.5 shrink-0" />
          <span>{order.note}</span>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3">
        <p className="font-bold text-stone-900 text-xs sm:text-sm">
          {formatCurrency(orderTotal(order))}
        </p>
        <button
          type="button"
          onClick={canAdvance ? () => onAdvance(order.id) : undefined}
          title={canAdvance ? `Bấm để chuyển tiếp (hoặc kéo thả)` : "Kéo thả sang cột khác"}
          aria-label={canAdvance ? `Chuyển tiếp` : "Chi tiết"}
          className="text-[#E06D44] transition-all p-1.5 rounded-lg hover:bg-orange-50 hover:translate-x-0.5"
        >
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
