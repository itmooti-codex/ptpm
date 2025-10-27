import { DashboardHelper } from "../helper.js";
export class DashboardController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.initStatusDropdown();
    this.initAccountTypeDropdown();
    // DOM refs (assigned in init)
    this.calendarEl = null;
    this.tableContainerEl = null;
    this.tableElements = null;

    // Bind once so we can add/remove listeners cleanly
    this.onCalendarClick = this.onCalendarClick.bind(this);
    this.dashboardHelper = new DashboardHelper();
    this.deals = [];
    this.currentTab = "inquiry";
    this.filters = this.filters || {
      global: "",
      accountName: "",
      resident: "",
      address: "",
      source: "",
      serviceman: "",
      type: "",
      quoteNumber: "",
      invoiceNumber: "",
      recommendation: "",
      priceMin: null,
      priceMax: null,
      statuses: [],
      dateFrom: null,
      dateTo: null,
    };
  }

  init({
    calendarContainerId = "calendar-grid",
    tableContainerId = "inquiry-table-container",
    topTabs: {
      navId = "top-tabs",
      panelsId = "tab-panels",
      defaultTab = "inquiry",
    } = {},
  } = {}) {
    this.calendarEl = document.getElementById(calendarContainerId);
    this.tableContainerEl = document.getElementById(tableContainerId);

    if (!this.calendarEl || !this.tableContainerEl) {
      // Even if calendar/table missing, we can still init tabs if present
      this.view.initTopTabs({
        navId,
        panelsId,
        defaultTab,
        onTabChange: (tab) => this.handleTabChange(tab),
      });
      return;
    }
    this.renderCalendar();
    this.calendarEl.addEventListener("click", this.onCalendarClick);
    this.onNotificationIconClick();
    // Client-side filtering disabled; filters will be applied server-side.
    // Wire Apply Filters to collect UI and refetch with server-side filtering
    this.bindApplyFilters();
    // Initialize top navigation tabs (Inquiry/Quote/Jobs/Payment)
    this.view.initTopTabs({
      navId,
      panelsId,
      defaultTab,
      onTabChange: (tab) => this.handleTabChange(tab),
    });

    // Bind Clear/Reset button if present
    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.clearAllFilters());
    }
  }

  destroy() {
    if (this.calendarEl) {
      this.calendarEl.removeEventListener("click", this.onCalendarClick);
    }
  }

  refresh() {
    if (this.currentTab !== "inquiry") return;
    this.renderCalendar();
    this.reRenderActiveTab();
  }

  setSelectedDateAndRender(dateIso) {
    if (this.currentTab !== "inquiry") return;
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

  async handleTabChange(tab) {
    this.currentTab = tab;
    switch (tab) {
      case "quote":
        await this.fetchQuotesAndRenderTable();
        break;
      case "payment":
        await this.fetchPaymentsAndRenderTable();
        break;
      case "jobs":
        await this.fetchJobsAndRenderTable();
        break;
      case "urgent-calls":
        await this.fetchUrgentCallsAndRenderTable();
        break;
      case "inquiry":
        await this.fetchDealsAndRenderTable();
        break;
      case "payment":

      case "urgent-calls":

      default:
        this.deals = [];
        this.clearTable(tab);
        break;
    }
  }

  clearTable(tab) {
    if (!this.tableContainerEl) return;
    const label = tab ? tab.replace(/-/g, " ") : "this tab";
    this.tableElements = this.view.renderDataTable({
      container: this.tableContainerEl,
      headers: [],
      rows: [],
      emptyState: `No data available for ${label}.`,
    });
  }

  ensureSelectedDate() {
    let selected = this.model.getSelectedDate?.();
    if (!selected && this.model.calendarDays?.length) {
      selected = this.model.calendarDays[0].iso;
    }
    if (!selected && window.dayjs) {
      selected = window.dayjs().format("YYYY-MM-DD");
    }
    if (!selected) selected = "1970-01-01";
    this.model.setSelectedDate(selected);
    return selected;
  }

  renderTable(dateIso, deals) {
    if (!this.tableContainerEl) return;
    const statusClasses = this.model.getStatusClasses();
    const formatDisplayDate = (iso) => this.model.formatDisplayDate(iso);
    const hasExplicitRows = Array.isArray(deals);
    const rows = hasExplicitRows ? deals : null;

    if (this.currentTab === "quote") {
      const quoteRows = rows ?? [];
      this.tableElements = this.view.renderQuoteTable(
        this.tableContainerEl,
        quoteRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    if (this.currentTab === "payment") {
      const paymentRows = rows ?? [];
      this.tableElements = this.view.renderPaymentTable(
        this.tableContainerEl,
        paymentRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    if (this.currentTab === "jobs") {
      const jobRows = rows ?? [];
      this.tableElements = this.view.renderJobsTable(
        this.tableContainerEl,
        jobRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    if (this.currentTab === "urgent-calls") {
      const urgentRows = rows ?? [];
      this.tableElements = this.view.renderUrgentCallsTable(
        this.tableContainerEl,
        urgentRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }
    if (this.currentTab === "payment") {
      const jobRows = rows ?? [];
      this.tableElements = this.view.renderPaymentTable(
        this.tableContainerEl,
        jobRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    if (this.currentTab === "urgent-calls") {
      const jobRows = rows ?? [];
      this.tableElements = this.view.renderUrgentCallsTable(
        this.tableContainerEl,
        jobRows,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    const selectedDate = dateIso ?? this.model.getSelectedDate();
    const inquiryRows = Array.isArray(rows) ? rows : [];
    const scopedRows = inquiryRows;

    this.tableElements = this.view.renderTable(
      this.tableContainerEl,
      this.model.getRowsForDate(selectedDate, scopedRows),
      statusClasses,
      formatDisplayDate,
      selectedDate
    );
  }

  reRenderActiveTab() {
    if (!this.tableContainerEl) return;
    if (this.currentTab === "inquiry") {
      const selected =
        this.model.getSelectedDate() ?? this.ensureSelectedDate();
      const baseRows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(selected, baseRows);
      return;
    }
    if (this.currentTab === "quote") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      return;
    }
    if (this.currentTab === "jobs") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      return;
    }
    this.clearTable(this.currentTab);
  }

  onNotificationIconClick() {
    const btn = document.getElementById("notification-btn");
    if (!btn) return;
    if (!document.getElementById("notificationPopover")) {
      this.view.createNotificationModal();
    }
    const pop = document.getElementById("notificationPopover");
    const toggle = () => {
      const willShow = pop.classList.contains("hidden");
      this.view.toggleNotificationPopover(willShow);
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    document.addEventListener("click", (e) => {
      if (!pop) return;
      if (pop.classList.contains("hidden")) return;
      const target = e.target;
      if (pop.contains(target) || btn.contains(target)) return;
      this.view.toggleNotificationPopover(false);
    });
  }

  async fetchDealsAndRenderTable() {
    try {
      const dealData =
        typeof this.model.fetchDeal === "function"
          ? await this.model.fetchDeal(this.filters)
          : {};
      const mappedDealData =
        this.dashboardHelper.mapDealToTableRow(dealData ?? {}) ?? [];
      const sampleRows = this.dashboardHelper.mapInquirysRows(
        mappedDealData,
        (iso) => this.model.formatDisplayDate(iso)
      );
      this.deals = sampleRows;
      this.reRenderActiveTab();
      return sampleRows;
    } catch (e) {
      console.log("fetchDeals render error", e);
      this.clearTable("inquiry");
      return [];
    }
  }

  async fetchQuotesAndRenderTable() {
    try {
      const quoteData =
        typeof this.model.fetchQuotesCreated === "function"
          ? await this.model.fetchQuotesCreated(this.filters)
          : {};
      const mappedQuoteData =
        this.dashboardHelper.mapDealToTableRow(quoteData ?? {}) ?? [];
      const sampleRows = this.dashboardHelper.mapQuoteRows(mappedQuoteData);
      this.deals = sampleRows;
      this.reRenderActiveTab();
      return sampleRows;
    } catch (e) {
      console.log("fetchQuotes render error", e);
      this.clearTable("quote");
      return [];
    }
  }

  async fetchPaymentsAndRenderTable() {
    try {
      // Reuse deal fetch unless a dedicated model method exists
      const fetcher =
        typeof this.model.fetchPayments === "function"
          ? () => this.model.fetchPayments(this.filters)
          : () => this.model.fetchDeal(this.filters);
      const paymentData = await fetcher();
      const mapped =
        this.dashboardHelper.mapDealToTableRow(paymentData ?? {}) ?? [];
      const rows = this.dashboardHelper.mapPaymentRows(mapped);
      this.deals = rows;
      this.renderTable(null, rows);
      return rows;
    } catch (e) {
      console.log("fetchPayments render error", e);
      this.clearTable("payment");
      return [];
    }
  }

  async fetchUrgentCallsAndRenderTable() {
    try {
      const fetcher =
        typeof this.model.fetchUrgentCalls === "function"
          ? () => this.model.fetchUrgentCalls(this.filters)
          : () => this.model.fetchDeal(this.filters);
      const urgentData = await fetcher();
      const mapped =
        this.dashboardHelper.mapDealToTableRow(urgentData ?? {}) ?? [];
      const rows = this.dashboardHelper.mapUrgentCallRows(mapped);
      this.deals = rows;
      this.renderTable(null, rows);
      return rows;
    } catch (e) {
      console.log("fetchUrgentCalls render error", e);
      this.clearTable("urgent-calls");
      return [];
    }
  }

  async fetchJobsAndRenderTable() {
    try {
      const jobData =
        typeof this.model.fetchJobs === "function"
          ? await this.model.fetchJobs(this.filters)
          : await this.model.fetchDeal(this.filters);
      const mappedJobData =
        this.dashboardHelper.mapDealToTableRow(jobData ?? {}) ?? [];
      const sampleRows = this.dashboardHelper.mapJobRows(mappedJobData);
      this.deals = sampleRows;
      this.reRenderActiveTab();
      return sampleRows;
    } catch (e) {
      console.log("fetchJobs render error", e);
      this.clearTable("jobs");
      return [];
    }
  }

  // Server-side filtering: collect filters and persist across tabs
  bindApplyFilters() {
    const applyBtn = document.getElementById("apply-filters-btn");
    if (!applyBtn) return;
    applyBtn.addEventListener("click", () => {
      this.filters = this.collectAllFiltersFromUI();
      this.handleTabChange(this.currentTab);
      this.renderAppliedFilters(this.filters);
    });
  }

  // Collect all available filters from the sidebar.
  // Hidden inputs will generally be empty; normalize empties to null.
  collectAllFiltersFromUI() {
    const byId = (id) => document.getElementById(id);
    const val = (id) => (byId(id)?.value || "").trim();
    const toNum = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };
    const statusCard = document.getElementById("status-filter-card");
    const statuses = statusCard
      ? Array.from(
          statusCard.querySelectorAll(
            'input[type="checkbox"][data-status]:checked'
          )
        ).map((c) => (c.value || "").toString().trim().toLowerCase())
      : [];
    // Account Type dropdown selections (if present)
    const typeCard = document.getElementById("account-type-filter-card");
    const accountTypes = typeCard
      ? Array.from(
          typeCard.querySelectorAll(
            'input[type="checkbox"][data-account-type]:checked'
          )
        )
          .map((c) => (c.dataset.accountType || c.value || "").trim())
          .filter(Boolean)
      : [];
    // Prefer dropdown selections; fallback to free text type field
    const typeText = val("filter-type");
    const typeCombined = accountTypes.length
      ? accountTypes.join(", ")
      : typeText || null;
    // Helper to nullify empty strings
    const nz = (s) => (s && s.length ? s : null);
    return {
      // Global
      global: nz(val("global-search")),
      // Common text filters
      accountName: nz(val("filter-account-name")),
      resident: nz(val("filter-resident")),
      address: nz(val("filter-address")),
      source: nz(val("filter-source")),
      serviceman: nz(val("filter-serviceman")),
      accountTypes,
      // IDs / numbers
      quoteNumber: nz(val("filter-quote-number")),
      invoiceNumber: nz(val("filter-invoice-number")),
      // Notes
      recommendation: nz(val("filter-recommendation")),
      // Ranges
      priceMin: toNum(val("price-min")),
      priceMax: toNum(val("price-max")),
      // Status list
      statuses,
      // Dates (generic range shown in UI)
      dateFrom: nz(val("date-from")),
      dateTo: nz(val("date-to")),
      // Payment-specific (optional — include if these inputs exist)
      xeroInvoiceStatus: nz(val("xero-invoice-status")),
      invoiceDateFrom: nz(val("invoice-date-from")),
      invoiceDateTo: nz(val("invoice-date-to")),
      dueDateFrom: nz(val("due-date-from")),
      dueDateTo: nz(val("due-date-to")),
      billPaidDateFrom: nz(val("bill-paid-date-from")),
      billPaidDateTo: nz(val("bill-paid-date-to")),
      // Urgent/task-related (optional)
      taskPropertySearch: nz(val("task-property-search")),
      // Checkboxes for task filters (if present)
      taskDueToday: !!byId("task-due-today")?.checked || null,
      taskAssignedToMe: !!byId("task-assigned-to-me")?.checked || null,
    };
  }

  // --- Applied filters UI ---
  renderAppliedFilters(filters) {
    const root = document.getElementById("filter-applied");
    if (!root) return;
    const chips = [];
    const addChip = (key, label, value) => {
      if (value == null) return;
      let text = "";
      if (Array.isArray(value)) {
        if (!value.length) return;
        text = value.join(", ");
      } else {
        text = String(value).trim();
      }
      if (!text) return;
      chips.push(`
        <div data-chip-key="${key}" data-add-btn="true" data-filter="true" data-icon="true" data-tab="false" data-type="primary" class="px-3 py-2 bg-sky-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-blue-700 flex justify-center items-center gap-1 mr-2 mb-2">
          <div class="justify-end text-blue-700 text-xs font-normal font-['Inter'] leading-3">${label}: ${text} </div>
          <button type="button" class="w-3 h-3 relative overflow-hidden remove-chip" aria-label="Remove ${label}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 3 24 24" class="w-4 h-4 fill-[#003882]">
              <path d="M6.225 4.811a1 1 0 0 0-1.414 1.414L10.586 12l-5.775 5.775a1 1 0 1 0 1.414 1.414L12 13.414l5.775 5.775a1 1 0 0 0 1.414-1.414L13.414 12l5.775-5.775a1 1 0 0 0-1.414-1.414L12 10.586 6.225 4.811z"></path>
            </svg>
          </button>
        </div>
      `);
    };

    addChip("statuses", "Status", filters.statuses || []);
    addChip("accountTypes", "Account Types", filters.accountTypes || []);
    addChip("accountName", "Account Name", filters.accountName);
    addChip("resident", "Resident", filters.resident);
    addChip("address", "Address", filters.address);
    addChip("source", "Source", filters.source);
    addChip("serviceman", "Serviceman", filters.serviceman);
    addChip("type", "Type", filters.type);
    addChip("quoteNumber", "Quote #", filters.quoteNumber);
    addChip("invoiceNumber", "Invoice #", filters.invoiceNumber);
    addChip("recommendation", "Recommendation", filters.recommendation);
    if (filters.priceMin != null || filters.priceMax != null) {
      const min = filters.priceMin != null ? filters.priceMin : "";
      const max = filters.priceMax != null ? filters.priceMax : "";
      addChip("priceRange", "Price", `${min} - ${max}`);
    }
    if (filters.dateFrom || filters.dateTo) {
      addChip("dateRange", "Quoted Date", `${filters.dateFrom || ""} –  ${filters.dateTo || ""}`);
    }
    addChip("xeroInvoiceStatus", "Xero Status", filters.xeroInvoiceStatus);
    if (filters.invoiceDateFrom || filters.invoiceDateTo) {
      addChip("invoiceDate", "Invoice Date", `${filters.invoiceDateFrom || ""} –  ${filters.invoiceDateTo || ""}`);
    }
    if (filters.dueDateFrom || filters.dueDateTo) {
      addChip("dueDate", "Due Date", `${filters.dueDateFrom || ""} –  ${filters.dueDateTo || ""}`);
    }
    if (filters.billPaidDateFrom || filters.billPaidDateTo) {
      addChip("billPaidDate", "Bill Paid", `${filters.billPaidDateFrom || ""} –  ${filters.billPaidDateTo || ""}`);
    }
    addChip("taskPropertySearch", "Task Property", filters.taskPropertySearch);
    if (filters.taskDueToday) addChip("taskDueToday", "Due Today", "Yes");
    if (filters.taskAssignedToMe) addChip("taskAssignedToMe", "Assigned To Me", "Yes");

    root.innerHTML = chips.join("") || "";

    // Attach remove handlers
    root.querySelectorAll(".remove-chip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chip = e.currentTarget.closest('[data-chip-key]');
        if (!chip) return;
        const key = chip.getAttribute('data-chip-key');
        this.removeFilterChip(key);
      });
    });
  }

  removeFilterChip(key) {
    // Update in-memory filters and mirror to UI controls
    const f = this.filters || {};
    const setVal = (id, v = "") => {
      const el = document.getElementById(id);
      if (el) el.value = v;
    };
    const uncheckAll = (selector, root = document) => {
      Array.from(root.querySelectorAll(selector)).forEach((c) => (c.checked = false));
    };

    switch (key) {
      case "statuses":
        f.statuses = [];
        {
          const card = document.getElementById("status-filter-card");
          if (card) {
            uncheckAll('input[type="checkbox"][data-status]', card);
            const allToggle = card.querySelector('#status-all');
            if (allToggle) allToggle.checked = false;
          }
        }
        break;
      case "accountTypes":
        f.accountTypes = [];
        {
          const card = document.getElementById("account-type-filter-card");
          if (card) {
            uncheckAll('input[type="checkbox"][data-account-type]', card);
            const allToggle = card.querySelector('#account-type-all');
            if (allToggle) allToggle.checked = false;
            const labelSpan = card.querySelector('#account-type-label');
            if (labelSpan) labelSpan.textContent = 'All';
          }
        }
        break;
      case "accountName":
        f.accountName = null; setVal('filter-account-name'); break;
      case "resident":
        f.resident = null; setVal('filter-resident'); break;
      case "address":
        f.address = null; setVal('filter-address'); break;
      case "source":
        f.source = null; setVal('filter-source'); break;
      case "serviceman":
        f.serviceman = null; setVal('filter-serviceman'); break;
      case "type":
        f.type = null; setVal('filter-type'); break;
      case "quoteNumber":
        f.quoteNumber = null; setVal('filter-quote-number'); break;
      case "invoiceNumber":
        f.invoiceNumber = null; setVal('filter-invoice-number'); break;
      case "recommendation":
        f.recommendation = null; setVal('filter-recommendation'); break;
      case "priceRange":
        f.priceMin = null; f.priceMax = null;
        {
          const minEl = document.getElementById('price-min');
          const maxEl = document.getElementById('price-max');
          const progress = document.getElementById('price-progress');
          if (minEl) minEl.value = minEl.min || '0';
          if (maxEl) maxEl.value = maxEl.max || '';
          if (progress) { progress.style.left = '0%'; progress.style.right = '0%'; }
        }
        break;
      case "dateRange":
        f.dateFrom = null; f.dateTo = null; setVal('date-from'); setVal('date-to'); break;
      case "xeroInvoiceStatus":
        f.xeroInvoiceStatus = null; setVal('xero-invoice-status'); break;
      case "invoiceDate":
        f.invoiceDateFrom = null; f.invoiceDateTo = null; setVal('invoice-date-from'); setVal('invoice-date-to'); break;
      case "dueDate":
        f.dueDateFrom = null; f.dueDateTo = null; setVal('due-date-from'); setVal('due-date-to'); break;
      case "billPaidDate":
        f.billPaidDateFrom = null; f.billPaidDateTo = null; setVal('bill-paid-date-from'); setVal('bill-paid-date-to'); break;
      case "taskPropertySearch":
        f.taskPropertySearch = null; setVal('task-property-search'); break;
      case "taskDueToday":
        f.taskDueToday = null; {
          const el = document.getElementById('task-due-today'); if (el) el.checked = false;
        } break;
      case "taskAssignedToMe":
        f.taskAssignedToMe = null; {
          const el = document.getElementById('task-assigned-to-me'); if (el) el.checked = false;
        } break;
      default:
        break;
    }

    this.filters = f;
    // Re-render chips and refetch
    this.renderAppliedFilters(this.filters);
    this.handleTabChange(this.currentTab);
  }

  clearAppliedFiltersUI() {
    const root = document.getElementById("filter-applied");
    if (root) root.innerHTML = "";
  }

  clearAllFilters() {
    // Text-like inputs
    const textIds = [
      "filter-account-name",
      "filter-resident",
      "filter-address",
      "filter-source",
      "filter-serviceman",
      "filter-type",
      "filter-quote-number",
      "filter-invoice-number",
      "filter-recommendation",
      "global-search",
      "date-from",
      "date-to",
      "xero-invoice-status",
      "invoice-date-from",
      "invoice-date-to",
      "due-date-from",
      "due-date-to",
      "bill-paid-date-from",
      "bill-paid-date-to",
      "task-property-search",
    ];
    textIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });

    // Status checkboxes
    const statusCard = document.getElementById("status-filter-card");
    if (statusCard) {
      Array.from(
        statusCard.querySelectorAll('input[type="checkbox"][data-status]')
      ).forEach((c) => (c.checked = false));
      const allToggle = statusCard.querySelector("#status-all");
      if (allToggle) allToggle.checked = false;
    }

    // Account Type checkboxes
    const typeCard = document.getElementById("account-type-filter-card");
    if (typeCard) {
      Array.from(
        typeCard.querySelectorAll(
          'input[type="checkbox"][data-account-type]'
        )
      ).forEach((c) => (c.checked = false));
      const allToggle = typeCard.querySelector("#account-type-all");
      if (allToggle) allToggle.checked = false;
      const labelSpan = typeCard.querySelector("#account-type-label");
      if (labelSpan) labelSpan.textContent = "All";
    }

    // Price range
    const minEl = document.getElementById("price-min");
    const maxEl = document.getElementById("price-max");
    const progress = document.getElementById("price-progress");
    if (minEl) minEl.value = minEl.min || "0";
    if (maxEl) maxEl.value = maxEl.max || "";
    if (progress) {
      progress.style.left = "0%";
      progress.style.right = "0%";
    }

    // Reset in-memory filters
    this.filters = {
      global: null,
      accountName: null,
      resident: null,
      address: null,
      source: null,
      serviceman: null,
      type: null,
      quoteNumber: null,
      invoiceNumber: null,
      recommendation: null,
      priceMin: null,
      priceMax: null,
      statuses: [],
      accountTypes: [],
      dateFrom: null,
      dateTo: null,
      xeroInvoiceStatus: null,
      invoiceDateFrom: null,
      invoiceDateTo: null,
      dueDateFrom: null,
      dueDateTo: null,
      billPaidDateFrom: null,
      billPaidDateTo: null,
      taskPropertySearch: null,
      taskDueToday: null,
      taskAssignedToMe: null,
    };

    this.clearAppliedFiltersUI();
    this.handleTabChange(this.currentTab);
  }

  /*
  initFilters() {
    const byId = (id) => document.getElementById(id);
    const inputs = [
      ["filter-account-name", (v) => (this.activeFilters.accountName = v)],
      ["filter-resident", (v) => (this.activeFilters.resident = v)],
      ["filter-address", (v) => (this.activeFilters.address = v)],
      ["filter-source", (v) => (this.activeFilters.source = v)],
      ["filter-serviceman", (v) => (this.activeFilters.serviceman = v)],
      ["filter-type", (v) => (this.activeFilters.type = v)],
      ["filter-quote-number", (v) => (this.activeFilters.quoteNumber = v)],
      ["filter-invoice-number", (v) => (this.activeFilters.invoiceNumber = v)],
      ["filter-recommendation", (v) => (this.activeFilters.recommendation = v)],
    ];
    const handler = () => {
      this.reRenderActiveTab();
    };
    // Collect values only when Apply Filters is clicked
    inputs.forEach(([id, setter]) => {
      const el = byId(id);
      if (!el) return;
      // Remove live listeners; we'll read values on Apply click instead
      el._filterSetter = setter;
    });

    const applyBtn = document.getElementById("apply-filters-btn");
    const resetBtn = document.getElementById("reset-filters-btn");
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        // Read all input values at apply time
        inputs.forEach(([id, setter]) => {
          const el = byId(id);
          if (!el) return;
          setter((el.value || "").trim());
        });
        // Read price range from sliders if present
        const minEl = document.getElementById("price-min");
        const maxEl = document.getElementById("price-max");
        if (minEl && maxEl) {
          const minVal = parseFloat(minEl.value);
          const maxVal = parseFloat(maxEl.value);
          this.activeFilters.priceMin = isFinite(minVal) ? minVal : null;
          this.activeFilters.priceMax = isFinite(maxVal) ? maxVal : null;
        }
        handler();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        // Clear text inputs
        inputs.forEach(([id, setter]) => {
          const el = byId(id);
          if (!el) return;
          el.value = "";
          setter("");
        });

        // Clear Status checkboxes
        const statusCard = document.getElementById("status-filter-card");
        if (statusCard) {
          const statusBoxes = Array.from(
            statusCard.querySelectorAll('input[type="checkbox"][data-status]')
          );
          statusBoxes.forEach((c) => (c.checked = false));
          const allToggle = statusCard.querySelector("#status-all");
          if (allToggle) allToggle.checked = false;
          this.activeFilters.statuses.clear();
        }

        // Clear Account Type checkboxes and activeFilters.type
        const typeCard = document.getElementById("account-type-filter-card");
        if (typeCard) {
          const typeBoxes = Array.from(
            typeCard.querySelectorAll(
              'input[type="checkbox"][data-account-type]'
            )
          );
          typeBoxes.forEach((c) => (c.checked = false));
          const allToggle = typeCard.querySelector("#account-type-all");
          if (allToggle) allToggle.checked = false;
          this.activeFilters.type = "";
        }

        // Reset price sliders if present
        const minEl = document.getElementById("price-min");
        const maxEl = document.getElementById("price-max");
        const progress = document.getElementById("price-progress");
        if (minEl && maxEl && progress) {
          minEl.value = "0";
          maxEl.value = maxEl.max || "10000";
          progress.style.left = "0%";
          progress.style.right = "0%";
        }
        this.activeFilters.priceMin = null;
        this.activeFilters.priceMax = null;

        // Re-render with no filters
        this.reRenderActiveTab();
      });
    }
  }

  initGlobalSearch() {
    const input = document.querySelector(
      'input[placeholder*="Search all records"]'
    );
    if (!input) return;
    const apply = () => {
      this.activeFilters.global = (input.value || "").trim();
      this.reRenderActiveTab();
    };
    input.addEventListener("input", apply);
    input.addEventListener("change", apply);
  }

  applyActiveFilters(rows) {
    if (!Array.isArray(rows)) return rows;
    const f = this.activeFilters;
    const toText = (value) => (value ?? "").toString().trim().toLowerCase();
    const toList = (value) => {
      if (!value) return [];
      if (Array.isArray(value)) {
        return value.map(toText).filter(Boolean);
      }
      if (value instanceof Set) {
        return Array.from(value).map(toText).filter(Boolean);
      }
      const textValue = toText(value);
      if (!textValue) return [];
      return textValue
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);
    };
    const need = {
      global: toText(f.global),
      accountName: toText(f.accountName),
      resident: toText(f.resident),
      address: toText(f.address),
      source: toText(f.source),
      serviceman: toText(f.serviceman),
      quoteNumber: toText(f.quoteNumber),
      invoiceNumber: toText(f.invoiceNumber),
      recommendation: toText(f.recommendation),
    };
    const typeFilters = toList(f.type);
    const statusFilters = toList(f.statuses);
    const taskStatusFilters = toList(f.taskStatuses);
    const dueTodayFilters = toList(f.dueToday);
    const assignedToFilters = toList(f.assignedTo);
    const propertySearch = toText(f.propertySearch);
    const hasPriceMin =
      typeof f.priceMin === "number" && !Number.isNaN(f.priceMin);
    const hasPriceMax =
      typeof f.priceMax === "number" && !Number.isNaN(f.priceMax);
    const hasPrice = hasPriceMin || hasPriceMax;
    const any =
      Object.values(need).some(Boolean) ||
      typeFilters.length > 0 ||
      statusFilters.length > 0 ||
      taskStatusFilters.length > 0 ||
      dueTodayFilters.length > 0 ||
      assignedToFilters.length > 0 ||
      Boolean(propertySearch) ||
      hasPrice;
    if (!any) return rows;
    return rows.filter((r) => {
      const client = toText(r.client);
      const resident = toText(r.resident ?? r.meta?.resident ?? r.client);
      const address = toText(r.meta?.address);
      const source = toText(r.source);
      const serviceman = toText(r.serviceman);
      const type = toText(r.type);
      const quote = toText(r.quoteNumber ?? r.meta?.quoteNumber);
      const invoice = toText(r.invoiceNumber ?? r.meta?.invoiceNumber);
      const recommendation = toText(r.recommendation ?? r.meta?.recommendation);
      const accountName = toText(r.meta?.accountName);
      const idValue = toText(r.id);
      const statusValue = toText(r.status);
      const taskStatusValue = toText(r.taskStatus ?? r.status);
      const dueTodayValue =
        r.dueToday === true
          ? "yes"
          : r.dueToday === false
          ? "no"
          : toText(r.dueToday);
      const assignedToValue = toText(r.assignedTo ?? r.meta?.assignedTo);

      // Global search across key fields
      if (need.global) {
        const haystack = [
          idValue,
          client,
          resident,
          address,
          source,
          serviceman,
          type,
          quote,
          invoice,
          recommendation,
          accountName,
        ]
          .filter(Boolean)
          .join(" | ");
        if (!haystack.includes(need.global)) return false;
      }
      if (need.accountName && !accountName.includes(need.accountName))
        return false;
      if (need.resident && !resident.includes(need.resident)) return false;
      if (need.address && !address.includes(need.address)) return false;
      if (need.source && !source.includes(need.source)) return false;
      if (need.serviceman && !serviceman.includes(need.serviceman))
        return false;
      if (
        typeFilters.length > 0 &&
        !typeFilters.some((value) => type.includes(value))
      )
        return false;
      if (need.quoteNumber && !quote.includes(need.quoteNumber)) return false;
      if (need.invoiceNumber && !invoice.includes(need.invoiceNumber))
        return false;
      if (need.recommendation && !recommendation.includes(need.recommendation))
        return false;
      // Price filter
      if (hasPrice) {
        const price = parseFloat(r?.meta?.price ?? r?.price ?? NaN);
        if (!Number.isFinite(price)) return false;
        if (typeof f.priceMin === "number" && price < f.priceMin) return false;
        if (typeof f.priceMax === "number" && price > f.priceMax) return false;
      }
      if (statusFilters.length > 0 && !statusFilters.includes(statusValue))
        return false;

      // Property Search (if present) checks id/address/client fields
      if (propertySearch) {
        const propHay = [idValue, address, client, resident]
          .filter(Boolean)
          .join(" | ");
        if (!propHay.includes(propertySearch)) return false;
      }

      // Task Status filter (dummy hook: compare to r.taskStatus if exists)
      if (
        taskStatusFilters.length > 0 &&
        !taskStatusFilters.includes(taskStatusValue)
      ) {
        return false;
      }

      // Due Today filter (dummy hook: compare to r.dueToday boolean if exists)
      if (
        dueTodayFilters.length > 0 &&
        (dueTodayValue === "" || !dueTodayFilters.includes(dueTodayValue))
      ) {
        return false;
      }

      // Assigned To filter (dummy hook: compare to r.assignedTo if exists)
      if (
        assignedToFilters.length > 0 &&
        !assignedToFilters.includes(assignedToValue)
      ) {
        return false;
      }
      return true;
    });
  }

  initStatusDropdown() {
    const btn = document.getElementById("status-filter-btn");
    const card = document.getElementById("status-filter-card");
    if (!btn || !card) return;

    // Toggle card
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
      }
    });

    const allToggle = card.querySelector("#status-all");
    const statusBoxes = Array.from(
      card.querySelectorAll('input[type="checkbox"][data-status]')
    );

    const syncAllCheckbox = () => {
      const allChecked = statusBoxes.every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    const apply = () => {
      this.activeFilters.statuses.clear();
      statusBoxes.forEach((c) => {
        if (c.checked) this.activeFilters.statuses.add(c.value);
      });
      this.reRenderActiveTab();
    };

    statusBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        syncAllCheckbox();
        apply();
      });
    });

    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        statusBoxes.forEach((c) => (c.checked = next));
        apply();
      });
    }

    // Initialize state
    syncAllCheckbox();
    apply();
  }

  initAccountTypeDropdown() {
    const btn = document.getElementById("account-type-filter-btn");
    const card = document.getElementById("account-type-filter-card");
    if (!btn || !card) return;

    // Toggle card visibility
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
      }
    });

    const allToggle = card.querySelector("#account-type-all");
    const typeBoxes = Array.from(
      card.querySelectorAll('input[type="checkbox"][data-account-type]')
    );

    const apply = () => {
      // Merge selected account types into the free-text `type` filter as a comma list
      const selected = typeBoxes.filter((c) => c.checked).map((c) => c.value);
      this.activeFilters.type = selected.join(", ");
      this.reRenderActiveTab();
    };

    const syncAllCheckbox = () => {
      const allChecked = typeBoxes.every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    typeBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        syncAllCheckbox();
        apply();
      });
    });

    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        typeBoxes.forEach((c) => (c.checked = next));
        apply();
      });
    }

    // Initialize state
    syncAllCheckbox();
    apply();
  }

  initTaskFilters() {
    const initDropdown = (btnId, cardId, selector, applyFn) => {
      const btn = document.getElementById(btnId);
      const card = document.getElementById(cardId);
      if (!btn || !card) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        card.classList.toggle("hidden");
      });
      document.addEventListener("click", (e) => {
        if (
          !card.classList.contains("hidden") &&
          !card.contains(e.target) &&
          e.target !== btn
        ) {
          card.classList.add("hidden");
        }
      });
      const boxes = Array.from(card.querySelectorAll(selector));
      const apply = () => {
        applyFn(boxes);
        this.reRenderActiveTab();
      };
      boxes.forEach((b) => b.addEventListener("change", apply));
      apply();
    };

    // Task Type -> reuse `type` free-text filter
    initDropdown(
      "task-type-filter-btn",
      "task-type-filter-card",
      'input[type="checkbox"][data-task-type]',
      (boxes) => {
        const vals = boxes.filter((c) => c.checked).map((c) => c.value);
        this.activeFilters.type = vals.join(", ");
      }
    );

    // Task Status -> store separately
    this.activeFilters.taskStatuses =
      this.activeFilters.taskStatuses || new Set();
    initDropdown(
      "task-status-filter-btn",
      "task-status-filter-card",
      'input[type="checkbox"][data-task-status]',
      (boxes) => {
        this.activeFilters.taskStatuses.clear();
        boxes.forEach(
          (c) => c.checked && this.activeFilters.taskStatuses.add(c.value)
        );
      }
    );

    // Due Today -> array of selections
    initDropdown(
      "due-today-filter-btn",
      "due-today-filter-card",
      'input[type="checkbox"][data-due-today]',
      (boxes) => {
        this.activeFilters.dueToday = boxes
          .filter((c) => c.checked)
          .map((c) => String(c.value).toLowerCase());
      }
    );

    // Assigned To -> array
    initDropdown(
      "assigned-to-filter-btn",
      "assigned-to-filter-card",
      'input[type="checkbox"][data-assigned-to]',
      (boxes) => {
        this.activeFilters.assignedTo = boxes
          .filter((c) => c.checked)
          .map((c) => c.value);
      }
    );

    // Property Search text input
    const propInput = document.getElementById("filter-property-search");
    if (propInput) {
      propInput.addEventListener("input", () => {
        this.activeFilters.propertySearch = propInput.value
          .trim()
          .toLowerCase();
        this.reRenderActiveTab();
      });
    }
  }

  initPriceRange() {
    const range = document.getElementById("price-range");
    const progress = document.getElementById("price-progress");
    const minSlider = document.getElementById("price-min");
    const maxSlider = document.getElementById("price-max");
    const minDisplay = document.getElementById("min-display");
    const maxDisplay = document.getElementById("max-display");
    const minLabel = document.getElementById("price-min-label");
    const maxLabel = document.getElementById("price-max-label");
    if (!range || !progress || !minSlider || !maxSlider) return;

    const fmt = (n) => `$${Number(n).toLocaleString()}`;

    const updateRange = (evt) => {
      let minVal = parseInt(minSlider.value, 10);
      let maxVal = parseInt(maxSlider.value, 10);

      // Enforce minimum gap
      const GAP = 500;
      if (maxVal - minVal < GAP) {
        if (evt && evt.target === minSlider) {
          minVal = maxVal - GAP;
          minSlider.value = String(minVal);
        } else {
          maxVal = minVal + GAP;
          maxSlider.value = String(maxVal);
        }
      }

      const minPercent = (minVal / parseInt(minSlider.max || 1, 10)) * 100;
      const maxPercent =
        100 - (maxVal / parseInt(maxSlider.max || 1, 10)) * 100;
      progress.style.left = `${minPercent}%`;
      progress.style.right = `${maxPercent}%`;

      range.dataset.min = String(minVal);
      range.dataset.max = String(maxVal);

      if (minDisplay) minDisplay.textContent = fmt(minVal);
      if (maxDisplay) maxDisplay.textContent = fmt(maxVal);
      if (minLabel) minLabel.textContent = fmt(0);
      if (maxLabel)
        maxLabel.textContent = fmt(parseInt(maxSlider.max || 10000, 10));
    };

    minSlider.addEventListener("input", updateRange);
    maxSlider.addEventListener("input", updateRange);
    // initialize on load
    updateRange();
  }
  */

  initStatusDropdown() {
    const btn = document.getElementById("status-filter-btn");
    const card = document.getElementById("status-filter-card");
    if (!btn || !card) return;

    // Toggle card
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
      }
    });

    const allToggle = card.querySelector("#status-all");
    const statusBoxes = Array.from(
      card.querySelectorAll('input[type="checkbox"][data-status]')
    );

    const syncAllCheckbox = () => {
      const allChecked = statusBoxes.every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    statusBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        syncAllCheckbox();
      });
    });

    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        statusBoxes.forEach((c) => (c.checked = next));
      });
    }

    // Initialize state
    syncAllCheckbox();
  }

  initAccountTypeDropdown() {
    const btn = document.getElementById("account-type-filter");
    const card = document.getElementById("account-type-filter-card");
    if (!btn || !card) return;

    // Toggle card visibility
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
      }
    });

    const allToggle = card.querySelector("#account-type-all");
    const typeBoxes = Array.from(
      card.querySelectorAll('input[type="checkbox"][data-account-type]')
    );

    const syncAllCheckbox = () => {
      const allChecked = typeBoxes.every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    typeBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        syncAllCheckbox();
      });
    });

    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        typeBoxes.forEach((c) => (c.checked = next));
      });
    }

    // Initialize state
    syncAllCheckbox();
  }
}
