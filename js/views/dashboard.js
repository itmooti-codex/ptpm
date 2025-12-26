export function renderDynamicTable({
  container,
  headers = [],
  rows = [],
  emptyState = "No records found.",
  zebra = false,
  getRowClass = null,
  tableClass = "min-w-full text-sm text-slate-700",
  theadClass = "bg-[#f5f8ff] text-xs font-semibold uppercase tracking-wide border-b border-slate-200",
  tbodyClass = "bg-white",
  defaultHeaderClass = "px-6 py-4 text-left",
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
    if (header.colSpan != null) th.colSpan = header.colSpan;
    if (header.rowSpan != null) th.rowSpan = header.rowSpan;
    if (header.html != null) {
      th.innerHTML = header.html;
    } else {
      th.textContent = header.label ?? "";
    }
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
        <a data-action="call" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Call" title="Call">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z"/></svg>
        </a>
        <a data-action="email" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Email" title="Email">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z"/><path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z"/></svg>
        </a>
        <a data-action="address" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Location" title="Address">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
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
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z"/></svg>
        </a>
        <a data-action="email" href="${emailHref}" ${
      email ? "" : 'aria-disabled="true"'
    } title="${email}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z"/><path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z"/></svg>
        </a>
        <a data-action="address" href="${mapHref}" ${
      address ? 'target="_blank" rel="noopener"' : 'aria-disabled="true"'
    } title="${address}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd"/></svg>
        </a>
      </div>
    `;
  }

  buildClientCell(row) {
    const meta = row?.meta ?? {};
    return `
      <div class="font-normal text-slate-700">${row.client ?? ""}</div>
      ${this.buildClientContactIcons(meta)}
    `;
  }

  buildStatusBadge(row, statusClasses = {}) {
    const status = row?.status ?? "-";
    const badgeClass = statusClasses[status] ?? "bg-slate-100 text-slate-600";
    return `<span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}">${status}</span>`;
  }

  renderDataTable(config = {}) {
    return renderDynamicTable({
      tableClass: "min-w-full text-sm text-slate-700",
      theadClass:
        "bg-[#f5f8ff] text-xs font-semibold uppercase tracking-wide border-b border-slate-200",
      tbodyClass: "bg-white",
      defaultHeaderClass: "px-6 py-4 text-left",
      defaultCellClass: "px-6 py-4 text-slate-600",
      emptyCellClass: "px-6 py-6 text-center text-sm text-slate-500",
      ...config,
    });
  }

  init() {
    this.createCreateButtonPopup();
    // lightweight toast container
    if (!document.getElementById("dashboardToast")) {
      const t = document.createElement("div");
      t.id = "dashboardToast";
      t.className =
        "hidden fixed top-6 right-6 z-50 max-w-sm w-[360px] bg-white border border-slate-200 shadow-xl rounded-lg";
      t.innerHTML = `<div class="px-4 py-3 text-sm text-slate-800 flex items-start gap-2"><svg class="w-5 h-5 text-red-500 mt-0.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11 7h2v6h-2zm0 8h2v2h-2z"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/></svg><div id="dashboardToastMsg" class="flex-1"></div></div>`;
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
        const rowTotal =
          rowTotals[rowIndex] ?? row.reduce((sum, d) => sum + d.total, 0);

        const dayCols = row
          .map((day) => {
            const isSelected = day.iso === selectedDate;
            const cellBorder = isSelected
              ? "border-emerald-200"
              : "border-gray-200";
            const headerState = isSelected
              ? "bg-sky-100 text-teal-700"
              : "bg-white  text-neutral-700";
            const valueState = isSelected
              ? "bg-emerald-50 text-neutral-700"
              : "bg-white text-neutral-700";
            const hoverHeader = isSelected
              ? ""
              : "group-hover:bg-slate-50 group-hover:text-brand-600";
            const hoverValue = isSelected
              ? ""
              : "group-hover:bg-slate-50 group-hover:text-brand-600";

            return `
              <button
                type="button"
                class="group flex flex-1 min-w-0 flex-col border-r ${cellBorder} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
                data-date="${day.iso}"
                aria-pressed="${isSelected}"
              >
                <div class="w-full h-full px-2 py-2 border-b ${cellBorder} ${headerState} ${hoverHeader} text-center text-sm font-medium leading-tight transition-colors">
                  ${day.label}
                </div>
                <div class="w-full h-full px-2 py-2 ${valueState} ${hoverValue} text-center text-lg font-semibold leading-tight transition-colors">
                  ${day.total.toString().padStart(2, "0")}
                </div>
              </button>
            `;
          })
          .join("");

        return `
          <div class="flex-1 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div class="flex items-stretch">
              ${dayCols}
              <div class="flex w-32 flex-none flex-col items-stretch border-l border-gray-200">
                <div class="flex items-center justify-center border-b border-brand-600 bg-brand-600 px-4 py-3 text-sm font-semibold text-white">Total</div>
                <div class="flex flex-1 items-center justify-center bg-brand-50 px-4 py-3 text-lg font-semibold text-brand-600">${rowTotal
                  .toString()
                  .padStart(2, "0")}</div>
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
          `<a href="#" class="font-normal text-[#0052CC] hover:underline">${
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
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        html: `
          <span class="inline-flex items-center gap-1">
            Created Date
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400" viewBox="0 0 20 20" fill="none">
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
        headerClass: "px-6 py-4 text-left",
        cellClass: "px-6 py-4 text-slate-600",
        html: `
          <span class="inline-flex items-center gap-1">
            Follow Up Date
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400" viewBox="0 0 20 20" fill="none">
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
      <div class="flex items-center justify-between px-4 py-3 border-b rounded-t-lg bg-white">
          <!-- Title -->
            <div class="flex items-center gap-2">
              <span class="text-[15px] font-semibold text-gray-800">Notification</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                xmlns="http://www.w3.org/2000/svg" class="text-gray-500">
                <path d="M13.3965 17.6921C13.3965 17.8622 13.329 18.0252 13.2087 18.1454C13.0885 18.2656 12.9255 18.3332 12.7555 18.3332H7.62727C7.45726 18.3332 7.29421 18.2656 7.174 18.1454C7.05378 18.0252 6.98624 17.8622 6.98624 17.6921C6.98624 17.5221 7.05378 17.3591 7.174 17.2389C7.29421 17.1187 7.45726 17.0511 7.62727 17.0511H12.7555C12.9255 17.0511 13.0885 17.1187 13.2087 17.2389C13.329 17.3591 13.3965 17.5221 13.3965 17.6921ZM17.7082 13.8412C17.2627 13.0752 16.6016 10.9077 16.6016 8.07676C16.6016 6.37665 15.9263 4.74618 14.7241 3.54402C13.5219 2.34187 11.8915 1.6665 10.1914 1.6665C8.49127 1.6665 6.86079 2.34187 5.65864 3.54402C4.45648 4.74618 3.78111 6.37665 3.78111 8.07676C3.78111 10.9085 3.11926 13.0752 2.67454 13.8412C2.56098 14.0359 2.50077 14.2572 2.5 14.4826C2.49923 14.7081 2.55791 14.9297 2.67014 15.1252C2.78236 15.3208 2.94416 15.4832 3.13921 15.5963C3.33426 15.7093 3.55568 15.7689 3.78111 15.7691H16.6016C16.827 15.7688 17.0483 15.7091 17.2432 15.596C17.4382 15.4829 17.5999 15.3204 17.712 15.1249C17.8241 14.9294 17.8827 14.7078 17.8819 14.4824C17.8811 14.257 17.8209 14.0359 17.7074 13.8412H17.7082Z" fill="currentColor"/>
              </svg>
            </div>
          <div class="flex items-center gap-2 text-xs text-gray-600 select-none">
            <span>Only show unread</span>
            <button id="notifUnreadToggle" type="button" aria-pressed="false"
              class="w-10 h-5 inline-flex items-center rounded-full bg-gray-300 relative">
              <span class="knob absolute w-4 h-4 bg-white rounded-full left-0.5 transition-transform duration-200 ease-out translate-x-0"></span>
            </button>
          </div>
      </div>

      <!-- Tabs -->
      <div class="px-4 pt-3">
        <!-- Tailwind safelist anchor for dynamic classes used at runtime on Ontraport builds -->
        <span class="hidden bg-blue-600 bg-gray-300 text-gray-700 text-white shadow-sm translate-x-0 translate-x-5"></span>
        <div class="flex items-center gap-3">
          <button id="notifTabAction" class="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white shadow-sm">
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-red-600"></span>
              Action Required
            </span>
          </button>
          <button id="notifTabGeneral" class="px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-100">
            General Updates
          </button>
        </div>
  
        <!-- Mark all as read -->
        <label for="notifMarkAll" class="mt-3 mb-2 inline-flex items-center gap-2 text-sm text-gray-700 hover:text-blue-700 cursor-pointer select-none">
          <input id="notifMarkAll" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
          <h5>Mark all as read</h5>
        </label>
      </div>
  
      <!-- List -->
      <div class="max-h-[380px] overflow-auto" id="notifList"></div>
  
      <!-- Footer -->
      <div class="px-4 py-3 border-t rounded-b-lg text-center">
        <a href="#" class="text-sm font-medium text-blue-700 hover:underline">View All</a>
      </div>
    `;

      document.body.appendChild(wrap);

      const model = this.model;

      // ----- State -----
      let currentTab = "Action Required";
      let onlyUnread = false;
      let markAllOn = false;
      let selectedIndex = 0;

      // ----- Rendering -----
      const listEl = document.getElementById("notifList");
      function rowTemplate(item, active) {
        const unreadDot = !item.read
          ? `<span class="ml-2 p-1 w-2.5 h-2.5 rounded-full bg-red-600"></span>`
          : "";
        const baseBg = !item.read ? "bg-slate-200" : "bg-white";
        return `
        <div class="px-4 py-3 ${baseBg} border-b last:border-b-0">
          <div class="flex items-start">
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <div class="w-[250px] text-sm font-semibold text-slate-800">${item.id}
                  <span class="font-normal text-slate-600"> - ${item.text}</span>
                </div>
                ${unreadDot}
              </div>
              <div class="mt-1 text-xs text-slate-500">${item.when}</div>
            </div>
          </div>
        </div>`;
      }

      function render() {
        // update tab button styles
        const tabAction = document.getElementById("notifTabAction");
        const tabGeneral = document.getElementById("notifTabGeneral");
        const activeCls =
          "px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm";
        const inactiveCls =
          "px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100";
        tabAction.className =
          currentTab === "Action Required" ? activeCls : inactiveCls;
        tabGeneral.className =
          currentTab === "General Updates" ? activeCls : inactiveCls;

        // sync unread toggle visuals deterministically
        const unreadBtn = document.getElementById("notifUnreadToggle");
        if (unreadBtn) {
          unreadBtn.setAttribute("aria-pressed", String(onlyUnread));
          unreadBtn.classList.toggle("bg-blue-600", onlyUnread);
          unreadBtn.classList.toggle("bg-gray-300", !onlyUnread);
          const knob = unreadBtn.querySelector(".knob");
          if (knob) {
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
      a.classList.toggle("text-sky-900", isActive);
      a.classList.toggle("border-brand-500", isActive);
      a.classList.toggle("border-b-2", true);
      a.classList.toggle("text-base", !isActive);
      a.classList.toggle("font-medium", !isActive);
      a.classList.toggle("font-['Inter']", !isActive);
      a.classList.toggle("border-transparent", !isActive);
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
    let popup = document.createElement("div");
    popup.id = "create-button-Popup";
    popup.className =
      "mt-3 absolute hidden z-50 w-48 bg-white rounded-lg shadow-xl border border-slate-200";

    popup.innerHTML = `
      <div class="flex flex-col text-sm text-slate-700">
        <button id='new-inquiry' class="flex gap-2 px-4 py-2 text-left hover:bg-slate-100 w-full">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M9.50001 10.0554C9.83334 10.0554 10.0556 10.2776 10.0556 10.6109C10.0556 10.9443 9.83334 11.1665 9.50001 11.1665C9.16667 11.1665 8.94445 10.9443 8.94445 10.6109C8.94445 10.2776 9.16667 10.0554 9.50001 10.0554ZM5.11112 10.9998L4.94445 10.6109L5.11112 10.2221C5.83334 8.44428 7.55556 7.27762 9.50001 7.27762C10.5556 7.27762 11.5 7.61095 12.2778 8.1665V4.49984C12.2778 3.88873 11.7778 3.38873 11.1667 3.38873H8.94445V2.27762C8.94445 1.6665 8.44445 1.1665 7.83334 1.1665H5.61112C5.00001 1.1665 4.50001 1.6665 4.50001 2.27762V3.38873H2.27778C1.66667 3.38873 1.16667 3.88873 1.16667 4.49984V10.6109C1.16667 11.2221 1.66667 11.7221 2.27778 11.7221H5.50001C5.33334 11.4998 5.22223 11.2776 5.11112 10.9998ZM5.61112 2.27762H7.83334V3.38873H5.61112V2.27762ZM9.50001 8.38873C8.00001 8.38873 6.66667 9.33317 6.16667 10.6109C6.66667 11.8887 8.00001 12.8332 9.50001 12.8332C11 12.8332 12.3333 11.8887 12.8333 10.6109C12.3333 9.33317 11 8.38873 9.50001 8.38873ZM9.50001 11.9998C8.72223 11.9998 8.11112 11.3887 8.11112 10.6109C8.11112 9.83317 8.72223 9.22206 9.50001 9.22206C10.2778 9.22206 10.8889 9.83317 10.8889 10.6109C10.8889 11.3887 10.2778 11.9998 9.50001 11.9998Z"
              fill="#636D88"
            />
          </svg>
          <span>New Inquiry</span>
        </button>
        <button id='new-quote' class="flex gap-2 px-4 py-2 text-left hover:bg-slate-100 w-full">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4.311 12.7337C4.52262 12.7337 4.67101 12.628 4.91967 12.3949L6.83581 10.6482L10.4088 10.6534C11.9864 10.6588 12.8333 9.77998 12.8333 8.22905V4.17431C12.8333 2.62337 11.9864 1.75 10.409 1.75H3.59098C2.01904 1.75 1.16667 2.61795 1.16667 4.17431V8.22905C1.16667 9.78517 2.01882 10.6534 3.59098 10.6482H3.83987V12.1885C3.83987 12.5166 4.01445 12.7337 4.311 12.7337ZM4.44335 5.8734C4.44335 5.23311 4.93571 4.7884 5.576 4.7884C6.27479 4.7884 6.74592 5.344 6.74592 6.06944C6.74592 7.42975 5.6607 8.07547 5.11549 8.07547C4.96191 8.07547 4.85079 7.96435 4.85079 7.8268C4.85079 7.69965 4.90906 7.61495 5.11029 7.55691C5.45969 7.4616 5.86713 7.18628 6.06317 6.747H6.02071C5.87774 6.92158 5.6607 6.95862 5.43326 6.95862C4.82978 6.95862 4.44335 6.48207 4.44335 5.8734ZM7.33359 5.8734C7.33359 5.23311 7.82595 4.7884 8.46624 4.7884C9.16503 4.7884 9.63616 5.344 9.63616 6.06944C9.63616 7.42975 8.55094 8.07547 8.00573 8.07547C7.85215 8.07547 7.74103 7.96435 7.74103 7.8268C7.74103 7.69965 7.7993 7.61495 8.00053 7.55691C8.34993 7.4616 8.75737 7.18628 8.95318 6.747H8.91095C8.76798 6.92158 8.55094 6.95862 8.32328 6.95862C7.72003 6.95862 7.33359 6.48207 7.33359 5.8734Z"
              fill="#636D88"
            />
          </svg>

          <span>New Quote</span>
        </button>

        <button id='new-job' class="flex gap-2 px-4 py-2 text-left hover:bg-slate-100 w-full">
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5.90626 2.3335C5.61617 2.3335 5.33798 2.44873 5.13286 2.65385C4.92774 2.85897 4.81251 3.13717 4.81251 3.42725V3.79183H2.26042C1.97034 3.79183 1.69214 3.90706 1.48702 4.11218C1.28191 4.3173 1.16667 4.5955 1.16667 4.88558L1.16667 5.89475L6.71855 7.37495C6.90297 7.42407 7.09704 7.42407 7.28146 7.37495L12.8333 5.89475V4.88558C12.8333 4.5955 12.7181 4.3173 12.513 4.11218C12.3079 3.90706 12.0297 3.79183 11.7396 3.79183H9.18751V3.42725C9.18751 3.13717 9.07227 2.85897 8.86715 2.65385C8.66204 2.44873 8.38384 2.3335 8.09376 2.3335H5.90626ZM5.90626 3.06266H8.09376C8.19045 3.06266 8.28318 3.10107 8.35155 3.16945C8.41993 3.23782 8.45834 3.33055 8.45834 3.42725V3.79183H5.54167V3.42725C5.54167 3.33055 5.58008 3.23782 5.64846 3.16945C5.71683 3.10107 5.80956 3.06266 5.90626 3.06266Z"
              fill="#636D88"
            />
            <path
              d="M1.16667 10.7189C1.16667 11.009 1.28191 11.2872 1.48702 11.4923C1.69214 11.6974 1.97034 11.8127 2.26042 11.8127H11.7396C12.0297 11.8127 12.3079 11.6974 12.513 11.4923C12.7181 11.2872 12.8333 11.009 12.8333 10.7189V6.59912L7.09407 8.12818C7.03244 8.14464 6.96757 8.14464 6.90594 8.12818L1.16667 6.59912V10.7189Z"
              fill="#636D88"
            />
          </svg>

          <span>Book a job</span>
        </button>
      </div>
    `;

    let baseElement = document.getElementById("create-popup-base");
    baseElement?.appendChild(popup);
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

  renderPagination() {
    const PAGES_PER_GROUP = 4;
    const TOTAL_PAGES = Math.ceil(this.model.totalCount / PAGES_PER_GROUP);
    const limit =
      (this?.model?.paginationLimit ?? this?.model?.limit ?? 10) || 10;

    let currentIdx = 1;
    let start = 1;

    const embedDiv = document.getElementById("pagination-pages");
    const prev = document.getElementById("prev-page-btn");
    const next = document.getElementById("next-page-btn");
    const lt = document.getElementById("lt-btn");
    const gt = document.getElementById("gt-btn");

    const updateModelRange = (shouldNotify = false) => {
      if (!this.model) return;
      const totalCount = this.model.totalCount;
      const startIndex = totalCount - (currentIdx - 1) * limit;
      this.model.startIndex = Number.isFinite(startIndex) ? startIndex : null;
      this.model.endIndex =
        this.model.startIndex != null ? this.model.startIndex + limit : null;

      if (shouldNotify && typeof this.onPageChange === "function") {
        this.onPageChange(currentIdx);
      }
    };

    function renderPages() {
      const end = Math.min(start + PAGES_PER_GROUP - 1, TOTAL_PAGES);
      embedDiv.innerHTML = "";
      embedDiv.appendChild(createPagesBtn(start, end));
      setActive(currentIdx);
      updateModelRange(false);
    }

    function bindEvents() {
      lt.addEventListener("click", () => {
        if (currentIdx === 1) return;
        currentIdx--;
        shiftWindowIfNeeded(false);
      });

      gt.addEventListener("click", () => {
        if (currentIdx === TOTAL_PAGES) return;
        currentIdx++;
        shiftWindowIfNeeded(false);
      });

      prev.addEventListener("click", () => {
        if (start === 1) return;
        start = Math.max(1, start - PAGES_PER_GROUP);
        currentIdx = start;
        renderPages();
        updateModelRange(false);
      });

      next.addEventListener("click", () => {
        if (start + PAGES_PER_GROUP > TOTAL_PAGES) return;
        start += PAGES_PER_GROUP;
        currentIdx = start;
        renderPages();
        updateModelRange(false);
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
      updateModelRange(shouldNotify);
    }

    function createPagesBtn(start, end) {
      const btnDiv = document.createElement("div");
      btnDiv.className = "flex gap-2";

      for (let i = start; i <= end; i++) {
        const btn = document.createElement("button");
        btn.textContent = i;
        btn.dataset.idx = i;
        btn.className = "px-3 py-1.5 text-sm font-semibold text-slate-500";

        btn.addEventListener("click", () => {
          currentIdx = i;
          shiftWindowIfNeeded(false);
        });

        btnDiv.appendChild(btn);
      }
      return btnDiv;
    }

    function setActive(idx) {
      embedDiv.querySelectorAll("button").forEach((btn) => {
        const isActive = Number(btn.dataset.idx) === idx;

        btn.classList.toggle("bg-[#003882]", isActive);
        btn.classList.toggle("text-white", isActive);

        if (!isActive) {
          btn.classList.add("text-slate-500");
        } else {
          btn.classList.remove("text-slate-500");
        }
      });
    }

    renderPages();
    bindEvents();
  }
}
