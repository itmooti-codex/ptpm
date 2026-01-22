import { renderDynamicTable } from "../../shared/dynamicTable.js";
import { getDashboardTableElement } from "../../shared/dom.js";
import { formatDisplayDate, formatUnixDate } from "../../shared/dateFormat.js";
import { DASHBOARD_TABS } from "./config.js";
import { tableState } from "./dashboardState.js";

export class DashboardView {
  constructor() {}

  getCalendarElement() {
    let calendarElement = document.querySelector("#calendar-grid");
    if (!calendarElement) {
      throw new Error("Calendar element not found");
    }
    return calendarElement;
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

  renderTable(headers, rows) {
    const container = getDashboardTableElement();
    if (!container) return null;

    return this.renderDataTable({
      container,
      headers,
      rows: Array.isArray(rows) ? rows : [],
      emptyState: `No inquiries scheduled for ${formatDisplayDate(
        formatUnixDate
      )}.`,
      getRowClass: (_row, idx) =>
        `${
          idx % 2 === 0 ? "bg-white" : "bg-[#f5f8ff]"
        } transition-colors hover:bg-brand-50/40`,
    });
  }

  renderDataTable(config = {}) {
    return this.renderDynamicTable({
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

  renderDynamicTable(config) {
    renderDynamicTable(config);
  }

  emitDashboardTabChangesEvent(handler) {
    let tabsContainer = document.querySelector("#top-tabs");
    if (!tabsContainer) return;

    const onClick = (e) => {
      const tabEl = e.target.closest("[data-tab]");
      if (!tabEl) return;

      handler(tabEl.dataset.tab);
    };

    tabsContainer.addEventListener("click", onClick);
    return () => {
      tabsContainer.removeEventListener("click", onClick);
    };
  }

  setActiveTab(tab, context, links, panels) {
    const relatedFilters = document.getElementById("related-filters");
    const paymentRelated = document.getElementById("payment-related-filter");
    if (tab === "urgent-calls") relatedFilters?.classList.add("hidden");
    else relatedFilters?.classList.remove("hidden");

    if (paymentRelated) {
      const showPaymentFilters = [
        DASHBOARD_TABS.payment,
        DASHBOARD_TABS.quote,
        DASHBOARD_TABS.jobs,
        DASHBOARD_TABS["active-jobs"],
      ].includes(tab);
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
      tableState.previousTab = tab;
      if (typeof context.onTabChange === "function") {
        context.onTabChange(tab);
      }
    } else {
      context.previousTab = tab;
      tableState.previousTab = tab;
    }
  }

  renderStatusOptionsForTab(statuses, handler) {
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
    handler();
  }

  renderSourceOptions(sources) {
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
}
