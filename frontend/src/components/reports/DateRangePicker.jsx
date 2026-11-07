import React, { useState, useRef, useEffect } from "react";
import { CalendarDays, ChevronDown, Check } from "lucide-react";

export default function DateRangePicker({ selectedRange, onSelectRange }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const displayLabel = typeof selectedRange === "object" ? selectedRange?.label : selectedRange;

  // Các tùy chọn nhanh phổ biến
  const PRESET_OPTIONS = [
    { id: "today", label: "Hôm nay" },
    { id: "yesterday", label: "Hôm qua" },
    { id: "7days", label: "7 ngày gần nhất" },
    { id: "30days", label: "30 ngày gần nhất" },
    { id: "this_month", label: "Tháng này" },
    { id: "last_month", label: "Tháng trước" },
    { id: "custom", label: "Tùy chỉnh ngày..." },
  ];

  // Ngày bắt đầu và kết thúc khi chọn tùy chỉnh
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Helper tính fromDate & toDate
  const getDatesForPreset = (id) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const toYMD = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (id === "today") {
      const s = toYMD(now);
      return { fromDate: s, toDate: s };
    }
    if (id === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = toYMD(y);
      return { fromDate: s, toDate: s };
    }
    if (id === "7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { fromDate: toYMD(start), toDate: toYMD(now) };
    }
    if (id === "30days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return { fromDate: toYMD(start), toDate: toYMD(now) };
    }
    if (id === "this_month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { fromDate: toYMD(start), toDate: toYMD(now) };
    }
    if (id === "last_month") {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { fromDate: toYMD(start), toDate: toYMD(end) };
    }
    return { fromDate: toYMD(now), toDate: toYMD(now) };
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectPreset = (option) => {
    if (option.id === "custom") {
      setIsCustomMode(true);
      return;
    }

    setIsCustomMode(false);
    const { fromDate, toDate } = getDatesForPreset(option.id);
    onSelectRange({ label: option.label, fromDate, toDate });
    setIsOpen(false);
  };

  const handleApplyCustom = () => {
    if (!startDate || !endDate) return;
    const formatDisplay = (d) => {
      const [year, month, day] = d.split("-");
      return `${day}/${month}/${year}`;
    };
    const label = `${formatDisplay(startDate)} - ${formatDisplay(endDate)}`;
    onSelectRange({ label, fromDate: startDate, toDate: endDate });
    setIsOpen(false);
    setIsCustomMode(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Nút bấm hiển thị lịch */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:bg-stone-50 shadow-2xs transition active:scale-[0.98]"
      >
        <CalendarDays size={16} className="text-stone-500" />
        <span>{displayLabel}</span>
        <ChevronDown size={14} className="text-stone-400" />
      </button>

      {/* Dropdown Menu Lịch */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 origin-top-right rounded-2xl bg-white p-3 shadow-xl ring-1 ring-black/5 border border-stone-100 z-50 animate-in fade-in zoom-in-95 duration-150">
          <div className="mb-2 px-2 pt-1">
            <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Khoảng thời gian báo cáo
            </span>
          </div>

          {!isCustomMode ? (
            <div className="space-y-1">
              {PRESET_OPTIONS.map((opt) => {
                const isSelected = displayLabel === opt.label;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectPreset(opt)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition ${
                      isSelected
                        ? "bg-orange-50 font-bold text-orange-600"
                        : "text-stone-700 hover:bg-stone-50"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <Check size={14} className="text-orange-600" />}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Form chọn ngày bắt đầu & kết thúc */
            <div className="space-y-3 p-1">
              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Từ ngày:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-stone-600 mb-1">
                  Đến ngày:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-stone-200 focus:outline-none focus:border-orange-500 text-stone-800"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setIsCustomMode(false)}
                  className="flex-1 py-1.5 rounded-xl border border-stone-200 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Quay lại
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustom}
                  className="flex-1 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 shadow-xs"
                >
                  Áp dụng
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

