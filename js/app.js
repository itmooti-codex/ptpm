import { NewInquiryController } from "./controller/new-enquiry.js";
import { NewInquiryModel } from "./models/new-enquiry.js";
import { NewInquiryView } from "./views/new-enquiry.js";
import { DashboardModel } from "./models/dashboard.js";
import { DashboardView, renderDynamicTable } from "./views/dashboard.js";
import { DashboardController } from "./controller/dashboard.js";
import { initOperationLoader, showLoader, hideLoader } from "./helper.js";
import { JobDetailView } from "./views/job-detail.js";
import { JobDetailController } from "../js/controller/job-detail.js";
import { JobDetailModal } from "../js/models/job-detail.js";
import { NotificationModel } from "./models/notification.js";
import { NotificationView } from "./views/notification.js";
import { NotificationController } from "./controller/notification.js";

import { config } from "../sdk/config.js";
import { VitalStatsSDK } from "../sdk/init.js";

// Apply a neutral class to all elements to avoid host overrides
function applyBrowserDefault() {
  const all = [
    document.documentElement,
    document.body,
    ...document.querySelectorAll("*"),
  ].filter(Boolean);

  all.forEach((el) => {
    if (el.tagName === "BUTTON") {
      el.classList.remove("browser-default");
      return;
    }
    el.classList.add("browser-default");
  });
}

// Central app bootstrap: instantiate classes once based on page
(function bootstrap() {
  const loaderElement = initOperationLoader();
  const loaderMessageEl =
    loaderElement?.querySelector("[data-loader-message]") || null;
  const loaderCounter = { count: 0 };

  // showLoader(loaderElement, loaderMessageEl, loaderCounter, "Loading app...");
  const App = {
    services: {},
    controllers: {},
    started: false,
    loaderElement,
    loaderMessageEl,
    loaderCounter,
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
      // await this.maybeInitDashboard();

      // Page-specific
      if (page == "new-inquiry") this.initNewInquiry();
      if (page === "dashboard") await this.maybeInitDashboard();
      if (page == "new-direct-job") await this.initDirectJob();
      if (page === "notification") this.initNotification();
    },

    async maybeInitDashboard() {
      if (this.controllers.dashboard) return this.controllers.dashboard;
      const model = new DashboardModel(tempPlugin);
      const view = new DashboardView("", model);
      const ctrl = new DashboardController(model, view, {
        loaderElement: this.loaderElement,
        loaderCounter: this.loaderCounter,
        loaderMessageEl: this.loaderMessageEl,
      });
      await ctrl.init();
      this.controllers.dashboard = ctrl;
      return ctrl;
    },

    initNewInquiry() {
      if (this.controllers.newInquiry) return;
      const model = new NewInquiryModel(tempPlugin);
      const view = new NewInquiryView(model);
      const ctrl = new NewInquiryController(model, view, tempPlugin);
      const boundInitAutocomplete = ctrl.initAutocomplete.bind(ctrl);
      window.initAutocomplete = boundInitAutocomplete;
      ctrl.init();
      this.controllers.newInquiry = ctrl;
    },

    async initDirectJob() {
      const model = new JobDetailModal(tempPlugin);
      const view = new JobDetailView(model);
      const controller = new JobDetailController(model, view);
      await controller.init();
      // Google Places callback for property search
      window.initAutocomplete = controller.initAutocomplete.bind(controller);
    },

    initNotification() {
      if (this.controllers.notification) return;
      const model = new NotificationModel(tempPlugin);
      const view = new NotificationView(model);
      const controller = new NotificationController(model, view, {
        loaderElement: this.loaderElement,
        loaderCounter: this.loaderCounter,
        loaderMessageEl: this.loaderMessageEl,
      });
      controller.init();
      this.controllers.notification = controller;
    },
  };

  document.addEventListener("DOMContentLoaded", () => {
    applyBrowserDefault();
    App.start();
  });
  window.App = App; // optional: debug access
  window.renderDynamicTable = renderDynamicTable;
})();
