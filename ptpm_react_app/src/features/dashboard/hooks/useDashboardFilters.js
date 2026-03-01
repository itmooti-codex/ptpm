import { useCallback, useState } from "react";
import { INITIAL_FILTER_STATE } from "../constants/filters.js";

export function useDashboardFilters() {
  const [filters, setFilters] = useState(INITIAL_FILTER_STATE);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTER_STATE);

  const patchFilter = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleArrayFilter = useCallback((key, value) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const next = current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const applyFilters = useCallback(() => {
    setAppliedFilters(filters);
    return filters;
  }, [filters]);

  const resetFilters = useCallback(() => {
    setFilters(INITIAL_FILTER_STATE);
    setAppliedFilters(INITIAL_FILTER_STATE);
    return INITIAL_FILTER_STATE;
  }, []);

  const removeAppliedFilter = useCallback((key, value) => {
    setAppliedFilters((prev) => {
      if (Array.isArray(prev[key])) {
        return { ...prev, [key]: prev[key].filter((item) => item !== value) };
      }
      return { ...prev, [key]: "" };
    });
    setFilters((prev) => {
      if (Array.isArray(prev[key])) {
        return { ...prev, [key]: prev[key].filter((item) => item !== value) };
      }
      return { ...prev, [key]: "" };
    });
  }, []);

  function getActiveChips(applied, { serviceProviders = [] } = {}) {
    const spById = Object.fromEntries(serviceProviders.map((sp) => [sp.id, sp.name]));
    const chips = [];
    Object.entries(applied).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const label =
            key === "serviceProviders" ? (spById[item] || item) : item;
          chips.push({ key, value: item, label });
        });
      } else if (value) {
        const labelMap = {
          accountName: "Account",
          address: "Address",
          serviceman: "Serviceman",
          quoteNumber: "Quote #",
          invoiceNumber: "Invoice #",
          recommendation: "Recommendation",
          priceMin: "Min Price",
          priceMax: "Max Price",
          dateFrom: "From",
          dateTo: "To",
        };
        chips.push({ key, value, label: `${labelMap[key] || key}: ${value}` });
      }
    });
    return chips;
  }

  return {
    filters,
    appliedFilters,
    patchFilter,
    toggleArrayFilter,
    applyFilters,
    resetFilters,
    removeAppliedFilter,
    getActiveChips,
  };
}
