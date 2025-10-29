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
    this.paymentQuery = null;
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
    const toEpoch = (d, endOfDay = false) => {
      if (!d) return null;
      const m = dayjsRef(d);
      if (!m.isValid()) return null;
      return endOfDay ? m.endOf("day").unix() : m.startOf("day").unix();
    };
    const startEpoch = toEpoch(f.dateFrom, false);
    const endEpoch = toEpoch(f.dateTo, true);
    const hasAnyFilter = Boolean(
      (f.global && f.global.trim()) ||
        (Array.isArray(f.accountTypes) && f.accountTypes.length) ||
        (f.accountName && f.accountName.trim()) ||
        (f.resident && f.resident.trim()) ||
        (f.address && f.address.trim()) ||
        (f.source && f.source.trim()) ||
        (Array.isArray(f.statuses) && f.statuses.length) ||
        (f.quoteNumber && f.quoteNumber.trim()) ||
        (f.invoiceNumber && f.invoiceNumber.trim()) ||
        (f.recommendation && f.recommendation.trim()) ||
        f.priceMin != null ||
        f.priceMax != null ||
        (f.dateFrom && f.dateFrom.trim()) ||
        (f.dateTo && f.dateTo.trim())
    );

    if (!hasAnyFilter) {
      this.dealQuery = ptpmDealModel
        .query()
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
      return;
    }

    let accountType = f.accountTypes.length != 0 ? f.accountTypes : [""];
    let accountName = f.accountName ? `%${f.accountName}%` : "";
    let resident = f.resident ? `%${f.resident}%` : "";
    let address = f.address ? `%${f.address}%` : "";
    let source = f.source ? f.source : "";
    let status = f.statuses.length != 0 ? f.statuses : [""];
    this.dealQuery = ptpmDealModel
      .query()
      .where("how_did_you_hear", source)
      .andWhere("inquiry_status", "in", status)
      .andWhere("Company", (q) => {
        q.where("name", "like", accountName).andWhere(
          "account_type",
          "in",
          accountType
        );
      })
      .andWhere("Primary_Contact", (q) => {
        q.where("first_name", "like", resident).orWhere(
          "last_name",
          "like",
          resident
        );
      })
      .andWhere("Property", (q) => {
        q.where("address_1", "like", address);
      })
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
    const hasAnyFilter = Boolean(
      (f.global && f.global.trim()) ||
        (Array.isArray(f.accountTypes) && f.accountTypes.length) ||
        (f.accountName && f.accountName.trim()) ||
        (f.resident && f.resident.trim()) ||
        (f.address && f.address.trim()) ||
        (f.source && f.source.trim()) ||
        (Array.isArray(f.statuses) && f.statuses.length) ||
        f.priceMin != null ||
        f.priceMax != null ||
        (f.dateFrom && f.dateFrom.trim()) ||
        (f.dateTo && f.dateTo.trim())
    );

    // Base query (no filters applied)
    if (!hasAnyFilter) {
      this.quoteQuery = ptpmDealModel
        .query()
        .where("Jobs", (q) => {
          q.whereNot("quote_status", "Accepted");
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
        .include("Jobs", (q) => {
          q.deSelectAll().select([
            "quote_status",
            "quote_total",
            "date_quoted_accepted",
            "quote_valid_until",
          ]);
        })
        .noDestroy();
      return;
    }

    // Filtered query
    let accountType =
      Array.isArray(f.accountTypes) && f.accountTypes.length
        ? f.accountTypes
        : [""];
    let accountName = f.accountName ? `%${f.accountName}%` : "";
    let resident = f.resident ? `%${f.resident}%` : "";
    let address = f.address ? `%${f.address}%` : "";
    let source = f.source ? f.source : "";
    let statuses = f.statuses.length != 0 ? f.statuses : [""];
    let minPrice = f.priceMin ? f.priceMin : 0;
    let maxPrice = f.priceMax ? f.priceMax : 20000;
    const toEpoch = (d, endOfDay = false) => {
      if (!d) return null;
      const m = dayjsRef(d);
      if (!m.isValid()) return null;
      return endOfDay ? m.endOf("day").unix() : m.startOf("day").unix();
    };
    const startEpoch =
      toEpoch(f.dateFrom, false) ?? toEpoch("1970-01-01", false);
    const endEpoch = toEpoch(f.dateTo, true) ?? toEpoch("2100-12-31", true);
    this.quoteQuery = ptpmDealModel
      .query()
      .where("how_did_you_hear", source)
      .andWhere("Company", (q) => {
        q.where("name", "like", accountName).andWhere(
          "account_type",
          "in",
          accountType
        );
      })
      .andWhere("Primary_Contact", (q) => {
        q.where("first_name", "like", resident).orWhere(
          "last_name",
          "like",
          resident
        );
      })
      .andWhere("Property", (q) => {
        q.where("address_1", "like", address);
      })
      .andWhere("Jobs", (q) => {
        q.where("quote_status", "in", statuses)
          .whereNot("quote_status", "Accepted")
          .andWhere("quote_total", ">=", minPrice)
          .andWhere("quote_total", "<=", maxPrice)
          .andWhere("date_quoted_accepted", ">=", startEpoch)
          .andWhere("quote_valid_until", "<=", endEpoch);
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

  BuildJobQuery(filters = {}) {
    const f = filters || {};
    const hasAnyFilter = Boolean(
      (f.global && f.global.trim()) ||
        (Array.isArray(f.accountTypes) && f.accountTypes.length) ||
        (f.accountName && f.accountName.trim()) ||
        (f.resident && f.resident.trim()) ||
        (f.address && f.address.trim()) ||
        (f.source && f.source.trim()) ||
        (Array.isArray(f.statuses) && f.statuses.length) ||
        f.priceMin != null ||
        f.priceMax != null ||
        (f.dateFrom && f.dateFrom.trim()) ||
        (f.dateTo && f.dateTo.trim())
    );

    // Base query (no filters applied)
    if (!hasAnyFilter) {
      this.jobQuery = ptpmDealModel
        .query()
        .where("Jobs", (q) => {
          q.where("quote_status", "Accepted");
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
        .include("Jobs", (q) => {
          q.deSelectAll().select([
            "quote_status",
            "quote_total",
            "date_quoted_accepted",
            "quote_valid_until",
          ]);
        })
        .noDestroy();
      return;
    }

    // Filtered query
    let accountType =
      Array.isArray(f.accountTypes) && f.accountTypes.length
        ? f.accountTypes
        : [""];
    let accountName = f.accountName ? `%${f.accountName}%` : "";
    let resident = f.resident ? `%${f.resident}%` : "";
    let address = f.address ? `%${f.address}%` : "";
    let source = f.source ? f.source : "";
    let statuses = f.statuses.length != 0 ? f.statuses : [""];
    let minPrice = f.priceMin ? f.priceMin : 0;
    let maxPrice = f.priceMax ? f.priceMax : 20000;
    const toEpoch = (d, endOfDay = false) => {
      if (!d) return null;
      const m = dayjsRef(d);
      if (!m.isValid()) return null;
      return endOfDay ? m.endOf("day").unix() : m.startOf("day").unix();
    };
    const startEpoch =
      toEpoch(f.dateFrom, false) ?? toEpoch("1970-01-01", false);
    const endEpoch = toEpoch(f.dateTo, true) ?? toEpoch("2100-12-31", true);
    this.jobQuery = ptpmDealModel
      .query()
      .where("how_did_you_hear", source)
      .andWhere("Company", (q) => {
        q.where("name", "like", accountName).andWhere(
          "account_type",
          "in",
          accountType
        );
      })
      .andWhere("Primary_Contact", (q) => {
        q.where("first_name", "like", resident).orWhere(
          "last_name",
          "like",
          resident
        );
      })
      .andWhere("Property", (q) => {
        q.where("address_1", "like", address);
      })
      .andWhere("Jobs", (q) => {
        q.where("quote_status", "in", statuses)
          .where("quote_status", "Accepted")
          .andWhere("quote_total", ">=", minPrice)
          .andWhere("quote_total", "<=", maxPrice)
          .andWhere("date_quoted_accepted", ">=", startEpoch)
          .andWhere("quote_valid_until", "<=", endEpoch);
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

  BuildPaymentQuery(filters = {}) {
    const f = filters || {};
    const hasAnyFilter = Boolean(
      (f.global && f.global.trim()) ||
        (Array.isArray(f.accountTypes) && f.accountTypes.length) ||
        (f.accountName && f.accountName.trim()) ||
        (f.resident && f.resident.trim()) ||
        (f.address && f.address.trim()) ||
        (f.source && f.source.trim()) ||
        (Array.isArray(f.statuses) && f.statuses.length) ||
        f.priceMin != null ||
        f.priceMax != null ||
        (f.dateFrom && f.dateFrom.trim()) ||
        (f.dateTo && f.dateTo.trim())
    );

    // Base query (no filters applied)
    if (!hasAnyFilter) {
      this.paymentQuery = ptpmDealModel
        .query()
        .where("Jobs", (q) => {
          q.whereNot("payment_status", "isNull");
        })
        .deSelectAll()
        .select(["Unique_ID", "Type", "Inquiry_Status", "How_did_you_hear"])
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
        .include("Jobs", (q) => {
          q.deSelectAll().select([
            "invoice_number",
            "invoice_date",
            "due_date",
            "invoice_total",
            "bill_time_paid",
            "xero_invoice_status",
          ]);
        })
        .noDestroy();
      return;
    }

    // Filtered query
    let accountType =
      Array.isArray(f.accountTypes) && f.accountTypes.length
        ? f.accountTypes
        : [""];
    let accountName = f.accountName ? `%${f.accountName}%` : "";
    let resident = f.resident ? `%${f.resident}%` : "";
    let address = f.address ? `%${f.address}%` : "";
    let source = f.source ? f.source : "";
    let statuses = f.statuses.length != 0 ? f.statuses : [""];
    let minPrice = f.priceMin ? f.priceMin : 0;
    let maxPrice = f.priceMax ? f.priceMax : 20000;
    const toEpoch = (d, endOfDay = false) => {
      if (!d) return null;
      const m = dayjsRef(d);
      if (!m.isValid()) return null;
      return endOfDay ? m.endOf("day").unix() : m.startOf("day").unix();
    };
    const startEpoch =
      toEpoch(f.dateFrom, false) ?? toEpoch("1970-01-01", false);
    const endEpoch = toEpoch(f.dateTo, true) ?? toEpoch("2100-12-31", true);
    this.paymentQuery = ptpmDealModel
      .query()
      .where("how_did_you_hear", source)
      .andWhere("Company", (q) => {
        q.where("name", "like", accountName).andWhere(
          "account_type",
          "in",
          accountType
        );
      })
      .andWhere("Primary_Contact", (q) => {
        q.where("first_name", "like", resident).orWhere(
          "last_name",
          "like",
          resident
        );
      })
      .andWhere("Property", (q) => {
        q.where("address_1", "like", address);
      })
      .andWhere("Jobs", (q) => {
        q.where("quote_status", "in", statuses)
          .where("quote_status", "Accepted")
          .andWhere("quote_total", ">=", minPrice)
          .andWhere("quote_total", "<=", maxPrice)
          .andWhere("date_quoted_accepted", ">=", startEpoch)
          .andWhere("quote_valid_until", "<=", endEpoch);
      })
      .deSelectAll()
      .select(["Unique_ID", "Type", "Inquiry_Status", "How_did_you_hear"])
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
      .include("Jobs", (q) => {
        q.deSelectAll().select([
          "invoice_number",
          "invoice_date",
          "due_date",
          "invoice_total",
          "bill_time_paid",
          "xero_invoice_status",
        ]);
      })
      .noDestroy();
  }

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
}
