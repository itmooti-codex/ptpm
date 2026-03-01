import { useMemo } from "react";

function buildDays(count = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function toIso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function DashboardCalendar({ calendarData = {} }) {
  const days = useMemo(() => buildDays(14), []);

  return (
    <div className="w-full border-b border-slate-200 bg-white">
      <div className="flex w-full gap-1 px-4 py-2">
        {days.map((day) => {
          const iso = toIso(day);
          const dayName = DAY_NAMES[day.getDay()];
          const dateNum = day.getDate();
          const month = MONTH_NAMES[day.getMonth()];
          const count = calendarData[iso] ?? 0;

          return (
            <div
              key={iso}
              className="flex flex-1 flex-col items-center rounded bg-slate-50 py-2 text-xs text-slate-700"
            >
              <span className="font-medium">{dayName}</span>
              <span className="text-base font-semibold leading-tight">{dateNum}</span>
              <span className="text-slate-400">{month}</span>
              <span className="mt-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-200 px-1 text-[10px] font-semibold text-slate-600">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
