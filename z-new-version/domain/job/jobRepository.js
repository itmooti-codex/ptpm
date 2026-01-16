import { switchPluginModal } from "../../sdk/modelRegistry.js";
export class JobRepository {
  constructor() {
    this.jobModel = switchPluginModal("PeterpmJob");
    this.jobQuery = null;
  }

  async BuildJobQuery(filters = {}) {
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
    this.jobQuery = await this.jobModel;
    this.jobQuery = this.jobQuery.query();
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
        "unique_id",
        "date_started",
        "payment_status",
        "date_job_required_by",
        "date_booked",
        "job_status",
        "job_total",
        "date_quoted_accepted",
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
        q.deSelectAll().include("Contact_Information", (r) => {
          r.deSelectAll().select(["first_name", "last_name"]);
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

  async fetchJobs(filters, limit, offset) {
    try {
      await this.BuildJobQuery(filters);
      this.jobQuery.getOrInitQueryCalc();
      const rows = await this.jobQuery
        .fetchDirect({
          variables: { limit, offset },
        })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return rows?.resp ?? [];
    } catch (e) {
      console.log("Fetch jobs error", e);
    }
  }

  async countJobs() {
    try {
      const countQuery = this.jobQuery.deSelectAll().noDestroy();
      const totalRes = await countQuery.fetchDirect().toPromise();
      return totalRes?.resp?.length ?? 0;
    } catch (e) {
      console.error("Count jobs error", e);
    }
  }
}
