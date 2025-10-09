import { NewEnquiryController } from "./controller/new-enquiry.js";
import { NewEnquiryModal } from "./models/new-enquiry.js";
import { NewEnquiryView } from "./views/new-enquiry.js";
import { initDashboard } from "./controller/dashboard.js";

// import { JobDetailController } from "./controller/job-detail.js";
// import { JobDetailModal } from "./models/job-detail.js";
// import { JobDetailView } from "./views/job-detail.js";

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
