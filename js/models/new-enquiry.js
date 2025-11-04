const DEFAULT_CONTACTS = [
  {
    first_name: "Alice",
    last_name: "Johnson",
    email: "alice.johnson@example.com",
    sms_number: "+61 400 000 001",
    office_phone: "+61 2 9000 0001",
  },
  {
    first_name: "Brendan",
    last_name: "Moore",
    email: "brendan.moore@example.com",
    sms_number: "+61 400 000 002",
    office_phone: "+61 3 7000 0002",
  },
  {
    first_name: "Chloe",
    last_name: "Nguyen",
    email: "chloe.nguyen@example.com",
    sms_number: "+61 400 000 003",
    office_phone: "+61 7 3000 0003",
  },
];

export class NewEnquiryModel {
  constructor(plugin, { maxRecords = 200 } = {}) {
    this.plugin = plugin;
    this.maxRecords = maxRecords;
    this.contactModel = null;
    this.contactModelName = null;
    this.contacts = DEFAULT_CONTACTS.map((fields, index) =>
      this.#formatContact(fields, index)
    );
    this.relatedCache = new Map();
    this.relatedModelNames = {
      properties: null,
      jobs: null,
      deals: null,
    };
  }

  async loadContacts() {
    if (!this.plugin) return this.getContacts();

    const model = await this.#resolveContactModel();
    if (!model) return this.getContacts();

    try {
      await this.#primeContacts(model);
    } catch (error) {
      console.warn("[NewEnquiry] Failed to prime contacts", error);
    }
    return this.getContacts();
  }

  getContacts() {
    return Array.isArray(this.contacts) ? [...this.contacts] : [];
  }

  async createContact(fields = {}) {
    const payload = this.#buildCreatePayload(fields);

    if (!this.plugin) {
      return this.#createLocalContact(payload);
    }

    try {
      const model = await this.#resolveContactModel();
      if (!model) return this.#createLocalContact(payload);

      const mutation =
        typeof this.plugin.mutation === "function" ? this.plugin.mutation() : null;
      if (!mutation || typeof mutation.switchTo !== "function") {
        return this.#createLocalContact(payload);
      }

      const modelName = this.contactModelName || model?.schema?.name;
      const modelMutation = mutation.switchTo(modelName);
      if (!modelMutation || typeof modelMutation.createOne !== "function") {
        return this.#createLocalContact(payload);
      }

      const record = modelMutation.createOne(payload);
      const execution =
        typeof mutation.execute === "function"
          ? mutation.execute(true)
          : typeof modelMutation.execute === "function"
          ? modelMutation.execute(true)
          : null;

      await this.#awaitResult(execution);

      const state = typeof record?.getState === "function" ? record.getState() : record;
      const contact = this.#normaliseRecord(state, 0) || this.#createLocalContact(payload);
      if (contact?.fields?.email) {
        this.relatedCache.delete(contact.fields.email.trim().toLowerCase());
      }
      return contact;
    } catch (error) {
      console.warn("[NewEnquiry] Falling back to local contact creation", error);
      return this.#createLocalContact(payload);
    }
  }

  async #resolveContactModel() {
    if (this.contactModel) {
      if (!this.contactModelName) {
        this.contactModelName = this.contactModel?.schema?.name || null;
      }
      return this.contactModel;
    }
    if (!this.plugin) return null;

    const state = typeof this.plugin.getState === "function" ? this.plugin.getState() : {};
    for (const [key, model] of Object.entries(state || {})) {
      const schema = model?.schema || {};
      const names = [schema.displayLabel, schema.label, schema.name, key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const fields = this.#collectFieldNames(schema);
      const looksLikeContact =
        names.includes("contact") && fields.includes("email") && fields.includes("first_name");
      if (looksLikeContact) {
        this.contactModelName = schema.name || key;
        this.contactModel = this.plugin.switchTo(this.contactModelName);
        return this.contactModel;
      }
    }

    for (const candidate of ["Contact", "Contacts"]) {
      try {
        const model = this.plugin.switchTo(candidate);
        if (model?.schema) {
          this.contactModelName = candidate;
          this.contactModel = model;
          return model;
        }
      } catch (_) {
        // ignore missing model
      }
    }

    return null;
  }

  async #primeContacts(model) {
    let query = null;
    try {
      query = model.query();
    } catch (_) {
      query = null;
    }

    if (query) {
      if (typeof query.limit === "function") {
        try {
          query = query.limit(this.maxRecords);
        } catch (_) {}
      }
      if (typeof query.noDestroy === "function") {
        try {
          query = query.noDestroy();
        } catch (_) {}
      }
    }

    const execution = query
      ? typeof query.fetchAllRecords === "function"
        ? query.fetchAllRecords()
        : typeof query.fetch === "function"
        ? query.fetch()
        : typeof query.get === "function"
        ? query.get()
        : null
      : null;

    await this.#awaitResult(execution);

    const state = typeof model.getState === "function" ? model.getState() : {};
    const contacts = Object.values(state || {})
      .map((record, index) => this.#normaliseRecord(record, index))
      .filter(Boolean);

    if (contacts.length) {
      this.contacts = contacts;
    }
  }

  #buildCreatePayload(fields = {}) {
    const allowed = ["first_name", "last_name", "email", "sms_number", "office_phone"];
    const payload = {};
    allowed.forEach((key) => {
      const value = fields[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") {
        payload[key] = String(value).trim();
      }
    });
    return payload;
  }

  #normaliseRecord(record = {}, index = 0) {
    return this.#formatContact(record, index);
  }

  #collectFieldNames(schema = {}) {
    const fields = new Set();
    const add = (collection) => {
      if (!collection) return;
      if (Array.isArray(collection)) {
        collection.forEach((entry) => {
          if (typeof entry === "string") fields.add(entry.toLowerCase());
          if (entry && typeof entry === "object" && entry.name) {
            fields.add(String(entry.name).toLowerCase());
          }
        });
        return;
      }
      if (typeof collection === "object") {
        Object.keys(collection).forEach((key) => fields.add(key.toLowerCase()));
      }
    };

    add(schema.fields);
    add(schema.props?.fields);
    return Array.from(fields);
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

  #unwrap(record) {
    if (!record || typeof record !== "object") return record;
    if (typeof record.getState === "function") {
      try {
        const state = record.getState();
        if (state && typeof state === "object") {
          return { ...record, ...state };
        }
      } catch (_) {}
    }
    if (record.state && typeof record.state === "object") {
      return { ...record, ...record.state };
    }
    return record;
  }

  #toString(value) {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  #upsertContact(contact) {
    const contacts = Array.isArray(this.contacts) ? [...this.contacts] : [];
    const index = contacts.findIndex((entry) => entry.id === contact.id);
    if (index >= 0) contacts.splice(index, 1, contact);
    else contacts.unshift(contact);
    this.contacts = contacts.slice(0, this.maxRecords);
  }

  #createLocalContact(fields = {}) {
    const contact = this.#formatContact(
      {
        ...fields,
        id: fields.email || `contact-${Date.now()}`,
      },
      this.contacts.length
    );
    this.#upsertContact(contact);
    if (contact?.fields?.email) {
      this.relatedCache.delete(contact.fields.email.trim().toLowerCase());
    }
    return contact;
  }

  #formatContact(source = {}, index = 0) {
    const state = this.#unwrap(source) || {};

    const firstName = this.#toString(
      state.first_name ?? state.firstName ?? state.fields?.first_name
    );
    const lastName = this.#toString(
      state.last_name ?? state.lastName ?? state.fields?.last_name
    );
    const email = this.#toString(state.email ?? state.fields?.email);
    const sms = this.#toString(
      state.sms_number ?? state.smsNumber ?? state.fields?.sms_number
    );
    const office = this.#toString(
      state.office_phone ?? state.officePhone ?? state.fields?.office_phone
    );

    const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
    const label = fullName || email || sms || office || "Unknown Contact";
    const meta = email || sms || office || "";

    const contactId =
      state.contact_id ??
      state.fields?.contact_id ??
      state.id ??
      state.ID ??
      (email ? `contact-${email}` : `contact-${Date.now()}-${index}`);

    return {
      id: contactId,
      label,
      meta,
      fields: {
        contact_id: this.#toString(contactId),
        first_name: firstName,
        last_name: lastName,
        email,
        sms_number: sms,
        office_phone: office,
      },
    };
  }

  async fetchRelated(email) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return this.#cloneRelated(this.#emptyRelated());

    const cached = this.relatedCache.get(normalized);
    if (cached) {
      return this.#cloneRelated(cached);
    }

    let related = this.#emptyRelated();
    if (!this.plugin) {
      related = this.#mockRelated(normalized);
    } else {
      try {
        related = await this.#fetchRelatedFromSdk(normalized);
      } catch (error) {
        console.warn("[NewEnquiry] Related fetch failed, using mock data", error);
        related = this.#mockRelated(normalized);
      }
    }

    this.relatedCache.set(normalized, related);
    return this.#cloneRelated(related);
  }

  async #fetchRelatedFromSdk(email) {
    const [properties, jobs, inquiries] = await Promise.all([
      this.#queryProperties(email),
      this.#queryJobs(email),
      this.#queryDeals(email),
    ]);

    return {
      properties,
      jobs,
      inquiries,
    };
  }

  async #queryProperties(email) {
    const model = await this.#resolveRelatedModel("properties");
    if (!model) return this.#mockRelated(email).properties;

    let query = model.query();
    if (typeof query.deSelectAll === "function") {
      query = query.deSelectAll();
    }
    if (typeof query.field === "function") {
      const fields = [
        ["id", "id"],
        ["unique_id", "unique_id"],
        ["property_name", "property_name"],
        ["address", "address"],
        ["address_1", "address_1"],
        ["address_2", "address_2"],
        ["suburb_town", "suburb_town"],
        ["city", "city"],
        ["state", "state"],
        ["postal_code", "postal_code"],
        ["postcode", "postcode"],
        ["map_url", "map_url"],
        ["owner_name", "owner_name"],
        ["primary_owner_contact_for_property", "primary_owner_contact_for_property"],
        ["status", "status"],
        ["property_status", "property_status"],
      ];
      fields.forEach(([name, alias]) => {
        try {
          query = query.field(name, alias);
        } catch (_) {}
      });
    } else if (typeof query.select === "function") {
      try {
        query = query.select([
          "id",
          "unique_id",
          "property_name",
          "address",
          "address_1",
          "address_2",
          "suburb_town",
          "city",
          "state",
          "postal_code",
          "postcode",
          "map_url",
          "owner_name",
          "status",
          "property_status",
        ]);
      } catch (_) {}
    }
    if (typeof query.where === "function") {
      try {
        query = query.where("Individual_Owner", (owner) => {
          if (typeof owner.where === "function") {
            return owner.where("email", ":email");
          }
          return owner;
        });
      } catch (_) {}
    }
    if (typeof query.limit === "function") {
      try {
        query = query.limit(":limit");
      } catch (_) {}
    }
    query.getOrInitQueryCalc?.();

    const payload = await this.#executeCalcQuery(query, {
      email,
      limit: this.maxRecords,
    });

    return this.#mapProperties(this.#extractCalcRecords(payload));
  }

  async #queryJobs(email) {
    const model = await this.#resolveRelatedModel("jobs");
    if (!model) return this.#mockRelated(email).jobs;

    let query = model.query();
    if (typeof query.deSelectAll === "function") {
      query = query.deSelectAll();
    }
    if (typeof query.field === "function") {
      const fields = [
        ["id", "id"],
        ["unique_id", "unique_id"],
        ["status", "status"],
        ["job_status", "job_status"],
        ["created_at", "created_at"],
        ["date_added", "date_added"],
        ["completed_at", "completed_at"],
        ["date_completed", "date_completed"],
        ["provider_name", "provider_name"],
        ["assigned_to", "assigned_to"],
        ["assignee", "assignee"],
        ["property_name", "property_name"],
        ["property", "property"],
        ["address", "address"],
        ["address_1", "address_1"],
        ["suburb_town", "suburb_town"],
        ["state", "state"],
        ["postal_code", "postal_code"],
      ];
      fields.forEach(([name, alias]) => {
        try {
          query = query.field(name, alias);
        } catch (_) {}
      });
    } else if (typeof query.select === "function") {
      try {
        query = query.select([
          "id",
          "unique_id",
          "status",
          "job_status",
          "created_at",
          "date_added",
          "completed_at",
          "date_completed",
          "provider_name",
          "assigned_to",
          "assignee",
          "property_name",
          "property",
          "address",
          "address_1",
          "suburb_town",
          "state",
          "postal_code",
        ]);
      } catch (_) {}
    }
    if (typeof query.where === "function") {
      try {
        query = query.where("Client_Individual", (client) => {
          if (typeof client.where === "function") {
            return client.where("email", ":email");
          }
          return client;
        });
      } catch (_) {}
    }
    if (typeof query.limit === "function") {
      try {
        query = query.limit(":limit");
      } catch (_) {}
    }
    query.getOrInitQueryCalc?.();

    const payload = await this.#executeCalcQuery(query, {
      email,
      limit: this.maxRecords,
    });

    return this.#mapJobs(this.#extractCalcRecords(payload));
  }

  async #queryDeals(email) {
    const model = await this.#resolveRelatedModel("deals");
    if (!model) return this.#mockRelated(email).inquiries;

    let query = model.query();
    if (typeof query.deSelectAll === "function") {
      query = query.deSelectAll();
    }
    if (typeof query.field === "function") {
      const fields = [
        ["id", "id"],
        ["unique_id", "unique_id"],
        ["service_name", "service_name"],
        ["service", "service"],
        ["created_at", "created_at"],
        ["date_created", "date_created"],
        ["previous_job_id", "previous_job_id"],
        ["related_job_id", "related_job_id"],
        ["job_id", "job_id"],
        ["property_name", "property_name"],
        ["property", "property"],
        ["address", "address"],
        ["address_1", "address_1"],
        ["suburb_town", "suburb_town"],
        ["state", "state"],
        ["postal_code", "postal_code"],
      ];
      fields.forEach(([name, alias]) => {
        try {
          query = query.field(name, alias);
        } catch (_) {}
      });
    } else if (typeof query.select === "function") {
      try {
        query = query.select([
          "id",
          "unique_id",
          "service_name",
          "service",
          "created_at",
          "date_created",
          "previous_job_id",
          "related_job_id",
          "job_id",
          "property_name",
          "property",
          "address",
          "address_1",
          "suburb_town",
          "state",
          "postal_code",
        ]);
      } catch (_) {}
    }
    if (typeof query.where === "function") {
      try {
        query = query.where("Primary_Contact", (contact) => {
          if (typeof contact.where === "function") {
            return contact.where("email", ":email");
          }
          return contact;
        });
      } catch (_) {}
    }
    if (typeof query.limit === "function") {
      try {
        query = query.limit(":limit");
      } catch (_) {}
    }
    query.getOrInitQueryCalc?.();

    const payload = await this.#executeCalcQuery(query, {
      email,
      limit: this.maxRecords,
    });

    return this.#mapInquiries(this.#extractCalcRecords(payload));
  }

  async #executeCalcQuery(query, variables) {
    if (!query) return null;
    try {
      let execution = null;
      if (typeof query.fetchDirect === "function") {
        execution = query.fetchDirect({ variables });
      } else if (typeof query.fetch === "function") {
        execution = query.fetch({ variables });
      } else if (typeof query.get === "function") {
        execution = query.get({ variables });
      }
      return await this.#awaitResult(execution);
    } catch (error) {
      console.warn("[NewEnquiry] calc query execution failed", error);
      return null;
    } finally {
      try {
        query.destroy?.();
      } catch (_) {}
    }
  }

  #extractCalcRecords(payload) {
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

  #mapProperties(list = []) {
    return list.map((item, index) => {
      const state = this.#unwrap(item) || {};
      const lookup = this.#buildLookup(state);

      const id = this.#toString(
        this.#getFromLookup(lookup, "id", "property_id", "record_id")
      );
      const unique =
        this.#toString(
          this.#getFromLookup(lookup, "unique_id", "uniqueid", "uid")
        ) || id || `prop-${index}`;
      const propertyName =
        this.#toString(
          this.#getFromLookup(
            lookup,
            "property_name",
            "name",
            "label",
            "property"
          )
        ) || unique;
      const addressLine = this.#composeAddress(lookup);
      const ownerName = this.#toString(
        this.#getFromLookup(
          lookup,
          "owner_name",
          "primary_owner_contact_name",
          "primary_owner_contact_for_property",
          "primary_owner_contact"
        )
      );
      const status = this.#toString(
        this.#getFromLookup(
          lookup,
          "status",
          "property_status",
          "stage",
          "lifecycle_stage"
        )
      );
      const mapUrl = this.#toString(
        this.#getFromLookup(lookup, "map_url", "maplink", "map_link")
      );

      const address1 = this.#toString(
        this.#getFromLookup(lookup, "address_1", "address", "address_line")
      );
      const address2 = this.#toString(
        this.#getFromLookup(
          lookup,
          "address_2",
          "unit_number",
          "suite",
          "building"
        )
      );
      const suburb = this.#toString(
        this.#getFromLookup(lookup, "suburb_town", "suburb", "city", "town")
      );
      const stateValue = this.#toString(
        this.#getFromLookup(lookup, "state", "region", "province")
      );
      const postal = this.#toString(
        this.#getFromLookup(
          lookup,
          "postal_code",
          "postcode",
          "zip_code",
          "zip"
        )
      );

      return {
        id: id || unique,
        unique_id: unique,
        property_name: propertyName,
        address: addressLine,
        address_line: addressLine,
        address_1: address1,
        address_2: address2,
        suburb_town: suburb,
        state: stateValue,
        postal_code: postal,
        owner_name: ownerName,
        status,
        map_url: mapUrl,
      };
    });
  }

  #mapJobs(list = []) {
    return list.map((item, index) => {
      const state = this.#unwrap(item) || {};
      const lookup = this.#buildLookup(state);

      const id = this.#toString(this.#getFromLookup(lookup, "id", "job_id"));
      const unique =
        this.#toString(
          this.#getFromLookup(
            lookup,
            "unique_id",
            "job_number",
            "job_reference",
            "reference"
          )
        ) || id || `job-${index}`;
      const status = this.#toString(
        this.#getFromLookup(lookup, "status", "job_status", "stage")
      );
      const createdAt =
        this.#getFromLookup(
          lookup,
          "created_at",
          "date_created",
          "date_added",
          "job_date"
        ) ?? null;
      const completedAt =
        this.#getFromLookup(
          lookup,
          "completed_at",
          "date_completed",
          "completion_date"
        ) ?? null;
      const provider = this.#toString(
        this.#getFromLookup(
          lookup,
          "provider_name",
          "assigned_to",
          "assignee",
          "technician"
        )
      );
      const propertyName = this.#toString(
        this.#getFromLookup(
          lookup,
          "property_name",
          "property",
          "address",
          "location"
        )
      );
      const address = this.#composeAddress(lookup);

      return {
        id: id || unique,
        unique_id: unique,
        status,
        created_at: createdAt,
        completed_at: completedAt,
        provider_name: provider,
        property_name: propertyName,
        address,
      };
    });
  }

  #mapInquiries(list = []) {
    return list.map((item, index) => {
      const state = this.#unwrap(item) || {};
      const lookup = this.#buildLookup(state);

      const id = this.#toString(this.#getFromLookup(lookup, "id", "deal_id"));
      const unique =
        this.#toString(
          this.#getFromLookup(
            lookup,
            "unique_id",
            "deal_number",
            "reference",
            "inquiry_number"
          )
        ) || id || `inq-${index}`;
      const service = this.#toString(
        this.#getFromLookup(
          lookup,
          "service_name",
          "service",
          "service_type",
          "job_type"
        )
      );
      const previousJob = this.#toString(
        this.#getFromLookup(
          lookup,
          "previous_job_id",
          "related_job_id",
          "job_id"
        )
      );
      const propertyName = this.#toString(
        this.#getFromLookup(
          lookup,
          "property_name",
          "property",
          "address",
          "location"
        )
      );
      const address = this.#composeAddress(lookup);
      const createdAt =
        this.#getFromLookup(
          lookup,
          "created_at",
          "date_created",
          "submitted_at"
        ) ?? null;

      return {
        id: id || unique,
        unique_id: unique,
        service_name: service,
        previous_job_id: previousJob,
        property_name: propertyName,
        address,
        created_at: createdAt,
      };
    });
  }

  #buildLookup(record) {
    const lookup = new Map();
    const add = (source) => {
      if (!source || typeof source !== "object") return;
      Object.entries(source).forEach(([key, value]) => {
        if (value === undefined) return;
        const normalized = String(key).toLowerCase();
        const compact = normalized.replace(/[^a-z0-9]/g, "");
        if (!lookup.has(normalized)) lookup.set(normalized, value);
        if (compact && !lookup.has(compact)) lookup.set(compact, value);
      });
    };
    add(record);
    add(record?.fields);
    return lookup;
  }

  #getFromLookup(lookup, ...keys) {
    for (const key of keys) {
      if (!key) continue;
      const normalized = String(key).toLowerCase();
      if (lookup.has(normalized)) return lookup.get(normalized);
      const compact = normalized.replace(/[^a-z0-9]/g, "");
      if (compact && lookup.has(compact)) return lookup.get(compact);
    }
    return undefined;
  }

  #composeAddress(lookup) {
    const line1 = this.#toString(
      this.#getFromLookup(lookup, "address", "address_1", "address_line")
    );
    const line2 = this.#toString(
      this.#getFromLookup(lookup, "address_2", "unit_number", "suite")
    );
    const suburb = this.#toString(
      this.#getFromLookup(lookup, "suburb_town", "suburb", "city", "town")
    );
    const state = this.#toString(
      this.#getFromLookup(lookup, "state", "region", "province")
    );
    const postal = this.#toString(
      this.#getFromLookup(lookup, "postal_code", "postcode", "zip_code", "zip")
    );

    const parts = [];
    if (line1) parts.push(line1);
    if (line2) parts.push(line2);
    const locality = [suburb, state].filter(Boolean).join(" ").trim();
    if (locality) parts.push(locality);
    if (postal) parts.push(postal);

    return parts.filter(Boolean).join(", ");
  }

  async #resolveRelatedModel(type) {
    if (!this.plugin) return null;

    const stored = this.relatedModelNames?.[type];
    if (stored) {
      try {
        return this.plugin.switchTo(stored);
      } catch (_) {}
    }

    const hintsMap = {
      properties: ["property"],
      jobs: ["job"],
      deals: ["deal"],
    };
    const fallbackMap = {
      properties: ["Property", "Properties"],
      jobs: ["Job", "Jobs"],
      deals: ["Deal", "Deals"],
    };

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

    if (properName) {
      fallbackMap.properties.push(`${properName}Property`, `${properName}Properties`);
      fallbackMap.jobs.push(`${properName}Job`, `${properName}Jobs`);
      fallbackMap.deals.push(`${properName}Deal`, `${properName}Deals`);
    }

    const hints = (hintsMap[type] || []).map((hint) => hint.toLowerCase());
    const state = typeof this.plugin.getState === "function" ? this.plugin.getState() : {};

    for (const [key, model] of Object.entries(state || {})) {
      const schema = model?.schema || {};
      const identifier = [schema.displayLabel, schema.label, schema.name, schema.apiName, key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (hints.some((hint) => identifier.includes(hint))) {
        const name = schema.name || key;
        this.relatedModelNames[type] = name;
        try {
          return this.plugin.switchTo(name);
        } catch (_) {}
      }
    }

    for (const candidate of fallbackMap[type] || []) {
      try {
        const model = this.plugin.switchTo(candidate);
        if (model?.schema) {
          this.relatedModelNames[type] = candidate;
          return model;
        }
      } catch (_) {}
    }

    return null;
  }

  #emptyRelated() {
    return { properties: [], jobs: [], inquiries: [] };
  }

  #cloneRelated(related = this.#emptyRelated()) {
    return {
      properties: related.properties.map((item) => ({ ...item })),
      jobs: related.jobs.map((item) => ({ ...item })),
      inquiries: related.inquiries.map((item) => ({ ...item })),
    };
  }

  #mockRelated(email) {
    const clean = email.replace(/[^a-z0-9]/gi, "").toUpperCase();
    const seed = clean.slice(0, 4) || "MOCK";
    const now = new Date();
    const ago = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7);
    const isoNow = now.toISOString();
    const isoAgo = ago.toISOString();
    const baseAddress = `${seed} Mock Street, Exampleville`;
    return {
      properties: [
        {
          id: `prop-${seed}-1`,
          unique_id: `PROP-${seed}-1`,
          property_name: `Property ${seed}`,
          address: baseAddress,
          address_line: baseAddress,
          status: "Active",
          owner_name: `Owner ${seed}`,
          map_url: `https://maps.google.com/?q=${encodeURIComponent(baseAddress)}`,
        },
      ],
      jobs: [
        {
          id: `job-${seed}-1`,
          unique_id: `JOB-${seed}-1`,
          status: "Scheduled",
          created_at: isoAgo,
          completed_at: null,
          provider_name: `Crew ${seed}`,
          property_name: `Property ${seed}`,
          address: baseAddress,
        },
      ],
      inquiries: [
        {
          id: `inq-${seed}-1`,
          unique_id: `INQ-${seed}-1`,
          service_name: "Mock Service",
          previous_job_id: `JOB-${seed}-0`,
          property_name: `Property ${seed}`,
          address: baseAddress,
          created_at: isoNow,
        },
      ],
    };
  }
}
