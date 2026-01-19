// routes.js
import {
  NewInquiryModel,
  NewInquiryView,
  NewInquiryController,
} from "../index.js";
import {
  DashboardModel,
  DashboardView,
  DashboardController,
} from "./dashboard/index.js";

export const ROUTES = {
  "new-inquiry": () => ({
    model: NewInquiryModel,
    view: NewInquiryView,
    controller: NewInquiryController,
  }),
  dashboard: () => ({
    model: DashboardModel,
    view: DashboardView,
    controller: DashboardController,
    async: true,
  }),
  "new-direct-job": () => ({
    model: JobDetailModel,
    view: JobDetailView,
    controller: JobDetailController,
    async: true,
  }),
  notification: () => ({
    model: NotificationModel,
    view: NotificationView,
    controller: NotificationController,
  }),
};
