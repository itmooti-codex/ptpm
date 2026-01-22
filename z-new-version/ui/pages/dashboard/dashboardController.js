import {
  InquiryHeaders,
  JobHeaders,
  paymentHeaders,
  quotesHeaders,
  DASHBOARD_NAVIGATION_CONFIG,
  filtersConfig,
  QUERY_SOURCES,
  STATUSES,
  createViewEnquiryURL,
} from "./config.js";
import { paginationState, tableState } from "./dashboardState.js";
import { clearTable } from "../../shared/dom.js";
import {
  bindApplyFilters,
  filters,
  initGlobalSearch,
} from "../../../helpers/dashboardFilters.js";
import { initCheckboxDropdown } from "../../shared/initCheckboxdropdown.js";

export class DashboardController {
  constructor(
    calService,
    inquiryService,
    quoteService,
    jobService,
    view,
    calendarsStore,
    paymentService
  ) {
    this.calendarService = calService;
    this.inquiryService = inquiryService;
    this.jobService = jobService;
    this.quoteService = quoteService;
    this.view = view;
    this.calendarsStore = calendarsStore;
    this.paymentService = paymentService;
  }

  async init() {
    this.renderCalendar();
    this.renderInquiryTable();
    this.clearnupTabs = this.view.emitDashboardTabChangesEvent(
      this.tableTabChangesHandler.bind(this)
    );
    this.initializeDashboardTabNavigation(
      DASHBOARD_NAVIGATION_CONFIG,
      this.tableTabChangesHandler.bind(this)
    );

    this.view.renderSourceOptions(QUERY_SOURCES);
    bindApplyFilters(this.tableTabChangesHandler.bind(this));
    this.initializeFiltersDropdown();
    initGlobalSearch(this.tableTabChangesHandler.bind(this));
    this.handleEyeIconClick();
  }

  initializeFiltersDropdown() {
    initCheckboxDropdown({
      btnId: "service-provider-filter-btn",
      cardId: "service-provider-filter-card",
      checkboxSelector: 'input[type="checkbox"][data-service-provider]',
      allToggleId: "#sp-all",
    });

    initCheckboxDropdown({
      btnId: "account-type-filter",
      cardId: "account-type-filter-card",
      checkboxSelector: 'input[type="checkbox"][data-account-type]',
      allToggleId: "#account-type-all",
    });

    initCheckboxDropdown({
      btnId: "source-filter-btn",
      cardId: "source-filter-card",
      checkboxSelector: 'input[type="checkbox"][data-source]',
      allToggleId: "#source-none",
      storeTo: { target: this.filters, key: "sources" },
      onChange: () => {
        // Additional logic for source filters if needed
        // e.g. update table, call applyFilters, etc.
      },
    });
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

  async renderInquiryTable(filters) {
    let inquiryData = await this.inquiryService.fetchInquiries({
      filters,
      limit: paginationState.itemsPerPage,
      offset: paginationState.offset,
    });
    this.updatePaginationState(inquiryData.totalCount, inquiryData.totalPages);
    this.renderTable(InquiryHeaders, inquiryData.rows);
  }

  async tableTabChangesHandler(tab) {
    let filters = tableState.filters || {};
    if (tableState.activeTab === tab && tableState.initialLoad) {
      return;
    }
    tableState.activeTab = tab;
    clearTable();
    switch (tab) {
      case "inquiry":
        await this.renderInquiryTable(filters);
        this.view.renderStatusOptionsForTab(
          STATUSES.inquiryStatues,
          this.initStatusDropdown.bind(this)
        );
        break;

      case "quote":
        const quotes = await this.quoteService.fetchQuotes(
          filters,
          paginationState.itemsPerPage,
          paginationState.offset
        );
        this.updatePaginationState(quotes.totalCount, quotes.totalPages);
        this.renderTable(quotesHeaders, quotes.rows);
        this.view.renderStatusOptionsForTab(
          STATUSES.quoteStatuses,
          this.initStatusDropdown.bind(this)
        );
        break;
      case "jobs":
        let jobs = await this.jobService.fetchJobs(
          filters,
          paginationState.itemsPerPage,
          paginationState.offset
        );
        this.updatePaginationState(jobs.totalCount, jobs.totalPages);
        this.renderTable(JobHeaders, jobs.rows);
        this.view.renderStatusOptionsForTab(
          STATUSES.jobStatuses,
          this.initStatusDropdown.bind(this)
        );
        break;
      case "payment":
        let payment = await this.paymentService.fetchPayments(
          filters,
          paginationState.itemsPerPage,
          paginationState.offset
        );
        this.updatePaginationState(payment.totalCount, payment.totalPages);
        this.renderTable(paymentHeaders, payment.rows);
        this.view.renderStatusOptionsForTab(
          STATUSES.paymentStatuses,
          this.initStatusDropdown.bind(this)
        );
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

  updatePaginationState(totalCount, totalPages) {
    paginationState.totalItems = totalCount;
    paginationState.totalPages = totalPages;
  }

  initializeDashboardTabNavigation(config, handler) {
    this.initTopTabs(config, handler);
  }

  attachTabsClickListeners(nav, links, panels, context) {
    const setActive = this.view.setActiveTab.bind(this);
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("[data-tab]");
      if (!a) return;
      if (this.tabsDisabled) {
        e.preventDefault();
        return;
      }
      e.preventDefault();
      const tab = a.getAttribute("data-tab");
      setActive(tab, context, links, panels);
    });
  }

  initTopTabs(
    {
      navId = "top-tabs",
      panelsId = "tab-panels",
      defaultTab = "inquiry",
    } = {},
    handler
  ) {
    const nav = document.getElementById(navId);
    const panelsWrap = document.getElementById(panelsId);
    if (!nav) return;

    const links = [...nav.querySelectorAll("[data-tab]")];
    const panels = panelsWrap
      ? [...panelsWrap.querySelectorAll("[data-panel]")]
      : [];

    const context = {
      filtersConfig: filtersConfig || {},
      previousTab: tableState.previousTab || null,
      handler,
    };

    this.removeActiveStatus(links);
    this.attachTabsClickListeners(nav, links, panels, context);

    const initialTab = this.deriveInitialTab(nav, defaultTab);
    this.view.setActiveTab(initialTab, context, links, panels);
  }

  removeActiveStatus(links) {
    links.forEach((a) => {
      if (!a.hasAttribute("data-active"))
        a.setAttribute("data-active", "false");
    });
  }

  deriveInitialTab(nav, defaultTab) {
    const dataActive = nav.querySelector('[data-tab][data-active="true"]');
    if (dataActive) return dataActive.getAttribute("data-tab");
    return defaultTab;
  }

  initStatusDropdown() {
    const btn = document.getElementById("status-filter-btn");
    const card = document.getElementById("status-filter-card");
    if (!btn || !card) return;

    // idempotent rebind: remove old listeners if present
    const list = document.getElementById("status-filter-list") || card;
    const old = this._statusHandlers;
    if (old) {
      btn.removeEventListener("click", old.onBtnClick);
      document.removeEventListener("click", old.onDocClick);
      if (old.onListChange)
        list.removeEventListener("change", old.onListChange);
      if (old.onAllChange && old.allToggle)
        old.allToggle.removeEventListener("change", old.onAllChange);
    }

    const onBtnClick = (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");
    };
    const onDocClick = (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
      }
    };

    const allToggle = card.querySelector("#status-all");
    const syncAllCheckbox = () => {
      const boxes = card.querySelectorAll(
        'input[type="checkbox"][data-status]'
      );
      const allChecked = Array.from(boxes).every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    const onListChange = (e) => {
      const t = e.target;
      if (!(t && t.matches('input[type="checkbox"][data-status]'))) return;
      syncAllCheckbox();
      // Mirror to filters (lowercase for consistency with collection)
      const checked = Array.from(
        card.querySelectorAll('input[type="checkbox"][data-status]:checked')
      ).map((c) => (c.value || "").toString().trim().toLowerCase());
      filters.statuses = checked;
    };

    const onAllChange = () => {
      const next = !!allToggle.checked;
      card
        .querySelectorAll('input[type="checkbox"][data-status]')
        .forEach((c) => (c.checked = next));
      onListChange({ target: { matches: () => true } });
    };

    // Bind fresh
    btn.addEventListener("click", onBtnClick);
    document.addEventListener("click", onDocClick);
    list.addEventListener("change", onListChange);
    if (allToggle) allToggle.addEventListener("change", onAllChange);
    // Initialize state: restore checked boxes from applied filters
    const applied = Array.isArray(filters?.statuses) ? filters.statuses : [];
    card
      .querySelectorAll('input[type="checkbox"][data-status]')
      .forEach((c) => {
        const v = (c.value || "").toString().trim().toLowerCase();
        c.checked = applied.includes(v);
      });
    syncAllCheckbox();
    // store handlers for next re-init
    this._statusHandlers = {
      onBtnClick,
      onDocClick,
      onListChange,
      onAllChange,
      allToggle,
    };
  }

  handleEyeIconClick() {
    const tableElement = document.getElementById("inquiry-table-container");
    if (!tableElement) return;

    const iconClick = (e) => {
      const svgIcon = e.target.closest("svg#view-icon");
      if (!svgIcon) return;

      const row = svgIcon.closest("tr");
      if (!row) return;

      const rowId = row.dataset.uniqueId?.slice(1);
      if (!rowId) return;

      window.location.href = createViewEnquiryURL(rowId);
    };

    tableElement.addEventListener("click", iconClick);
  }
}
