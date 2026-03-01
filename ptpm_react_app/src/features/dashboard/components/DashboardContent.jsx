import { Button } from "../../../shared/components/ui/Button.jsx";
import { DashboardCalendar } from "./calendar/DashboardCalendar.jsx";
import { DashboardTabsNav } from "./tabs/DashboardTabsNav.jsx";
import { AppliedFilterChips } from "./filters/AppliedFilterChips.jsx";
import { DashboardTable } from "./table/DashboardTable.jsx";
import { DashboardPagination } from "./pagination/DashboardPagination.jsx";
import { CALENDAR_TABS } from "../constants/tabs.js";

const PAGE_SIZE = 25;

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardContent({
  activeTab,
  onTabChange,
  tabCounts,
  calendarData,
  activeChips,
  onRemoveChip,
  currentPage,
  onPageChange,
  rows = [],
  totalCount = 0,
  totalPages = 1,
  isLoading = false,
  isBatchMode,
  batchSelectedIds,
  onBatchSelectionChange,
  onOpenTaskModal,
  onDeleteInquiry,
  onViewInquiry,
  sidebarOpen,
  onToggleSidebar,
  sortOrder = "desc",
  onToggleSortOrder,
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Toolbar row */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-2">
        {!sidebarOpen && (
          <Button variant="ghost" size="sm" onClick={onToggleSidebar} title="Show filters">
            <FilterIcon />
            <span>Filters</span>
          </Button>
        )}
        {sidebarOpen && (
          <Button variant="ghost" size="sm" onClick={onToggleSidebar} title="Hide filters">
            <FilterIcon />
            <span>Hide Filters</span>
          </Button>
        )}
      </div>

      {/* Calendar — only for inquiry tab */}
      {CALENDAR_TABS.has(activeTab) && (
        <DashboardCalendar calendarData={calendarData} />
      )}

      {/* Tabs */}
      <DashboardTabsNav
        activeTab={activeTab}
        tabCounts={tabCounts}
        onTabChange={onTabChange}
      />

      {/* Applied filter chips */}
      {activeChips.length > 0 && (
        <div className="border-b border-slate-100 bg-white px-4 py-2">
          <AppliedFilterChips chips={activeChips} onRemove={onRemoveChip} />
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        <DashboardTable
          activeTab={activeTab}
          rows={rows}
          isLoading={isLoading}
          isBatchMode={isBatchMode}
          batchSelectedIds={batchSelectedIds}
          onBatchSelectionChange={onBatchSelectionChange}
          onOpenTaskModal={onOpenTaskModal}
          onDeleteInquiry={onDeleteInquiry}
          onViewInquiry={onViewInquiry}
          sortOrder={sortOrder}
          onToggleSortOrder={onToggleSortOrder}
        />
      </div>

      {/* Pagination */}
      <DashboardPagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={onPageChange}
      />
    </div>
  );
}
