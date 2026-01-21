import { tableState } from "../ui/pages/dashboard/dashboardState.js";
export let filters = tableState.filters || {};

export function bindApplyFilters(handler) {
  const applyBtn = document.getElementById("apply-filters-btn");
  if (!applyBtn) return;
  applyBtn.addEventListener("click", () => {
    filters = collectAllFiltersFromUI();
    tableState.filters = filters;
    handler(tableState.activeTab);
    renderAppliedFilters(filters);
  });
}

export function collectAllFiltersFromUI() {
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

export function renderAppliedFilters(filters) {
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
        <div data-chip-key="${key}" data-add-btn="true" data-filter="true" data-icon="true" data-tab="false" data-type="primary" class="px-3 py-2 bg-sky-100 rounded-[20px] outline outline-1 outline-offset-[-1px] outline-blue-700 flex justify-center items-center gap-1 mr-2 hover:!bg-sky-100 active:!bg-sky-100 hover:bg-sky-100 active:bg-sky-100 focus:bg-sky-100 focus-visible:bg-sky-100 hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-blue-700 active:outline-blue-700 focus:outline-blue-700 focus-visible:outline-blue-700">
          <div class="justify-end text-blue-700 text-xs font-normal font-['Inter'] leading-3 hover:!text-blue-700 active:!text-blue-700 hover:text-blue-700 active:text-blue-700 focus:text-blue-700 focus-visible:text-blue-700 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs">${label}: ${text} </div>
          <button type="button" class="w-3 h-3 relative overflow-hidden remove-chip" aria-label="Remove ${label}">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 3 24 24" class="w-4 h-4 fill-[#003882] focus:fill-[#003882] focus-visible:fill-[#003882]">
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

  const hasChips = chips.length > 0;
  const clearAllBtn = hasChips
    ? `<button id="clear-all-filters" type="button" class="px-1 text-slate-500 text-sm font-medium whitespace-nowrap font-['Inter'] leading-4 focus:text-slate-500 focus-visible:text-slate-500 focus:text-sm focus-visible:text-sm">Clear All</button>`
    : "";

  root.innerHTML = chips.join("") + clearAllBtn;

  // Attach remove handlers
  root.querySelectorAll(".remove-chip").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const chip = e.currentTarget.closest("[data-chip-key]");
      if (!chip) return;
      const key = chip.getAttribute("data-chip-key");
      removeFilterChip(key);
    });
  });

  const clearAll = root.querySelector("#clear-all-filters");
  if (clearAll) {
    clearAll.addEventListener("click", () => clearAllFilters());
  }
}

export function removeFilterChip(key) {
  // Update in-memory filters and mirror to UI controls
  const f = filters || {};
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

  filters = f;
  // Re-render chips and refetch
  renderAppliedFilters(filters);
  handleTabChange(currentTab);
}

export function clearAppliedFiltersUI() {
  const root = document.getElementById("filter-applied");
  if (root) root.innerHTML = "";
}

export function clearAllFilters() {
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
  filters = {
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

  clearAppliedFiltersUI();
  handleTabChange(currentTab);
}

export function initGlobalSearch(handler) {
  const input = document.querySelector(
    'input[placeholder*="Search all records"]'
  );
  if (!input) return;
  const apply = () => {
    const val = (input.value || "").trim();
    filters.global = val || null;
    tableState.filters = filters;
    handler(tableState.activeTab);
  };
  input.addEventListener("input", apply);
  input.addEventListener("change", apply);
}
