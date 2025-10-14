import { DashboardHelper } from "../helper.js";
export class DashboardController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    // DOM refs (assigned in init)
    this.calendarEl = null;
    this.tableBodyEl = null;

    // Bind once so we can add/remove listeners cleanly
    this.onCalendarClick = this.onCalendarClick.bind(this);
    this.dashboardHelper = new DashboardHelper();
    this.deals = [];
  }

  init({
    calendarContainerId = "calendar-grid",
    tableBodyId = "inquiry-table-body",
    topTabs: {
      navId = "top-tabs",
      panelsId = "tab-panels",
      defaultTab = "inquiry",
    } = {},
  } = {}) {
    this.fetchDealsAndRenderTable();
    this.calendarEl = document.getElementById(calendarContainerId);
    this.tableBodyEl = document.getElementById(tableBodyId);

    if (!this.calendarEl || !this.tableBodyEl) {
      // Even if calendar/table missing, we can still init tabs if present
      this.view.initTopTabs({ navId, panelsId, defaultTab });
      return;
    }
    this.renderCalendar();
    this.calendarEl.addEventListener("click", this.onCalendarClick);
    this.onNotificationIconClick();
    // Initialize top navigation tabs (Inquiry/Quote/Jobs/Payment)
    this.view.initTopTabs({ navId, panelsId, defaultTab });
    // Fetch after UI is ready
  }

  destroy() {
    if (this.calendarEl) {
      this.calendarEl.removeEventListener("click", this.onCalendarClick);
    }
  }

  refresh() {
    const selected = this.model.getSelectedDate();
    this.renderCalendar();
    this.renderTable(selected, this.deals);
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

  renderTable(dateIso, deals) {
    if (!this.tableBodyEl) return;
    this.view.renderTable(
      this.tableBodyEl,
      this.model.getRowsForDate(dateIso, deals),
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

  async fetchDealsAndRenderTable() {
    try {
      const data = await this.model.fetchDeal();
      const mappedData = this.dashboardHelper.mapDealToTableRow(data);
      const sampleRows = this.dashboardHelper.mapDealsToSampleRows(
        mappedData,
        (iso) => this.model.formatDisplayDate(iso)
      );
      this.deals = sampleRows;
      // Establish a selected date if missing
      let selected = this.model.getSelectedDate?.();
      if (!selected && this.model.calendarDays?.length) {
        selected = this.model.calendarDays[0].iso;
      }
      if (!selected && window.dayjs) selected = window.dayjs().format('YYYY-MM-DD');
      if (!selected) selected = '1970-01-01';
      this.model.setSelectedDate(selected);
      this.renderTable(selected, this.deals);
      return sampleRows;
    } catch (e) {
      console.log("fetchDeals render error", e);
      return [];
    }
  }
}
