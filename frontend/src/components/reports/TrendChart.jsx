import { useState } from "react";
import Segmented from "../common/Segmented";
import { TrendingUp, TrendingDown, ArrowRight, Calendar, ShoppingBag } from "lucide-react";

const TREND_RANGES = [
  { value: "day", label: "Ngày" },
  { value: "week", label: "Tuần" },
  { value: "month", label: "Tháng" },
  { value: "year", label: "Năm" },
];

const fmt = (n) =>
  Number(n || 0).toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

const formatVND = (n) =>
  `${Number(n || 0).toLocaleString("vi-VN")} đ`;

export default function TrendChart({
  data: externalData = [],
  subtitle: externalSubtitle = "",
  comparison = null,
  range: externalRange,
  onRangeChange,
}) {
  const [internalRange, setInternalRange] = useState("day");
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const currentRange = externalRange !== undefined ? externalRange : internalRange;

  const handleRangeChange = (val) => {
    setHoveredIndex(null);
    if (onRangeChange) {
      onRangeChange(val);
    } else {
      setInternalRange(val);
    }
  };

  const defaultSubtitles = {
    day: "Khung giờ trong ngày (8h — 22h) • triệu đồng",
    week: "8 tuần gần nhất • triệu đồng",
    month: "12 tháng gần nhất • triệu đồng",
    year: "Theo các năm • triệu đồng",
  };

  const subtitle = externalSubtitle || defaultSubtitles[currentRange] || "Theo thời gian • triệu đồng";
  const data = externalData || [];

  // Tìm mức doanh thu cao nhất (cả kỳ này lẫn kỳ trước) để căn tỷ lệ cột
  const max = Math.max(
    ...data.flatMap((d) => [Number(d.value || 0), Number(d.prev_value || 0)]),
    0.1
  );

  // Tính tăng trưởng tổng thể
  const totalCurrent = comparison?.total_current ?? data.reduce((s, d) => s + (d.raw_value || 0), 0);
  const totalPrevious = comparison?.total_previous ?? data.reduce((s, d) => s + (d.prev_raw_value || 0), 0);
  let overallGrowth = 0;
  if (totalPrevious > 0) {
    overallGrowth = Number((((totalCurrent - totalPrevious) / totalPrevious) * 100).toFixed(1));
  } else if (totalCurrent > 0) {
    overallGrowth = 100;
  }
  const isPositiveGrowth = overallGrowth >= 0;

  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-sm border border-stone-100/80 flex flex-col justify-between">
      {/* Header biểu đồ: Tiêu đề + Tabs Ngày/Tuần/Tháng/Năm + Tóm tắt so sánh */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="font-bold text-stone-900 text-base">Xu hướng doanh thu</h2>
              {/* Badge tăng trưởng so với kỳ trước */}
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isPositiveGrowth
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200/50"
                    : "bg-rose-50 text-rose-600 border border-rose-200/50"
                }`}
                title="So sánh với cùng kỳ trước đó"
              >
                {isPositiveGrowth ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                <span>
                  {overallGrowth >= 0 ? `+${overallGrowth}%` : `${overallGrowth}%`}
                </span>
                <span className="text-[10px] text-stone-400 font-normal hidden sm:inline">kỳ trước</span>
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">{subtitle}</p>
          </div>

          <div className="flex items-center gap-2">
            <Segmented options={TREND_RANGES} value={currentRange} onChange={handleRangeChange} />
          </div>
        </div>

        {/* Chú thích (Legend) */}
        <div className="mt-3 flex items-center justify-between text-xs text-stone-500 border-b border-stone-100 pb-2.5">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand" />
              <span className="font-medium text-stone-700">Kỳ này</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-stone-300" />
              <span className="font-medium text-stone-400">Kỳ trước</span>
            </div>
          </div>
          <span className="text-[11px] text-stone-400 italic hidden sm:inline">
            💡 Rê chuột vào cột để xem chi tiết
          </span>
        </div>
      </div>

      {/* Vùng vẽ biểu đồ */}
      <div className="relative mt-4">
        {/* Các cột biểu đồ */}
        <div className="flex h-56 items-end gap-1.5 sm:gap-2.5 pt-6 px-1">
          {data.map((d, index) => {
            const isHovered = hoveredIndex === index;
            const currentHeight = max > 0 ? (d.value / max) * 100 : 0;
            const prevHeight = max > 0 && d.prev_value ? (d.prev_value / max) * 100 : 0;
            const isPeak = d.value === max && max > 0;

            return (
              <div
                key={d.label + index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative flex h-full flex-1 flex-col items-center justify-end cursor-pointer"
              >
                {/* Tooltip nổi tương tác khi hover trực tiếp trên cột */}
                {isHovered && (
                  <div
                    className={`pointer-events-none absolute -top-24 z-30 flex flex-col animate-in fade-in zoom-in-95 duration-150 ${
                      index <= 1
                        ? "left-0 items-start"
                        : index >= data.length - 2
                        ? "right-0 items-end"
                        : "left-1/2 -translate-x-1/2 items-center"
                    }`}
                  >
                    <div className="rounded-xl bg-stone-900/95 backdrop-blur-md px-3.5 py-2 text-white shadow-xl ring-1 ring-white/10 text-xs text-left min-w-[190px]">
                      <div className="flex items-center justify-between border-b border-stone-700/60 pb-1 mb-1.5 font-bold text-stone-200 text-[11px] gap-2">
                        <span className="flex items-center gap-1">
                          <Calendar size={11} className="text-brand" />
                          {d.full_label || d.label}
                        </span>
                        {d.orders !== undefined && (
                          <span className="flex items-center gap-0.5 text-stone-400 font-normal">
                            <ShoppingBag size={10} />
                            {d.orders} đơn
                          </span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-stone-400">Kỳ này:</span>
                          <span className="font-bold text-brand">
                            {formatVND(d.raw_value)}
                          </span>
                        </div>
                        {d.prev_raw_value !== undefined && (
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-stone-400">Kỳ trước:</span>
                            <span className="text-stone-300 font-medium">
                              {formatVND(d.prev_raw_value)}
                            </span>
                          </div>
                        )}
                        {d.diff_percent !== undefined && (
                          <div className="flex items-center justify-between pt-0.5 text-[11px] font-semibold border-t border-stone-800">
                            <span className="text-stone-400">Chênh lệch:</span>
                            <span className={d.diff_percent >= 0 ? "text-emerald-400" : "text-rose-400"}>
                              {d.diff_percent >= 0 ? `↑ +${d.diff_percent}%` : `↓ ${d.diff_percent}%`}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* Mũi tên nhỏ bên dưới tooltip */}
                    <div
                      className={`h-1.5 w-3 bg-stone-900/95 [clip-path:polygon(50%_100%,0_0,100%_0)] ${
                        index <= 1 ? "ml-4" : index >= data.length - 2 ? "mr-4" : ""
                      }`}
                    />
                  </div>
                )}

                {/* Giá trị trên đầu cột */}
                <span
                  className={`text-[10px] mb-1.5 transition-all truncate max-w-full ${
                    isHovered
                      ? "font-bold text-brand scale-110"
                      : isPeak
                      ? "font-bold text-stone-900"
                      : "text-stone-400 group-hover:text-stone-600"
                  }`}
                >
                  {fmt(d.value)}
                </span>

                {/* Khung chứa cột kép (Kỳ trước và Kỳ này) */}
                <div className="flex w-full items-end justify-center gap-1 h-[78%]">
                  {/* Cột kỳ trước (màu xám nhạt) */}
                  {d.prev_value !== undefined && (
                    <div
                      className={`w-full max-w-[12px] sm:max-w-[14px] rounded-t-md transition-all duration-300 ${
                        isHovered ? "bg-stone-400/80" : "bg-stone-200/90"
                      }`}
                      style={{
                        height: `${Math.max(prevHeight, 2)}%`,
                      }}
                    />
                  )}

                  {/* Cột kỳ này (màu cam thương hiệu, nổi bật khi hover) */}
                  <div
                    className={`w-full max-w-[16px] sm:max-w-[22px] rounded-t-md transition-all duration-300 ${
                      isHovered
                        ? "bg-[#D95D39] ring-2 ring-orange-300 shadow-md scale-y-[1.03]"
                        : isPeak
                        ? "bg-brand shadow-xs"
                        : "bg-brand/85 group-hover:bg-brand"
                    }`}
                    style={{
                      height: `${Math.max(currentHeight, 2)}%`,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Nhãn trục hoành (X-Axis) */}
        <div className="mt-2.5 flex gap-1.5 sm:gap-2.5 border-t border-stone-100 pt-2 px-1">
          {data.map((d, index) => {
            const isHovered = hoveredIndex === index;
            return (
              <span
                key={d.label + index}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                className={`flex-1 text-center text-[10px] sm:text-[11px] truncate transition-colors cursor-pointer ${
                  isHovered ? "font-bold text-brand" : "text-stone-400 hover:text-stone-600"
                }`}
              >
                {d.label}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
