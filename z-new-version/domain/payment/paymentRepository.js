import { switchPluginModal } from "../../sdk/modelRegistry.js";

export class PaymentRepository {
  constructor() {
    this.paymentModel = switchPluginModal("PeterpmJob");
    this.paymentQuery = null;
  }

  async buildPaymentQuery(filters = {}) {
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

    const minPrice = f.minAmount;
    const maxPrice = f.maxAmount;

    this.paymentQuery = (await this.paymentModel).query();

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
      this.paymentQuery = this.paymentQuery.andWhere("Inquiry_Record", (q) => {
        q.andWhere("how_did_you_hear", "in", f.source);
      });
    }

    this.paymentQuery = this.paymentQuery
      .andWhereNot("xero_invoice_status", "isNull")
      .deSelectAll()
      .select([
        "unique_id",
        "invoice_number",
        "invoice_date",
        "due_date",
        "invoice_total",
        "bill_time_paid",
        "bill_approved_admin",
        "bill_approved_service_provider2",
        "xero_invoice_status",
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
  }

  async fetchPayments(filters, limit, offset) {
    await this.buildPaymentQuery(filters);
    this.paymentQuery.getOrInitQueryCalc();

    const rows = await this.paymentQuery
      .fetchDirect({ variables: { limit, offset } })
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .toPromise();

    return rows?.resp ?? [];
  }

  async countPayments() {
    const countQuery = this.paymentQuery.deSelectAll().noDestroy();
    const res = await countQuery.fetchDirect().toPromise();
    return res?.resp?.length ?? 0;
  }
}
