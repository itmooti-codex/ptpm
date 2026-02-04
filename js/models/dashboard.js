import { LOGGEDIN_USER_ID } from "../../sdk/config.js";
const dayjsRef = window.dayjs;
if (!dayjsRef) {
  throw new Error("Day.js is required for the dashboard model to operate.");
}

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

// Ensure Day.js uses Australia/Brisbane timezone when computing start/end of day
// Requires dayjs-timezone + utc plugins to be loaded on window.dayjs
const TZ = "Australia/Brisbane";

export const DASHBOARD_DEFAULTS = {
  dayCount: 14,
  startDate: dayjsRef.tz
    ? dayjsRef.tz(dayjsRef(), TZ).startOf("day")
    : dayjsRef(dayjsRef().startOf("day")),
  totalsPattern: Array(14).fill(0),
  rowTotals: [0, 0],
};

export class DashboardModel {
  constructor(plugin, overrides = {}) {
    window.plugin = plugin;
    window.ptpmDealModel = plugin.switchTo("PeterpmDeal");
    window.ptpmJobModel = plugin.switchTo("PeterpmJob");
    window.pptmAnnouncementModel = plugin.switchTo("PeterpmAnnouncement");
    window.ptpmTaskModel = plugin.switchTo("PeterpmTask");
    window.ptpmServiceProviderModel = plugin.switchTo("PeterpmServiceProvider");

    this.dealQuery = null;
    this.quoteQuery = null;
    this.jobQuery = null;
    this.paymentQuery = null;
    this.activeJobsQuery = null;
    this.announcementQuery = null;
    this.serviceProviderQuery = null;

    this.announcementSub = null;

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
    this.offset = 0;
    // this.startIndex = 300;
    // this.endIndex = 346;
    this.totalCount = null;
    this.paginationLimit = 5;
  }

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

  setSelectedDate(dateIso) {
    this.selectedDate = dateIso;
  }

  formatDisplayDate(input) {
    if (!input || typeof input !== "string") return "";

    const [day, month, yearAndTime] = input.split("-");
    if (!day || !month || !yearAndTime) return "";
    const [year] = yearAndTime.split(" ");

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    const monthName = monthNames[parseInt(month, 10) - 1] ?? "";
    return `${day} ${monthName} ${year}`;
  }

  async deleteDealsByIds(ids = []) {
    const cleaned = Array.from(
      new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))
    );
    if (!cleaned.length) return null;
    const query = window.ptpmDealModel?.mutation?.();
    if (!query) return null;
    query.delete((q) => q.where("unique_id", "in", cleaned));
    return await query.execute(true).toPromise();
  }

  async deleteJobsByIds(ids = []) {
    const cleaned = Array.from(
      new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))
    );
    if (!cleaned.length) return null;
    const query = window.ptpmJobModel?.mutation?.();
    if (!query) return null;
    query.delete((q) => q.where("unique_id", "in", cleaned));
    return await query.execute(true).toPromise();
  }

  applyIdRange(query) {
    const start = Number(this.startIndex);
    const end = Number(this.endIndex);
    let q = query;
    if (Number.isFinite(start)) {
      q = q.andWhere("id", ">=", start);
    }
    if (Number.isFinite(end)) {
      q = q.andWhere("id", "<=", end);
    }
    return q;
  }

  async fetchTabCount(tab, filters) {
    switch (tab) {
      case "inquiry":
        await this.fetchDeal(filters);
        break;
      case "quote":
        await this.fetchQuotesCreated(filters);
        break;
      case "jobs":
        await this.fetchJobs(filters);
        break;
      case "payment":
        await this.fetchPayments(filters);
        break;
      case "active-jobs":
        await this.fetchActiveJobs(filters);
        break;
      default:
        console.warn(`Unknown tab: ${tab}`);
        return null;
    }
  }

  BuildDealQuery(filters = {}) {
    const f = filters || {};
    const like = (s) => `%${s}%`;
    const toEpoch = (d, endOfDay = false) => {
      if (!d) return null;
      const m = dayjsRef.tz ? dayjsRef.tz(d, TZ) : dayjsRef(d);
      if (!m.isValid()) return null;
      const z = endOfDay ? m.endOf("day") : m.startOf("day");
      // Convert zoned moment to epoch seconds (unix is UTC-based)
      return z.unix();
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);

    this.dealQuery = ptpmDealModel.query();
    if (f.global && f.global.trim()) {
      const likeVal = like(f.global.trim()); // -> e.g. %john%
      this.dealQuery = this.dealQuery.andWhere("Primary_Contact", (q) => {
        q.andWhere((g) => {
          g.where("first_name", "like", likeVal)
            .orWhere("last_name", "like", likeVal)
            .orWhere("email", "like", likeVal)
            .orWhere("sms_number", "like", likeVal);
        });
      });
    }

    if (f.source && Array.isArray(f.source) && f.source.length) {
      this.dealQuery = this.dealQuery.where("how_did_you_hear", "in", f.source);
    }
    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.dealQuery = this.dealQuery.andWhere(
        "inquiry_status",
        "in",
        f.statuses
      );
    }
    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.dealQuery = this.dealQuery.andWhere(
        "service_provider_id",
        "in",
        f.serviceProviders
      );
    }
    if (
      (f.accountName && f.accountName.trim()) ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.dealQuery = this.dealQuery.andWhere("Company", (q) => {
        if (f.accountName && f.accountName.trim()) {
          q.where("name", "like", `%${f.accountName}%`);
        }
        if (Array.isArray(f.accountTypes) && f.accountTypes.length) {
          q.andWhere("account_type", "in", f.accountTypes);
        }
      });
    }
    if (f.resident && f.resident.trim()) {
      const likeResident = `%${f.resident}%`;
      this.dealQuery = this.dealQuery.andWhere("Primary_Contact", (q) => {
        q.where("first_name", "like", likeResident).orWhere(
          "last_name",
          "like",
          likeResident
        );
      });
    }
    if (f.address && f.address.trim()) {
      this.dealQuery = this.dealQuery.andWhere("Property", (q) => {
        q.where("address_1", "like", `%${f.address}%`);
      });
    }
    this.dealQuery = this.dealQuery.andWhere((q) => {
      if (startEpoch != null)
        q.andWhere("date_quoted_accepted", ">=", startEpoch);
      if (endEpoch != null) q.andWhere("quote_valid_until", "<=", endEpoch);
    });

    this.dealQuery = this.dealQuery
      .orderBy("id", "desc")
      .deSelectAll()
      .select([
        "id",
        "Unique_ID",
        "Date_Added",
        "Type",
        "Inquiry_Status",
        "How_did_you_hear",
      ])
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

  BuildQuoteQuery(filters = {}) {
    const f = filters || {};
    const like = (s) => `%${s}%`;
    const toEpoch = (d, end = false) => {
      if (!d) return null;
      const m = dayjsRef.tz ? dayjsRef.tz(d, TZ) : dayjsRef(d);
      return m.isValid()
        ? end
          ? m.endOf("day").unix()
          : m.startOf("day").unix()
        : null;
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);

    let minPrice = null;
    let maxPrice = null;
    if (f.priceMin != 0 && f.priceMax != 10000) {
      minPrice = f.priceMin;
      maxPrice = f.priceMax;
    }

    // Start with base query, append conditional filters first
    this.quoteQuery = ptpmJobModel.query();

    if (f.invoiceNumber) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    if (minPrice != null) {
      this.quoteQuery = this.quoteQuery.andWhere("quote_total", ">=", minPrice);
    }
    if (maxPrice != null) {
      this.quoteQuery = this.quoteQuery.andWhere("quote_total", "<=", maxPrice);
    }

    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "quote_status",
        "in",
        f.statuses
      );
    }

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "primary_service_provider_id",
        "in",
        f.serviceProviders
      );
    }

    if (f.quoteNumber) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "unique_id",
        "like",
        like(f.quoteNumber)
      );
    }
    if (f.recommendation) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }
    if (startEpoch != null || endEpoch != null) {
      this.quoteQuery = this.quoteQuery.andWhere((q) => {
        if (startEpoch != null) q.andWhere("quote_date", ">=", startEpoch);
        if (endEpoch != null) q.andWhere("quote_date", "<=", endEpoch);
      });
    }
    if (f.resident) {
      const likeResident = like(f.resident);
      this.quoteQuery = this.quoteQuery.andWhere("Client_Individual", (q) => {
        q.where("first_name", "like", likeResident).orWhere(
          "last_name",
          "like",
          likeResident
        );
      });
    }
    if (f.address) {
      this.quoteQuery = this.quoteQuery.andWhere("Property", (q) => {
        q.andWhere("property_name", "like", like(f.address));
      });
    }
    if (f.global && f.global.trim()) {
      const likeVal = like(f.global.trim());
      this.quoteQuery = this.quoteQuery.andWhere("Client_Individual", (q) => {
        q.andWhere((g) => {
          g.where("first_name", "like", likeVal)
            .orWhere("last_name", "like", likeVal)
            .orWhere("email", "like", likeVal)
            .orWhere("sms_number", "like", likeVal);
        });
      });
    }
    if (
      f.accountName ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.quoteQuery = this.quoteQuery.andWhere("Client_Entity", (q) => {
        if (f.accountName) q.andWhere("name", "like", like(f.accountName));
        if (Array.isArray(f.accountTypes) && f.accountTypes.length)
          q.andWhere("type", "in", f.accountTypes);
      });
    }
    if (f.source && f.source.length != 0) {
      this.quoteQuery = this.quoteQuery.andWhere("Inquiry_Record", (q) => {
        q.andWhere("how_did_you_hear", "in", f.source);
      });
    }

    // Now apply select/includes consistently
    this.quoteQuery = this.applyIdRange(
      this.quoteQuery
        .andWhereNot("quote_status", "isNull")
        .deSelectAll()
        .select([
          "Unique_ID",
          "Quote_Status",
          "Quote_Total",
          "Quote_Date",
          "Date_Quoted_Accepted",
        ])
        .include("Client_Individual", (q) =>
          q.select([
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "address_1",
          ])
        )
        .include("Property", (q) => {
          q.deSelectAll().select(["property_name"]);
        })
        .include("Primary_Service_Provider", (q) => {
          q.deSelectAll().include("Contact_Information", (q) => {
            q.deSelectAll().select(["first_name", "last_name"]);
          });
        })
        .include("Client_Entity", (q) =>
          q.deSelectAll().select(["name", "type"])
        )
        .include("Inquiry_Record", (q) =>
          q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
        )
        .include("Inquiry_Record", (q) =>
          q.include("Service_Inquiry", (d) =>
            d.deSelectAll().select(["service_name"])
          )
        )
    ).noDestroy();
    return;
  }

  BuildJobQuery(filters = {}) {
    const f = filters || {};
    const like = (s) => `%${s}%`;
    const toEpoch = (d, end = false) => {
      if (!d) return null;
      const m = dayjsRef.tz ? dayjsRef.tz(d, TZ) : dayjsRef(d);
      return m.isValid()
        ? end
          ? m.endOf("day").unix()
          : m.startOf("day").unix()
        : null;
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);

    const minPrice = f.minPrice;
    const maxPrice = f.maxPrice;

    // Start with base query, append conditional filters first
    this.jobQuery = ptpmJobModel.query();
    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.jobQuery = this.jobQuery.andWhere("job_status", "in", f.statuses);
    }

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.jobQuery = this.jobQuery.andWhere(
        "primary_service_provider_id",
        "in",
        f.serviceProviders
      );
    }

    if (minPrice != null) {
      this.jobQuery = this.jobQuery.andWhere("quote_total", ">=", minPrice);
    }
    if (maxPrice != null) {
      this.jobQuery = this.jobQuery.andWhere("quote_total", "<=", maxPrice);
    }

    if (f.quoteNumber) {
      this.jobQuery = this.jobQuery.andWhere(
        "unique_id",
        "like",
        like(f.quoteNumber)
      );
    }

    if (f.invoiceNumber) {
      this.jobQuery = this.jobQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    if (f.recommendation) {
      this.jobQuery = this.jobQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }
    if (startEpoch != null || endEpoch != null) {
      this.jobQuery = this.jobQuery.andWhere((q) => {
        if (startEpoch != null) q.andWhere("date_scheduled", ">=", startEpoch);
        if (endEpoch != null) q.andWhere("date_scheduled", "<=", endEpoch);
      });
    }
    if (f.resident) {
      const likeResident = like(f.resident);
      this.jobQuery = this.jobQuery.andWhere("Client_Individual", (q) => {
        q.where("first_name", "like", likeResident).orWhere(
          "last_name",
          "like",
          likeResident
        );
      });
    }
    if (f.address) {
      this.jobQuery = this.jobQuery.andWhere("Property", (q) => {
        q.andWhere("property_name", "like", like(f.address));
      });
    }
    if (f.global && f.global.trim()) {
      const likeVal = like(f.global.trim());
      this.jobQuery = this.jobQuery.andWhere("Client_Individual", (q) => {
        q.andWhere((g) => {
          g.where("first_name", "like", likeVal)
            .orWhere("last_name", "like", likeVal)
            .orWhere("email", "like", likeVal)
            .orWhere("sms_number", "like", likeVal);
        });
      });
    }
    if (
      f.accountName ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.jobQuery = this.jobQuery.andWhere("Client_Entity", (q) => {
        if (f.accountName) q.andWhere("name", "like", like(f.accountName));
        if (Array.isArray(f.accountTypes) && f.accountTypes.length)
          q.andWhere("type", "in", f.accountTypes);
      });
    }
    if (f.source && f.source.length != 0) {
      this.quoteQuery = this.quoteQuery.andWhere("Inquiry_Record", (q) => {
        q.andWhere("how_did_you_hear", "in", f.source);
      });
    }

    this.jobQuery = this.applyIdRange(
      this.jobQuery
        .andWhereNot("job_status", "isNull")
        .deSelectAll()
        .select([
          "Unique_ID",
          "Date_Started",
          "Payment_Status",
          "Date_Job_Required_By",
          "Date_Booked",
          "Job_Status",
          "Job_Total",
          "Date_Quoted_Accepted",
          "invoice_number",
        ])
        .include("Client_Individual", (q) =>
          q.select([
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "address_1",
          ])
        )
        .include("Property", (q) => {
          q.deSelectAll().select(["property_name"]);
        })
        .include("Primary_Service_Provider", (q) => {
          q.deSelectAll().include("Contact_Information", (q) => {
            q.deSelectAll().select(["first_name", "last_name"]);
          });
        })
        .include("Client_Entity", (q) =>
          q.deSelectAll().select(["name", "type"])
        )
        .include("Inquiry_Record", (q) =>
          q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
        )
        .include("Inquiry_Record", (q) =>
          q.include("Service_Inquiry", (d) =>
            d.deSelectAll().select(["service_name"])
          )
        )
    ).noDestroy();
    return;
  }

  BuildPaymentQuery(filters = {}) {
    const f = filters || {};
    const like = (s) => `%${s}%`;
    const toEpoch = (d, end = false) => {
      if (!d) return null;
      const m = dayjsRef.tz ? dayjsRef.tz(d, TZ) : dayjsRef(d);
      return m.isValid()
        ? end
          ? m.endOf("day").unix()
          : m.startOf("day").unix()
        : null;
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);

    const minPrice = f.minPrice;
    const maxPrice = f.maxPrice;

    // Start with base query, append conditional filters first
    this.paymentQuery = ptpmJobModel.query();

    if (f.global && f.global.trim()) {
      const likeVal = like(f.global.trim());
      this.paymentQuery = this.paymentQuery.andWhere(
        "Client_Individual",
        (q) => {
          q.andWhere((g) => {
            g.where("first_name", "like", likeVal)
              .orWhere("last_name", "like", likeVal)
              .orWhere("email", "like", likeVal)
              .orWhere("sms_number", "like", likeVal);
          });
        }
      );
    }

    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "payment_status",
        "in",
        f.statuses
      );
    }

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "primary_service_provider_id",
        "in",
        f.serviceProviders
      );
    }

    if (minPrice != null) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "quote_total",
        ">=",
        minPrice
      );
    }
    if (maxPrice != null) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "quote_total",
        "<=",
        maxPrice
      );
    }

    if (f.quoteNumber) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "unique_id",
        "like",
        like(f.quoteNumber)
      );
    }

    if (f.invoiceNumber) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    if (f.recommendation) {
      this.paymentQuery = this.paymentQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }
    if (startEpoch != null || endEpoch != null) {
      this.paymentQuery = this.paymentQuery.andWhere((q) => {
        if (startEpoch != null) q.andWhere("invoice_date", ">=", startEpoch);
        if (endEpoch != null) q.andWhere("invoice_date", "<=", endEpoch);
      });
    }
    if (f.resident) {
      const likeResident = like(f.resident);
      this.paymentQuery = this.paymentQuery.andWhere(
        "Client_Individual",
        (q) => {
          q.where("first_name", "like", likeResident).orWhere(
            "last_name",
            "like",
            likeResident
          );
        }
      );
    }
    if (f.address) {
      this.paymentQuery = this.paymentQuery.andWhere("Property", (q) => {
        q.andWhere("property_name", "like", like(f.address));
      });
    }
    if (
      f.accountName ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.paymentQuery = this.paymentQuery.andWhere("Client_Entity", (q) => {
        if (f.accountName) q.andWhere("name", "like", like(f.accountName));
        if (Array.isArray(f.accountTypes) && f.accountTypes.length)
          q.andWhere("type", "in", f.accountTypes);
      });
    }
    if (f.source && f.source.length != 0) {
      this.quoteQuery = this.quoteQuery.andWhere("Inquiry_Record", (q) => {
        q.andWhere("how_did_you_hear", "in", f.source);
      });
    }

    this.paymentQuery = this.applyIdRange(
      this.paymentQuery
        .andWhereNot("xero_invoice_status", "isNull")
        .deSelectAll()
        .select([
          "Unique_ID",
          "Invoice_Number",
          "Invoice_Date",
          "Due_Date",
          "Invoice_Total",
          "Bill_Time_Paid",
          "Bill_Approved_Admin",
          "Bill_Approved_Service_Provider2",
          "Xero_Invoice_Status",
        ])
        .include("Client_Individual", (q) =>
          q.select([
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "address_1",
          ])
        )
        .include("Property", (q) => {
          q.deSelectAll().select(["property_name"]);
        })
        .include("Primary_Service_Provider", (q) => {
          q.deSelectAll().include("Contact_Information", (q) => {
            q.deSelectAll().select(["first_name", "last_name"]);
          });
        })
        .include("Client_Entity", (q) =>
          q.deSelectAll().select(["name", "type"])
        )
        .include("Inquiry_Record", (q) =>
          q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
        )
        .include("Inquiry_Record", (q) =>
          q.include("Service_Inquiry", (d) =>
            d.deSelectAll().select(["service_name"])
          )
        )
    ).noDestroy();

    if (f.global && f.global.trim()) {
      const likeVal = `%${f.global.trim()}%`;
      this.paymentQuery = this.paymentQuery.andWhere(
        "Client_Individual",
        (q) => {
          q.andWhere((g) => {
            g.where("first_name", "like", likeVal)
              .orWhere("last_name", "like", likeVal)
              .orWhere("email", "like", likeVal)
              .orWhere("sms_number", "like", likeVal);
          });
        }
      );
    }
    return;
  }

  BuildactiveJobsQuery(filters = {}) {
    const f = filters || {};
    const like = (s) => `%${s}%`;
    const toEpoch = (d, end = false) => {
      if (!d) return null;
      const m = dayjsRef(d);
      return m.isValid()
        ? end
          ? m.endOf("day").unix()
          : m.startOf("day").unix()
        : null;
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);

    let minPrice = null;
    let maxPrice = null;
    if (f.priceMin != 0 && f.priceMax != 10000) {
      minPrice = f.priceMin;
      maxPrice = f.priceMax;
    }

    this.activeJobsQuery = ptpmJobModel.query();

    if (f.global && f.global.trim()) {
      const likeVal = like(f.global.trim());
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Client_Individual",
        (q) => {
          q.andWhere((g) => {
            g.where("first_name", "like", likeVal)
              .orWhere("last_name", "like", likeVal)
              .orWhere("email", "like", likeVal)
              .orWhere("sms_number", "like", likeVal);
          });
        }
      );
    }

    // Default to "Booked" and "In Progress" for active jobs if no statuses specified
    const activeJobStatuses = (Array.isArray(f.statuses) && f.statuses.length)
      ? f.statuses
      : ["Booked", "In Progress"];

    this.activeJobsQuery = this.activeJobsQuery.andWhere(
      "job_status",
      "in",
      activeJobStatuses
    );

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "primary_service_provider_id",
        "in",
        f.serviceProviders
      );
    }

    if (minPrice != null) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "quote_total",
        ">=",
        minPrice
      );
    }
    if (maxPrice != null) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "quote_total",
        "<=",
        maxPrice
      );
    }

    if (f.quoteNumber) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "unique_id",
        "like",
        like(f.quoteNumber)
      );
    }

    if (f.invoiceNumber) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    if (f.recommendation) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }
    if (startEpoch != null || endEpoch != null) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere((q) => {
        if (startEpoch != null) q.andWhere("Date_Booked", ">=", startEpoch);
        if (endEpoch != null) q.andWhere("Date_Booked", "<=", endEpoch);
      });
    }
    if (f.resident) {
      const likeResident = like(f.resident);
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Client_Individual",
        (q) => {
          q.where("first_name", "like", likeResident).orWhere(
            "last_name",
            "like",
            likeResident
          );
        }
      );
    }
    if (f.address) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere("Property", (q) => {
        q.andWhere("property_name", "like", like(f.address));
      });
    }
    if (
      f.accountName ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Client_Entity",
        (q) => {
          if (f.accountName) q.andWhere("name", "like", like(f.accountName));
          if (Array.isArray(f.accountTypes) && f.accountTypes.length)
            q.andWhere("type", "in", f.accountTypes);
        }
      );
    }
    if (Array.isArray(f.source) && f.source.length) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Inquiry_Record",
        (q) => {
          q.andWhere("how_did_you_hear", "in", f.source);
        }
      );
    }

    this.activeJobsQuery = this.applyIdRange(
      this.activeJobsQuery
        .deSelectAll()
        .select([
          "id",
          "Unique_ID",
          "date_started",
          "date_completed",
          "quote_total",
          "job_status",
          "Date_Booked",
        ])
        .include("Client_Individual", (q) =>
          q.select([
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "address_1",
          ])
        )
        .include("Property", (q) => {
          q.deSelectAll().select(["property_name"]);
        })
        .include("Primary_Service_Provider", (q) => {
          q.deSelectAll().include("Contact_Information", (q) => {
            q.deSelectAll().select(["first_name", "last_name"]);
          });
        })
        .include("Client_Entity", (q) =>
          q.deSelectAll().select(["name", "type"])
        )
        .include("Inquiry_Record", (q) =>
          q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear", "unique_id"])
        )
        .include("Inquiry_Record", (q) =>
          q.include("Service_Inquiry", (d) =>
            d.deSelectAll().select(["service_name"])
          )
        )
    ).noDestroy();

    return;
  }

  async fetchDeal(filters = {}) {
    try {
      // 1️⃣ Build COUNT query (no includes, no limit)
      this.BuildDealQuery(filters);
      const countQuery = this.dealQuery
        .deSelectAll()
        .count("id", "total")
        .noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      this.totalCount = totalRes?.resp?.length ?? 0;
      this.totalPages = Math.ceil(this.totalCount / this.paginationLimit);

      // 2️⃣ Build FETCH query again (with includes + pagination)
      this.BuildDealQuery(filters);
      const rows = await this.dealQuery
        .fetch({
          variables: { limit: this.paginationLimit, offset: this.offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return {
        rows,
        totalCount: this.totalCount,
        totalPages: this.totalPages,
      };
    } catch (e) {
      console.log("Fetch deal error", e);
    }
  }

  async fetchQuotesCreated(filters = {}) {
    try {
      // 1️⃣ Build COUNT query (no includes, no pagination)
      this.BuildQuoteQuery(filters);
      const countQuery = this.quoteQuery
        .deSelectAll()
        .count("id", "total")
        .noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      this.totalCount = totalRes?.resp?.length ?? 0;
      this.totalPages = Math.ceil(this.totalCount / this.paginationLimit);

      // 2️⃣ Build FETCH query again (with includes + pagination)
      this.BuildQuoteQuery(filters);
      const rows = await this.quoteQuery
        .fetch({
          variables: { limit: this.paginationLimit, offset: this.offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return {
        rows,
        totalCount: this.totalCount,
        totalPages: this.totalPages,
      };
    } catch (e) {
      console.log("Fetch quotes error", e);
    }
  }

  async fetchJobs(filters = {}) {
    try {
      // 1️⃣ Build COUNT query first (NO includes, NO pagination)
      this.BuildJobQuery(filters);
      const countQuery = this.jobQuery
        .deSelectAll()
        .count("id", "total")
        .noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      this.totalCount = totalRes?.resp?.length ?? 0;
      this.totalPages = Math.ceil(this.totalCount / this.paginationLimit);

      // 2️⃣ Build FETCH query again (with includes + pagination)
      this.BuildJobQuery(filters);
      const rows = await this.jobQuery
        .fetch({
          variables: { limit: this.paginationLimit, offset: this.offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return {
        rows,
        totalCount: this.totalCount,
        totalPages: this.totalPages,
      };
    } catch (e) {
      console.log("Fetch jobs error", e);
    }
  }

  async fetchPayments(filters = {}) {
    try {
      // 1️⃣ Build COUNT query (no includes, no pagination)
      this.BuildPaymentQuery(filters);
      const countQuery = this.paymentQuery
        .deSelectAll()
        .count("id", "total")
        .noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      this.totalCount = totalRes?.resp?.length ?? 0;
      this.totalPages = Math.ceil(this.totalCount / this.paginationLimit);

      // 2️⃣ Build FETCH query fresh (includes + limit/offset)
      this.BuildPaymentQuery(filters);
      const rows = await this.paymentQuery
        .fetch({
          variables: { limit: this.paginationLimit, offset: this.offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return {
        rows,
        totalCount: this.totalCount,
        totalPages: this.totalPages,
      };
    } catch (e) {
      console.log("Fetch payments error", e);
    }
  }

  async fetchActiveJobs(filters = {}) {
    try {
      // 1️⃣ Build COUNT query (no includes, no pagination)
      this.BuildactiveJobsQuery(filters);
      const countQuery = this.activeJobsQuery
        .deSelectAll()
        .count("id", "total")
        .noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      this.totalCount = totalRes?.resp?.length ?? 0;
      this.totalPages = Math.ceil(this.totalCount / this.paginationLimit);

      // 2️⃣ Build FETCH query again (includes + pagination)
      this.BuildactiveJobsQuery(filters);
      const rows = await this.activeJobsQuery
        .fetch({
          variables: { limit: this.paginationLimit, offset: this.offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return {
        rows,
        totalCount: this.totalCount,
        totalPages: this.totalPages,
      };
    } catch (e) {
      console.log("Fetch active jobs error", e);
    }
  }

  async fetchAllScheduledJobs(input = {}) {
    try {
      let scheduleQuery = ptpmJobModel
        .query()
        .where("date_scheduled", input)
        .count("unique_id", "total")
        .noDestroy();

      let result = await scheduleQuery.fetch().pipe().toPromise();
      return result.resp[0].total;
    } catch (e) {
      console.log("Fetch scheduled jobs error", e);
    }
  }

  async eachJobScheduledOnEachDate() {
    let totalDate = this.calendarDays;
    let weekTotalJobs = 0;
    for (let i = 0; i < totalDate.length; i++) {
      let date = totalDate[i].iso;
      let dayjsDate = dayjsRef(date);
      let unixDate = dayjsDate.startOf("day").unix();
      let retunedData = await this.fetchAllScheduledJobs(unixDate);
      this.calendarDays[i].total = retunedData;
      if (i == 7) {
        DASHBOARD_DEFAULTS.rowTotals[0] = weekTotalJobs;
        weekTotalJobs = retunedData;
      } else {
        weekTotalJobs = weekTotalJobs + retunedData;
      }

      if (i == totalDate.length - 1) {
        DASHBOARD_DEFAULTS.rowTotals[1] = weekTotalJobs;
      }
    }
  }

  async createEmptyJob() {
    let query = window.ptpmJobModel.mutation();
    query.createOne({});
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchServiceProvidersList() {
    const model = window.ptpmServiceProviderModel;
    if (!model || typeof model.query !== "function") return [];
    try {
      this.serviceProviderQuery = model
        .query()
        .deSelectAll()
        .select(["account_name", "id", "status"])
        .include("Contact_Information", (q) =>
          q
            .deSelectAll()
            .select(["first_name", "last_name", "id", "profile_image"])
        )
        .noDestroy();
      this.serviceProviderQuery.getOrInitQueryCalc?.();
      const result = await this.serviceProviderQuery.fetchDirect().toPromise();
      const direct = Array.isArray(result?.resp)
        ? result.resp
        : result?.resp || [];
      if (direct.length) return direct;
      const payload = Array.isArray(result?.payload) ? result.payload : [];
      const gqlBlock =
        payload.find((p) => Array.isArray(p?.data?.calcServiceProviders)) ||
        payload[0];
      const gqlList = gqlBlock?.data?.calcServiceProviders || [];
      return Array.isArray(gqlList) ? gqlList : [];
    } catch (err) {
      console.error("[DashboardModel] fetchServiceProvidersList failed", err);
      return [];
    }
  }

  async fetchAllServiceProviderDetails() {
    const model = window.ptpmServiceProviderModel;
    if (!model || typeof model.query !== "function") return [];
    try {
      const allFields = [
        "id", "unique_id", "account_name", "business_entity_name", "status", "type",
        "abn", "gst_registered", "bsb", "account_number",
        "mobile_number", "work_email", "emergency_contact_number",
        "workload_capacity", "job_rate_percentage",
        "jobs_in_progress", "completed_jobs_last_30_days", "new_jobs_last_30_days",
        "call_backs_last_30_days", "total_inquiries", "inquiries",
        "quotes_jobs", "scheduled_visits",
        "busy", "looking", "ok",
        "accepted_payment", "declined_payment", "pending_payment",
        "bill_items_to_be_paid_count", "bill_items_to_be_paid_total",
        "bill_items_to_be_processed_count", "bill_items_to_be_processed_total",
        "last_batch_code", "next_batch_code", "process_next_batch",
        "last_bill_date", "last_bill_due_date", "last_bill_paid_date",
        "next_bill_date", "next_bill_due_date",
        "materials_total_deductions_owed", "materials_total_reimbursements_owed",
        "materials_non_job_deductions_to_be_paid", "materials_non_job_reimbursements_to_be_paid",
        "total_non_job_materials_balance", "process_non_job_materials_owed",
        "memos_comments", "approval_by_admin",
        "google_calendar_id", "contact_information_id",
        "xero_contact_id", "xero_bill_account_code", "xero_bill_item_code",
        "xero_tax_rate", "xero_bill_pdf", "xero_api_response",
        "bulk_email_status", "bulk_sms_status", "shareable_link",
        "created_at"
      ];

      const query = model
        .query()
        .deSelectAll()
        .select(allFields)
        .noDestroy();
      query.getOrInitQueryCalc?.();
      const result = await query.fetchDirect().toPromise();

      // Debug: log the raw result structure
      console.log("[fetchAllServiceProviderDetails] Raw result:", result);

      // Try to extract data from various possible locations
      const direct = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
      if (direct.length) {
        console.log("[fetchAllServiceProviderDetails] Found data in result.resp");
        return direct;
      }

      const payload = Array.isArray(result?.payload) ? result.payload : [];
      console.log("[fetchAllServiceProviderDetails] Payload:", payload);

      const gqlBlock =
        payload.find((p) => Array.isArray(p?.data?.calcServiceProviders)) ||
        payload[0];
      console.log("[fetchAllServiceProviderDetails] gqlBlock:", gqlBlock);

      const gqlList = gqlBlock?.data?.calcServiceProviders || [];
      console.log("[fetchAllServiceProviderDetails] gqlList:", gqlList);

      return Array.isArray(gqlList) ? gqlList : [];
    } catch (err) {
      console.error("[DashboardModel] fetchAllServiceProviderDetails failed", err);
      return [];
    }
  }

  async createTask(payload = {}) {
    const model = window.ptpmTaskModel;
    if (!model || typeof model.mutation !== "function") return null;
    const query = model.mutation();
    query.createOne(payload);
    const result = await query.execute(true).toPromise();
    return result;
  }

  async fetchJobUniqueID(id) {
    let query = ptpmJobModel
      .query()
      .where("id", id)
      .deSelectAll()
      .select(["new_direct_job_url"])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async fetchInquiryUniqueIdFromJob(jobId) {
    try {
      const query = ptpmJobModel
        .query()
        .where("id", jobId)
        .deSelectAll()
        .select(["id"])
        .include("Inquiry_Record", (q) => {
          q.deSelectAll().select(["unique_id"]);
        })
        .noDestroy();
      query.getOrInitQueryCalc?.();
      const result = await query.fetchDirect().toPromise();

      // Extract the inquiry unique_id from the result
      const jobs = Array.isArray(result?.resp) ? result.resp : [];
      if (jobs.length > 0) {
        const job = jobs[0];
        const inquiryUniqueId = job?.Inquiry_Record?.unique_id || job?.inquiry_record?.unique_id;
        return inquiryUniqueId || null;
      }

      // Fallback: check payload structure
      const payload = Array.isArray(result?.payload) ? result.payload : [];
      const gqlBlock = payload.find((p) => Array.isArray(p?.data?.calcJobs)) || payload[0];
      const gqlList = gqlBlock?.data?.calcJobs || [];
      if (gqlList.length > 0) {
        const job = gqlList[0];
        return job?.Inquiry_Record?.unique_id || job?.inquiry_record?.unique_id || null;
      }

      return null;
    } catch (err) {
      console.error("[DashboardModel] fetchInquiryUniqueIdFromJob failed", err);
      return null;
    }
  }

  async fetchNotification(callback) {
    this.announcementQuery = pptmAnnouncementModel
      .query()
      .where("notified_contact_id", LOGGEDIN_USER_ID)
      .deSelectAll()
      .select([
        "id",
        "created_at",
        "title",
        "unique_id",
        "type",
        "is_read",
        "notified_contact_id",
        "origin_url",
      ])
      .noDestroy();
    this.announcementQuery = this.announcementQuery.orderBy(
      "created_at",
      "desc"
    );
    this.announcementQuery.getOrInitQueryCalc();

    let result = "";
    try {
      result = await this.announcementQuery.fetchDirect().toPromise();
    } catch (e) {
      console.log("Fetch announcement error", e);
    }

    this.subscribeToannouncementChanges();
    this.announcementCallback = callback;
    if (typeof this.announcementCallback === "function")
      this.announcementCallback(result.resp);
    return result.resp;
  }

  subscribeToannouncementChanges() {
    this.announcementSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.announcementQuery?.subscribe === "function") {
        liveObs = this.announcementQuery?.subscribe();
      }
    } catch (_) {
      console.error("[DashboardModel] announcement subscribe failed", _);
    }

    if (
      !liveObs &&
      typeof this.announcementQuery?.localSubscribe === "function"
    ) {
      try {
        liveObs = this.announcementQuery?.localSubscribe();
      } catch (_) {
        console.error("[DashboardModel] announcement localSubscribe failed", _);
      }
    }

    if (!liveObs) return;

    this.announcementSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          if (typeof this.announcementCallback === "function") {
            this.announcementCallback(payload);
          }
        },
        error: () => {},
      });
  }

  // async updateAnnouncement(id) {
  //   let query = pptmAnnouncementModel.mutation();
  //   query.updateOne((q) => q.where("unique_id", id).set({ is_read: true }));
  //   let result = await query.execute(true).toPromise();
  //   return result;
  // }

  async updateAnnouncements(ids = []) {
    if (!Array.isArray(ids) || ids.length === 0) return null;
    const mutation = pptmAnnouncementModel.mutation();
    mutation.update((q) =>
      q.where("unique_id", "in", ids).set({ is_read: true })
    );
    const result = await mutation.execute(true).toPromise();
    return result;
  }
}
