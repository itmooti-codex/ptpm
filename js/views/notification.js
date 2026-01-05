export class NotificationView {
  constructor(model, { autoBind = true, root = document } = {}) {
    this.model = model;
    this.root = root || document;
    this.data = [];
    this._bound = false;
    this.state = {
      currentTab: "Action Required",
      onlyUnread: false,
      markAllOn: false,
      selectedIndex: 0,
    };
    if (autoBind) this.bindOnce();
  }

  bindOnce(force = false) {
    if (this._bound && !force) return;
    const q = (sel) =>
      (this.root ? this.root.querySelector(sel) : null) ||
      document.querySelector(sel);
    this.listEl = q("#notifList");
    this.unreadToggle = q("#notifUnreadToggle");
    this.markAllBtn = q("#notifMarkAll");
    this.tabActionBtn = q("#notifTabAction");
    this.tabGeneralBtn = q("#notifTabGeneral");
    this.badgeEl = q("#notification-count");
    this.viewMoreBtn = q("#notifViewMore");

    if (
      !this.unreadToggle &&
      !this.markAllBtn &&
      !this.tabActionBtn &&
      !this.tabGeneralBtn
    ) {
      return;
    }
    this._bound = true;

    this.unreadToggle?.addEventListener("click", () => {
      this.state.onlyUnread = !this.state.onlyUnread;
      this.render();
    });

    this.tabActionBtn?.addEventListener("click", () => {
      this.state.currentTab = "Action Required";
      this.state.selectedIndex = 0;
      this.render();
    });

    this.tabGeneralBtn?.addEventListener("click", () => {
      this.state.currentTab = "General Updates";
      this.state.selectedIndex = 0;
      this.render();
    });

    this.markAllBtn?.addEventListener("click", async () => {
      const unreadItems = this.data.filter((n) => !n.read);
      if (!unreadItems.length) return;

      const idsToMark = unreadItems
        .map((n) => n.uniqueId ?? n.unique_id ?? n.id)
        .filter(Boolean);

      if (
        idsToMark.length &&
        this.model &&
        typeof this.model.updateAnnouncements === "function"
      ) {
        try {
          await this.model.updateAnnouncements(idsToMark);
        } catch (err) {
          console.error("[Notification] Failed to mark all as read", err);
        }
      }

      unreadItems.forEach((n) => (n.read = true));
      this.state.markAllOn = true;
      const icon = this.markAllBtn.querySelector("svg");
      icon?.classList.remove("hidden");
      this.render();
    });

    this.viewMoreBtn?.addEventListener("click", (e) => {
      e.preventDefault();
      if (this.listEl) {
        this.listEl.style.maxHeight = "600px";
      }
    });
  }

  setData(next = []) {
    // preserve read states
    const previous = new Map(this.data.map((n) => [n.id, n.read]));
    this.data = (next || []).map((n) => ({
      ...n,
      read: previous.has(n.id) ? previous.get(n.id) : n.read ?? false,
    }));
    this.render();
  }

  updateBadge() {
    if (!this.badgeEl) return;
    const unreadCount = this.data.filter((n) => !n.read).length;
    this.badgeEl.textContent = String(unreadCount);
    this.badgeEl.classList.toggle("hidden", unreadCount === 0);
  }

  render() {
    if (!this.listEl) return;

    const { currentTab, onlyUnread } = this.state;

    const hasUnread = this.data.some((n) => !n.read);
    this.state.markAllOn = !hasUnread;
    if (this.markAllBtn) {
      const icon = this.markAllBtn.querySelector("svg");
      icon?.classList.toggle("hidden", hasUnread);
    }

    const tabAction = this.tabActionBtn;
    const tabGeneral = this.tabGeneralBtn;
    const activeCls =
      "px-3 py-1.5 rounded-full text-sm font-semibold bg-blue-600 text-white shadow-sm";
    const inactiveCls =
      "px-3 py-1.5 rounded-full text-sm font-semibold text-gray-700 hover:bg-gray-100";
    if (tabAction) {
      tabAction.className =
        currentTab === "Action Required" ? activeCls : inactiveCls;
    }
    if (tabGeneral) {
      tabGeneral.className =
        currentTab === "General Updates" ? activeCls : inactiveCls;
    }

    if (this.unreadToggle) {
      this.unreadToggle.setAttribute("aria-pressed", String(onlyUnread));
      this.unreadToggle.classList.toggle("bg-blue-600", onlyUnread);
      this.unreadToggle.classList.toggle("bg-gray-300", !onlyUnread);
      const knob = this.unreadToggle.querySelector(".knob");
      if (knob) {
        knob.classList.toggle("translate-x-0", !onlyUnread);
        knob.classList.toggle("translate-x-5", onlyUnread);
      }
    }

    const items = this.data
      .map((x, i) => ({ ...x, _idx: i }))
      .filter((x) => x.tab === currentTab && (!onlyUnread || !x.read));

    if (this.state.selectedIndex >= items.length) {
      this.state.selectedIndex = items.length - 1;
    }
    if (this.state.selectedIndex < 0) this.state.selectedIndex = 0;

    this.listEl.innerHTML = items
      .map((item, i) => this.rowTemplate(item, i === this.state.selectedIndex))
      .join("");

    Array.from(this.listEl.children).forEach((el, i) => {
      el.addEventListener("click", async () => {
        this.state.selectedIndex = i;
        const originalIndex = items[i]?._idx;
        const target = originalIndex != null ? this.data[originalIndex] : null;

        if (target) {
          if (!target.read) {
            target.read = true;
            const id =
              target.uniqueId ??
              target.unique_id ??
              target.id ??
              target.Unique_ID;
            if (
              id &&
              this.model &&
              typeof this.model.updateAnnouncements === "function"
            ) {
              try {
                await this.model.updateAnnouncements([id]);
              } catch (err) {
                console.error("[Notification] Failed to mark read", err);
              }
            }
          }

          const url = target.origin_url ?? target.originUrl ?? target.origin;
          if (url) {
            try {
              window.open(url, "_blank", "noreferrer");
            } catch (err) {
              console.error("[Notification] Failed to open origin_url", err);
            }
          }
        }

        this.render();
      });
    });

    this.updateBadge();
  }

  rowTemplate(item, active) {
    const unreadDot = !item.read
      ? `<span class="ml-2 p-1 w-2.5 h-2.5 rounded-full bg-red-600 hover:!bg-red-600 active:!bg-red-600 hover:bg-red-600 active:bg-red-600 focus:bg-red-600 focus-visible:bg-red-600"></span>`
      : "";
    const baseBg = !item.read ? "bg-slate-200" : "bg-white";
    return `
      <div class="px-4 py-3 ${baseBg} border-b last:border-b-0 hover:border-b active:border-b focus:border-b focus-visible:border-b hover:last:border-b-0 active:last:border-b-0 focus:last:border-b-0 focus-visible:last:border-b-0">
        <div class="flex items-start">
          <div class="flex-1">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium text-slate-800 hover:!text-slate-800 active:!text-slate-800 hover:text-sm active:text-sm focus:text-sm focus-visible:text-sm hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800">${item.id}
                <span class="font-normal text-slate-600 hover:!text-slate-600 active:!text-slate-600 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600"> - ${item.text}</span>
              </div>
              ${unreadDot}
            </div>
            <div class="mt-1 text-xs text-slate-500 hover:!text-slate-500 active:!text-slate-500 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500">${item.when}</div>
          </div>
        </div>
      </div>`;
  }

  createPopover(initialData = []) {
    if (document.getElementById("notificationPopover")) return;
    const wrap = document.createElement("div");
    wrap.id = "notificationPopover";
    wrap.className =
      "hidden absolute top-16 right-6 z-50 w-[420px] max-w-sm bg-white rounded-lg shadow-xl border border-slate-200";
    wrap.innerHTML = `
      <div class="flex items-center justify-between px-4 py-3 border-b rounded-t-lg bg-white hover:!bg-white active:!bg-white hover:border-b active:border-b focus:border-b focus-visible:border-b hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white">
        <div class="flex items-center gap-2">
          <span class="text-[15px] font-semibold text-gray-800 hover:!text-[15px] active:!text-[15px] hover:!text-gray-800 active:!text-gray-800 hover:text-[15px] active:text-[15px] focus:text-[15px] focus-visible:text-[15px] hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800">Notification</span>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
            xmlns="http://www.w3.org/2000/svg" class="text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500">
            <path d="M13.3965 17.6921C13.3965 17.8622 13.329 18.0252 13.2087 18.1454C13.0885 18.2656 12.9255 18.3332 12.7555 18.3332H7.62727C7.45726 18.3332 7.29421 18.2656 7.174 18.1454C7.05378 18.0252 6.98624 17.8622 6.98624 17.6921C6.98624 17.5221 7.05378 17.3591 7.174 17.2389C7.29421 17.1187 7.45726 17.0511 7.62727 17.0511H12.7555C12.9255 17.0511 13.0885 17.1187 13.2087 17.2389C13.329 17.3591 13.3965 17.5221 13.3965 17.6921ZM17.7082 13.8412C17.2627 13.0752 16.6016 10.9077 16.6016 8.07676C16.6016 6.37665 15.9263 4.74618 14.7241 3.54402C13.5219 2.34187 11.8915 1.6665 10.1914 1.6665C8.49127 1.6665 6.86079 2.34187 5.65864 3.54402C4.45648 4.74618 3.78111 6.37665 3.78111 8.07676C3.78111 10.9085 3.11926 13.0752 2.67454 13.8412C2.56098 14.0359 2.50077 14.2572 2.5 14.4826C2.49923 14.7081 2.55791 14.9297 2.67014 15.1252C2.78236 15.3208 2.94416 15.4832 3.13921 15.5963C3.33426 15.7093 3.55568 15.7689 3.78111 15.7691H16.6016C16.827 15.7688 17.0483 15.7091 17.2432 15.596C17.4382 15.4829 17.5999 15.3204 17.712 15.1249C17.8241 14.9294 17.8827 14.7078 17.8819 14.4824C17.8811 14.257 17.8209 14.0359 17.7074 13.8412H17.7082Z" fill="currentColor"/>
          </svg>
        </div>
        <div class="flex items-center gap-2 text-xs text-gray-600 select-none hover:!text-gray-600 active:!text-gray-600 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs hover:text-gray-600 active:text-gray-600 focus:text-gray-600 focus-visible:text-gray-600">
          <span>Only show unread</span>
          <button id="notifUnreadToggle" type="button" aria-pressed="false"
            class="w-10 h-5 inline-flex items-center rounded-full bg-gray-300 relative focus:bg-gray-300 focus-visible:bg-gray-300">
            <span class="knob absolute w-4 h-4 bg-white rounded-full left-0.5 transition-transform duration-200 ease-out translate-x-0 focus:bg-white focus-visible:bg-white"></span>
          </button>
        </div>
      </div>
      <div class="px-4 pt-3">
        <span class="hidden bg-blue-600 bg-gray-300 text-gray-700 text-white shadow-sm translate-x-0 translate-x-5 hover:!bg-blue-600 active:!bg-blue-600 hover:!bg-gray-300 active:!bg-gray-300 hover:!text-gray-700 active:!text-gray-700 hover:!text-white active:!text-white hover:bg-blue-600 active:bg-blue-600 focus:bg-blue-600 focus-visible:bg-blue-600 hover:bg-gray-300 active:bg-gray-300 focus:bg-gray-300 focus-visible:bg-gray-300 hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700 hover:text-white active:text-white focus:text-white focus-visible:text-white hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm"></span>
        <div class="flex items-center gap-3">
          <button id="notifTabAction" class="px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white shadow-sm focus:text-sm focus-visible:text-sm focus:bg-blue-600 focus-visible:bg-blue-600 focus:text-white focus-visible:text-white focus:shadow-sm focus-visible:shadow-sm">
            <span class="inline-flex items-center gap-1">
              <span class="w-2.5 h-2.5 rounded-full bg-red-600 focus:bg-red-600 focus-visible:bg-red-600"></span>
              Action Required
            </span>
          </button>
          <button id="notifTabGeneral" class="px-3 py-1.5 rounded-full text-sm font-medium text-gray-700 focus:text-sm focus-visible:text-sm focus:text-gray-700 focus-visible:text-gray-700">
            General Updates
          </button>
        </div>
        <label for="notifMarkAll" class="mt-3 mb-2 inline-flex items-center gap-2 text-sm text-gray-700 hover:!text-blue-700 cursor-pointer select-none hover:!text-gray-700 active:!text-gray-700 hover:text-sm active:text-sm focus:text-sm focus-visible:text-sm hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">
          <input id="notifMarkAll" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 hover:!border-gray-300 active:!border-gray-300 hover:!text-blue-600 active:!text-blue-600 hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:text-blue-600 active:text-blue-600 focus:text-blue-600 focus-visible:text-blue-600" />
          <h5>Mark all as read</h5>
        </label>
      </div>
      <div class="max-h-[380px] overflow-auto transition-all duration-200" id="notifList"></div>
      <div class="px-4 py-3 border-t rounded-b-lg text-center hover:border-t active:border-t focus:border-t focus-visible:border-t hover:text-center active:text-center focus:text-center focus-visible:text-center">
        <button type="button" id="notifViewMore" class="text-sm font-medium text-blue-700 focus:text-sm focus-visible:text-sm focus:text-blue-700 focus-visible:text-blue-700">
          View All
        </button>
      </div>
    `;
    document.body.appendChild(wrap);
    this.root = wrap;
    this.listEl = wrap.querySelector("#notifList");
    this.unreadToggle = wrap.querySelector("#notifUnreadToggle");
    this.markAllBtn = wrap.querySelector("#notifMarkAll");
    this.tabActionBtn = wrap.querySelector("#notifTabAction");
    this.tabGeneralBtn = wrap.querySelector("#notifTabGeneral");
    this.badgeEl = document.getElementById("notification-count");
    this.viewMoreBtn = wrap.querySelector("#notifViewMore");
    this.setData(initialData);
    this.bindOnce(true);
    this.toggleNotificationPopover = (show = true) => {
      wrap.classList.toggle("hidden", !show);
    };
    this.updateNotificationPopover = (next = []) => this.setData(next);
  }
}
