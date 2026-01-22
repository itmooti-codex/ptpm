import { switchPluginModal } from "../../sdk/modelRegistry.js";

export class ActiveJobRepository {
  constructor() {
    this.activeJobModel = switchPluginModal("PeterpmJob");
    this.activeJobQuery = null;
  }

  async buildActiveJobQuery(filters = {}) {
    const f = filters;
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

    const startEpoch = toEpoch(f.dateFrom);
    const endEpoch = toEpoch(f.dateTo, true);

    const minPrice = f.minPrice;
    const maxPrice = f.maxPrice;

    this.activeJobQuery = (await this.activeJobModel).query();

    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "active_job_status",
        "in",
        f.statuses
      );
    }

    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "Primary_Service_Provider",
        (q) => q.where("account_name", "in", f.serviceProviders)
      );
    }

    if (minPrice != null) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "active_job_total",
        ">=",
        minPrice
      );
    }

    if (maxPrice != null) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "active_job_total",
        "<=",
        maxPrice
      );
    }

    if (f.activeJobNumber) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "unique_id",
        "like",
        like(f.activeJobNumber)
      );
    }

    if (f.invoiceNumber) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    if (f.recommendation) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }

    if (startEpoch || endEpoch) {
      this.activeJobQuery = this.activeJobQuery.andWhere((q) => {
        if (startEpoch)
          q.andWhere("date_active_job_accepted", ">=", startEpoch);
        if (endEpoch) q.andWhere("date_active_job_accepted", "<=", endEpoch);
      });
    }

    if (f.resident) {
      const likeResident = like(f.resident);
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "Client_Individual",
        (q) =>
          q
            .where("first_name", "like", likeResident)
            .orWhere("last_name", "like", likeResident)
      );
    }

    if (f.address) {
      this.activeJobQuery = this.activeJobQuery.andWhere("Property", (q) =>
        q.andWhere("property_name", "like", like(f.address))
      );
    }

    if (f.global?.trim()) {
      const likeVal = like(f.global.trim());
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "Client_Individual",
        (q) =>
          q.andWhere((g) =>
            g
              .where("first_name", "like", likeVal)
              .orWhere("last_name", "like", likeVal)
              .orWhere("email", "like", likeVal)
              .orWhere("sms_number", "like", likeVal)
          )
      );
    }

    if (
      f.accountName ||
      (Array.isArray(f.accountTypes) && f.accountTypes.length)
    ) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "Client_Entity",
        (q) => {
          if (f.accountName) q.andWhere("name", "like", like(f.accountName));
          if (f.accountTypes?.length) q.andWhere("type", "in", f.accountTypes);
        }
      );
    }

    if (Array.isArray(f.source) && f.source.length) {
      this.activeJobQuery = this.activeJobQuery.andWhere(
        "Inquiry_Record",
        (q) => q.andWhere("how_did_you_hear", "in", f.source)
      );
    }

    this.activeJobQuery = this.activeJobQuery
      .andWhereNot("job_status", "completed")
      .andWhereNot("job_status", "cancelled")
      .deSelectAll()
      .select([
        "unique_id",
        "active_job_status",
        "active_job_total",
        "date_active_job_accepted",
        "active_job_valid_until",
        "invoice_number",
        "created_at",
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
      .include("Property", (q) => q.deSelectAll().select(["property_name"]))
      .include("Primary_Service_Provider", (q) =>
        q
          .deSelectAll()
          .include("Contact_Information", (r) =>
            r.deSelectAll().select(["first_name", "last_name"])
          )
      )
      .include("Client_Entity", (q) => q.deSelectAll().select(["name", "type"]))
      .include("Inquiry_Record", (q) =>
        q.deSelectAll().select(["type", "how_did_you_hear"])
      )
      .include("Inquiry_Record", (q) =>
        q.include("Service_Inquiry", (d) =>
          d.deSelectAll().select(["service_name"])
        )
      )
      .noDestroy();
  }

  async fetchActiveJobs(filters, limit, offset) {
    await this.buildActiveJobQuery(filters);
    this.activeJobQuery.getOrInitQueryCalc();

    const rows = await this.activeJobQuery
      .fetchDirect({ variables: { limit, offset } })
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    return rows?.resp ?? [];
  }

  async countActiveJobs() {
    const countQuery = this.activeJobQuery.deSelectAll().noDestroy();
    const res = await countQuery.fetchDirect().toPromise();
    return res?.resp?.length ?? 0;
  }
}
