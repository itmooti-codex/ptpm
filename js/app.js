import { NewEnquiryController } from "./controller/new-enquiry.js";
import { NewEnquiryModel } from "./models/new-enquiry.js";
import { NewEnquiryView } from "./views/new-enquiry.js";
import { DashboardModel } from "./models/dashboard.js";
import { DashboardView, renderDynamicTable } from "./views/dashboard.js";
import { DashboardController } from "./controller/dashboard.js";

import { config } from "../sdk/config.js";
import { VitalStatsSDK } from "../sdk/init.js";

// Central app bootstrap: instantiate classes once based on page
(function bootstrap() {
  const App = {
    services: {},
    controllers: {},
    started: false,
    start: async function () {
      if (this.started) return;
      this.started = true;

      try {
        // Initialize shared SDK/service once
        const { slug, apiKey } = config;
        const sdk = new VitalStatsSDK({ slug, apiKey });
        this.services.plugin = await sdk.initialize();
        window.tempPlugin ??= this.services.plugin;
      } catch (err) {
        console.error("SDK init failed", err);
      }

      const page = document.body?.dataset?.page || "";

      // Always-available controllers (if DOM present)
      this.maybeInitDashboard();

      // Page-specific
      if (page === "new-enquiry") this.initNewEnquiry();
      if (page === "dashboard") this.maybeInitDashboard();
      if (page === "job-detail") {
      }
    },

    maybeInitDashboard() {
      const hasCalendar = document.getElementById("calendar-grid");
      const hasTable = document.getElementById("inquiry-table-container");
      if (!hasCalendar || !hasTable) return;
      if (typeof dayjs === "undefined") return;
      if (this.controllers.dashboard) return; // already initialized
      const model = new DashboardModel(tempPlugin);
      const view = new DashboardView();
      const ctrl = new DashboardController(model, view);
      ctrl.init();
      this.controllers.dashboard = ctrl;
    },

    initNewEnquiry() {
      if (this.controllers.newEnquiry) return;
      const model = new NewEnquiryModel(this.services.plugin);
      const view = new NewEnquiryView();
      const ctrl = new NewEnquiryController(model, view);
      ctrl.init();
      this.controllers.newEnquiry = ctrl;
    },
  };

  document.addEventListener("DOMContentLoaded", () => App.start());
  window.App = App; // optional: debug access
  window.renderDynamicTable = renderDynamicTable;
})();
