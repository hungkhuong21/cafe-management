import React, { useMemo } from "react";

const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const DEFAULT_EMPTY_GROUPS = [
  { name: "Chưa có doanh thu", percent: 100, stroke: "stroke-stone-200", dot: "bg-stone-300" },
];

export default function RevenueDonut({ groups: externalGroups }) {
  const groups =
    externalGroups && externalGroups.length > 0 ? externalGroups : DEFAULT_EMPTY_GROUPS;

  const segments = useMemo(() => {
    let start = 0;
    return groups.map((g) => {
      const length = (g.percent / 100) * CIRCUMFERENCE;
      const segment = { ...g, length, offset: start };
      start += length;
      return segment;
    });
  }, [groups]);
  return (
    <div className="h-full rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="font-bold text-stone-900">Doanh thu theo nhóm</h2>
      <p className="text-xs text-stone-500">Tỷ trọng trong kỳ</p>

      <div className="relative mx-auto mt-4 h-40 w-40">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={RADIUS}
            fill="none"
            strokeWidth="16"
            className="stroke-stone-100"
          />
          {segments.map((s) => (
            <circle
              key={s.name}
              cx="60"
              cy="60"
              r={RADIUS}
              fill="none"
              strokeWidth="16"
              strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
              strokeDashoffset={-s.offset}
              className={s.stroke}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-stone-900">100%</span>
          <span className="text-xs text-stone-500">doanh thu</span>
        </div>
      </div>

      <ul className="mt-5 space-y-2.5">
        {groups.map((g) => (
          <li key={g.name} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-stone-600">
              <span className={`h-2 w-2 rounded-full ${g.dot}`} />
              {g.name}
            </span>
            <span className="font-bold text-stone-900">{g.percent}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}