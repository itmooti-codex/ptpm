import { InquiryHeaders, JobHeaders } from "./config.js";
import { paginationState, tableState } from "./dashboardState.js";
import { clearTable } from "../../shared/dom.js";

export class DashboardController {
  constructor(calService, inquiryService, jobService, view, calendarsStore) {
    this.calendarService = calService;
    this.inquiryService = inquiryService;
    this.jobService = jobService;
    this.view = view;
    this.calendarsStore = calendarsStore;
  }

  async init() {
    this.renderCalendar();
    this.renderInquiryTable();
    this.clearnupTabs = this.view.emitDashboardTabChangesEvent(
      this.tableTabChangesHandler.bind(this)
    );
  }

  renderCalendar() {
    let calendarElement = this.view.getCalendarElement();
    if (!calendarElement) return;

    let calendarDays = this.calendarService.getCalendarDays();
    let totalRows = this.calendarService.getRowTotals();

    let selectedDate = this.calendarService.selectedDate;
    this.calendarsStore.setSelectedDate(selectedDate);

    this.view.renderCalendar(
      calendarElement,
      calendarDays,
      totalRows,
      selectedDate
    );
  }

  destroy() {
    this.clearnupTabs?.();
  }

  async renderTable(headers, tableRows) {
    await this.view.renderTable(headers, tableRows);
  }

  async renderInquiryTable() {
    let inquiryData = await this.inquiryService.fetchInquiries({
      filters: {},
      limit: paginationState.itemsPerPage,
      offset: paginationState.offset,
    });
    this.renderTable(InquiryHeaders, inquiryData.rows);
  }

  async tableTabChangesHandler(tab) {
    if (tableState.activeTab === tab && !tableState.initialLoad) {
      return;
    }
    tableState.activeTab = tab;
    clearTable();
    switch (tab) {
      case "inquiry":
        await this.renderInquiryTable();
        break;

      case "quote":
        this.renderTable();
        break;
      case "jobs":
        let jobs = await this.jobService.fetchJobs(
          {},
          paginationState.itemsPerPage,
          paginationState.offset
        );
        this.renderTable(JobHeaders, jobs.rows);
        break;
      case "payment":
        this.renderTable();
        break;
      case "active-jobs":
        this.renderTable();
        break;
      case "urgent-calls":
        break;
      default:
        console.warn("Unknown tab:", tab);
        break;
    }

    tableState.initialLoad = false;
  }
}
