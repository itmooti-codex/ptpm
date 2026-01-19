import { switchPluginModal } from "../../sdk/modelRegistry.js";

export class InquiryRepository {
  constructor() {
    this.inquiryModal = switchPluginModal("PeterpmDeal");
    this.dealQuery = null;
  }

  async buildBaseDealQuery(filters = {}) {
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

    this.dealQuery = await this.inquiryModal;
    this.dealQuery = this.dealQuery.query();
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
        "unique_id",
        "created_at",
        "type",
        "inquiry_status",
        "how_did_you_hear",
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
        q.deSelectAll().include("Contact_Information", (r) => {
          r.deSelectAll().select(["first_name", "last_name"]);
        });
      })
      .noDestroy();
  }

  async countInquiries(filters) {
    try {
      this.buildBaseDealQuery(filters);
      const countQuery = this.dealQuery.deSelectAll().noDestroy();

      const totalRes = await countQuery.fetchDirect().toPromise();
      return totalRes?.resp?.length ?? 0;
    } catch (err) {
      console.error("Count inquiries error", err);
    }
  }

  async fetchInquiries({ filters, limit, offset }) {
    try {
      await this.buildBaseDealQuery(filters);
      this.dealQuery.getOrInitQueryCalc();

      const rows = await this.dealQuery
        .fetchDirect({
          variables: { limit, offset },
        })
        .toPromise();

      return rows?.resp ?? [];
    } catch (err) {
      console.log("Fetch deal error", err);
    }
  }
}
