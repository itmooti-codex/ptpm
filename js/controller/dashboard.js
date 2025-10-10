export class DashboardController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // DOM refs (assigned in init)
    this.calendarEl = null;
    this.tableBodyEl = null;

    // Bind once so we can add/remove listeners cleanly
    this.onCalendarClick = this.onCalendarClick.bind(this);
  }

  init({
    calendarContainerId = "calendar-grid",
    tableBodyId = "inquiry-table-body",
  } = {}) {
    this.calendarEl = document.getElementById(calendarContainerId);
    this.tableBodyEl = document.getElementById(tableBodyId);

    if (!this.calendarEl || !this.tableBodyEl) {
      return;
    }
    this.renderCalendar();
    this.renderTable(this.model.getSelectedDate());
    this.calendarEl.addEventListener("click", this.onCalendarClick);
    this.onNotificationIconClick();
  }

  destroy() {
    if (this.calendarEl) {
      this.calendarEl.removeEventListener("click", this.onCalendarClick);
    }
  }

  refresh() {
    const selected = this.model.getSelectedDate();
    this.renderCalendar();
    this.renderTable(selected);
  }

  setSelectedDateAndRender(dateIso) {
    if (!dateIso || dateIso === this.model.getSelectedDate()) return;
    this.model.setSelectedDate(dateIso);
    this.refresh();
  }

  onCalendarClick(evt) {
    const button = evt.target.closest("button[data-date]");
    if (!button) return;
    const { date } = button.dataset;
    this.setSelectedDateAndRender(date);
  }

  renderCalendar() {
    if (!this.calendarEl) return;
    this.view.renderCalendar(
      this.calendarEl,
      this.model.getCalendarDays(),
      this.model.getRowTotals(),
      this.model.getSelectedDate()
    );
  }

  renderTable(dateIso) {
    if (!this.tableBodyEl) return;
    this.view.renderTable(
      this.tableBodyEl,
      this.model.getRowsForDate(dateIso),
      this.model.getStatusClasses(),
      (iso) => this.model.formatDisplayDate(iso),
      dateIso
    );
  }

  onNotificationIconClick() {
    let element = document.getElementById("notification-btn");
    element.addEventListener("click", () => {
      this.view.toggleNotificationPopover();
    });
  }
}
