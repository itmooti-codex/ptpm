export class InquiryDetailModel {
  constructor(plugin, { inquiryId } = {}) {
    this.plugin = plugin || null;
    this.inquiryId = this.#normaliseId(inquiryId);
    this._modelName = null;
  }

  setInquiryId(inquiryId) {
    if (inquiryId === undefined || inquiryId === null) return;
    this.inquiryId = this.#normaliseId(inquiryId);
  }

  async fetchInquiry() {
    const id = this.inquiryId ?? null;
    if (!id || !this.plugin) return null;

    const model = await this.#resolveInquiryModel();
    if (!model) return null;

    let query = null;
    try {
      query = model.query();
    } catch (_) {
      query = null;
    }
    if (!query) return null;

    if (typeof query.deSelectAll === "function") {
      try {
        query = query.deSelectAll();
      } catch (_) {}
    }

    if (typeof query.field === "function") {
      const fields = [
        ["ID", "id"],
        ["id", "id"],
        ["Unique_ID", "unique_id"],
        ["unique_id", "unique_id"],
        ["Inquiry_Source", "inquiry_source"],
        ["inquiry_source", "inquiry_source"],
        ["Date_Added", "created_at"],
        ["created_at", "created_at"],
        ["Owner_ID", "owner_id"],
        ["owner_id", "owner_id"],
        ["Primary_Contact_ID", "primary_contact_id"],
        ["primary_contact_id", "primary_contact_id"],
        ["Type", "type"],
        ["type", "type"],
        ["Deal_Name", "deal_name"],
        ["deal_name", "deal_name"],
        ["How_can_we_help", "how_can_we_help"],
        ["how_can_we_help", "how_can_we_help"],
        ["Inquiry_Status", "inquiry_status"],
        ["inquiry_status", "inquiry_status"],
      ];
      fields.forEach(([fieldName, alias]) => {
        try {
          query = query.field(fieldName, alias);
        } catch (_) {}
      });
    } else if (typeof query.select === "function") {
      const selects = [
        "ID",
        "id",
        "Unique_ID",
        "unique_id",
        "Inquiry_Source",
        "inquiry_source",
        "Date_Added",
        "created_at",
        "Owner_ID",
        "owner_id",
        "Primary_Contact_ID",
        "primary_contact_id",
        "Type",
        "type",
        "Deal_Name",
        "deal_name",
        "How_can_we_help",
        "how_can_we_help",
        "Inquiry_Status",
        "inquiry_status",
      ];
      try {
        query = query.select(selects);
      } catch (_) {}
    }

    if (typeof query.where === "function") {
      const filters = ["ID", "id"];
      let applied = false;
      filters.some((field) => {
        try {
          query = query.where(field, ":id");
          applied = true;
          return true;
        } catch (_) {
          return false;
        }
      });
      if (!applied) {
        try {
          query = query.where("Unique_ID", ":id");
        } catch (_) {}
      }
    }

    if (typeof query.limit === "function") {
      try {
        query = query.limit(":limit");
      } catch (_) {}
    }

    query.getOrInitQueryCalc?.();

    const payload = await this.#executeQuery(query, {
      id,
      limit: 1,
    });

    if (!payload) return null;
    const [record] = this.#extractRecords(payload);
    if (!record) return null;

    const state = this.#unwrap(record) || {};

    const recordId = this.#toString(
      this.#pick(state, "id", "ID") ?? id
    );
    const unique = this.#toString(
      this.#pick(state, "unique_id", "Unique_ID") ?? recordId
    );
    const source = this.#toString(
      this.#pick(state, "inquiry_source", "Inquiry_Source")
    );
    const createdAt = this.#toString(
      this.#pick(state, "created_at", "Date_Added")
    );
    const ownerId = this.#toString(
      this.#pick(state, "owner_id", "Owner_ID")
    );
    const primaryContactId = this.#toString(
      this.#pick(state, "primary_contact_id", "Primary_Contact_ID")
    );
    const inquiryType = this.#toString(this.#pick(state, "type", "Type"));
    const dealName = this.#toString(this.#pick(state, "deal_name", "Deal_Name"));
    const requestSummary = this.#toString(
      this.#pick(state, "how_can_we_help", "How_can_we_help")
    );
    const inquiryStatus = this.#toString(
      this.#pick(state, "inquiry_status", "Inquiry_Status")
    );

    return {
      id: recordId,
      unique_id: unique,
      inquiry_source: source,
      created_at: createdAt,
      owner_id: ownerId,
      primary_contact_id: primaryContactId,
      type: inquiryType,
      deal_name: dealName,
      how_can_we_help: requestSummary,
      inquiry_status: inquiryStatus,
    };
  }

  async #resolveInquiryModel() {
    if (!this.plugin) return null;

    if (this._modelName) {
      try {
        return this.plugin.switchTo(this._modelName);
      } catch (_) {
        this._modelName = null;
      }
    }

    const state =
      typeof this.plugin.getState === "function" ? this.plugin.getState() : {};
    const hints = ["deal", "inquiry"];

    for (const [key, model] of Object.entries(state || {})) {
      const schema = model?.schema || {};
      const identifier = [schema.displayLabel, schema.label, schema.name, key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hints.some((hint) => identifier.includes(hint))) {
        this._modelName = schema.name || key;
        try {
          return this.plugin.switchTo(this._modelName);
        } catch (_) {
          this._modelName = null;
        }
      }
    }

    const pluginName =
      this.plugin?.schema?.name ||
      this.plugin?.slug ||
      window.config?.slug ||
      "";
    const properName = pluginName
      .toString()
      .replace(/[-_]/g, " ")
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join("");

    const candidates = [
      "Deal",
      "Deals",
      "Inquiry",
      "Inquiries",
      properName ? `${properName}Deal` : null,
      properName ? `${properName}Deals` : null,
      properName ? `${properName}Inquiry` : null,
      properName ? `${properName}Inquiries` : null,
    ].filter(Boolean);

    for (const candidate of candidates) {
      try {
        const model = this.plugin.switchTo(candidate);
        if (model?.schema) {
          this._modelName = candidate;
          return model;
        }
      } catch (_) {
        // continue searching
      }
    }

    return null;
  }

  async #executeQuery(query, variables) {
    if (!query) return null;
    let execution = null;
    try {
      if (typeof query.fetchDirect === "function") {
        execution = query.fetchDirect({ variables });
      } else if (typeof query.fetch === "function") {
        execution = query.fetch({ variables });
      } else if (typeof query.get === "function") {
        execution = query.get({ variables });
      }
    } catch (error) {
      console.warn("[InquiryDetail] query execution failed", error);
      execution = null;
    }

    const result = await this.#awaitResult(execution);

    try {
      query.destroy?.();
    } catch (_) {}

    return result;
  }

  async #awaitResult(execution) {
    if (!execution) return null;
    if (execution instanceof Promise) {
      try {
        return await execution;
      } catch (_) {
        return null;
      }
    }
    if (typeof execution.then === "function") {
      try {
        return await execution;
      } catch (_) {
        return null;
      }
    }
    if (typeof execution.subscribe === "function") {
      return new Promise((resolve) => {
        let settled = false;
        const subscription = execution.subscribe({
          next: (value) => {
            if (!settled) {
              settled = true;
              resolve(value);
            }
            subscription?.unsubscribe?.();
          },
          error: () => {
            if (!settled) {
              settled = true;
              resolve(null);
            }
            subscription?.unsubscribe?.();
          },
          complete: () => {
            if (!settled) {
              settled = true;
              resolve(null);
            }
            subscription?.unsubscribe?.();
          },
        });
      });
    }
    return null;
  }

  #extractRecords(payload) {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.resp)) return payload.resp;
    if (Array.isArray(payload?.records)) return payload.records;
    if (payload?.records && typeof payload.records === "object") {
      return Object.values(payload.records);
    }
    if (payload?.data && typeof payload.data === "object") {
      const first = Object.values(payload.data)[0];
      if (Array.isArray(first)) return first;
    }
    return [];
  }

  #unwrap(record) {
    if (!record || typeof record !== "object") return record;
    if (typeof record.getState === "function") {
      try {
        return record.getState();
      } catch (_) {}
    }
    if (record.state && typeof record.state === "object") {
      return record.state;
    }
    return record;
  }

  #toString(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  #normaliseId(value) {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  }

  #pick(state, ...keys) {
    for (const key of keys) {
      if (!key) continue;
      if (state && Object.prototype.hasOwnProperty.call(state, key)) {
        const value = state[key];
        if (value !== undefined) return value;
      }
      const lower = key.toLowerCase();
      if (
        state &&
        Object.prototype.hasOwnProperty.call(state, lower) &&
        state[lower] !== undefined
      ) {
        return state[lower];
      }
      if (state?.fields) {
        if (Object.prototype.hasOwnProperty.call(state.fields, key)) {
          const value = state.fields[key];
          if (value !== undefined) return value;
        }
        if (
          Object.prototype.hasOwnProperty.call(state.fields, lower) &&
          state.fields[lower] !== undefined
        ) {
          return state.fields[lower];
        }
      }
      if (state?.data) {
        if (Object.prototype.hasOwnProperty.call(state.data, key)) {
          const value = state.data[key];
          if (value !== undefined) return value;
        }
        if (
          Object.prototype.hasOwnProperty.call(state.data, lower) &&
          state.data[lower] !== undefined
        ) {
          return state.data[lower];
        }
      }
    }
    return undefined;
  }
}
