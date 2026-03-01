import { useEffect, useState } from "react";
import { extractFromPayload } from "../sdk/dashboardCore.js";
import { TAB_IDS } from "../constants/tabs.js";
import {
  buildDealsQuery,
  buildQuotesQuery,
  buildJobsQuery,
  buildPaymentsQuery,
  buildActiveJobsQuery,
} from "../sdk/dashboardSdk.js";

const TAB_QUERY_BUILDERS = {
  [TAB_IDS.INQUIRY]: buildDealsQuery,
  [TAB_IDS.QUOTE]: buildQuotesQuery,
  [TAB_IDS.JOBS]: buildJobsQuery,
  [TAB_IDS.PAYMENT]: buildPaymentsQuery,
  [TAB_IDS.ACTIVE_JOBS]: buildActiveJobsQuery,
};

export function useDashboardData({
  plugin,
  activeTab,
  appliedFilters,
  currentPage,
  pageSize = 25,
  sortOrder = "desc",
}) {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!plugin) return;

    const builder = TAB_QUERY_BUILDERS[activeTab];
    if (!builder) {
      setRows([]);
      setIsLoading(false);
      return;
    }

    setRows([]);
    setIsLoading(true);
    setError(null);

    let cancelled = false;
    let rxSub = null;
    let query = null;

    try {
      const built = builder(plugin, appliedFilters, currentPage, pageSize, sortOrder);
      query = built.query;
      const { normalize } = built;

      // Subscribe to real-time server updates.
      // The subscription fires immediately with current records, then on each change.
      rxSub = query.subscribe().subscribe({
        next: (payload) => {
          if (cancelled) return;
          const records = extractFromPayload(payload);
          console.debug(
            "[useDashboardData] subscription emit:",
            records.length,
            "records",
            payload
          );
          setRows(records.map(normalize));
          setIsLoading(false);
        },
        error: (err) => {
          if (cancelled) return;
          console.error("[useDashboardData] subscription error:", err);
          setError(err);
          setRows([]);
          setIsLoading(false);
        },
      });
    } catch (err) {
      if (!cancelled) {
        console.error("[useDashboardData] query build error:", err);
        setError(err);
        setRows([]);
        setIsLoading(false);
      }
    }

    return () => {
      cancelled = true;
      rxSub?.unsubscribe?.();
      try {
        query?.destroy?.();
      } catch (_) {
        // ignore destroy errors
      }
    };
  }, [plugin, activeTab, appliedFilters, currentPage, pageSize, sortOrder]);

  return { rows, isLoading, error };
}
