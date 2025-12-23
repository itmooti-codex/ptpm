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

    this.dealQuery = null;
    this.quoteQuery = null;
    this.jobQuery = null;
    this.paymentQuery = null;
    this.activeJobsQuery = null;
    this.announcementQuery = null;

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

    this.limit = 500;
    this.offset = 0;
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
    this.dealQuery = this.dealQuery
      .andWhere((q) => {
        if (startEpoch != null)
          q.andWhere("date_quoted_accepted", ">=", startEpoch);
        if (endEpoch != null) q.andWhere("quote_valid_until", "<=", endEpoch);
      })
      .deSelectAll()
      .select([
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
        "Primary_Service_Provider",
        (q) => {
          q.where("account_name", "in", f.serviceProviders);
        }
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
    this.quoteQuery = this.quoteQuery
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
      .include("Client_Entity", (q) => q.deSelectAll().select(["name", "type"]))
      .include("Inquiry_Record", (q) =>
        q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
      )
      .include("Inquiry_Record", (q) =>
        q.include("Service_Inquiry", (d) =>
          d.deSelectAll().select(["service_name"])
        )
      )
      .noDestroy();
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
        "Primary_Service_Provider",
        (q) => {
          q.where("account_name", "in", f.serviceProviders);
        }
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

    this.jobQuery = this.jobQuery
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
      .include("Client_Entity", (q) => q.deSelectAll().select(["name", "type"]))
      .include("Inquiry_Record", (q) =>
        q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
      )
      .include("Inquiry_Record", (q) =>
        q.include("Service_Inquiry", (d) =>
          d.deSelectAll().select(["service_name"])
        )
      )
      .noDestroy();
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
        "Primary_Service_Provider",
        (q) => {
          q.where("account_name", "in", f.serviceProviders);
        }
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

    this.paymentQuery = this.paymentQuery
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
      .include("Client_Entity", (q) => q.deSelectAll().select(["name", "type"]))
      .include("Inquiry_Record", (q) =>
        q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
      )
      .include("Inquiry_Record", (q) =>
        q.include("Service_Inquiry", (d) =>
          d.deSelectAll().select(["service_name"])
        )
      )
      .noDestroy();

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
    if (f.minPrice != 0 && f.maxPrice != 10000) {
      minPrice = f.minPrice;
      maxPrice = f.maxPrice;
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

    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "quote_status",
        "in",
        f.statuses
      );
    }

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Primary_Service_Provider",
        (q) => {
          q.where("account_name", "in", f.serviceProviders);
        }
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
    if (f.source) {
      this.activeJobsQuery = this.activeJobsQuery.andWhere(
        "Inquiry_Record",
        (q) => {
          q.andWhere("how_did_you_hear", "in", f.source);
        }
      );
    }

    this.paymentQuery = this.activeJobsQuery
      .deSelectAll()
      .andWhereNot("job_status", "completed")
      .andWhereNot("job_status", "cancelled")
      .select([
        "Unique_ID",
        "Invoice_Number",
        "Invoice_Date",
        "Due_Date",
        "Invoice_Total",
        "Bill_Time_Paid",
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
      .include("Client_Entity", (q) => q.deSelectAll().select(["name", "type"]))
      .include("Inquiry_Record", (q) =>
        q.deSelectAll().select(["inquiry_status", "type", "how_did_you_hear"])
      )
      .include("Inquiry_Record", (q) =>
        q.include("Service_Inquiry", (d) =>
          d.deSelectAll().select(["service_name"])
        )
      )
      .noDestroy();

    return;
  }

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

  async fetchQuotesCreated(filters) {
    try {
      await this.BuildQuoteQuery(filters);
      return await this.quoteQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch quotes error", e);
    }
  }

  async fetchJobs(filters) {
    try {
      await this.BuildJobQuery(filters);
      return await this.jobQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch jobs error", e);
    }
  }

  async fetchPayments(filters) {
    try {
      await this.BuildPaymentQuery(filters);
      return await this.paymentQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
    } catch (e) {
      console.log("Fetch jobs error", e);
    }
  }

  async fetchActiveJobs(filters) {
    await this.BuildactiveJobsQuery(filters);
    try {
      return await this.activeJobsQuery
        .fetch()
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();
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

  async fetchNotification(callback) {
    this.announcementQuery = pptmAnnouncementModel
      .query()
      .where("notified_contact_id", LOGGEDIN_USER_ID)
      .deSelectAll()
      .select([
        "id",
        "publish_date_time",
        "title",
        "unique_id",
        "type",
        "is_read",
        "notified_contact_id",
        "origin_url",
      ])
      .noDestroy();
    this.announcementQuery = this.announcementQuery.orderBy(
      "publish_date_time",
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
    } catch (_) {}

    if (
      !liveObs &&
      typeof this.announcementQuery?.localSubscribe === "function"
    ) {
      try {
        liveObs = this.announcementQuery?.localSubscribe();
      } catch (_) {}
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

  async updateAnnouncement(id) {
    let query = pptmAnnouncementModel.mutation();
    query.updateOne((q) => q.where("unique_id", id).set({ is_read: true }));
    let result = await query.execute(true).toPromise();
    return result;
  }
}
