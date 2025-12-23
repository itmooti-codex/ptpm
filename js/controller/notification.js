import { NotificationModel } from "../models/notification.js";
import { NotificationView } from "../views/notification.js";
import { hideLoader } from "../helper.js";

export class NotificationController {
  constructor(model, view, loaderRefs = {}) {
    this.model = model;
    this.view = view;
    this.latest = [];
    this.popoverView = null;
    this.loaderElement = loaderRefs.loaderElement || null;
    this.loaderCounter = loaderRefs.loaderCounter || null;
    this.loaderMessageEl = loaderRefs.loaderMessageEl || null;
  }

  async init() {
    this.view.setData([]);
    await this.loadNotifications();
    this.setupBellPopover();
    hideLoader(this.loaderElement, this.loaderCounter, true);
  }

  formatNotificationDate(value) {
    const d = window.dayjs ? window.dayjs(value) : null;
    if (d?.isValid?.()) return d.format("DD MMM · h:mma");
    return value || "";
  }

  normalizeNotificationType(type) {
    const t = (type || "").toLowerCase();
    if (t.includes("action")) return "Action Required";
    return "General Updates";
  }

  mapNotifications(list = []) {
    if (!Array.isArray(list)) list = list ? [list] : [];
    return list
      .map((n) => {
        const tab = this.normalizeNotificationType(n?.Type || n?.type);
        const label = n?.Unique_ID
          ? `#${n.Unique_ID}`
          : n?.Title || "Notification";
        return {
          id: label,
          text: n?.Title || "Notification",
          when: this.formatNotificationDate(
            n?.Publish_Date_Time || n?.publish_date_time
          ),
          tab,
          read: n.Is_Read,
          origin_url: n.Origin_Url,
          notified_contact_id: n.Notified_Contact_ID,
          uniqueId: n?.Unique_ID ?? n?.unique_id ?? n?.id,
        };
      })
      .filter((n) => n.text || n.when || n.id);
  }

  async loadNotifications() {
    if (typeof this.model.fetchNotification !== "function") return;
    const mergeReadState = (incoming = []) => {
      const previous = new Map(this.latest.map((n) => [n.id, n.read]));
      return incoming.map((n) => ({
        ...n,
        read: previous.has(n.id) ? previous.get(n.id) : n.read ?? false,
      }));
    };
    const handleUpdate = (records = []) => {
      const mapped = this.mapNotifications(records);
      this.latest = mergeReadState(mapped);
      this.view.setData(this.latest);
      if (this.popoverView) {
        this.popoverView.setData(this.latest);
      }
    };

    try {
      const initial = await this.model.fetchNotification(handleUpdate);
      handleUpdate(initial || []);
    } catch (e) {
      console.error("[Notification] Failed to load notifications", e);
    }
  }

  async setupBellPopover() {
    const btn = document.getElementById("notification-btn");
    if (!btn) return;
    // create a lightweight view for the popover using the same renderer
    this.popoverView = new NotificationView(this.model, {
      autoBind: false,
      root: null,
    });
    this.popoverView.createPopover(this.latest);
    const pop = document.getElementById("notificationPopover");
    if (!pop) return;

    const toggle = () => {
      const willShow = pop.classList.contains("hidden");
      this.popoverView.toggleNotificationPopover?.(willShow);
    };

    btn.addEventListener("click", (e) => {
      let notificationHeight = document.getElementById("notifList");
      if (notificationHeight)
        notificationHeight.style.maxHeight = "380px !important";
      e.stopPropagation();
      toggle();
    });

    document.addEventListener("click", (e) => {
      if (!pop || pop.classList.contains("hidden")) return;
      const target = e.target;
      if (pop.contains(target) || btn.contains(target)) return;
      this.popoverView.toggleNotificationPopover?.(false);
    });
  }
}
