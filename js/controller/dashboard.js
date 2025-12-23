import { DashboardHelper, hideLoader } from "../helper.js";
export class DashboardController {
  constructor(model, view, loaderRefs = {}) {
    this.model = model;
    this.view = view;
    this.loaderElement = loaderRefs.loaderElement || null;
    this.loaderMessageEl = loaderRefs.loaderMessageEl || null;
    this.loaderCounter = loaderRefs.loaderCounter || null;
    this.initAccountTypeDropdown();
    this.initServiceProviderDropdown();
    this.initSourceDropdown();
    // DOM refs (assigned in init)
    this.calendarEl = null;
    this.tableContainerEl = null;
    this.tableElements = null;

    this.inquiryStatues = [
      "New Inquiry",
      "Not Allocated",
      "Contact Client",
      "Contact For Site Visit",
      "Site Visit Scheduled",
      "Site Visit to be Re-Scheduled",
      "Generate Quote",
      "Quote Created",
      "Completed",
      "Cancelled",
      "Expired",
    ];
    this.quoteStatuses = [
      "New",
      "Requested",
      "Sent",
      "Accepted",
      "Declined",
      "Expired",
      "Cancelled",
    ];
    this.jobStatuses = [
      "Quote",
      "On Hold",
      "Booked",
      "Call Back",
      "Scheduled",
      "Reschedule",
      "In Progress",
      "Waiting For Payment",
      "Completed",
      "Cancelled",
    ];
    this.paymentStatuses = [
      "Invoice Required",
      "Invoice Sent",
      "Paid",
      "Overdue",
      "Written Off",
      "Cancelled",
    ];

    this.sources = [
      "Select none",
      "Google",
      "Bing",
      "Facebook",
      "Yellow Pages",
      "Referral",
      "Car Signage",
      "Returning Customers",
      "Other",
    ];

    this.activeJobStatuses = [];

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
      source: [],
      serviceman: "",
      type: "",
      accountTypes: [],
      quoteNumber: "",
      invoiceNumber: "",
      recommendation: "",
      priceMin: null,
      priceMax: null,
      statuses: [],
      serviceProviders: [],
      dateFrom: null,
      dateTo: null,
    };
    this.latestNotifications = [];
    this.notificationListeners = new Set();
    this.renderSourceOptionsForTab(this.sources || []);
  }

  initServiceProviderDropdown() {
    const btn = document.getElementById("service-provider-filter-btn");
    const card = document.getElementById("service-provider-filter-card");
    if (!btn || !card) return;
    const allToggle = card.querySelector("#sp-all");
    const boxes = Array.from(
      card.querySelectorAll('input[type="checkbox"][data-service-provider]')
    );
    const syncAll = () => {
      if (!allToggle) return;
      allToggle.checked = boxes.every((b) => b.checked);
    };
    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const v = allToggle.checked;
        boxes.forEach((b) => (b.checked = v));
      });
    }
    boxes.forEach((b) => b.addEventListener("change", syncAll));
    const toggle = () => card.classList.toggle("hidden");
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggle();
    });
    document.addEventListener("click", (e) => {
      if (card.classList.contains("hidden")) return;
      const t = e.target;
      if (card.contains(t) || btn.contains(t)) return;
      card.classList.add("hidden");
    });
  }

  initSourceDropdown() {
    const btn = document.getElementById("source-filter-btn");
    const card = document.getElementById("source-filter-card");
    if (!btn || !card) return;

    // idempotent rebind: remove old listeners if present
    const list = document.getElementById("source-filter-list") || card;
    const old = this._sourceHandlers;
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

    // "None" toggle
    const allToggle = card.querySelector("#source-none");

    // keep "None" in sync: checked iff every box is unchecked
    const syncAllCheckbox = () => {
      const boxes = card.querySelectorAll(
        'input[type="checkbox"][data-source]'
      );
      const allUnchecked = Array.from(boxes).every((c) => !c.checked);
      if (allToggle) allToggle.checked = allUnchecked;
    };

    const onListChange = (e) => {
      const t = e.target;
      if (!(t && t.matches('input[type="checkbox"][data-source]'))) return;

      // if any box is checked manually, uncheck "None"
      if (allToggle && t.checked) allToggle.checked = false;

      // Mirror to filters (lowercase for consistency)
      const checked = Array.from(
        card.querySelectorAll('input[type="checkbox"][data-source]:checked')
      ).map((c) => (c.value || "").toString().trim().toLowerCase());

      this.filters.sources = checked; // array

      syncAllCheckbox();
    };

    const onAllChange = () => {
      // When "None" is toggled on, uncheck everything
      const next = !!allToggle.checked; // true means "none selected"
      const boxes = card.querySelectorAll(
        'input[type="checkbox"][data-source]'
      );
      if (next) {
        boxes.forEach((c) => (c.checked = false));
        this.filters.sources = [];
      } else {
        // if user unticks "None" explicitly, don't auto-select anything;
        // just keep current selections (likely none) and resync.
        this.filters.sources = Array.from(
          card.querySelectorAll('input[type="checkbox"][data-source]:checked')
        ).map((c) => (c.value || "").toString().trim().toLowerCase());
      }
      syncAllCheckbox();
    };

    // Bind fresh
    btn.addEventListener("click", onBtnClick);
    document.addEventListener("click", onDocClick);
    list.addEventListener("change", onListChange);
    if (allToggle) allToggle.addEventListener("change", onAllChange);

    // Initialize state: restore checked boxes from applied filters
    const applied = Array.isArray(this.filters?.sources)
      ? this.filters.sources
      : [];
    card
      .querySelectorAll('input[type="checkbox"][data-source]')
      .forEach((c) => {
        const v = (c.value || "").toString().trim().toLowerCase();
        c.checked = applied.includes(v);
      });
    syncAllCheckbox();

    // store handlers for next re-init
    this._sourceHandlers = {
      onBtnClick,
      onDocClick,
      onListChange,
      onAllChange,
      allToggle,
    };
  }

  renderSourceOptionsForTab(sources) {
    const list = document.getElementById("source-filter-list");
    if (!list) return;
    Array.from(list.querySelectorAll('li[data-dynamic="true"]')).forEach((n) =>
      n.remove()
    );
    const applied = Array.isArray(this.filters?.sources)
      ? this.filters.sources.map((x) => String(x).toLowerCase())
      : [];
    const frag = document.createDocumentFragment();
    Array.from(new Set(sources || []))
      .sort((a, b) => a.localeCompare(b))
      .forEach((s) => {
        const id = `source-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const li = document.createElement("li");
        li.className = "px-2 py-1 flex items-center gap-2";
        li.setAttribute("data-dynamic", "true");
        const checked = applied.includes(s) ? "checked" : "";
        li.innerHTML = `<input id="${id}" data-source value="${s}" ${checked} type="checkbox" class="h-4 w-4 accent-[#003882]"><label for="${id}">${s}</label>`;
        frag.appendChild(li);
      });
    list.appendChild(frag);
  }

  async init({
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
      this.hidePageLoader(true);
      return;
    }

    await this.model.eachJobScheduledOnEachDate();
    // Initialize scheduled totals for the next 14 days, then render
    if (typeof this.model.initScheduledTotals === "function") {
      this.model
        .initScheduledTotals()
        .then(() => this.renderCalendar())
        .catch(() => this.renderCalendar());
    } else {
      this.renderCalendar();
    }
    this.calendarEl.addEventListener("click", this.onCalendarClick);
    this.onNotificationIconClick();
    this.loadNotifications();
    this.initGlobalSearch();
    this.bindApplyFilters();
    this.view.initTopTabs({
      navId,
      panelsId,
      defaultTab,
      onTabChange: (tab) => this.handleTabChange(tab),
    });

    const resetBtn = document.getElementById("reset-filters-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => this.clearAllFilters());
    }

    let createButton = document.getElementById("create-btn");
    createButton.addEventListener("click", () => {
      let element = document.getElementById("create-button-Popup");
      element.classList.toggle("hidden");
    });

    ["new-inquiry", "new-quote", "new-job"].forEach((item) => {
      this.attchCreateButtonListners(item);
    });
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
    try {
      switch (tab) {
        case "quote":
          await this.fetchQuotesAndRenderTable();
          break;
        case "payment":
          await this.fetchPaymentsAndRenderTable();
          break;
        case "active-jobs":
          await this.fetchActiveJobsAndRenderTable();
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
        default:
          this.deals = [];
          this.clearTable(tab);
          break;
      }
    } finally {
      this.hidePageLoader();
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

    if (this.currentTab === "inquiry") {
      const inquiryRow = rows ?? [];
      this.tableElements = this.view.renderTable(
        this.tableContainerEl,
        inquiryRow,
        statusClasses,
        formatDisplayDate
      );
      return;
    }

    if (this.currentTab === "active-jobs") {
      const activeRows = rows ?? [];
      this.tableElements = this.view.renderActiveJobsTable(
        this.tableContainerEl,
        activeRows,
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

  renderStatusOptionsForTab(statuses) {
    const card = document.getElementById("status-filter-card");
    const list = document.getElementById("status-filter-list");
    if (!card || !list) return;
    // Remove previous dynamic items (keep the first All item)
    Array.from(list.querySelectorAll('li[data-dynamic="true"]')).forEach((n) =>
      n.remove()
    );
    statuses.sort((a, b) => a.localeCompare(b));
    const frag = document.createDocumentFragment();
    const applied = Array.isArray(this.filters?.statuses)
      ? this.filters.statuses.map((x) => String(x).toLowerCase())
      : [];
    statuses.forEach((s) => {
      const id = `status-${s.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
      const li = document.createElement("li");
      li.className = "px-2 py-1 flex items-center gap-2";
      li.setAttribute("data-dynamic", "true");
      const checkedAttr = applied.includes(s.toLowerCase()) ? "checked" : "";
      li.innerHTML =
        `<input id="${id}" data-status value="${s}" ${checkedAttr} type="checkbox" class="h-4 w-4 accent-[#003882]">` +
        `<label for="${id}">${s}</label>`;
      frag.appendChild(li);
    });
    list.appendChild(frag);
    // Re-bind dropdown interactions since we replaced checkboxes
    this.initStatusDropdown();
  }

  reRenderActiveTab() {
    if (!this.tableContainerEl) return;

    if (this.currentTab === "inquiry") {
      const selected =
        this.model.getSelectedDate() ?? this.ensureSelectedDate();
      const baseRows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(selected, baseRows);
      this.renderStatusOptionsForTab(this.inquiryStatues);
      this.hidePageLoader();
      return;
    }
    if (this.currentTab === "quote") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      this.renderStatusOptionsForTab(this.quoteStatuses);
      this.hidePageLoader();
      return;
    }
    if (this.currentTab === "jobs") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      this.renderStatusOptionsForTab(this.jobStatuses);
      this.hidePageLoader();
      return;
    }
    if (this.currentTab === "active-jobs") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      this.renderStatusOptionsForTab(this.activeJobStatuses);
      this.hidePageLoader();
      return;
    }
    if (this.currentTab === "payment") {
      const rows = Array.isArray(this.deals) ? this.deals : [];
      this.renderTable(null, rows);
      this.renderStatusOptionsForTab(this.paymentStatuses);
      this.hidePageLoader();
      return;
    }
    this.clearTable(this.currentTab);
    this.hidePageLoader();
  }

  async onNotificationIconClick() {
    const btn = document.getElementById("notification-btn");
    if (!btn) return;
    if (!document.getElementById("notificationPopover")) {
      await this.view.createNotificationModal();
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

  mapNotificationsForView(list = []) {
    if (list.length == 0) return;
    if (!Array.isArray(list)) list = [list];
    return list
      .map((n) => {
        const tab = this.normalizeNotificationType(n?.type);
        const label = n?.Unique_ID
          ? `#${n.Unique_ID}`
          : n?.Title || "Notification";
        return {
          id: label,
          text: n?.Title || "Notification",
          when: this.formatNotificationDate(
            n?.Publish_Date_Time || n?.publish_date_time
          ),
          tab,
          read: n.Is_Read,
          origin_url: n.Origin_Url,
          notified_contact_id: n.Notified_Contact_ID,
        };
      })
      .filter((n) => n.text || n.when || n.id);
  }

  formatNotificationDate(value) {
    const d = window.dayjs ? window.dayjs(value) : null;
    if (d?.isValid?.()) {
      return d.format("DD MMM · h:mma");
    }
    return value || "";
  }

  normalizeNotificationType(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("action")) return "Action Required";
    return "General Updates";
  }

  async loadNotifications() {
    if (typeof this.model.fetchNotification !== "function") return;
    const mergeReadState = (incoming = []) => {
      const previous = new Map(
        (this.latestNotifications || []).map((n) => [n.id, n.read])
      );
      return (incoming || []).map((n) => ({
        ...n,
        read: previous.has(n.id) ? previous.get(n.id) : n.read ?? false,
      }));
    };
    const handleUpdate = (records = []) => {
      const mapped = this.mapNotificationsForView(records) || [];
      this.latestNotifications = mergeReadState(mapped);
      this.updateNotificationBadge();
      if (document.getElementById("notificationPopover")) {
        this.view.updateNotificationPopover?.(this.latestNotifications);
      } else {
        this.view.createNotificationModal?.(this.latestNotifications);
      }
      this.notifyNotificationListeners();
    };

    try {
      const initial = await this.model.fetchNotification(handleUpdate);
      handleUpdate(initial || []);
    } catch (error) {
      console.error("[Dashboard] Failed to load notifications", error);
    }
  }

  notifyNotificationListeners() {
    this.notificationListeners.forEach((fn) => {
      try {
        fn(this.latestNotifications);
      } catch (e) {
        console.warn("Notification listener failed", e);
      }
    });
  }

  updateNotificationBadge() {
    const badge = document.getElementById("notification-count");
    if (!badge) return;
    const unread = (this.latestNotifications || []).filter(
      (n) => !n.read
    ).length;
    badge.textContent = String(unread);
    badge.classList.toggle("hidden", unread <= 0);
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
      const sampleRows = this.dashboardHelper.mapQuoteRows(quoteData);
      this.deals = sampleRows;
      this.reRenderActiveTab();
      return sampleRows;
    } catch (e) {
      console.log("fetchQuotes render error", e);
      this.clearTable("quote");
      return [];
    }
  }

  async fetchJobsAndRenderTable() {
    try {
      const jobData =
        typeof this.model.fetchJobs === "function"
          ? await this.model.fetchJobs(this.filters)
          : {};
      const sampleRows = this.dashboardHelper.mapJobRows(jobData);
      this.deals = sampleRows;
      this.reRenderActiveTab();
      return sampleRows;
    } catch (e) {
      console.log("fetchJobs render error", e);
      this.clearTable("jobs");
      return [];
    }
  }

  async fetchPaymentsAndRenderTable() {
    try {
      // Reuse deal fetch unless a dedicated model method exists
      const paymentData =
        typeof this.model.fetchPayments === "function"
          ? await this.model.fetchPayments(this.filters)
          : [];
      const rows = this.dashboardHelper.mapPaymentRows(paymentData);
      this.deals = rows;
      this.reRenderActiveTab();
      return rows;
    } catch (e) {
      console.log("fetchPayments render error", e);
      this.clearTable("payment");
      return [];
    }
  }

  async fetchActiveJobsAndRenderTable() {
    try {
      const data =
        typeof this.model.fetchPayments === "function"
          ? await this.model.fetchActiveJobs(this.filters)
          : {};
      const rows = this.dashboardHelper.mapPaymentRows(data);
      this.deals = rows;
      this.reRenderActiveTab();
      return rows;
    } catch (e) {
      console.log("fetchActiveJobs render error", e);
      this.clearTable("active-jobs");
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

  hidePageLoader(force = false) {
    hideLoader(this.loaderElement, this.loaderCounter, force);
  }

  bindApplyFilters() {
    const applyBtn = document.getElementById("apply-filters-btn");
    if (!applyBtn) return;
    applyBtn.addEventListener("click", () => {
      this.filters = this.collectAllFiltersFromUI();
      this.handleTabChange(this.currentTab);
      this.renderAppliedFilters(this.filters);
    });
  }

  collectAllFiltersFromUI() {
    const byId = (id) => document.getElementById(id);
    const val = (id) => (byId(id)?.value || "").trim();
    const toNum = (x) => {
      const n = Number(x);
      return Number.isFinite(n) ? n : null;
    };
    // Read Source from new dropdown (checkboxes) if present
    const sourceCard = document.getElementById("source-filter-card");
    const sourcesFromDropdown = sourceCard
      ? Array.from(
          sourceCard.querySelectorAll(
            'input[type="checkbox"][data-source]:checked'
          )
        )
          .map((c) => (c.value || "").trim())
          .filter(Boolean)
      : [];
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
    const nz = (s) => (s && s.length ? s : null);
    // Service Provider selections (if present)
    const spCard = document.getElementById("service-provider-filter-card");
    const serviceProviders = spCard
      ? Array.from(
          spCard.querySelectorAll(
            'input[type="checkbox"][data-service-provider]:checked'
          )
        )
          .map((c) => (c.value || "").trim())
          .filter(Boolean)
      : [];
    return {
      // Global
      global: nz(val("global-search")),
      // Common text filters
      accountName: nz(val("filter-account-name")),
      resident: nz(val("filter-resident")),
      address: nz(val("filter-address")),
      // Prefer dropdown values; fallback to any legacy text input if present
      source: sourcesFromDropdown.length ? sourcesFromDropdown : [],
      serviceman: nz(val("filter-serviceman")),
      accountTypes: Array.isArray(accountTypes)
        ? accountTypes
        : accountTypes
        ? [accountTypes]
        : [],
      serviceProviders,
      // serviceProviders,
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
    addChip(
      "serviceProviders",
      "Service Provider",
      filters.serviceProviders || []
    );
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
      addChip(
        "dateRange",
        "Quoted Date",
        `${filters.dateFrom || ""} –  ${filters.dateTo || ""}`
      );
    }
    addChip("xeroInvoiceStatus", "Xero Status", filters.xeroInvoiceStatus);
    if (filters.invoiceDateFrom || filters.invoiceDateTo) {
      addChip(
        "invoiceDate",
        "Invoice Date",
        `${filters.invoiceDateFrom || ""} –  ${filters.invoiceDateTo || ""}`
      );
    }
    if (filters.dueDateFrom || filters.dueDateTo) {
      addChip(
        "dueDate",
        "Due Date",
        `${filters.dueDateFrom || ""} –  ${filters.dueDateTo || ""}`
      );
    }
    if (filters.billPaidDateFrom || filters.billPaidDateTo) {
      addChip(
        "billPaidDate",
        "Bill Paid",
        `${filters.billPaidDateFrom || ""} –  ${filters.billPaidDateTo || ""}`
      );
    }
    addChip("taskPropertySearch", "Task Property", filters.taskPropertySearch);
    if (filters.taskDueToday) addChip("taskDueToday", "Due Today", "Yes");
    if (filters.taskAssignedToMe)
      addChip("taskAssignedToMe", "Assigned To Me", "Yes");

    root.innerHTML = chips.join("") || "";

    // Attach remove handlers
    root.querySelectorAll(".remove-chip").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const chip = e.currentTarget.closest("[data-chip-key]");
        if (!chip) return;
        const key = chip.getAttribute("data-chip-key");
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
      Array.from(root.querySelectorAll(selector)).forEach(
        (c) => (c.checked = false)
      );
    };

    switch (key) {
      case "statuses":
        f.statuses = [];
        {
          const card = document.getElementById("status-filter-card");
          if (card) {
            uncheckAll('input[type="checkbox"][data-status]', card);
            const allToggle = card.querySelector("#status-all");
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
            const allToggle = card.querySelector("#account-type-all");
            if (allToggle) allToggle.checked = false;
            const labelSpan = card.querySelector("#account-type-label");
            if (labelSpan) labelSpan.textContent = "All";
          }
        }
        break;
      case "serviceProviders":
        f.serviceProviders = [];
        {
          const card = document.getElementById("service-provider-filter-card");
          if (card) {
            uncheckAll('input[type="checkbox"][data-service-provider]', card);
            const allToggle = card.querySelector("#sp-all");
            if (allToggle) allToggle.checked = false;
          }
        }
        break;

      case "accountName":
        f.accountName = null;
        setVal("filter-account-name");
        break;
      case "resident":
        f.resident = null;
        setVal("filter-resident");
        break;
      case "address":
        f.address = null;
        setVal("filter-address");
        break;
      case "source":
        f.source = null;
        setVal("filter-source");
        break;
      case "serviceman":
        f.serviceman = null;
        setVal("filter-serviceman");
        break;
      case "type":
        f.type = null;
        setVal("filter-type");
        break;
      case "quoteNumber":
        f.quoteNumber = null;
        setVal("filter-quote-number");
        break;
      case "invoiceNumber":
        f.invoiceNumber = null;
        setVal("filter-invoice-number");
        break;
      case "recommendation":
        f.recommendation = null;
        setVal("filter-recommendation");
        break;
      case "priceRange":
        f.priceMin = null;
        f.priceMax = null;
        {
          const minEl = document.getElementById("price-min");
          const maxEl = document.getElementById("price-max");
          const progress = document.getElementById("price-progress");
          if (minEl) minEl.value = minEl.min || "0";
          if (maxEl) maxEl.value = maxEl.max || "";
          if (progress) {
            progress.style.left = "0%";
            progress.style.right = "0%";
          }
        }
        break;
      case "dateRange":
        f.dateFrom = null;
        f.dateTo = null;
        setVal("date-from");
        setVal("date-to");
        break;
      case "xeroInvoiceStatus":
        f.xeroInvoiceStatus = null;
        setVal("xero-invoice-status");
        break;
      case "invoiceDate":
        f.invoiceDateFrom = null;
        f.invoiceDateTo = null;
        setVal("invoice-date-from");
        setVal("invoice-date-to");
        break;
      case "dueDate":
        f.dueDateFrom = null;
        f.dueDateTo = null;
        setVal("due-date-from");
        setVal("due-date-to");
        break;
      case "billPaidDate":
        f.billPaidDateFrom = null;
        f.billPaidDateTo = null;
        setVal("bill-paid-date-from");
        setVal("bill-paid-date-to");
        break;
      case "taskPropertySearch":
        f.taskPropertySearch = null;
        setVal("task-property-search");
        break;
      case "taskDueToday":
        f.taskDueToday = null;
        {
          const el = document.getElementById("task-due-today");
          if (el) el.checked = false;
        }
        break;
      case "taskAssignedToMe":
        f.taskAssignedToMe = null;
        {
          const el = document.getElementById("task-assigned-to-me");
          if (el) el.checked = false;
        }
        break;
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
        typeCard.querySelectorAll('input[type="checkbox"][data-account-type]')
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

  initGlobalSearch() {
    const input = document.querySelector(
      'input[placeholder*="Search all records"]'
    );
    if (!input) return;
    const apply = () => {
      const val = (input.value || "").trim();
      this.filters.global = val || null;
      // Refetch current tab with server-side filtering
      this.handleTabChange(this.currentTab);
      // Update chips
      this.renderAppliedFilters(this.filters);
    };
    input.addEventListener("input", apply);
    input.addEventListener("change", apply);
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
      this.filters.statuses = checked;
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
    const applied = Array.isArray(this.filters?.statuses)
      ? this.filters.statuses
      : [];
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

    syncAllCheckbox();
  }

  attchCreateButtonListners(buttonId) {
    let element = document.getElementById(buttonId);
    if (element) {
      element.addEventListener("click", async () => {
        if (buttonId == "new-job") {
          let result = await this.model.createEmptyJob();
          if (!result.isCancelling) {
            let jobId = Object.keys(result.mutations.PeterpmJob.managedData)[0];
            if (jobId) {
              const result = await this.model.fetchJobUniqueID(jobId);
              let uniqueURL = result.resp[0].field;
              if (uniqueURL) {
                window.location.replace(uniqueURL);
              }
            }
          }
          return result;
        }
      });
    }
  }
}
