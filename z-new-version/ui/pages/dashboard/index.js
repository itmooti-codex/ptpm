import { CalendarService } from "../../../domain/calendar/calendarService.js";
import { CalendarStore } from "../../../domain/calendar/calendarStore.js";

import { DashboardController } from "../dashboard/dashboardController.js";
import { DashboardView } from "../dashboard/dashboardView.js";

import { InquiryRepository } from "../../../domain/inquiry/inquiryRepository.js";
import { InquiryService } from "../../../domain/inquiry/inquiryService.js";

import { JobRepository } from "../../../domain/job/jobRepository.js";
import { JobService } from "../../../domain/job/jobService.js";

import { QuoteRepository } from "../../../domain/quote/quotesRepository.js";
import { QuoteService } from "../../../domain/quote/quoteService.js";

import { PaymentRepository } from "../../../domain/payment/paymentRepository.js";
import { PaymentService } from "../../../domain/payment/paymentService.js";

import { ActiveJobRepository } from "../../../domain/activeJobs/activeJobsRepository.js";
import { ActiveJobService } from "../../../domain/activeJobs/activeJobService.js";

let calendarService = new CalendarService();
let calendarStore = new CalendarStore();
let dashboardView = new DashboardView();

let inquiryRepo = new InquiryRepository();
let inquiryService = new InquiryService(inquiryRepo);

let jobRepo = new JobRepository();
let jobService = new JobService(jobRepo);

let quoteRepo = new QuoteRepository();
let quoteService = new QuoteService(quoteRepo);

// let activeJobsRepo = new ActiveJobRepository();
// let activeJobService = new ActiveJobService(activeJobsRepo);

let paymentRepo = new PaymentRepository();
let paymentService = new PaymentService(paymentRepo);
paymentService.fetchPayments({}, 0, 0);

let dashboardController = new DashboardController(
  calendarService,
  inquiryService,
  quoteService,
  jobService,
  dashboardView,
  calendarStore,
  paymentService
);

dashboardController.init();
