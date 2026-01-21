import { showSaveViewAsModal, showAlertModal } from "../helper.js";

export function renderDynamicTable({
  container,
  headers = [],
  rows = [],
  emptyState = "No records found.",
  zebra = false,
  getRowClass = null,
  tableClass = "w-full table-fixed text-sm text-slate-700",
  theadClass = "bg-[#f5f8ff] text-xs font-semibold uppercase tracking-wide border-b border-slate-200",
  tbodyClass = "bg-white",
  defaultHeaderClass = "truncate px-6 py-4 text-left",
  defaultCellClass = "px-6 py-4 text-slate-600",
  emptyCellClass = "px-6 py-6 text-center text-sm text-slate-500",
} = {}) {
  const root =
    typeof container === "string"
      ? document.querySelector(container)
      : container;
  if (!root) return null;

  const normalisedHeaders = headers.map((header, index) => {
    if (typeof header === "string") {
      return { key: index, label: header };
    }
    if (header == null || typeof header !== "object") {
      return { key: index, label: String(header ?? "") };
    }
    if (header.key == null) {
      return { ...header, key: header.label ?? index };
    }
    return header;
  });

  const createCellContent = (cell, value) => {
    if (value instanceof Node) {
      cell.appendChild(value);
      return;
    }
    if (value == null) {
      cell.textContent = "";
      return;
    }
    if (typeof value === "string") {
      cell.innerHTML = value;
      return;
    }
    if (
      typeof value === "object" &&
      Object.prototype.hasOwnProperty.call(value, "__html")
    ) {
      cell.innerHTML = value.__html ?? "";
      return;
    }
    cell.textContent = String(value);
  };

  root.innerHTML = "";
  const table = document.createElement("table");
  table.className = tableClass;

  const thead = document.createElement("thead");
  thead.className = theadClass;
  const headRow = document.createElement("tr");

  normalisedHeaders.forEach((header) => {
    const th = document.createElement("th");
    th.scope = "col";
    th.className = header.headerClass ?? defaultHeaderClass;
    const colLabel = header.label ?? header.key ?? "";
    if (header.colSpan != null) th.colSpan = header.colSpan;
    if (header.rowSpan != null) th.rowSpan = header.rowSpan;
    if (header.html != null) {
      th.innerHTML = header.html;
    } else {
      th.textContent = header.label ?? "";
    }
    th.setAttribute("data-col", colLabel);
    headRow.appendChild(th);
  });

  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.className = tbodyClass;

  if (!rows.length) {
    const emptyRow = document.createElement("tr");
    const emptyCell = document.createElement("td");
    emptyCell.colSpan = normalisedHeaders.length || 1;
    emptyCell.className = emptyCellClass;
    const emptyValue =
      typeof emptyState === "function" ? emptyState() : emptyState;
    createCellContent(emptyCell, emptyValue);
    emptyRow.appendChild(emptyCell);
    tbody.appendChild(emptyRow);
  } else {
    rows.forEach((row, rowIndex) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-unique-id", row.id);
      const zebraClass = zebra
        ? rowIndex % 2 === 0
          ? "bg-white"
          : "bg-[#f5f8ff]"
        : "";
      const extraRowClass =
        typeof getRowClass === "function" ? getRowClass(row, rowIndex) : "";
      const rowClass = [zebraClass, extraRowClass]
        .filter(Boolean)
        .join(" ")
        .trim();
      if (rowClass) tr.className = rowClass;

      normalisedHeaders.forEach((header, columnIndex) => {
        const td = document.createElement("td");
        td.className = header.cellClass ?? defaultCellClass;
        td.setAttribute("data-col", header.label ?? header.key ?? "");
        let cellValue;
        if (typeof header.render === "function") {
          cellValue = header.render(row, {
            rowIndex,
            columnIndex,
            header,
          });
        } else if (Array.isArray(row)) {
          cellValue = row[columnIndex];
        } else if (header.key != null) {
          cellValue = row[header.key];
        }

        createCellContent(td, cellValue);
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });
  }

  table.appendChild(tbody);
  root.appendChild(table);
  return { table, thead, tbody };
}

export class DashboardView {
  constructor(overrides = {}, model) {
    this.model = model;
    this.iconButtonGroup =
      overrides.iconButtonGroup ??
      `
      <div class="mt-2 flex items-center gap-2">
        <a data-action="call" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:!border-brand-300 hover:!text-brand-600 hover:!border-slate-200 active:!border-slate-200 hover:!bg-white active:!bg-white hover:!text-brand-500 active:!text-brand-500 hover:border active:border focus:border focus-visible:border hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:text-brand-500 active:text-brand-500 focus:text-brand-500 focus-visible:text-brand-500 hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm" aria-label="Call" title="Call">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z"/></svg>
        </a>
        <a data-action="email" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:!border-brand-300 hover:!text-brand-600 hover:!border-slate-200 active:!border-slate-200 hover:!bg-white active:!bg-white hover:!text-brand-500 active:!text-brand-500 hover:border active:border focus:border focus-visible:border hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:text-brand-500 active:text-brand-500 focus:text-brand-500 focus-visible:text-brand-500 hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm" aria-label="Email" title="Email">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z"/><path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z"/></svg>
        </a>
        <a data-action="address" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:!border-brand-300 hover:!text-brand-600 hover:!border-slate-200 active:!border-slate-200 hover:!bg-white active:!bg-white hover:!text-brand-500 active:!text-brand-500 hover:border active:border focus:border focus-visible:border hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:text-brand-500 active:text-brand-500 focus:text-brand-500 focus-visible:text-brand-500 hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm" aria-label="Location" title="Address">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    `;

    this.actionButtons =
      overrides.actionButtons ??
      `
      <div class="flex items-center justify-center gap-4">
        <svg id="view-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.6283 7.59794C14.6089 7.55406 14.1383 6.51017 13.0922 5.46405C11.6983 4.07016 9.93776 3.3335 7.99998 3.3335C6.0622 3.3335 4.30164 4.07016 2.90775 5.46405C1.86164 6.51017 1.38886 7.55572 1.37164 7.59794C1.34637 7.65478 1.33331 7.7163 1.33331 7.7785C1.33331 7.8407 1.34637 7.90222 1.37164 7.95905C1.39109 8.00294 1.86164 9.04628 2.90775 10.0924C4.30164 11.4857 6.0622 12.2224 7.99998 12.2224C9.93776 12.2224 11.6983 11.4857 13.0922 10.0924C14.1383 9.04628 14.6089 8.00294 14.6283 7.95905C14.6536 7.90222 14.6666 7.8407 14.6666 7.7785C14.6666 7.7163 14.6536 7.65478 14.6283 7.59794ZM7.99998 10.0002C7.56047 10.0002 7.13082 9.86984 6.76538 9.62566C6.39994 9.38147 6.11511 9.03441 5.94691 8.62835C5.77872 8.22229 5.73471 7.77548 5.82046 7.34441C5.9062 6.91334 6.11785 6.51738 6.42863 6.20659C6.73941 5.89581 7.13538 5.68416 7.56644 5.59842C7.99751 5.51267 8.44433 5.55668 8.85039 5.72488C9.25645 5.89307 9.60351 6.1779 9.84769 6.54334C10.0919 6.90879 10.2222 7.33843 10.2222 7.77794C10.2222 8.36731 9.98808 8.93255 9.57133 9.34929C9.15458 9.76604 8.58935 10.0002 7.99998 10.0002Z" fill="#636D88"/></svg>
        <svg id="add-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.00001 1.3335C6.68147 1.3335 5.39254 1.72449 4.29621 2.45703C3.19988 3.18957 2.3454 4.23077 1.84082 5.44894C1.33623 6.66711 1.20421 8.00756 1.46144 9.30076C1.71868 10.594 2.35362 11.7819 3.28597 12.7142C4.21832 13.6466 5.4062 14.2815 6.69941 14.5387C7.99262 14.796 9.33306 14.6639 10.5512 14.1594C11.7694 13.6548 12.8106 12.8003 13.5431 11.704C14.2757 10.6076 14.6667 9.3187 14.6667 8.00016C14.6648 6.23263 13.9618 4.53802 12.712 3.28818C11.4622 2.03834 9.76755 1.33536 8.00001 1.3335ZM8.00001 13.6412C6.88432 13.6412 5.79369 13.3103 4.86603 12.6905C3.93836 12.0707 3.21534 11.1897 2.78838 10.1589C2.36143 9.12813 2.24972 7.9939 2.46738 6.89965C2.68504 5.8054 3.22229 4.80027 4.0112 4.01135C4.80012 3.22244 5.80525 2.68519 6.8995 2.46753C7.99375 2.24987 9.12798 2.36158 10.1587 2.78853C11.1895 3.21549 12.0705 3.93851 12.6904 4.86618C13.3102 5.79384 13.641 6.88447 13.641 8.00016C13.6393 9.49573 13.0445 10.9296 11.9869 11.9871C10.9294 13.0446 9.49558 13.6395 8.00001 13.6412ZM11.0769 8.00016C11.0769 8.13617 11.0229 8.26661 10.9267 8.36278C10.8306 8.45895 10.7001 8.51298 10.5641 8.51298H8.51283V10.5643C8.51283 10.7003 8.4588 10.8307 8.36263 10.9269C8.26646 11.0231 8.13602 11.0771 8.00001 11.0771C7.864 11.0771 7.73356 11.0231 7.63739 10.9269C7.54122 10.8307 7.48719 10.7003 7.48719 10.5643V8.51298H5.43591C5.2999 8.51298 5.16946 8.45895 5.07329 8.36278C4.97712 8.26661 4.92309 8.13617 4.92309 8.00016C4.92309 7.86415 4.97712 7.73372 5.07329 7.63754C5.16946 7.54137 5.2999 7.48734 5.43591 7.48734H7.48719V5.43606C7.48719 5.30005 7.54122 5.16961 7.63739 5.07344C7.73356 4.97727 7.864 4.92324 8.00001 4.92324C8.13602 4.92324 8.26646 4.97727 8.36263 5.07344C8.4588 5.16961 8.51283 5.30005 8.51283 5.43606V7.48734H10.5641C10.7001 7.48734 10.8306 7.54137 10.9267 7.63754C11.0229 7.73372 11.0769 7.86415 11.0769 8.00016Z" fill="#636D88"/></svg>
        <svg id="delete-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M13.7949 3.38478H11.2308V2.87196C11.2308 2.46393 11.0687 2.07262 10.7802 1.7841C10.4916 1.49558 10.1003 1.3335 9.69231 1.3335H6.61539C6.20736 1.3335 5.81605 1.49558 5.52753 1.7841C5.23901 2.07262 5.07692 2.46393 5.07692 2.87196V3.38478H2.51282C2.37681 3.38478 2.24637 3.43881 2.1502 3.53498C2.05403 3.63115 2 3.76159 2 3.8976C2 4.03361 2.05403 4.16405 2.1502 4.26022C2.24637 4.35639 2.37681 4.41042 2.51282 4.41042H3.02564V13.6412C3.02564 13.9132 3.1337 14.1741 3.32604 14.3664C3.51839 14.5588 3.77927 14.6668 4.05128 14.6668H12.2564C12.5284 14.6668 12.7893 14.5588 12.9816 14.3664C13.174 14.1741 13.2821 13.9132 13.2821 13.6412V4.41042H13.7949C13.9309 4.41042 14.0613 4.35639 14.1575 4.26022C14.2537 4.16405 14.3077 4.03361 14.3077 3.8976C14.3077 3.76159 14.2537 3.63115 14.1575 3.53498C14.0613 3.43881 13.9309 3.38478 13.7949 3.38478ZM7.12821 11.0771C7.12821 11.2131 7.07418 11.3435 6.978 11.4397C6.88183 11.5359 6.75139 11.5899 6.61539 11.5899C6.47938 11.5899 6.34894 11.5359 6.25277 11.4397C6.15659 11.3435 6.10256 11.2131 6.10256 11.0771V6.97452C6.10256 6.83851 6.15659 6.70808 6.25277 6.6119C6.34894 6.51573 6.47938 6.4617 6.61539 6.4617C6.75139 6.4617 6.88183 6.51573 6.978 6.6119C7.07418 6.70808 7.12821 6.83851 7.12821 6.97452V11.0771ZM10.2051 11.0771C10.2051 11.2131 10.1511 11.3435 10.0549 11.4397C9.95876 11.5359 9.82832 11.5899 9.69231 11.5899C9.5563 11.5899 9.42586 11.5359 9.32969 11.4397C9.23352 11.3435 9.17949 11.2131 9.17949 11.0771V6.97452C9.17949 6.83851 9.23352 6.70808 9.32969 6.6119C9.42586 6.51573 9.5563 6.4617 9.69231 6.6119C9.82832 6.6119 9.95876 6.51573 10.0549 6.6119C10.1511 6.70808 10.2051 6.83851 10.2051 6.97452V11.0771ZM10.2051 3.38478H6.10256V2.87196C6.10256 2.73595 6.15659 2.60551 6.25277 2.50934C6.34894 2.41317 6.47938 2.35914 6.61539 2.35914H9.69231C9.82832 2.35914 9.95876 2.41317 10.0549 2.50934C10.1511 2.60551 10.2051 2.73595 10.2051 2.87196V3.38478Z" fill="#636D88"/></svg>
      </div>
    `;
    this.init();
    this.previousTab = "";

    this.filtersConfig = {
      quote: [
        "status-filter-btn",
        "service-provider-filter-btn",
        "account-name-filter",
        "resident-search-filter",
        "address-filter",
        "account-type-filter",
        "taken-by-filter",
        "Source-filter",
        "date-filters",
        "quote-number-filter",
        "recommendation-filter",
        "price-range-filter",
      ],
      inquiry: [
        "status-filter-btn",
        "account-name-filter",
        "resident-search-filter",
        "address-filter",
        "account-type-filter",
        "taken-by-filter",
        "Source-filter",
      ],
      jobs: [
        "status-filter-btn",
        "service-provider-filter-btn",
        "account-name-filter",
        "resident-search-filter",
        "address-filter",
        "account-type-filter",
        "taken-by-filter",
        "Source-filter",
        "date-filters",
        "quote-number-filter",
        "invoice-number-filter",
        "recommendation-filter",
        "price-range-filter",
      ],
      payment: [
        "status-filter-btn",
        "service-provider-filter-btn",
        "account-name-filter",
        "resident-search-filter",
        "address-filter",
        "account-type-filter",
        "taken-by-filter",
        "Source-filter",
        "date-filters",
        "quote-number-filter",
        "invoice-number-filter",
        "recommendation-filter",
        "price-range-filter",
      ],
      "active-jobs": [
        "status-filter-btn",
        "service-provider-filter-btn",
        "account-name-filter",
        "resident-search-filter",
        "address-filter",
        "account-type-filter",
        "taken-by-filter",
        "Source-filter",
        "date-filters",
        "quote-number-filter",
        "invoice-number-filter",
        "recommendation-filter",
        "price-range-filter",
      ],
      "urgent-calls": ["job-filters", "task-filters"],
    };
    this.handleActionButtonClick();
    this.tabsDisabled = false;
    this.isEditColumnsMode = false;
    this._editColumnsBound = false;
    this.editColumnsContainer = null;
    this.editModeActions = null;
    this.editColumnsButton = null;
    this.bindEditColumns();
    this.bindSaveViewAsButton();
  }

  openSaveViewAsModal({ onSave } = {}) {
    showSaveViewAsModal({
      onSave: (name) => {
        if (!name) {
          showAlertModal({
            title: "Save View As",
            message: "Please enter a view name.",
            buttonLabel: "OK",
          });
          return false;
        }
        if (typeof onSave === "function") onSave(name);
        return true;
      },
    });
  }

  bindSaveViewAsButton() {
    if (this._saveViewBound) return;
    this._saveViewBound = true;
    const btn = document.getElementById("save-view-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      this.openSaveViewAsModal({
        onSave: (name) => {
          let button = this.createCustomEditButton(name);
          document.getElementById("top-tabs")?.appendChild(button);
        },
      });
    });
  }

  createCustomEditButton(value) {
    let button = document.createElement("button");
    if (button._isCreated) return;
    button._isCreated = true;
    button.classList =
      "pl-2 ml-9 px-4 border-l-slate-100 text-[#003882] bg-white border-b border-[#003882] hover:text-[#003882] active:text-[#003882] focus:ttext-[#003882] focus-visible:text-[#003882]";
    button.textContent = value;
    return button;
  }

  buildClientContactIcons(meta = {}) {
    const email = meta.email || "";
    const sms = meta.sms || "";
    const address = meta.address || "";
    const emailHref = email ? `mailto:${email}` : "#";
    const mapHref = address
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          address
        )}`
      : "#";
    const callHref = sms ? `tel:${sms}` : "#";

    return `
      <div class="mt-2 flex items-center gap-2">
        <a data-action="call" href="${callHref}" ${
      sms ? "" : 'aria-disabled="true"'
    } title="${sms}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z"/></svg>
        </a>
        <a data-action="email" href="${emailHref}" ${
      email ? "" : 'aria-disabled="true"'
    } title="${email}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z"/><path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z"/></svg>
        </a>
        <a data-action="address" href="${mapHref}" ${
      address ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'
    } title="${address}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="#003882"><path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    `;
  }

  buildClientCell(row) {
    const meta = row?.meta ?? {};
    return `
      <div class="font-normal text-slate-700 hover:!text-slate-700 active:!text-slate-700 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700">${
        row.client ?? ""
      }</div>
      ${this.buildClientContactIcons(meta)}
    `;
  }

  buildStatusBadge(row, statusClasses = {}) {
    const status = row?.status ?? "-";
    const badgeClass = statusClasses[status] ?? "bg-slate-100 text-slate-600";
    return `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass} hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs">${status}</span>`;
  }

  renderDataTable(config = {}) {
    return renderDynamicTable({
      tableClass: "min-w-[720px] w-full table-auto text-sm text-slate-700",
      theadClass:
        "bg-[#f5f8ff] text-[11px] sm:text-xs font-semibold uppercase tracking-wide border-b border-slate-200",
      tbodyClass: "bg-white",
      defaultHeaderClass: "px-3 sm:px-6 py-3 sm:py-4 text-left",
      defaultCellClass: "px-3 sm:px-6 py-3 sm:py-4 text-slate-600",
      emptyCellClass: "px-3 sm:px-6 py-6 text-center text-sm text-slate-500",
      ...config,
    });
  }

  // NAV: Filters panel toggle — setupResponsiveLayout
  // Quick note: this controls showing/hiding the left filters panel (#filters-panel)
  // Search token: "NAV: Filters panel toggle"
  setupResponsiveLayout() {
    const filterPanel = document.getElementById("filters-panel");
    const toggleBtn = document.getElementById("filters-toggle");
    const closeBtn = document.getElementById("filters-close");

    if (!filterPanel || !toggleBtn) return;

    const showFilters = () => {
      filterPanel.classList.remove("hidden");
      toggleBtn.setAttribute("aria-expanded", "true");
    };

    const hideFilters = () => {
      if (window.innerWidth >= 1024) return;
      filterPanel.classList.add("hidden");
      toggleBtn.setAttribute("aria-expanded", "false");
    };

    toggleBtn.addEventListener("click", () => {
      const isHidden = filterPanel.classList.contains("hidden");
      if (isHidden) {
        showFilters();
      } else {
        hideFilters();
      }
    });

    closeBtn?.addEventListener("click", hideFilters);

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        showFilters();
      } else {
        hideFilters();
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
  }

  init() {
    this.createCreateButtonPopup();
    this.setupResponsiveLayout();
    // lightweight toast container
    if (!document.getElementById("dashboardToast")) {
      const t = document.createElement("div");
      t.id = "dashboardToast";
      t.className =
        "hidden fixed top-6 right-6 z-50 max-w-sm w-[360px] bg-white border border-slate-200 shadow-xl rounded-lg";
      t.innerHTML = `<div class="px-4 py-3 text-sm text-slate-800 flex items-start gap-2 hover:!text-slate-800 active:!text-slate-800  hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800"><svg class="w-5 h-5 text-red-500 mt-0.5 hover:!text-red-500 active:!text-red-500 hover:text-red-500 active:text-red-500 focus:text-red-500 focus-visible:text-red-500" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v6h-2zm0 8h2v2h-2z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg><div id="dashboardToastMsg" class="flex-1"></div></div>`;
      document.body.appendChild(t);
    }
  }

  showToast(message = "") {
    const wrap = document.getElementById("dashboardToast");
    const msg = document.getElementById("dashboardToastMsg");
    if (!wrap || !msg) return;
    msg.textContent = message;
    wrap.classList.remove("hidden");
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => wrap.classList.add("hidden"), 3000);
  }

  renderCalendar(container, calendarDays, rowTotals, selectedDate) {
    const daysPerRow = 7;
    const rows = [];
    for (let i = 0; i < calendarDays.length; i += daysPerRow) {
      rows.push(calendarDays.slice(i, i + daysPerRow));
    }

    container.innerHTML = rows
      .map((row, rowIndex) => {
        const rowTotal = Number.isFinite(rowTotals?.[rowIndex])
          ? Number(rowTotals[rowIndex])
          : row.reduce(
              (sum, d) =>
                sum + (Number.isFinite(Number(d.total)) ? Number(d.total) : 0),
              0
            );

        const dayCols = row
          .map((day) => {
            const dayTotal = Number.isFinite(Number(day.total))
              ? Number(day.total)
              : 0;
            const isSelected = day.iso === selectedDate;
            const cellBorder = isSelected
              ? "border-emerald-200"
              : "border-gray-300";
            const headerState = isSelected
              ? "bg-sky-100 text-sky-800"
              : "bg-white text-neutral-700";
            const valueState = isSelected
              ? "bg-emerald-50 text-sky-800"
              : "bg-white text-slate-500";

            return `
              <button
                type="button"
                class="flex flex-1 basis-0 min-w-0 inline-flex flex-col justify-start items-start focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                data-date="${day.iso}"
                aria-pressed="${isSelected}"
              >
                <div class="self-stretch px-2 sm:px-3 py-2 sm:py-3 border-r border-t border-b ${cellBorder} inline-flex justify-center items-center gap-1 sm:gap-2 ${headerState} text-xs sm:text-sm font-medium leading-5 sm:leading-4 whitespace-nowrap focus:border-r focus-visible:border-r focus:border-t focus-visible:border-t focus:border-b focus-visible:border-b focus:text-xs focus-visible:text-xs focus:sm:text-sm focus-visible:sm:text-sm">
                  ${day.label}
                </div>
                <div class="h-[50px] self-stretch px-2 sm:px-3 py-2 sm:py-3 ${valueState} border-r border-b ${cellBorder} inline-flex justify-center items-center gap-2 sm:gap-3 focus:border-r focus-visible:border-r focus:border-b focus-visible:border-b">
                  <div class="text-xs sm:text-sm font-normal leading-5 tracking-tight whitespace-nowrap focus:text-xs focus-visible:text-xs focus:sm:text-sm focus-visible:sm:text-sm">
                    ${dayTotal.toString().padStart(2, "0")}
                  </div>
                </div>
              </button>
            `;
          })
          .join("");

        return `
            <div class="w-full bg-white rounded-lg border border-gray-300 inline-flex flex-col overflow-hidden hover:!bg-white active:!bg-white hover:!border-gray-300 active:!border-gray-300 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300">
              <div class="flex w-full">
                ${dayCols}
                <div class="flex flex-1 min-w-0 bg-neutral-100 inline-flex flex-col hover:!bg-neutral-100 active:!bg-neutral-100 hover:bg-neutral-100 active:bg-neutral-100 focus:bg-neutral-100 focus-visible:bg-neutral-100">
                  <div class="px-2 sm:px-3 py-2 sm:py-3 bg-[#003882] border-r border-b border-gray-300 flex justify-center items-center hover:!bg-[#003882] active:!bg-[#003882] hover:!border-gray-300 active:!border-gray-300 hover:bg-[#003882] active:bg-[#003882] focus:bg-[#003882] focus-visible:bg-[#003882] hover:border-r active:border-r focus:border-r focus-visible:border-r hover:border-b active:border-b focus:border-b focus-visible:border-b hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300">
                    <div class="text-white text-xs sm:text-sm font-semibold whitespace-nowrap hover:!text-white active:!text-white hover:text-white active:text-white focus:text-white focus-visible:text-white hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:sm:text-sm active:sm:text-sm focus:sm:text-sm focus-visible:sm:text-sm">Total</div>
                  </div>
                  <div class="flex-1 px-2 sm:px-3 py-2 sm:py-3 bg-sky-100 border-r border-b border-gray-300 flex justify-center items-center hover:!bg-sky-100 active:!bg-sky-100 hover:!border-gray-300 active:!border-gray-300 hover:bg-sky-100 active:bg-sky-100 focus:bg-sky-100 focus-visible:bg-sky-100 hover:border-r active:border-r focus:border-r focus-visible:border-r hover:border-b active:border-b focus:border-b focus-visible:border-b hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300">
                    <div class="text-sky-900 text-xs sm:text-sm font-semibold whitespace-nowrap hover:!text-sky-900 active:!text-sky-900 hover:text-sky-900 active:text-sky-900 focus:text-sky-900 focus-visible:text-sky-900 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:sm:text-sm active:sm:text-sm focus:sm:text-sm focus-visible:sm:text-sm">
                      ${rowTotal.toString().padStart(2, "0")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
        `;
      })
      .join("");
  }

  renderTable(container, rows, statusClasses, formatDisplayDate, dateIso) {
    if (!container) return null;

    const headers = [
      {
        key: "id",
        label: "Unique ID",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) =>
          `<a href="#" class="font-normal text-[#0052CC] hover:!underline hover:!text-[#0052CC] active:!text-[#0052CC] hover:text-[#0052CC] active:text-[#0052CC] focus:text-[#0052CC] focus-visible:text-[#0052CC]">${
            row.id ?? ""
          }</a>`,
      },
      {
        key: "client",
        label: "Client Info",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) => this.buildClientCell(row),
      },
      {
        key: "created",
        label: "Created Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        html: `
          <span class="inline-flex items-center gap-1">
            Created Date
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400 hover:!text-brand-400 active:!text-brand-400 hover:text-brand-400 active:text-brand-400 focus:text-brand-400 focus-visible:text-brand-400" viewBox="0 0 20 20" fill="none">
              <path d="M7 8l3-3 3 3M7 12l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        `,
      },
      {
        key: "serviceman",
        label: "Serviceman",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
      },
      {
        key: "followUp",
        label: "Follow Up",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        html: `
          <span class="inline-flex items-center gap-1">
            Follow Up
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400 hover:!text-brand-400 active:!text-brand-400 hover:text-brand-400 active:text-brand-400 focus:text-brand-400 focus-visible:text-brand-400" viewBox="0 0 20 20" fill="none">
              <path d="M7 8l3-3 3 3M7 12l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </span>
        `,
      },
      {
        key: "source",
        label: "Source",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
      },
      {
        key: "service",
        label: "Service Inquiry",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
      },
      {
        key: "type",
        label: "Type",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
      },
      {
        key: "status",
        label: "Status",
        headerClass: "px-6 py-4 text-center",
        cellClass: "px-6 py-4 text-center",
        render: (row) => this.buildStatusBadge(row, statusClasses),
      },
      {
        key: "actions",
        label: "Action",
        headerClass: "px-6 py-4 text-center",
        cellClass: "px-6 py-4 text-center",
        render: () => this.actionButtons,
      },
    ];

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: `No inquiries scheduled for ${formatDisplayDate(dateIso)}.`,
      getRowClass: (_row, idx) =>
        `${
          idx % 2 === 0 ? "bg-white" : "bg-[#f5f8ff]"
        } transition-colors hover:bg-brand-50/40`,
    });
  }

  renderQuoteTable(container, rows, statusClasses, formatDisplayDate) {
    if (!container) return null;

    const money = (n) =>
      n == null || Number.isNaN(Number(n))
        ? "-"
        : `$${Number(n).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
    const headers = [
      {
        key: "id",
        label: "Unique ID",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
      },
      {
        key: "client",
        label: "Client Info",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) => this.buildClientCell(row),
      },
      {
        key: "dateQuotedAccepted",
        label: "Quote Accepted Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const value = row.dateQuotedAccepted;
          return value ? formatDisplayDate(value) : "-";
        },
      },
      {
        key: "service",
        label: "Services",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row.service ?? "-",
      },
      {
        key: "quoteDate",
        label: "Quoted Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const value = row.quoteDate;
          return value ? formatDisplayDate(value) : "-";
        },
      },
      {
        key: "quoteTotal",
        label: "Quote Total",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => money(row.quoteTotal ?? row?.meta?.quoteTotal),
      },
      {
        key: "quoteStatus",
        label: "Status",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-left",
        render: (row) => {
          const status = row.quoteStatus ?? row.status ?? "-";
          return this.buildStatusBadge({ status }, statusClasses);
        },
      },

      {
        key: "actions",
        label: "Action",
        headerClass: "px-6 py-4 text-center",
        cellClass: "px-6 py-4 text-center",
        render: () => this.actionButtons,
      },
    ];

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: "No quotes found.",
      getRowClass: () => "border-b last:border-0",
    });
  }

  renderPaymentTable(container, rows, statusClasses, formatDisplayDate) {
    if (container == null) return null;
    const money = (n) =>
      n == null || Number.isNaN(Number(n))
        ? "-"
        : `$${Number(n).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;

    const headers = [
      {
        key: "id",
        label: "Unique ID",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
      },
      {
        key: "client",
        label: "Client Info",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) => this.buildClientCell(row),
      },
      {
        key: "invoiceNumber",
        label: "Invoice No.",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row.invoiceNumber ?? row?.meta?.invoiceNumber ?? "-",
      },
      {
        key: "invoiceDate",
        label: "Invoice Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) =>
          row.invoiceDate ? formatDisplayDate(row.invoiceDate) : "-",
      },
      {
        key: "dueDate",
        label: "Due Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => (row.dueDate ? formatDisplayDate(row.dueDate) : "-"),
      },
      {
        key: "invoiceTotal",
        label: "Invoice Total",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => money(row.invoiceTotal ?? row?.meta?.invoiceTotal),
      },
      {
        key: "billPaidDate",
        label: "Bill Paid Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) =>
          row.billPaidDate ? formatDisplayDate(row.billPaidDate) : "-",
      },
      {
        key: "serviceApproved",
        label: "Serviceman Approved",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => `
          ${
            row.serviceApproved
              ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2E7D32">
                  <circle cx="12" cy="12" r="10" fill="#2E7D32"></circle>
                  <path d="M9 12l2 2l4-4" fill="none" stroke="#fff" stroke-width="2"
                    stroke-linecap="round" stroke-linejoin="round"></path>
                </svg>`
              : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M9 12l2 2l4-4"></path>
                </svg>`
          }
        `,
      },
      {
        key: "adminApproved",
        label: "Admin Approved",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => `
        ${
          row.adminApproved
            ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2E7D32">
                <circle cx="12" cy="12" r="10" fill="#2E7D32"></circle>
                <path d="M9 12l2 2l4-4" fill="none" stroke="#fff" stroke-width="2"
                  stroke-linecap="round" stroke-linejoin="round"></path>
              </svg>`
            : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M9 12l2 2l4-4"></path>
              </svg>`
        }
      `,
      },
      {
        key: "xeroInvoiceStatus",
        label: "Xero Invoice Status",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-left",
        render: (row) => row.xeroInvoiceStatus ?? "-",
      },
      {
        key: "actions",
        label: "Action",
        headerClass: "px-6 py-4 text-center",
        cellClass: "px-6 py-4 text-center",
        render: () => this.actionButtons,
      },
    ];

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: "No payments found.",
      getRowClass: () => "border-b last:border-0",
    });
  }

  renderActiveJobsTable(container, rows, statusClasses, formatDisplayDate) {
    // Reuse the same columns and layout as the Payment table
    return this.renderPaymentTable(
      container,
      rows,
      statusClasses,
      formatDisplayDate
    );
  }

  renderJobsTable(container, rows, statusClasses, formatDisplayDate) {
    if (!container) return null;

    const money = (n) =>
      n == null || Number.isNaN(Number(n))
        ? "-"
        : `$${Number(n).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
    const headers = [
      {
        key: "id",
        label: "Unique ID",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
      },
      {
        key: "client",
        label: "Client Info",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) => this.buildClientCell(row),
      },
      {
        key: "startDate",
        label: "Start Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const value = row.startDate;
          return value ? formatDisplayDate(value) : "-";
        },
      },
      {
        key: "services",
        label: "Services",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row.service ?? "-",
      },
      {
        key: "paymentStatus",
        label: "Payment Status",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row.paymentStatus ?? "-",
      },
      {
        key: "jobRequiredBy",
        label: "Job Required By",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const value = row.requiredBy;
          return value ? formatDisplayDate(value) : "-";
        },
      },
      {
        key: "bookedDate",
        label: "Booked Date",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const value = row.bookedDate;
          return value ? formatDisplayDate(value) : "-";
        },
      },
      {
        key: "jobTotal",
        label: "Job Total",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => money(row.price ?? row?.meta?.price),
      },
      {
        key: "jobStatus",
        label: "Job Status",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-left",
        render: (row) => {
          const status = row.jobStatus ?? row.status ?? "-";
          return this.buildStatusBadge({ status }, statusClasses);
        },
      },
      {
        key: "actions",
        label: "Action",
        headerClass: "px-6 py-4 text-center",
        cellClass: "px-6 py-4 text-center",
        render: () => this.actionButtons,
      },
    ];

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: "No jobs found.",
      getRowClass: () => "border-b last:border-0",
    });
  }

  renderUrgentCallsTable(container, rows, statusClasses, formatDisplayDate) {
    if (!container) return null;
    const headers = [
      {
        key: "id",
        label: "Job ID",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
      },
      {
        key: "client",
        label: "Client Info",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4",
        render: (row) =>
          `<div class=\"font-normal text-slate-700\">${
            row.client ?? "-"
          }</div>`,
      },
      {
        key: "property",
        label: "Property",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row?.meta?.address ?? "-",
      },
      {
        key: "services",
        label: "Services",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => row.service ?? "-",
      },
      {
        key: "nextDue",
        label: "Next Due",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        render: (row) => {
          const v = row.requiredBy ?? row.bookedDate ?? row.startDate;
          return v ? formatDisplayDate(v) : "-";
        },
      },
      {
        key: "actions",
        label: "Action",
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-center",
        render: () => this.actionButtons,
      },
    ];

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: "No urgent calls found.",
      getRowClass: () => "border-b last:border-0",
    });
  }

  async createNotificationModal() {
    await this.model.fetchNotification((records = []) => {
      const formatDate = (value) => {
        const d = window.dayjs ? window.dayjs(value) : null;
        return d?.isValid?.() ? d.format("DD MMM · h:mma") : value || "";
      };
      const normalizeType = (value = "") => {
        const t = String(value || "").toLowerCase();
        return t.includes("action") ? "Action Required" : "General Updates";
      };

      let mappedNotification = records.map((record) => {
        const tab = normalizeType(record?.Type || record?.type);
        const label = record?.Unique_ID
          ? `#${record.Unique_ID}`
          : record?.Title || "Notification";
        return {
          id: label,
          text: record?.Title || "Notification",
          when: formatDate(record?.Publish_Date_Time),
          tab,
          read: record?.Is_Read,
          uniqueId: record?.Unique_ID ?? record?.unique_id ?? record?.id,
          origin_url: record?.Origin_Url,
          notified_contact_id: record?.Notified_Contact_ID,
        };
      });

      const getUnread = () => mappedNotification.filter((item) => !item.read);

      const wrap = document.createElement("div");
      wrap.id = "notificationPopover";
      wrap.className =
        "hidden absolute top-16 right-6 z-50 w-[420px] max-w-sm bg-white rounded-lg shadow-xl border border-slate-200";

      wrap.innerHTML = `
      <!-- Header -->
      <div class="flex items-center justify-between px-4 py-3 border-b rounded-t-lg bg-white hover:!bg-white active:!bg-white hover:border-b active:border-b focus:border-b focus-visible:border-b hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white">
          <!-- Title -->
            <div class="flex items-center gap-2">
              <span class="text-[15px] font-semibold text-gray-800 hover:!text-[15px] active:!text-[15px] hover:!text-gray-800 active:!text-gray-800 hover:text-[15px] active:text-[15px] focus:text-[15px] focus-visible:text-[15px] hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800">Notification</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                xmlns="http://www.w3.org/2000/svg" class="text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500">
                <path d="M13.3965 17.6921C13.3965 17.8622 13.329 18.0252 13.2087 18.1454C13.0885 18.2656 12.9255 18.3332 12.7555 18.3332H7.62727C7.45726 18.3332 7.29421 18.2656 7.174 18.1454C7.05378 18.0252 6.98624 17.8622 6.98624 17.6921C6.98624 17.5221 7.05378 17.3591 7.174 17.2389C7.29421 17.1187 7.45726 17.0511 7.62727 17.0511H12.7555C12.9255 17.0511 13.0885 17.1187 13.2087 17.2389C13.329 17.3591 13.3965 17.5221 13.3965 17.6921ZM17.7082 13.8412C17.2627 13.0752 16.6016 10.9077 16.6016 8.07676C16.6016 6.37665 15.9263 4.74618 14.7241 3.54402C13.5219 2.34187 11.8915 1.6665 10.1914 1.6665C8.49127 1.6665 6.86079 2.34187 5.65864 3.54402C4.45648 4.74618 3.78111 6.37665 3.78111 8.07676C3.78111 10.9085 3.11926 13.0752 2.67454 13.8412C2.56098 14.0359 2.50077 14.2572 2.5 14.4826C2.49923 14.7081 2.55791 14.9297 2.67014 15.1252C2.78236 15.3208 2.94416 15.4832 3.13921 15.5963C3.33426 15.7093 3.55568 15.7689 3.78111 15.7691H16.6016C16.827 15.7688 17.0483 15.7091 17.2432 15.596C17.4382 15.4829 17.5999 15.3204 17.712 15.1249C17.8241 14.9294 17.8827 14.7078 17.8819 14.4824C17.8811 14.257 17.8209 14.0359 17.7074 13.8412H17.7082Z" fill="currentColor"/>
              </svg>
            </div>
          <div class="flex items-center gap-2 text-xs text-gray-600 select-none hover:!text-gray-600 active:!text-gray-600 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:text-gray-600 active:text-gray-600 focus:text-gray-600 focus-visible:text-gray-600">
            <span>Only show unread</span>
            <button id="notifUnreadToggle" type="button" aria-pressed="false"
              class="w-10 h-5 inline-flex items-center rounded-full bg-gray-300 relative focus:bg-gray-300 focus-visible:bg-gray-300">
              <span class="knob absolute w-4 h-4 bg-white rounded-full left-0.5 transition-transform duration-200 ease-out translate-x-0 focus:bg-white focus-visible:bg-white"></span>
            </button>
          </div>
      </div>

      <!-- Tabs -->
      <div class="px-4 pt-3">
        <!-- Tailwind safelist anchor for dynamic classes used at runtime on Ontraport builds -->
        <span class="hidden bg-blue-600 bg-gray-300 text-gray-700 text-white shadow-sm translate-x-0 translate-x-5 hover:!bg-blue-600 active:!bg-blue-600 hover:!bg-gray-300 active:!bg-gray-300 hover:!text-gray-700 active:!text-gray-700 hover:!text-white active:!text-white hover:bg-blue-600 active:bg-blue-600 focus:bg-blue-600 focus-visible:bg-blue-600 hover:bg-gray-300 active:bg-gray-300 focus:bg-gray-300 focus-visible:bg-gray-300 hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700 hover:text-white active:text-white focus:text-white focus-visible:text-white hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm"></span>
        <div class="flex items-center gap-3">
          <button id="notifTabAction" class="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white shadow-sm focus:text-sm focus-visible:text-sm focus:bg-blue-600 focus-visible:bg-blue-600 focus:text-white focus-visible:text-white focus:shadow-sm focus-visible:shadow-sm">
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-red-600 focus:bg-red-600 focus-visible:bg-red-600"></span>
              Action Required
            </span>
          </button>
          <button id="notifTabGeneral" class="px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 focus:text-sm focus-visible:text-sm focus:text-gray-700 focus-visible:text-gray-700">
            General Updates
          </button>
        </div>
  
        <!-- Mark all as read -->
        <label for="notifMarkAll" class="mt-3 mb-2 inline-flex items-center gap-2 text-sm text-gray-700 hover:!text-blue-700 cursor-pointer select-none hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">
          <input id="notifMarkAll" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 hover:!border-gray-300 active:!border-gray-300 hover:!text-blue-600 active:!text-blue-600 hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:text-blue-600 active:text-blue-600 focus:text-blue-600 focus-visible:text-blue-600" />
          <h5>Mark all as read</h5>
        </label>
      </div>
  
      <!-- List -->
      <div class="max-h-[380px] overflow-auto" id="notifList"></div>
  
      <!-- Footer -->
      <div class="px-4 py-3 border-t rounded-b-lg text-center hover:border-t active:border-t focus:border-t focus-visible:border-t hover:text-center active:text-center focus:text-center focus-visible:text-center">
        <a href="#" class="text-sm font-medium text-blue-700 hover:!underline hover:!text-blue-700 active:!text-blue-700  hover:text-blue-700 active:text-blue-700 focus:text-blue-700 focus-visible:text-blue-700">View All</a>
      </div>
    `;

      document.body.appendChild(wrap);

      const model = this.model;

      // ----- State -----
      const TAB_ACTIVE_CLASSES =
        "px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm hover:!bg-blue-600 active:!bg-blue-600 focus:!bg-blue-600 focus-visible:!bg-blue-600 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white";
      const TAB_INACTIVE_CLASSES =
        "px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:!bg-gray-100 active:!bg-gray-100 focus:!bg-gray-100 focus-visible:!bg-gray-100 hover:!text-gray-700 active:!text-gray-700 focus:!text-gray-700 focus-visible:!text-gray-700";
      const UNREAD_TOGGLE_BASE =
        "w-10 h-5 inline-flex items-center rounded-full relative transition-colors duration-150 ease-out hover:!bg-gray-300 active:!bg-gray-300 focus:!bg-gray-300 focus-visible:!bg-gray-300";
      const UNREAD_TOGGLE_ON =
        "bg-blue-600 hover:!bg-blue-600 active:!bg-blue-600 focus:!bg-blue-600 focus-visible:!bg-blue-600";
      const UNREAD_TOGGLE_OFF = "bg-gray-300";
      const UNREAD_KNOB_BASE =
        "knob absolute w-4 h-4 bg-white rounded-full left-0.5 transition-transform duration-200 ease-out hover:!bg-white active:!bg-white focus:!bg-white focus-visible:!bg-white";
      const MARK_ALL_LABEL_CLASSES =
        "mt-3 mb-2 inline-flex items-center gap-2 text-sm text-gray-700 hover:!text-gray-700 active:!text-gray-700 focus:!text-gray-700 focus-visible:!text-gray-700 cursor-pointer select-none ";
      const MARK_ALL_INPUT_CLASSES =
        "h-4 w-4 rounded border-gray-300 text-blue-600 hover:!border-gray-300 active:!border-gray-300 focus:!border-gray-300 focus-visible:!border-gray-300 hover:!text-blue-600 active:!text-blue-600 focus:!text-blue-600 focus-visible:!text-blue-600 focus:ring-0";
      let currentTab = "Action Required";
      let onlyUnread = false;
      let markAllOn = false;
      let selectedIndex = 0;

      // ----- Rendering -----
      const listEl = document.getElementById("notifList");
      function rowTemplate(item, active) {
        const unreadDot = !item.read
          ? `<span class="ml-2 p-1 w-2.5 h-2.5 rounded-full bg-red-600 hover:!bg-red-600 active:!bg-red-600 hover:bg-red-600 active:bg-red-600 focus:bg-red-600 focus-visible:bg-red-600"></span>`
          : "";
        const baseBg = !item.read ? "bg-slate-200" : "bg-white";
        return `
        <div class="px-4 py-3 ${baseBg} border-b last:border-b-0 hover:border-b active:border-b focus:border-b focus-visible:border-b hover:last:border-b-0 active:last:border-b-0 focus:last:border-b-0 focus-visible:last:border-b-0">
          <div class="flex items-start">
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <div class="w-[250px] text-sm font-semibold text-slate-800 hover:!text-slate-800 active:!text-slate-800  hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800">${item.id}
                  <span class="font-normal text-slate-600 hover:!text-slate-600 active:!text-slate-600 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600"> - ${item.text}</span>
                </div>
                ${unreadDot}
              </div>
              <div class="mt-1 text-xs text-slate-500 hover:!text-slate-500 active:!text-slate-500 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500">${item.when}</div>
            </div>
          </div>
        </div>`;
      }

      function render() {
        // update tab button styles
        const tabAction = document.getElementById("notifTabAction");
        const tabGeneral = document.getElementById("notifTabGeneral");
        tabAction.className =
          currentTab === "Action Required"
            ? TAB_ACTIVE_CLASSES
            : TAB_INACTIVE_CLASSES;
        tabGeneral.className =
          currentTab === "General Updates"
            ? TAB_ACTIVE_CLASSES
            : TAB_INACTIVE_CLASSES;

        // sync unread toggle visuals deterministically
        const unreadBtn = document.getElementById("notifUnreadToggle");
        if (unreadBtn) {
          unreadBtn.className = [
            UNREAD_TOGGLE_BASE,
            onlyUnread ? UNREAD_TOGGLE_ON : UNREAD_TOGGLE_OFF,
          ].join(" ");
          unreadBtn.setAttribute("aria-pressed", String(onlyUnread));
          const knob = unreadBtn.querySelector(".knob");
          if (knob) {
            knob.className = UNREAD_KNOB_BASE;
            knob.classList.toggle("translate-x-0", !onlyUnread);
            knob.classList.toggle("translate-x-5", onlyUnread);
          }
        }

        const items = mappedNotification
          .map((x, i) => ({ ...x, _idx: i }))
          .filter((x) => x.tab === currentTab && (!onlyUnread || !x.read));

        // keep selectedIndex within bounds
        if (selectedIndex >= items.length) selectedIndex = items.length - 1;
        if (selectedIndex < 0) selectedIndex = 0;

        markAllOn = getUnread().length === 0;
        if (markAllCheckbox) {
          markAllCheckbox.checked = markAllOn;
        }

        listEl.innerHTML = items
          .map((item, i) => rowTemplate(item, i === selectedIndex))
          .join("");

        // click to select, mark as read, and follow origin URL
        Array.from(listEl.children).forEach((el, i) => {
          el.addEventListener("click", async () => {
            selectedIndex = i;
            const originalIndex = items[i]?._idx;
            const target =
              originalIndex != null ? mappedNotification[originalIndex] : null;

            if (target) {
              if (!target.read) {
                target.read = true;
                const id = target.uniqueId ?? target.id;
                if (
                  id &&
                  model &&
                  typeof model.updateAnnouncements === "function"
                ) {
                  try {
                    await model.updateAnnouncements([id]);
                  } catch (err) {
                    console.error(
                      "[Dashboard] Failed to mark notification read",
                      err
                    );
                  }
                }
              }

              const url =
                target.origin_url ?? target.originUrl ?? target.origin;
              if (url) {
                try {
                  window.open(url, "_blank", "noreferrer");
                } catch (err) {
                  console.error("[Dashboard] Failed to open origin_url", err);
                }
              }
            }

            render();
          });
        });
      }

      // ----- Controls -----
      const unreadToggle = document.getElementById("notifUnreadToggle");
      const markAllCheckbox = document.getElementById("notifMarkAll");
      const tabActionBtn = document.getElementById("notifTabAction");
      const tabGeneralBtn = document.getElementById("notifTabGeneral");
      const markAllLabel = document.querySelector('label[for="notifMarkAll"]');

      if (markAllLabel) {
        markAllLabel.className = MARK_ALL_LABEL_CLASSES;
      }
      if (markAllCheckbox) {
        markAllCheckbox.className = MARK_ALL_INPUT_CLASSES;
      }

      // Toggle-style button (no native checkbox) for Only show unread
      unreadToggle.addEventListener("click", () => {
        onlyUnread = !onlyUnread;
        render();
      });

      tabActionBtn.addEventListener("click", () => {
        currentTab = "Action Required";
        selectedIndex = 0;
        render();
      });

      tabGeneralBtn.addEventListener("click", () => {
        currentTab = "General Updates";
        selectedIndex = 0;
        render();
      });

      // Checkbox for Mark all as read
      markAllCheckbox.addEventListener("change", async (event) => {
        markAllOn = event.target.checked;
        if (markAllOn) {
          const idsToMark = getUnread()
            .map((item) => item.uniqueId ?? item.id)
            .filter(Boolean);
          if (
            idsToMark.length &&
            typeof model?.updateAnnouncements === "function"
          ) {
            try {
              await model.updateAnnouncements(idsToMark);
            } catch (err) {
              console.error("[Dashboard] Failed to mark all read", err);
            }
          }
          mappedNotification.forEach((n) => (n.read = true));
        }
        render();
      });

      // ----- API -----
      this.toggleNotificationPopover = (show = true) => {
        wrap.classList.toggle("hidden", !show);
      };
      this.updateNotificationPopover = (next = []) => {
        // replace data array with next and re-render
        mappedNotification.length = 0;
        next.forEach((n) => mappedNotification.push(n));
        selectedIndex = 0;
        render();
      };

      // initial render
      render();
    });
  }

  deriveInitialTab(nav, defaultTab) {
    const dataActive = nav.querySelector('[data-tab][data-active="true"]');
    if (dataActive) return dataActive.getAttribute("data-tab");
    return defaultTab;
  }

  initializeLinks(links) {
    links.forEach((a) => {
      if (!a.hasAttribute("data-active"))
        a.setAttribute("data-active", "false");
    });
  }

  // NAV: Tab <-> filters mapping and toggling — setActive
  // Quick note: setActive hides previous tab's filter ids and shows current tab's ids
  // Search token: "NAV: Tab <-> filters mapping and toggling"
  setActive(tab, context, links, panels) {
    const relatedFilters = document.getElementById("related-filters");
    const paymentRelated = document.getElementById("payment-related-filter");
    if (tab === "urgent-calls") relatedFilters?.classList.add("hidden");
    else relatedFilters?.classList.remove("hidden");
    // Toggle payment related container similar to related-filters
    if (paymentRelated) {
      const showPaymentFilters =
        tab === "payment" ||
        tab === "quote" ||
        tab === "jobs" ||
        tab === "active-jobs";
      paymentRelated.classList.toggle("hidden", !showPaymentFilters);
    }

    const previousTab = context.previousTab;
    if (previousTab) {
      context.filtersConfig[previousTab]?.forEach((id) => {
        document.getElementById(id)?.classList.add("hidden");
      });
    }

    context.filtersConfig[tab]?.forEach((id) => {
      document.getElementById(id)?.classList.remove("hidden");
    });

    links.forEach((a) => {
      const isActive = a.getAttribute("data-tab") === tab;
      a.setAttribute("data-active", isActive ? "true" : "false");
      a.classList.toggle("!text-sky-900", isActive);
      a.classList.toggle("!text-neutral-700", !isActive);
      a.classList.toggle("!border-sky-900", isActive);
      a.classList.toggle("!border-b-2", true);
      a.classList.toggle("!border-transparent", !isActive);
    });

    if (panels.length) {
      panels.forEach((p) => {
        const show = p.getAttribute("data-panel") === tab;
        p.classList.toggle("hidden", !show);
      });
    }

    if (previousTab !== tab) {
      context.previousTab = tab;
      this.previousTab = tab;
      if (typeof context.onTabChange === "function") {
        context.onTabChange(tab);
      }
    } else {
      context.previousTab = tab;
      this.previousTab = tab;
    }
  }

  attachClickListeners(nav, links, panels, context) {
    const setActive = this.setActive.bind(this);
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

  initTopTabs({
    navId = "top-tabs",
    panelsId = "tab-panels",
    defaultTab = "inquiry",
    onTabChange,
  } = {}) {
    const nav = document.getElementById(navId);
    const panelsWrap = document.getElementById(panelsId);
    if (!nav) return;

    const links = [...nav.querySelectorAll("[data-tab]")];
    const panels = panelsWrap
      ? [...panelsWrap.querySelectorAll("[data-panel]")]
      : [];

    const context = {
      filtersConfig: this.filtersConfig || {},
      previousTab: this.previousTab || null,
      onTabChange,
    };

    this.initializeLinks(links);
    this.attachClickListeners(nav, links, panels, context);

    const initialTab = this.deriveInitialTab(nav, defaultTab);
    this.setActive(initialTab, context, links, panels);
  }

  createCreateButtonPopup() {
    const wrapper = document.createElement("div");
    wrapper.id = "create-button-wrapper";
    wrapper.className = "fixed inset-0 z-50 hidden";
    const modalBox = document.createElement("div");
    modalBox.id = "create-button-popup";
    modalBox.className =
      "absolute w-48 bg-white rounded-lg shadow-xl border border-slate-200";

    const positionPopup = () => {
      const btn = document.getElementById("create-btn");
      if (!btn) return;
      const rect = btn.getBoundingClientRect();
      const gap = 8;
      modalBox.style.top = `${rect.bottom + window.scrollY + gap}px`;
      modalBox.style.left = `${rect.left + window.scrollX}px`;
    };

    modalBox.innerHTML = `
      <div class="flex flex-col text-sm text-slate-700 hover:!text-slate-700 active:!text-slate-700  hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700">
        <button id="new-inquiry" class="flex gap-2 px-4 py-2 text-left w-full focus:text-left focus-visible:text-left">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8.33333 8.88889C8.66667 8.88889 8.88889 9.11111 8.88889 9.44444C8.88889 9.77778 8.66667 10 8.33333 10C8 10 7.77778 9.77778 7.77778 9.44444C7.77778 9.11111 8 8.88889 8.33333 8.88889ZM3.94444 9.83333L3.77778 9.44444L3.94444 9.05556C4.66667 7.27778 6.38889 6.11111 8.33333 6.11111C9.38889 6.11111 10.3333 6.44444 11.1111 7V3.33333C11.1111 2.72222 10.6111 2.22222 10 2.22222H7.77778V1.11111C7.77778 0.5 7.27778 0 6.66667 0H4.44444C3.83333 0 3.33333 0.5 3.33333 1.11111V2.22222H1.11111C0.5 2.22222 0 2.72222 0 3.33333V9.44444C0 10.0556 0.5 10.5556 1.11111 10.5556H4.33333C4.16667 10.3333 4.05556 10.1111 3.94444 9.83333ZM4.44444 1.11111H6.66667V2.22222H4.44444V1.11111ZM8.33333 7.22222C6.83333 7.22222 5.5 8.16667 5 9.44444C5.5 10.7222 6.83333 11.6667 8.33333 11.6667C9.83333 11.6667 11.1667 10.7222 11.6667 9.44444C11.1667 8.16667 9.83333 7.22222 8.33333 7.22222ZM8.33333 10.8333C7.55556 10.8333 6.94445 10.2222 6.94445 9.44444C6.94445 8.66667 7.55556 8.05556 8.33333 8.05556C9.11111 8.05556 9.72222 8.66667 9.72222 9.44444C9.72222 10.2222 9.11111 10.8333 8.33333 10.8333Z" fill="#636D88"/>
        </svg>
          <span>New Inquiry</span>
        </button>
        <button id="new-quote" class="flex gap-2 px-4 py-2 text-left w-full focus:text-left focus-visible:text-left">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.311 12.7337C4.52262 12.7337 4.67101 12.628 4.91967 12.3949L6.83581 10.6482L10.4088 10.6534C11.9864 10.6588 12.8333 9.77998 12.8333 8.22905V4.17431C12.8333 2.62337 11.9864 1.75 10.409 1.75H3.59098C2.01904 1.75 1.16667 2.61795 1.16667 4.17431V8.22905C1.16667 9.78517 2.01882 10.6534 3.59098 10.6482H3.83987V12.1885C3.83987 12.5166 4.01445 12.7337 4.311 12.7337ZM4.44335 5.8734C4.44335 5.23311 4.93571 4.7884 5.576 4.7884C6.27479 4.7884 6.74592 5.344 6.74592 6.06944C6.74592 7.42975 5.6607 8.07547 5.11549 8.07547C4.96191 8.07547 4.85079 7.96435 4.85079 7.8268C4.85079 7.69965 4.90906 7.61495 5.11029 7.55691C5.45969 7.4616 5.86713 7.18628 6.06317 6.747H6.02071C5.87774 6.92158 5.6607 6.95862 5.43326 6.95862C4.82978 6.95862 4.44335 6.48207 4.44335 5.8734ZM7.33359 5.8734C7.33359 5.23311 7.82595 4.7884 8.46624 4.7884C9.16503 4.7884 9.63616 5.344 9.63616 6.06944C9.63616 7.42975 8.55094 8.07547 8.00573 8.07547C7.85215 8.07547 7.74103 7.96435 7.74103 7.8268C7.74103 7.69965 7.7993 7.61495 8.00053 7.55691C8.34993 7.4616 8.75737 7.18628 8.95318 6.747H8.91095C8.76798 6.92158 8.55094 6.95862 8.32328 6.95862C7.72003 6.95862 7.33359 6.48207 7.33359 5.8734Z" fill="#636D88"/>
          </svg>
          <span>New Quote</span>
        </button>
        <button id="new-job" class="flex gap-2 px-4 py-2 text-left w-full focus:text-left focus-visible:text-left">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M5.90626 2.3335C5.61617 2.3335 5.33798 2.44873 5.13286 2.65385C4.92774 2.85897 4.81251 3.13717 4.81251 3.42725V3.79183H2.26042C1.97034 3.79183 1.69214 3.90706 1.48702 4.11218C1.28191 4.3173 1.16667 4.5955 1.16667 4.88558L1.16667 5.89475L6.71855 7.37495C6.90297 7.42407 7.09704 7.42407 7.28146 7.37495L12.8333 5.89475V4.88558C12.8333 4.5955 12.7181 4.3173 12.513 4.11218C12.3079 3.90706 12.0297 3.79183 11.7396 3.79183H9.18751V3.42725C9.18751 3.13717 9.07227 2.85897 8.86715 2.65385C8.66204 2.44873 8.38384 2.3335 8.09376 2.3335H5.90626ZM5.90626 3.06266H8.09376C8.19045 3.06266 8.28318 3.10107 8.35155 3.16945C8.41993 3.23782 8.45834 3.33055 8.45834 3.42725V3.79183H5.54167V3.42725C5.54167 3.33055 5.58008 3.23782 5.64846 3.16945C5.71683 3.10107 5.80956 3.06266 5.90626 3.06266Z" fill="#636D88"/>
          <path d="M1.16667 10.7189C1.16667 11.009 1.28191 11.2872 1.48702 11.4923C1.69214 11.6974 1.97034 11.8127 2.26042 11.8127H11.7396C12.0297 11.8127 12.3079 11.6974 12.513 11.4923C12.7181 11.2872 12.8333 11.009 12.8333 10.7189V6.59912L7.09407 8.12818C7.03244 8.14464 6.96757 8.14464 6.90594 8.12818L1.16667 6.59912V10.7189Z" fill="#636D88"/>
        </svg>
        <span>Book a job</span>
        </button>
      </div>
    `;

    wrapper.appendChild(modalBox);
    document.body.appendChild(wrapper);

    wrapper.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!modalBox.contains(e.target)) {
        wrapper.classList.add("hidden");
      }
    });

    modalBox.addEventListener("click", (e) => {
      e.stopPropagation();
    });

    window.addEventListener("resize", () => {
      if (!wrapper.classList.contains("hidden")) {
        positionPopup();
      }
    });

    window.addEventListener("scroll", () => {
      if (!wrapper.classList.contains("hidden")) {
        positionPopup();
      }
    });

    return {
      show() {
        positionPopup();
        wrapper.classList.remove("hidden");
      },
      hide() {
        wrapper.classList.add("hidden");
      },
    };
  }

  handleActionButtonClick() {
    const tableElement = document.getElementById("inquiry-table-container");
    if (!tableElement) return;

    tableElement.addEventListener("click", (e) => {
      const svgIcon = e.target.closest("svg#view-icon");
      if (!svgIcon) return;

      const row = svgIcon.closest("tr");
      if (!row) return;

      const rowId = row.dataset.uniqueId?.slice(1);
      if (!rowId) return;

      window.location.href = `https://my.awesomate.pro/create-inquiry/${rowId}`;
    });
  }

  renderPagination(callback) {
    const PAGES_PER_GROUP = 4;
    const limit =
      (this?.model?.paginationLimit ?? this?.model?.limit ?? 5) || 5;
    const totalPages = Math.max(1, Math.ceil(this.model.totalCount / limit));

    let currentIdx = 1;
    let start = 1;

    const embedDiv = document.getElementById("pagination-pages");
    const prev = document.getElementById("prev-page-btn");
    const next = document.getElementById("next-page-btn");
    const lt = document.getElementById("lt-btn");
    const gt = document.getElementById("gt-btn");
    const PAGINATION_BASE_CLASSES =
      "px-3 py-1.5 text-sm font-semibold rounded transition";
    const PAGINATION_INACTIVE_CLASSES = [
      "text-slate-500",
      "bg-transparent",
      "hover:!bg-transparent",
      "active:!bg-transparent",
      "focus:!bg-transparent",
      "focus-visible:!bg-transparent",
      "hover:!text-slate-500",
      "active:!text-slate-500",
      "focus:!text-slate-500",
      "focus-visible:!text-slate-500",
    ];
    const PAGINATION_ACTIVE_CLASSES = [
      "bg-[#003882]",
      "text-white",
      "hover:!bg-[#003882]",
      "active:!bg-[#003882]",
      "focus:!bg-[#003882]",
      "focus-visible:!bg-[#003882]",
      "hover:!text-white",
      "active:!text-white",
      "focus:!text-white",
      "focus-visible:!text-white",
    ];
    const paginationInactiveClassName = `${PAGINATION_BASE_CLASSES} ${PAGINATION_INACTIVE_CLASSES.join(
      " "
    )}`;
    const paginationActiveClassName = `${PAGINATION_BASE_CLASSES} ${PAGINATION_ACTIVE_CLASSES.join(
      " "
    )}`;

    const updateModelRange = (shouldNotify = false) => {
      if (!this.model) return;
      // const totalCount = this.model.totalCount;
      // const startIndex = 300 + totalCount - (currentIdx - 1) * limit;
      // this.model.startIndex = Number.isFinite(startIndex) ? startIndex : null;
      // this.model.endIndex =
      //   this.model.startIndex != null ? this.model.startIndex + limit : null;

      if (shouldNotify && typeof this.onPageChange === "function") {
        this.onPageChange(currentIdx);
      }
      this.model.offset = (currentIdx - 1) * limit;
      callback();
    };

    function renderPages() {
      const end = Math.min(start + PAGES_PER_GROUP - 1, totalPages);
      embedDiv.innerHTML = "";
      embedDiv.appendChild(createPagesBtn(start, end, totalPages));
      setActive(currentIdx);
      updateModelRange(false, callback);
    }

    function bindEvents() {
      lt.addEventListener("click", () => {
        if (currentIdx === 1) return;
        currentIdx--;
        shiftWindowIfNeeded(false);
      });

      gt.addEventListener("click", () => {
        if (currentIdx === totalPages) return;
        currentIdx++;
        shiftWindowIfNeeded(false);
      });

      prev.addEventListener("click", () => {
        if (start === 1) return;
        start = Math.max(1, start - PAGES_PER_GROUP);
        currentIdx = start;
        renderPages();
        updateModelRange(false, callback);
      });

      next.addEventListener("click", () => {
        if (start + PAGES_PER_GROUP > totalPages) return;
        start += PAGES_PER_GROUP;
        currentIdx = start;
        renderPages();
        updateModelRange(false, callback);
      });
    }

    function shiftWindowIfNeeded(shouldNotify = false) {
      const end = start + PAGES_PER_GROUP - 1;

      if (currentIdx < start) {
        start = currentIdx;
        renderPages();
      } else if (currentIdx > end) {
        start = currentIdx - PAGES_PER_GROUP + 1;
        renderPages();
      } else {
        setActive(currentIdx);
      }
      updateModelRange(shouldNotify, callback);
    }

    function createPagesBtn(start, end, total) {
      const btnDiv = document.createElement("div");
      btnDiv.className = "flex gap-2";

      if (start > 1) {
        const leftEllipsis = document.createElement("button");
        leftEllipsis.textContent = "…";
        leftEllipsis.className = paginationInactiveClassName;
        leftEllipsis.addEventListener("click", () => {
          const newStart = Math.max(1, start - PAGES_PER_GROUP);
          start = newStart;
          currentIdx = start;
          renderPages();
          updateModelRange(false, callback);
        });
        btnDiv.appendChild(leftEllipsis);
      }

      for (let i = start; i <= end; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.dataset.idx = i;
        btn.className = paginationInactiveClassName;

        btn.addEventListener("click", () => {
          currentIdx = i;
          shiftWindowIfNeeded(false);
        });

        btnDiv.appendChild(btn);
      }

      if (end < total) {
        const rightEllipsis = document.createElement("button");
        rightEllipsis.textContent = "…";
        rightEllipsis.className = paginationInactiveClassName;
        rightEllipsis.addEventListener("click", () => {
          const newStart = start + PAGES_PER_GROUP;
          start = newStart;
          currentIdx = start;
          renderPages();
          updateModelRange(false, callback);
        });
        btnDiv.appendChild(rightEllipsis);
      }
      return btnDiv;
    }

    function setActive(idx) {
      embedDiv.querySelectorAll("button").forEach((btn) => {
        const isActive = Number(btn.dataset.idx) === idx;

        btn.className = isActive
          ? paginationActiveClassName
          : paginationInactiveClassName;
      });
    }

    renderPages();
    bindEvents();
  }

  // Build the Edit Columns cards from the current table snapshot.
  createEditColumnsSection() {
    const container = this.ensureEditColumnsContainer();
    if (!container) return;
    container.textContent = "";

    const columnsMap = new Map();
    const fragment = document.createDocumentFragment();
    const tableScope = document.getElementById("inquiry-table-container");
    const cells = tableScope
      ? tableScope.querySelectorAll("td[data-col]")
      : document.querySelectorAll("td[data-col]");

    const resolveLabel = (td) => {
      const data = td.dataset.col?.trim();
      if (data) return data;
      const th = td
        .closest("table")
        ?.querySelector(`thead th:nth-child(${td.cellIndex + 1})`);
      const text = th?.textContent?.trim();
      return text || `Column ${td.cellIndex + 1}`;
    };

    const createEyeIcon = () => {
      let svgDiv = document.createElement("div");
      svgDiv.setAttribute("data-icon", "eye");
      svgDiv.className =
        "inline-flex items-center gap-2 text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700";
      const svgOpen = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgOpen.classList = "open block";
      svgOpen.setAttribute("width", "16");
      svgOpen.setAttribute("height", "16");
      svgOpen.setAttribute("viewBox", "0 0 22 16");
      svgOpen.setAttribute("fill", "none");
      svgOpen.innerHTML = `<path d="M13.542 8C13.542 8.79565 13.2259 9.55871 12.6633 10.1213C12.1007 10.6839 11.3376 11 10.542 11C9.74634 11 8.98328 10.6839 8.42067 10.1213C7.85806 9.55871 7.54199 8.79565 7.54199 8C7.54199 7.20435 7.85806 6.44129 8.42067 5.87868C8.98328 5.31607 9.74634 5 10.542 5C11.3376 5 12.1007 5.31607 12.6633 5.87868C13.2259 6.44129 13.542 7.20435 13.542 8Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M1 8C2.274 3.943 6.065 1 10.542 1C15.02 1 18.81 3.943 20.084 8C18.81 12.057 15.02 15 10.542 15C6.064 15 2.274 12.057 1 8Z" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      svgDiv.appendChild(svgOpen);

      const svgClose = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgClose.classList = "closed hidden";
      svgClose.setAttribute("width", "16");
      svgClose.setAttribute("height", "15");
      svgClose.setAttribute("viewBox", "0 0 24 24");
      svgClose.setAttribute("fill", "none");
      svgClose.innerHTML = `<path d="M10.9399 6.08C11.2907 6.02651 11.6451 5.99976 11.9999 6C15.1799 6 18.1699 8.29 19.9099 12C19.6444 12.5649 19.3438 13.1126 19.0099 13.64C18.9041 13.8038 18.8485 13.995 18.8499 14.19C18.8522 14.4082 18.9257 14.6198 19.0594 14.7923C19.1931 14.9648 19.3795 15.0889 19.5903 15.1455C19.8011 15.2022 20.0246 15.1883 20.2267 15.1061C20.4289 15.0238 20.5986 14.8777 20.7099 14.69C21.175 13.9574 21.5796 13.1882 21.9199 12.39C21.9736 12.2652 22.0013 12.1308 22.0013 11.995C22.0013 11.8592 21.9736 11.7248 21.9199 11.6C19.8999 6.91 16.0999 4 11.9999 4C11.5307 3.99886 11.0622 4.03902 10.5999 4.12C10.4686 4.14233 10.343 4.1903 10.2302 4.26118C10.1174 4.33206 10.0197 4.42446 9.94263 4.5331C9.86555 4.64175 9.81063 4.76451 9.78101 4.89438C9.75138 5.02425 9.74762 5.15868 9.76994 5.29C9.79227 5.42132 9.84024 5.54696 9.91112 5.65975C9.982 5.77253 10.0744 5.87024 10.183 5.94732C10.2917 6.02439 10.4144 6.07931 10.5443 6.10894C10.6742 6.13857 10.8086 6.14233 10.9399 6.12V6.08ZM3.70994 2.29C3.6167 2.19676 3.50601 2.1228 3.38419 2.07234C3.26237 2.02188 3.1318 1.99591 2.99994 1.99591C2.86808 1.99591 2.73751 2.02188 2.61569 2.07234C2.49387 2.1228 2.38318 2.19676 2.28994 2.29C2.10164 2.47831 1.99585 2.7337 1.99585 3C1.99585 3.2663 2.10164 3.5217 2.28994 3.71L5.38994 6.8C3.9751 8.16117 2.84932 9.79372 2.07994 11.6C2.02488 11.7262 1.99646 11.8623 1.99646 12C1.99646 12.1377 2.02488 12.2738 2.07994 12.4C4.09994 17.09 7.89994 20 11.9999 20C13.797 19.9876 15.5517 19.4525 17.0499 18.46L20.2899 21.71C20.3829 21.8037 20.4935 21.8781 20.6154 21.9289C20.7372 21.9797 20.8679 22.0058 20.9999 22.0058C21.132 22.0058 21.2627 21.9797 21.3845 21.9289C21.5064 21.8781 21.617 21.8037 21.7099 21.71C21.8037 21.617 21.8781 21.5064 21.9288 21.3846C21.9796 21.2627 22.0057 21.132 22.0057 21C22.0057 20.868 21.9796 20.7373 21.9288 20.6154C21.8781 20.4936 21.8037 20.383 21.7099 20.29L3.70994 2.29ZM10.0699 11.48L12.5199 13.93C12.351 13.9786 12.1758 14.0022 11.9999 14C11.4695 14 10.9608 13.7893 10.5857 13.4142C10.2107 13.0391 9.99994 12.5304 9.99994 12C9.99775 11.8242 10.0213 11.649 10.0699 11.48ZM11.9999 18C8.81994 18 5.82994 15.71 4.09994 12C4.74625 10.5739 5.66321 9.28675 6.79994 8.21L8.56994 10C8.15419 10.7588 7.99568 11.6319 8.1182 12.4885C8.24072 13.345 8.63766 14.1387 9.24947 14.7505C9.86128 15.3623 10.655 15.7592 11.5115 15.8817C12.368 16.0043 13.2411 15.8458 13.9999 15.43L15.5899 17C14.501 17.6409 13.2634 17.9856 11.9999 18Z" fill="black"/>`;

      svgDiv.appendChild(svgClose);
      return svgDiv;
    };

    // Single DOM scan
    cells.forEach((td) => {
      const key = resolveLabel(td);
      const isAction = key.trim().toLowerCase() === "action";
      if (!columnsMap.has(key)) columnsMap.set(key, []);
      columnsMap.get(key).push({
        html: isAction ? td.innerHTML.trim() : null,
        text: isAction ? "" : td.textContent.trim(),
        isAction,
      });
    });

    columnsMap.forEach((values, key) => {
      const card = document.createElement("div");
      card.className = "inline-flex flex-col justify-start items-start";

      const header = document.createElement("div");
      header.className =
        "w-full px-4 py-3 bg-neutral-100 rounded-tl-lg rounded-tr-lg outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2";
      const headerWrap = document.createElement("div");
      headerWrap.className = "inline-flex justify-start items-center gap-2";
      const title = document.createElement("span");
      title.className =
        "justify-center text-neutral-700 text-sm font-medium leading-4";
      title.textContent = key;
      const eye = createEyeIcon();
      headerWrap.append(title, eye);
      header.appendChild(headerWrap);

      const body = document.createElement("div");
      body.className =
        "self-stretch bg-white flex flex-col max-h-60 overflow-y-auto text-sm text-slate-700 w-full min-w-0 overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

      values.forEach((valueObj) => {
        const el = document.createElement("div");
        // Truncate long values so they don't overflow the card
        el.className =
          "self-stretch px-4 py-3 bg-white border-l border-r border-b border-gray-300 inline-flex justify-start items-center gap-3";
        if (valueObj.isAction && valueObj.html) {
          el.innerHTML = valueObj.html;
        } else {
          const text = valueObj.text || "—";
          const textEl = document.createElement("div");
          textEl.className =
            "flex-1 justify-end text-neutral-700 text-sm font-normal leading-5 line-clamp-1";
          textEl.textContent = text;
          el.appendChild(textEl);
          el.title = text;
        }
        body.appendChild(el);
      });

      card.append(header, body);
      fragment.appendChild(card);
    });

    container.appendChild(fragment);
    this.handleEyeIconClicks();
  }

  // Wire up the Edit Columns entry point and supporting containers/actions.
  bindEditColumns() {
    if (this._editColumnsBound) return;
    this._editColumnsBound = true;
    this.editColumnsButton = this.findEditColumnsButton();
    this.ensureEditColumnsContainer();
    this.ensureEditModeActions();
    if (this.editColumnsButton) {
      this.editColumnsButton.addEventListener("click", () =>
        this.enterEditColumnsMode()
      );
    }
  }

  // Locate the Edit Columns trigger button by id or label text.
  findEditColumnsButton() {
    const direct = document.getElementById("edit-columns-btn");
    if (direct) return direct;
    return [...document.querySelectorAll("button")].find(
      (btn) =>
        btn.textContent &&
        btn.textContent.trim().toLowerCase() === "edit columns"
    );
  }

  // Ensure the Edit Columns container exists directly under the table area.
  ensureEditColumnsContainer() {
    if (
      this.editColumnsContainer &&
      document.body.contains(this.editColumnsContainer)
    ) {
      return this.editColumnsContainer;
    }
    const tableContainer = document.getElementById("inquiry-table-container");
    if (!tableContainer) return null;
    const tableSection =
      tableContainer.closest("div.self-stretch") || tableContainer;
    const container = document.createElement("div");
    container.id = "edit-columns-section";
    container.className =
      "hidden self-stretch p-2 bg-neutral-100 inline-flex flex-wrap justify-start items-start gap-2 border-t border-slate-300";
    if (tableSection?.parentElement) {
      tableSection.parentElement.insertBefore(
        container,
        tableSection.nextElementSibling
      );
    } else {
      tableContainer.insertAdjacentElement("afterend", container);
    }
    this.editColumnsContainer = container;
    return container;
  }

  // Build and cache the Cancel/Save/Save As action group for edit mode.
  ensureEditModeActions() {
    if (this.editModeActions && document.body.contains(this.editModeActions))
      return this.editModeActions;
    const actionsWrap = this.getActionsWrap();
    if (!actionsWrap) return null;
    const group = document.createElement("div");
    group.className = "flex items-center gap-3 hidden";
    group.innerHTML = `
      <button data-edit-action="cancel" type="button" class="px-4 py-2 rounded text-sm font-medium text-neutral-700 transition hover:!bg-neutral-100 active:!bg-neutral-100 focus:!bg-neutral-100 focus-visible:!bg-neutral-100 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700">
        Cancel
      </button>
      <button data-edit-action="save" type="button" class="px-4 py-2 rounded border border-slate-300 text-sm font-medium text-sky-900 bg-white transition hover:!bg-white active:!bg-white focus:!bg-white focus-visible:!bg-white hover:!text-sky-900 active:!text-sky-900 focus:!text-sky-900 focus-visible:!text-sky-900 hover:!border-slate-300 active:!border-slate-300 focus:!border-slate-300 focus-visible:!border-slate-300">
        Save
      </button>
      <button data-edit-action="save-as" type="button" class="px-4 py-2 rounded bg-[#003882] text-sm font-medium text-white transition outline outline-1 outline-offset-[-1px] outline-[#003882] hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882]">
        Save As
      </button>
    `;
    actionsWrap.appendChild(group);
    this.editModeActions = group;

    const cancelBtn = group.querySelector('[data-edit-action="cancel"]');
    const saveBtn = group.querySelector('[data-edit-action="save"]');
    const saveAsBtn = group.querySelector('[data-edit-action="save-as"]');

    cancelBtn?.addEventListener("click", () => this.exitEditColumnsMode());
    saveBtn?.addEventListener("click", () => this.exitEditColumnsMode());
    saveAsBtn?.addEventListener("click", () => {
      this.openSaveViewAsModal({
        onSave: (name) => {
          let button = this.createCustomEditButton(name);
          document.getElementById("top-tabs")?.appendChild(button);
          this.exitEditColumnsMode();
        },
      });
    });
    return group;
  }

  // Find the actions wrap beside the top tabs to host edit-mode buttons.
  getActionsWrap() {
    const cached =
      this.actionsWrap && document.body.contains(this.actionsWrap)
        ? this.actionsWrap
        : null;
    if (cached) return cached;
    const tabs = document.getElementById("top-tabs");
    const wrap =
      tabs?.parentElement?.querySelector(
        ".flex.flex-wrap.items-center.gap-3"
      ) || null;
    this.actionsWrap = wrap;
    return wrap;
  }

  // Show/hide default header actions vs edit-mode actions.
  toggleEditActions(show = false) {
    const actionsWrap = this.getActionsWrap();
    if (!actionsWrap) return;
    const editGroup = this.ensureEditModeActions();
    const defaultChildren = [...actionsWrap.children].filter(
      (child) => child !== editGroup
    );
    defaultChildren.forEach((el) => el.classList.toggle("hidden", show));
    if (editGroup) {
      editGroup.classList.toggle("hidden", !show);
    }
  }

  // Disable/enable tab navigation while in edit mode.
  toggleTabsDisabled(disable = false) {
    this.tabsDisabled = !!disable;
    const nav = document.getElementById("top-tabs");
    if (!nav) return;
    nav.classList.toggle("pointer-events-none", disable);
    nav.classList.toggle("opacity-60", disable);
    nav.querySelectorAll("[data-tab]").forEach((link) => {
      link.setAttribute("aria-disabled", disable ? "true" : "false");
      link.tabIndex = disable ? -1 : 0;
    });
  }

  // Return table + pagination containers to hide/show in edit mode.
  getTableSections() {
    const tableContainer = document.getElementById("inquiry-table-container");
    const tableSection =
      tableContainer?.closest("div.self-stretch") || tableContainer;
    const pagination = document
      .getElementById("pagination-pages")
      ?.closest("div.self-stretch");
    return { tableContainer, tableSection, pagination };
  }

  // Toggle between table view and Edit Columns container.
  toggleEditColumnsView(show = false) {
    const container = this.ensureEditColumnsContainer();
    const { tableSection, pagination } = this.getTableSections();
    if (!container) return;
    container.classList.toggle("hidden", !show);
    if (tableSection) tableSection.classList.toggle("hidden", show);
    pagination?.classList.toggle("hidden", show);
  }

  // Enter Edit Columns: populate cards, show edit UI, lock tabs.
  enterEditColumnsMode() {
    if (this.isEditColumnsMode) return;
    this.isEditColumnsMode = true;
    this.createEditColumnsSection();
    this.toggleEditColumnsView(true);
    this.toggleTabsDisabled(true);
    this.toggleEditActions(true);
  }

  // Exit Edit Columns: restore table and default controls.
  exitEditColumnsMode() {
    if (!this.isEditColumnsMode) return;
    this.isEditColumnsMode = false;
    this.toggleEditColumnsView(false);
    this.toggleTabsDisabled(false);
    this.toggleEditActions(false);
  }

  handleEyeIconClicks() {
    let container = document.getElementById("edit-columns-section");
    if (container._clickListenerAdded) return;
    container.addEventListener("click", (e) => {
      container._clickListenerAdded = true;
      let svg = e.target.closest("[data-icon='eye']");
      if (!svg) return;
      svg.querySelector(".open").classList.toggle("hidden");
      svg.querySelector(".closed").classList.toggle("hidden");
    });
  }
}
