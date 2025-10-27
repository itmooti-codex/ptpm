// models/DashboardModel.js
const dayjsRef = window.dayjs;
if (!dayjsRef) {
  throw new Error("Day.js is required for the dashboard model to operate.");
}

// Shared config accessible anywhere
export const DASHBOARD_STATUS_CLASSES = {
  "New Inquiry": "bg-rose-50 text-rose-500",
  "Not Allocated": "bg-fuchsia-50 text-fuchsia-600",
  "Contact Client": "bg-indigo-50 text-indigo-600",
  "Contact For Site Visit": "bg-sky-50 text-sky-600",
  "Site Visit Scheduled": "bg-amber-50 text-amber-600",
  "Site Visit to be Re-Scheduled": "bg-orange-50 text-orange-600",
  "Generate Quote": "bg-brand-50 text-brand-600",
  "Quote Created": "bg-emerald-50 text-emerald-600",
  "Awaiting Quote": "bg-amber-50 text-amber-600",
  Scheduled: "bg-emerald-50 text-emerald-600",
  "In Progress": "bg-sky-50 text-sky-600",
  Closed: "bg-slate-100 text-slate-600",
};

export const DASHBOARD_DEFAULTS = {
  dayCount: 14,
  startDate: dayjsRef("21 Jan 1970"),
  totalsPattern: [8, 13, 19, 8, 12, 3, 11, 8, 13, 19, 8, 13, 19, 11],
  rowTotals: [45, 45],
};

export class DashboardModel {
  constructor(plugin, overrides = {}) {
    window.plugin = plugin;
    window.ptpmDealModel = plugin.switchTo("PeterpmDeal");
    this.dealQuery = null;
    this.quoteQuery = null;
    this.jobQuery = null;
    // this.BuildDealQuery();
    this.BuildQuoteQuery();
    // this.BuildJobQuery();
    this.statusClasses = overrides.statusClasses || DASHBOARD_STATUS_CLASSES;
    this.dayCount = overrides.dayCount || DASHBOARD_DEFAULTS.dayCount;
    this.startDate = overrides.startDate || DASHBOARD_DEFAULTS.startDate;
    this.totalsPattern =
      overrides.totalsPattern || DASHBOARD_DEFAULTS.totalsPattern;
    this.rowTotals = overrides.rowTotals || DASHBOARD_DEFAULTS.rowTotals;
    this.calendarDays = this.#buildCalendarDays();
    this.selectedDate = this.calendarDays[0]?.iso;
    this.inquiryDataByDate = {};
    this.allRows = [];

    this.limit = 500;
    this.offset = 0;
  }

  // PRIVATE: compute calendar days grid
  #buildCalendarDays() {
    return Array.from({ length: this.dayCount }, (_, index) => {
      const current = this.startDate.add(index, "day");
      return {
        iso: current.format("YYYY-MM-DD"),
        label: current.format("ddd D/M"),
        total:
          this.totalsPattern[index] ??
          this.totalsPattern[index % this.totalsPattern.length],
      };
    });
  }

  // --- Getters ---
  getCalendarDays() {
    return this.calendarDays;
  }
  getRowTotals() {
    return this.rowTotals;
  }
  getSelectedDate() {
    return this.selectedDate;
  }
  getStatusClasses() {
    return this.statusClasses;
  }
  getRowsForDate(dateIso, allRows) {
    const rows = Array.isArray(allRows) ? allRows : [];
    if (rows.length) {
      const selectedIso = dateIso || this.selectedDate || null;
      if (!selectedIso) return rows;
      const display = this.formatDisplayDate("21 Jan 1970");
      return rows.filter((row) => {
        const rowIso = row?.meta?.createdIso || row?.createdIso || null;
        if (rowIso) return rowIso === selectedIso;
        const createdDisplay = (row?.created ?? "").trim();
        return display ? createdDisplay === display : true;
      });
    }
    const selected = dateIso || this.selectedDate || null;
    if (!selected) return [];
    return this.inquiryDataByDate?.[selected] ?? [];
  }

  // --- Mutations ---
  setSelectedDate(dateIso) {
    this.selectedDate = dateIso;
  }

  // --- Utilities ---
  formatDisplayDate(dateIso) {
    const instance = dayjsRef(dateIso);
    return instance.isValid() ? instance.format("D MMM YYYY") : "";
  }

  BuildDealQuery(filters = {}) {
    const f = filters || {};
    const isNonEmpty = (v) => v != null && String(v).trim() !== "";
    const hasArray = (arr) => Array.isArray(arr) && arr.length > 0;
    let accountType = ["Closed Real Estate"];
    let accountName = "Peter the Possum dfMan";
    let resident = `%${f.resident}%`;
    let address = `13 Parakeet Place`;
    let type = ["Service Request or Quote"];
    let source = "Other";
    let status = ["New Inquiry"];
    this.dealQuery = ptpmDealModel
      .query()
      .where("how_did_you_hear", source)
      .andWhere("type", "in", type)
      .andWhere("inquiry_status", "in", status)
      .deSelectAll()
      .select([
        "Unique_ID",
        "Date_Added",
        "Type",
        "Inquiry_Status",
        "How_did_you_hear",
      ])
      .include("Company", (q) =>
        q
          .where("account_type", "in", accountType)
          .andWhere("name", accountName)
          .deSelectAll()
          .select(["name", "account_type"])
      )
      .include("Service_Inquiry", (q) => q.select(["service_name"]))
      .include("Primary_Contact", (q) =>
        q
          .where("first_name", "like", resident)
          .andWhere("last_name", "like", resident)
          .select([
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "address_1",
          ])
      )
      .include("Property", (q) => {
        q.where("address_1", "like", address)
          .deSelectAll()
          .select(["address_1"]);
      })
      .include("Service_Provider", (q) => {
        q.deSelectAll().include("Contact_Information", (q) => {
          q.deSelectAll().select(["first_name", "last_name"]);
        });
      })
      .noDestroy();
  }

  BuildQuoteQuery() {
    this.quoteQuery = ptpmDealModel
      .query()
      .deSelectAll()
      .select([
        "Unique_ID",
        "Date_Added",
        "Type",
        "Inquiry_Status",
        "How_did_you_hear",
      ])
      .where("inquiry_status", "Quote Created")
      .include("Company", (q) =>
        q.deSelectAll().select(["name", "account_type"])
      )
      .include("Service_Inquiry", (q) => q.select(["service_name"]))
      .include("Primary_Contact", (q) =>
        q.select([
          "first_name",
          "last_name",
          "email",
          "sms_number",
          "address_1",
        ])
      )
      .include("Property", (q) => {
        q.deSelectAll().select(["address_1"]);
      })
      .include("Service_Provider", (q) => {
        q.deSelectAll().include("Contact_Information", (q) => {
          q.deSelectAll().select(["first_name", "last_name"]);
        });
      })
      .noDestroy();
  }

  BuildJobQuery() {
    this.jobQuery = ptpmDealModel
      .query()
      .deSelectAll()
      .select([
        "Unique_ID",
        "Date_Added",
        "Type",
        "Inquiry_Status",
        "How_did_you_hear",
      ])
      .where({
        Jobs: [{ where: { quote_status: "Accepted" } }],
      })
      .include("Company", (q) =>
        q.deSelectAll().select(["name", "account_type"])
      )
      .include("Service_Inquiry", (q) => q.select(["service_name"]))
      .include("Primary_Contact", (q) =>
        q.select([
          "first_name",
          "last_name",
          "email",
          "sms_number",
          "address_1",
        ])
      )
      .include("Property", (q) => {
        q.deSelectAll().select(["address_1"]);
      })
      .include("Service_Provider", (q) => {
        q.deSelectAll().include("Contact_Information", (q) => {
          q.deSelectAll().select(["first_name", "last_name"]);
        });
      })
      .noDestroy();
  }

  BuildActiveJObsQuery() {}

  BuildUrgentCalls() {}

  async fetchDeal(filters) {
    try {
      await this.BuildDealQuery(filters);
      return await this.dealQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch deal error", e);
    }
  }

  async fetchQuotesCreated() {
    try {
      return await this.quoteQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch quotes error", e);
    }
  }

  async fetchJobs() {
    try {
      return await this.jobQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch jobs error", e);
    }
  }
}
