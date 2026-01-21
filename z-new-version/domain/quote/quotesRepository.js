import { switchPluginModal } from "../../sdk/modelRegistry.js";

export class QuoteRepository {
  constructor() {
    this.quoteModel = switchPluginModal("PeterpmJob"); // quotes live on Job
    this.quoteQuery = null;
  }

  async BuildQuoteQuery(filters = {}) {
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

    /* ---------- Base query ---------- */
    this.quoteQuery = await this.quoteModel;
    this.quoteQuery = this.quoteQuery.query();

    /* ---------- Status ---------- */
    if (Array.isArray(f.statuses) && f.statuses.length) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "quote_status",
        "in",
        f.statuses
      );
    }

    /* ---------- Service Provider ---------- */
    if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "Primary_Service_Provider",
        (q) => {
          q.where("account_name", "in", f.serviceProviders);
        }
      );
    }

    /* ---------- Price range ---------- */
    if (minPrice != null) {
      this.quoteQuery = this.quoteQuery.andWhere("quote_total", ">=", minPrice);
    }
    if (maxPrice != null) {
      this.quoteQuery = this.quoteQuery.andWhere("quote_total", "<=", maxPrice);
    }

    /* ---------- Identifiers ---------- */
    if (f.quoteNumber) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "unique_id",
        "like",
        like(f.quoteNumber)
      );
    }

    if (f.invoiceNumber) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "invoice_number",
        "like",
        like(f.invoiceNumber)
      );
    }

    /* ---------- Recommendation ---------- */
    if (f.recommendation) {
      this.quoteQuery = this.quoteQuery.andWhere(
        "admin_recommendation",
        "like",
        like(f.recommendation)
      );
    }

    /* ---------- Date range ---------- */
    if (startEpoch != null || endEpoch != null) {
      this.quoteQuery = this.quoteQuery.andWhere((q) => {
        if (startEpoch != null)
          q.andWhere("date_quoted_accepted", ">=", startEpoch);
        if (endEpoch != null)
          q.andWhere("date_quoted_accepted", "<=", endEpoch);
      });
    }

    /* ---------- Client ---------- */
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

    /* ---------- Property ---------- */
    if (f.address) {
      this.quoteQuery = this.quoteQuery.andWhere("Property", (q) => {
        q.andWhere("property_name", "like", like(f.address));
      });
    }

    /* ---------- Global ---------- */
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

    /* ---------- Account ---------- */
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

    /* ---------- Source ---------- */
    if (Array.isArray(f.source) && f.source.length) {
      this.quoteQuery = this.quoteQuery.andWhere("Inquiry_Record", (q) => {
        q.andWhere("how_did_you_hear", "in", f.source);
      });
    }

    this.quoteQuery = this.quoteQuery
      .andWhereNot("quote_status", "isNull")
      .deSelectAll()
      .select([
        "unique_id",
        "quote_status",
        "quote_total",
        "date_quoted_accepted",
        "quote_valid_until",
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

  async fetchQuotes(filters, limit, offset) {
    try {
      await this.BuildQuoteQuery(filters);
      this.quoteQuery.getOrInitQueryCalc();

      const rows = await this.quoteQuery
        .fetchDirect({ variables: { limit, offset } })
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .toPromise();

      return rows?.resp ?? [];
    } catch (e) {
      console.log("Fetch quotes error", e);
    }
  }

  async countQuotes() {
    try {
      const countQuery = this.quoteQuery.deSelectAll().noDestroy();
      const totalRes = await countQuery.fetchDirect().toPromise();
      return totalRes?.resp?.length ?? 0;
    } catch (e) {
      console.error("Count quotes error", e);
    }
  }
}
