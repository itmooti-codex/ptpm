import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { Modal } from "../../../shared/components/ui/Modal.jsx";
import { useToast } from "../../../shared/providers/ToastProvider.jsx";
import { getFriendlyServiceMessage } from "../../../shared/utils/userFacingErrors.js";
import { GlobalTopHeader } from "../../../shared/layout/GlobalTopHeader.jsx";
import { useDashboardBootstrap } from "../hooks/useDashboardBootstrap.js";
import { useDashboardFilters } from "../hooks/useDashboardFilters.js";
import { useDashboardData } from "../hooks/useDashboardData.js";
import {
  cancelInquiryById,
  createJobRecord,
  fetchTabCounts,
  fetchInquiryCalendarData,
} from "../sdk/dashboardSdk.js";
import { TAB_IDS } from "../constants/tabs.js";
import { DashboardHeader } from "../components/DashboardHeader.jsx";
import { DashboardSidebar } from "../components/DashboardSidebar.jsx";
import { DashboardContent } from "../components/DashboardContent.jsx";
import { DashboardBatchDeleteModal } from "../components/modals/DashboardBatchDeleteModal.jsx";
import { TasksModal } from "../../job-direct/components/modals/TasksModal.jsx";

function FullPageLoader({ text = "Loading dashboard..." }) {
  return (
    <main className="min-h-screen w-full bg-slate-50 font-['Inter']">
      <div className="flex min-h-screen w-full items-center justify-center px-6">
        <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-[#003882]" />
            <div className="text-sm font-semibold text-slate-800">{text}</div>
          </div>
        </div>
      </div>
    </main>
  );
}

function FullPageError({
  title = "Unable to load dashboard.",
  description = "Please try refreshing the page.",
}) {
  return (
    <main className="min-h-screen w-full bg-slate-50 font-['Inter']">
      <div className="flex min-h-screen w-full items-center justify-center px-6">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold text-red-700">{title}</div>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
      </div>
    </main>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const { plugin, isBootstrapping, statusText, error, serviceProviders } =
    useDashboardBootstrap();

  const [activeTab, setActiveTab] = useState(TAB_IDS.INQUIRY);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState("desc");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tabCounts, setTabCounts] = useState({
    [TAB_IDS.INQUIRY]: 0,
    [TAB_IDS.QUOTE]: 0,
    [TAB_IDS.JOBS]: 0,
    [TAB_IDS.PAYMENT]: 0,
    [TAB_IDS.ACTIVE_JOBS]: 0,
    [TAB_IDS.URGENT_CALLS]: 0,
  });
  const [batchSelectedIds, setBatchSelectedIds] = useState([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [taskModal, setTaskModal] = useState({ open: false, row: null });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeletingInquiry, setIsDeletingInquiry] = useState(false);
  const [isCreatingJob, setIsCreatingJob] = useState(false);
  const [batchDeleteModal, setBatchDeleteModal] = useState(false);
  const [calendarData, setCalendarData] = useState({});

  const filterHook = useDashboardFilters();

  const handleToggleSortOrder = useCallback(() => {
    setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"));
    setCurrentPage(1);
  }, []);

  const { rows, isLoading } = useDashboardData({
    plugin,
    activeTab,
    appliedFilters: filterHook.appliedFilters,
    currentPage,
    pageSize: 25,
    sortOrder,
  });

  // Fetch tab count badges once when plugin is ready (calc queries, no re-fetch on tab switch)
  useEffect(() => {
    if (!plugin) return;
    fetchTabCounts({ plugin })
      .then((counts) => {
        setTabCounts({
          [TAB_IDS.INQUIRY]: counts.inquiry,
          [TAB_IDS.QUOTE]: counts.quote,
          [TAB_IDS.JOBS]: counts.jobs,
          [TAB_IDS.PAYMENT]: counts.payment,
          [TAB_IDS.ACTIVE_JOBS]: counts["active-jobs"],
          [TAB_IDS.URGENT_CALLS]: counts["urgent-calls"],
        });
      })
      .catch((err) => console.warn("[DashboardPage] fetchTabCounts failed:", err));
  }, [plugin]);

  // Fetch per-day inquiry counts for calendar badges (inquiry tab only).
  useEffect(() => {
    if (!plugin) return;
    fetchInquiryCalendarData({ plugin })
      .then(setCalendarData)
      .catch((err) => console.warn("[DashboardPage] fetchInquiryCalendarData failed:", err));
  }, [plugin]);

  // Derive pagination from tab count badge (calc total)
  const totalCount = tabCounts[activeTab] ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 25));

  const handleTabChange = useCallback(
    (tab) => {
      setActiveTab(tab);
      setCurrentPage(1);
      setBatchSelectedIds([]);
      setIsBatchMode(false);
    },
    []
  );

  const handleOpenTaskModal = useCallback((row) => {
    setTaskModal({ open: true, row: row || null });
  }, []);

  const handleCloseTaskModal = useCallback(() => {
    setTaskModal({ open: false, row: null });
  }, []);

  const handleOpenDeleteModal = useCallback((row) => {
    if (!row?.id) return;
    setDeleteTarget(row);
  }, []);

  const handleConfirmDeleteInquiry = useCallback(async () => {
    if (!plugin || !deleteTarget?.id || isDeletingInquiry) return;
    setIsDeletingInquiry(true);
    try {
      await cancelInquiryById({ plugin, dealId: deleteTarget.id });
      success("Inquiry cancelled", "Inquiry status has been updated to Cancelled.");
      setDeleteTarget(null);
      setTabCounts((prev) => ({
        ...prev,
        [TAB_IDS.INQUIRY]: Math.max(0, (prev?.[TAB_IDS.INQUIRY] ?? 0) - 1),
      }));
    } catch (deleteError) {
      console.error("[Dashboard] Failed to cancel inquiry", deleteError);
      showError(
        "Delete failed",
        deleteError?.message || "Unable to cancel inquiry."
      );
    } finally {
      setIsDeletingInquiry(false);
    }
  }, [plugin, deleteTarget, isDeletingInquiry, success, showError]);

  const handleCreateJob = useCallback(async () => {
    if (!plugin || isCreatingJob) return;
    setIsCreatingJob(true);
    try {
      const created = await createJobRecord({ plugin, payload: null });
      const uniqueId = String(created?.unique_id || "").trim();
      if (!uniqueId) {
        throw new Error("Created job did not return a unique ID.");
      }
      success("Job created", "Opening the new job page...");
      navigate(`/job-direct/${encodeURIComponent(uniqueId)}`);
    } catch (createError) {
      console.error("[Dashboard] Failed creating job", createError);
      showError("Create failed", createError?.message || "Unable to create job.");
      setIsCreatingJob(false);
    }
  }, [plugin, isCreatingJob, success, showError, navigate]);

  const handleEnableBatchDelete = useCallback(() => {
    setIsBatchMode(true);
    setBatchSelectedIds([]);
  }, []);

  const handleBatchDeleteConfirm = useCallback(() => {
    setBatchDeleteModal(false);
    setBatchSelectedIds([]);
    setIsBatchMode(false);
  }, []);

  const handleApplyFilters = useCallback(() => {
    filterHook.applyFilters();
    setCurrentPage(1);
  }, [filterHook]);

  const handleResetFilters = useCallback(() => {
    filterHook.resetFilters();
    setCurrentPage(1);
  }, [filterHook]);

  if (isBootstrapping || isCreatingJob) {
    const loaderText = isCreatingJob ? "Creating job..." : statusText;
    return <FullPageLoader text={loaderText} />;
  }

  if (error) {
    const friendlyMessage = getFriendlyServiceMessage(error);
    return (
      <FullPageError
        title={friendlyMessage ? "Temporary maintenance" : "Unable to load dashboard."}
        description={friendlyMessage || "Please try refreshing the page."}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-['Inter']">
      <GlobalTopHeader />
      <DashboardHeader
        onEnableBatchDelete={handleEnableBatchDelete}
        isBatchMode={isBatchMode}
        batchSelectedCount={batchSelectedIds.length}
        onBatchDeleteClick={() => setBatchDeleteModal(true)}
        onCreateJob={handleCreateJob}
      />

      <div className="flex h-[calc(100vh-56px)]">
        {sidebarOpen && (
          <DashboardSidebar
            activeTab={activeTab}
            filters={filterHook.filters}
            onPatchFilter={filterHook.patchFilter}
            onToggleArrayFilter={filterHook.toggleArrayFilter}
            onApply={handleApplyFilters}
            onReset={handleResetFilters}
            onClose={() => setSidebarOpen(false)}
            serviceProviders={serviceProviders}
          />
        )}

        <main className="flex min-w-0 flex-1 flex-col overflow-auto">
          <DashboardContent
            activeTab={activeTab}
            onTabChange={handleTabChange}
            tabCounts={tabCounts}
            calendarData={calendarData}
            activeChips={filterHook.getActiveChips(filterHook.appliedFilters, { serviceProviders })}
            onRemoveChip={filterHook.removeAppliedFilter}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            rows={rows}
            totalCount={totalCount}
            totalPages={totalPages}
            isLoading={isLoading}
            isBatchMode={isBatchMode}
            batchSelectedIds={batchSelectedIds}
            onBatchSelectionChange={setBatchSelectedIds}
            onOpenTaskModal={handleOpenTaskModal}
            onDeleteInquiry={activeTab === TAB_IDS.INQUIRY ? handleOpenDeleteModal : undefined}
            onViewInquiry={activeTab === TAB_IDS.INQUIRY ? () => {} : undefined}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
            sortOrder={sortOrder}
            onToggleSortOrder={handleToggleSortOrder}
          />
        </main>
      </div>

      <TasksModal
        open={taskModal.open}
        contextType="deal"
        contextId={taskModal.row?.id || ""}
        plugin={plugin}
        onClose={handleCloseTaskModal}
      />

      <Modal
        open={Boolean(deleteTarget)}
        onClose={() => {
          if (isDeletingInquiry) return;
          setDeleteTarget(null);
        }}
        title="Delete Inquiry?"
        widthClass="max-w-md"
        footer={
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => setDeleteTarget(null)}
              disabled={isDeletingInquiry}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleConfirmDeleteInquiry}
              disabled={isDeletingInquiry}
            >
              {isDeletingInquiry ? "Deleting..." : "Delete"}
            </Button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          Are you sure you want to delete this inquiry?
        </p>
      </Modal>

      <DashboardBatchDeleteModal
        open={batchDeleteModal}
        count={batchSelectedIds.length}
        onClose={() => setBatchDeleteModal(false)}
        onConfirm={handleBatchDeleteConfirm}
      />
    </div>
  );
}
