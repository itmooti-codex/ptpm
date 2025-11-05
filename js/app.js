import { NewEnquiryController } from "./controller/new-enquiry.js";
import { NewEnquiryModel } from "./models/new-enquiry.js";
import { NewEnquiryView } from "./views/new-enquiry.js";
import { DashboardModel } from "./models/dashboard.js";
import { DashboardView, renderDynamicTable } from "./views/dashboard.js";
import { DashboardController } from "./controller/dashboard.js";
import { InquiryDetailModel } from "./models/inquiry-details.js";
import { InquiryDetailView } from "./views/inquiry-detail.js";
import { InquiryDetailController } from "./controller/inquiry-detail.js";

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
      if (page === "inquiry-detail") this.initInquiryDetail();
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
      const model = new NewEnquiryModel(tempPlugin);
      const view = new NewEnquiryView(model);
      const ctrl = new NewEnquiryController(model, view);
      ctrl.init();
      this.controllers.newEnquiry = ctrl;
    },

    initInquiryDetail() {
      if (this.controllers.inquiryDetail) return;
      if (!this.services.plugin) {
        console.warn("[App] VitalStats plugin unavailable; inquiry detail skipped.");
        return;
      }

      const inquiryModel = new InquiryDetailModel(this.services.plugin, {
        inquiryId: config.inquiryId,
      });
      const inquiryView = new InquiryDetailView();
      const inquiryCtrl = new InquiryDetailController(inquiryModel, inquiryView);

      if (typeof inquiryCtrl.init === "function") {
        inquiryCtrl
          .init()
          .catch((error) =>
            console.error("[App] Inquiry detail init failed", error)
          );
      }

      this.controllers.inquiryDetail = inquiryCtrl;
    },
  };

  document.addEventListener("DOMContentLoaded", () => App.start());
  window.App = App; // optional: debug access
  window.renderDynamicTable = renderDynamicTable;
})();
