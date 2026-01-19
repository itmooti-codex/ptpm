import { CalendarService } from "../../../domain/calendar/calendarService.js";
import { CalendarStore } from "../../../domain/calendar/calendarStore.js";

import { DashboardController } from "../dashboard/dashboardController.js";
import { DashboardView } from "../dashboard/dashboardView.js";

import { InquiryRepository } from "../../../domain/inquiry/inquiryRepository.js";
import { InquiryService } from "../../../domain/inquiry/inquiryService.js";

import { JobRepository } from "../../../domain/job/jobRepository.js";
import { JobService } from "../../../domain/job/jobService.js";

let calendarService = new CalendarService();
let calendarStore = new CalendarStore();
let dashboardView = new DashboardView();

let inquiryRepo = new InquiryRepository();
let inquiryService = new InquiryService(inquiryRepo);

let jobRepo = new JobRepository();
let jobService = new JobService(jobRepo);

let y = jobService.fetchJobs({}, 10, 0);

let dashboardController = new DashboardController(
  calendarService,
  inquiryService,
  jobService,
  dashboardView,
  calendarStore
);

dashboardController.init();
