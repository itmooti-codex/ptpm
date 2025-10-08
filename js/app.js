import { NewEnquiryController } from "./controller/new-enquiry.js";
import { NewEnquiryModal } from "./models/new-enquiry.js";
import { NewEnquiryView } from "./views/new-enquiry.js";
import { initDashboard } from "./controller/dashboard.js";

document.addEventListener("DOMContentLoaded", () => {
  initDashboard();

  // let modal = new NewEnquiryModal();
  // let view = new NewEnquiryView(modal);
  // let controller = new NewEnquiryController(modal, view);

  // controller.init();
});
