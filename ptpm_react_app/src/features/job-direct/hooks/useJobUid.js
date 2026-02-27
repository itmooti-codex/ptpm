import { useMemo } from "react";

export function getJobUidFromSearch(search = "") {
  const params = new URLSearchParams(search || "");
  return (params.get("jobuid") || "").trim();
}

export function useJobUid() {
  return useMemo(() => getJobUidFromSearch(window.location.search), []);
}
