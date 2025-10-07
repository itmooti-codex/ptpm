import {
  createState,
  formatDisplayDate,
  getRowsForDate,
  setSelectedDate,
  statusClasses,
} from "../models/dashboard.js";
import { renderCalendar, renderTable } from "../views/dashboard.js";

export function initDashboard() {
  const calendarContainer = document.getElementById("calendar-grid");
  const tableBody = document.getElementById("inquiry-table-body");

  if (!calendarContainer || !tableBody) {
    return;
  }

  const state = createState();

  function updateTable(dateIso) {
    renderTable(
      tableBody,
      getRowsForDate(state, dateIso),
      statusClasses,
      formatDisplayDate,
      dateIso
    );
  }

  function updateCalendar() {
    renderCalendar(
      calendarContainer,
      state.calendarDays,
      state.rowTotals,
      state.selectedDate
    );
  }

  calendarContainer.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-date]");
    if (!button) return;
    const { date } = button.dataset;
    if (!date || date === state.selectedDate) return;
    setSelectedDate(state, date);
    updateCalendar();
    updateTable(state.selectedDate);
  });

  updateCalendar();
  updateTable(state.selectedDate);
}
