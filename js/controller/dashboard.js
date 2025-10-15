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
    this.activeFilters = {
      accountName: "",
      resident: "",
      address: "",
      source: "",
      serviceman: "",
      type: "",
      quoteNumber: "",
      invoiceNumber: "",
      recommendation: "",
      statuses: new Set(),
    };
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
    this.initFilters();
    this.initStatusDropdown();
    this.initAccountTypeDropdown();
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
      if (!selected && window.dayjs)
        selected = window.dayjs().format("YYYY-MM-DD");
      if (!selected) selected = "1970-01-01";
      this.model.setSelectedDate(selected);
      this.renderTable(selected, this.applyActiveFilters(this.deals));
      return sampleRows;
    } catch (e) {
      console.log("fetchDeals render error", e);
      return [];
    }
  }

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
      const selected = this.model.getSelectedDate();
      this.renderTable(selected, this.applyActiveFilters(this.deals));
    };
    // Collect values only when Apply Filters is clicked
    inputs.forEach(([id, setter]) => {
      const el = byId(id);
      if (!el) return;
      // Remove live listeners; we'll read values on Apply click instead
      el._filterSetter = setter;
    });

    const applyBtn = document.getElementById('apply-filters-btn');
    const resetBtn = document.getElementById('reset-filters-btn');
    if (applyBtn) {
      applyBtn.addEventListener("click", () => {
        // Read all input values at apply time
        inputs.forEach(([id, setter]) => {
          const el = byId(id);
          if (!el) return;
          setter((el.value || "").trim());
        });
        handler();
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        // Clear text inputs
        inputs.forEach(([id, setter]) => {
          const el = byId(id);
          if (!el) return;
          el.value = '';
          setter('');
        });

        // Clear Status checkboxes
        const statusCard = document.getElementById('status-filter-card');
        if (statusCard) {
          const statusBoxes = Array.from(statusCard.querySelectorAll('input[type="checkbox"][data-status]'));
          statusBoxes.forEach((c) => (c.checked = false));
          const allToggle = statusCard.querySelector('#status-all');
          if (allToggle) allToggle.checked = false;
          this.activeFilters.statuses.clear();
        }

        // Clear Account Type checkboxes and activeFilters.type
        const typeCard = document.getElementById('account-type-filter-card');
        if (typeCard) {
          const typeBoxes = Array.from(typeCard.querySelectorAll('input[type="checkbox"][data-account-type]'));
          typeBoxes.forEach((c) => (c.checked = false));
          const allToggle = typeCard.querySelector('#account-type-all');
          if (allToggle) allToggle.checked = false;
          this.activeFilters.type = '';
        }

        // Re-render with no filters
        const selected = this.model.getSelectedDate();
        this.renderTable(selected, this.applyActiveFilters(this.deals));
      });
    }
  }

  applyActiveFilters(rows) {
    const f = this.activeFilters;
    const has = (s) => (s ?? "").toString().toLowerCase();
    const term = (k) => has(k).trim();
    const need = {
      accountName: term(f.accountName),
      resident: term(f.resident),
      address: term(f.address),
      source: term(f.source),
      serviceman: term(f.serviceman),
      type: term(f.type),
      quoteNumber: term(f.quoteNumber),
      invoiceNumber: term(f.invoiceNumber),
      recommendation: term(f.recommendation),
    };
    const hasStatus = f.statuses && f.statuses.size > 0;
    const any = Object.values(need).some((v) => v) || hasStatus;
    if (!any) return rows;
    return rows.filter((r) => {
      const client = has(r.client);
      const resident = has(r.meta?.resident || r.meta?.client || "");
      const address = has(r.meta?.address);
      const source = has(r.source);
      const serviceman = has(r.serviceman);
      const type = has(r.type);
      const quote = has(r.quoteNumber || r.meta?.quoteNumber || "");
      const invoice = has(r.invoiceNumber || r.meta?.invoiceNumber || r.meta?.invoiceNumber || "");
      const recommendation = has(r.recommendation || r.meta?.recommendation || "");
      const accountName = has(r.meta?.accountName || "");
      if (need.accountName && !accountName.includes(need.accountName)) return false;
      if (need.resident && !resident.includes(need.resident)) return false;
      if (need.address && !address.includes(need.address)) return false;
      if (need.source && !source.includes(need.source)) return false;
      if (need.serviceman && !serviceman.includes(need.serviceman))
        return false;
      if (need.type && !type.includes(need.type)) return false;
      if (need.quoteNumber && !quote.includes(need.quoteNumber)) return false;
      if (need.invoiceNumber && !invoice.includes(need.invoiceNumber))
        return false;
      if (need.recommendation && !recommendation.includes(need.recommendation))
        return false;
      if (hasStatus && !f.statuses.has(r.status)) return false;
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
      const selected = this.model.getSelectedDate();
      this.renderTable(selected, this.applyActiveFilters(this.deals));
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
    const btn = document.getElementById('account-type-filter-btn');
    const card = document.getElementById('account-type-filter-card');
    if (!btn || !card) return;

    // Toggle card visibility
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.toggle('hidden');
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!card.classList.contains('hidden') && !card.contains(e.target) && e.target !== btn) {
        card.classList.add('hidden');
      }
    });

    const allToggle = card.querySelector('#account-type-all');
    const typeBoxes = Array.from(card.querySelectorAll('input[type="checkbox"][data-account-type]'));

    const apply = () => {
      // Merge selected account types into the free-text `type` filter as a comma list
      const selected = typeBoxes.filter(c => c.checked).map(c => c.value);
      this.activeFilters.type = selected.join(', ');
      const selectedDate = this.model.getSelectedDate();
      this.renderTable(selectedDate, this.applyActiveFilters(this.deals));
    };

    const syncAllCheckbox = () => {
      const allChecked = typeBoxes.every(c => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    typeBoxes.forEach((box) => {
      box.addEventListener('change', () => {
        syncAllCheckbox();
        apply();
      });
    });

    if (allToggle) {
      allToggle.addEventListener('change', () => {
        const next = !!allToggle.checked;
        typeBoxes.forEach(c => c.checked = next);
        apply();
      });
    }

    // Initialize state
    syncAllCheckbox();
    apply();
  }
}
