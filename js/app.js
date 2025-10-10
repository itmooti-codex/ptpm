import { NewEnquiryController } from "./controller/new-enquiry.js";
import { NewEnquiryModal } from "./models/new-enquiry.js";
import { NewEnquiryView } from "./views/new-enquiry.js";
import { DashboardModel } from "./models/dashboard.js";
import { DashboardView } from "./views/dashboard.js";
import { DashboardController } from "./controller/dashboard.js";

// import { JobDetailController } from "./controller/job-detail.js";
// import { JobDetailModal } from "./models/job-detail.js";
// import { JobDetailView } from "./views/job-detail.js";

export function initDashboard() {
  const model = new DashboardModel();
  const view = new DashboardView();
  const controller = new DashboardController(model, view);

  controller.init({
    calendarContainerId: "calendar-grid",
    tableBodyId: "inquiry-table-body",
  });

  // If you need it elsewhere:
  return { model, view, controller };
}

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();
  // let modal = new NewEnquiryModal();
  // let view = new NewEnquiryView(modal);
  // let controller = new NewEnquiryController(modal, view);
  // controller.init();

  // let jobDetailModal = new JobDetailModal();
  // let jobDetailView = new JobDetailView(jobDetailModal);
  // let jobDetailController = new JobDetailController(
  //   jobDetailModal,
  //   jobDetailView
  // );

  // jobDetailController.init();
});
