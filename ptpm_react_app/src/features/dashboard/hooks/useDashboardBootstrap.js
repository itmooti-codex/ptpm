import { useEffect, useState } from "react";
import { useVitalStatsPlugin } from "../../job-direct/hooks/useVitalStatsPlugin.js";
import { fetchServiceProviders } from "../sdk/dashboardSdk.js";

export function useDashboardBootstrap() {
  const { plugin, isReady: isSdkReady, error: sdkError } = useVitalStatsPlugin();
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [statusText, setStatusText] = useState("Starting app...");
  const [error, setError] = useState(null);
  const [serviceProviders, setServiceProviders] = useState([]);

  // Unblock the dashboard as soon as the plugin is ready.
  useEffect(() => {
    if (sdkError) {
      setError(sdkError);
      setIsBootstrapping(false);
      setStatusText("Unable to start app.");
      return;
    }

    if (!isSdkReady || !plugin) {
      setStatusText("Starting app...");
      setIsBootstrapping(true);
      return;
    }

    // Plugin ready — show dashboard immediately.
    setError(null);
    setIsBootstrapping(false);
    setStatusText("Ready.");
  }, [plugin, isSdkReady, sdkError]);

  // Load service providers in the background (non-blocking).
  useEffect(() => {
    if (!plugin) return;
    let isActive = true;
    const timer = setTimeout(() => {
      fetchServiceProviders({ plugin })
        .then((records) => {
          if (!isActive) return;
          setServiceProviders(Array.isArray(records) ? records : []);
        })
        .catch((err) => {
          if (!isActive) return;
          console.error("[Dashboard] fetchServiceProviders failed", err);
        });
    }, 2500);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [plugin]);

  return {
    plugin,
    isSdkReady,
    isBootstrapping,
    statusText,
    error,
    serviceProviders,
  };
}
