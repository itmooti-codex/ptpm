import { useCallback } from "react";
import {
  JobDirectTable,
  JobDirectEmptyTableRow,
  useRenderWindow,
} from "../../../job-direct/components/primitives/JobDirectTable.jsx";
import { TAB_IDS } from "../../constants/tabs.js";
import { getInquiryColumns } from "./columns/inquiryColumns.jsx";
import { getQuoteColumns } from "./columns/quoteColumns.jsx";
import { getJobsColumns } from "./columns/jobsColumns.jsx";
import { getPaymentColumns } from "./columns/paymentColumns.jsx";
import { getActiveJobsColumns } from "./columns/activeJobsColumns.jsx";
import { getUrgentCallsColumns } from "./columns/urgentCallsColumns.jsx";

function getColumns(activeTab, opts) {
  switch (activeTab) {
    case TAB_IDS.INQUIRY:
      return getInquiryColumns(opts);
    case TAB_IDS.QUOTE:
      return getQuoteColumns(opts);
    case TAB_IDS.JOBS:
      return getJobsColumns(opts);
    case TAB_IDS.PAYMENT:
      return getPaymentColumns(opts);
    case TAB_IDS.ACTIVE_JOBS:
      return getActiveJobsColumns(opts);
    case TAB_IDS.URGENT_CALLS:
      return getUrgentCallsColumns(opts);
    default:
      return [];
  }
}

export function DashboardTable({
  activeTab,
  rows = [],
  isLoading = false,
  isBatchMode = false,
  batchSelectedIds = [],
  onBatchSelectionChange,
  onOpenTaskModal,
  onDeleteInquiry,
  onViewInquiry,
  sortOrder = "desc",
  onToggleSortOrder,
}) {
  const { visibleRows, hasMore, remainingCount, showMore } = useRenderWindow(rows);

  const handleToggleSelect = useCallback(
    (id) => {
      onBatchSelectionChange?.((prev) => {
        const ids = Array.isArray(prev) ? prev : [];
        return ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id];
      });
    },
    [onBatchSelectionChange]
  );

  const colOpts = {
    isBatchMode,
    onView: (row) => onViewInquiry?.(row),
    onAddTask: (row) => onOpenTaskModal?.(row),
    onDelete: (row) => onDeleteInquiry?.(row),
    sortOrder,
    onToggleSortOrder,
  };

  const columns = getColumns(activeTab, colOpts);

  const rowCtx = {
    selectedIds: batchSelectedIds,
    onToggleSelect: handleToggleSelect,
  };

  return (
    <div className="flex-1">
      <JobDirectTable minWidthClass="min-w-[800px]">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 ${col.thClass ?? ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {isLoading ? (
            <JobDirectEmptyTableRow colSpan={columns.length} message="Loading…" />
          ) : visibleRows.length === 0 ? (
            <JobDirectEmptyTableRow
              colSpan={columns.length}
              message="No records found."
            />
          ) : (
            visibleRows.map((row, i) => (
              <tr
                key={row.id ?? i}
                className="hover:bg-slate-50"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 align-middle text-sm">
                    {col.render(row, rowCtx)}
                  </td>
                ))}
              </tr>
            ))
          )}
          {hasMore && (
            <tr>
              <td colSpan={columns.length} className="px-3 py-2 text-center">
                <button
                  type="button"
                  className="text-sm text-[#003882] hover:underline"
                  onClick={showMore}
                >
                  Show more ({remainingCount} remaining)
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </JobDirectTable>
    </div>
  );
}
