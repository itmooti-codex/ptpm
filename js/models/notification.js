import { DashboardModel } from "./dashboard.js";

/**
 * Thin wrapper so the notification page can reuse the dashboard announcement API.
 */
export class NotificationModel extends DashboardModel {
  constructor(plugin) {
    super(plugin);
  }
}
