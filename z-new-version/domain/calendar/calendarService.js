const dayjsRef = window.dayjs;
if (!dayjsRef) {
  throw new Error("Day.js is required for the dashboard model to operate.");
}
const TZ = "Australia/Brisbane";

export const DASHBOARD_DEFAULTS = {
  dayCount: 14,
  startDate: dayjsRef.tz
    ? dayjsRef.tz(dayjsRef(), TZ).startOf("day")
    : dayjsRef(dayjsRef().startOf("day")),
  totalsPattern: Array(14).fill(0),
  rowTotals: [0, 0],
};

export class CalendarService {
  constructor() {
    this.dayCount = DASHBOARD_DEFAULTS.dayCount;
    this.startDate = DASHBOARD_DEFAULTS.startDate;
    this.totalsPattern = DASHBOARD_DEFAULTS.totalsPattern;
    this.rowTotals = DASHBOARD_DEFAULTS.rowTotals;
    this.calendarDays = this.#buildCalendarDays();
    this.selectedDate = this.calendarDays[0]?.iso;
    this.inquiryDataByDate = {};
  }

  getCalendarDays() {
    return this.calendarDays;
  }

  getRowTotals() {
    return this.rowTotals;
  }

  #buildCalendarDays() {
    return Array.from({ length: this.dayCount }, (_, index) => {
      const current = this.startDate.add(index, "day");
      return {
        iso: current.format("YYYY-MM-DD"),
        label: current.format("ddd D/M"),
        total:
          this.totalsPattern[index] ??
          this.totalsPattern[index % this.totalsPattern.length],
      };
    });
  }
}
