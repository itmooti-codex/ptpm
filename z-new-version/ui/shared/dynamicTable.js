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
