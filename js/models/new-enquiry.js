export class NewInquiryModel {
  constructor(plugin, { maxRecords = 200 } = {}) {
    window.plugin = plugin;
    this.affiliationModel = plugin.switchTo("PeterpmAffiliation");
    this.propertyModel = plugin.switchTo("PeterpmProperty");
    this.dealModel = plugin.switchTo("PeterpmDeal");
    this.companyModel = plugin.switchTo("PeterpmCompany");
    this.jobModel = plugin.switchTo("PeterpmJob");
    this.plugin = plugin;
    this.maxRecords = maxRecords;
    this.contactModel = null;
    this.contactModelName = null;
    // Start with no default contacts; will be populated from SDK or user input
    this.contacts = [];
    this.relatedCache = new Map();
    this.relatedModelNames = {
      properties: null,
      jobs: null,
      deals: null,
    };
    this.relatedData = null;
    this.affiliationQuery = null;
    this.contactModel = plugin.switchTo("PeterpmContact");
    this.affiliationCallback = null;
    this.googlePlacesSessionToken = null;
    this.googlePlacesKey = null;
    this.googlePlacesEndpoint =
      "https://maps.googleapis.com/maps/api/place/autocomplete/json";
    this.googlePlaceDetailsEndpoint =
      "https://maps.googleapis.com/maps/api/place/details/json";
    this.autocompleteService = null;
    this.placesDetailsService = null;
  }

  async loadContacts() {
    if (!this.plugin) return this.getContacts();

    const model = await this.#resolveContactModel();
    if (!model) return this.getContacts();

    try {
      await this.#primeContacts(model);
    } catch (error) {
      console.warn("[NewInquiry] Failed to prime contacts", error);
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
        typeof this.plugin.mutation === "function"
          ? this.plugin.mutation()
          : null;
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

      const state =
        typeof record?.getState === "function" ? record.getState() : record;
      const contact =
        this.#normaliseRecord(state, 0) || this.#createLocalContact(payload);
      if (contact?.fields?.email) {
        this.relatedCache.delete(contact.fields.email.trim().toLowerCase());
      }
      return contact;
    } catch (error) {
      console.warn(
        "[NewInquiry] Falling back to local contact creation",
        error
      );
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

    const state =
      typeof this.plugin.getState === "function" ? this.plugin.getState() : {};
    for (const [key, model] of Object.entries(state || {})) {
      const schema = model?.schema || {};
      const names = [schema.displayLabel, schema.label, schema.name, key]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const fields = this.#collectFieldNames(schema);
      const looksLikeContact =
        names.includes("contact") &&
        fields.includes("email") &&
        fields.includes("first_name");
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
    const allowed = [
      "first_name",
      "last_name",
      "email",
      "sms_number",
      "office_phone",
    ];
    const payload = {};
    allowed.forEach((key) => {
      const value = fields[key];
      if (
        value !== undefined &&
        value !== null &&
        String(value).trim() !== ""
      ) {
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
        console.warn(
          "[NewInquiry] Related fetch failed, using mock data",
          error
        );
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

    this.relatedData = {
      properties,
      jobs,
      inquiries,
    };

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
        [
          "primary_owner_contact_for_property",
          "primary_owner_contact_for_property",
        ],
        ["status", "status"],
        ["property_status", "property_status"],
        ["building_age", "building_age"][("bedrooms", "bedrooms")],
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
          "lot_number",
          "unit_number",
          "property_type",
          "building_type",
          "foundation_type",
          "stories",
          "bedrooms",
          "building_age",
          "manhole",
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

    return this.mapProperties(this.#extractCalcRecords(payload));
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
      console.warn("[NewInquiry] calc query execution failed", error);
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

  mapProperties(list = []) {
    return list.map((item, index) => {
      const state = this.#unwrap(item) || {};
      const lookup = this.#buildLookup(state);

      const id = this.#toString(
        this.#getFromLookup(lookup, "id", "property_id", "record_id")
      );
      const unique =
        this.#toString(
          this.#getFromLookup(lookup, "unique_id", "uniqueid", "uid")
        ) ||
        id ||
        `prop-${index}`;
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

      const property_statusValue = this.#toString(
        this.#getFromLookup(lookup, "property_status")
      );

      const lot_numberValue = this.#toString(
        this.#getFromLookup(lookup, "lot_number")
      );

      const unit_numberValue = this.#toString(
        this.#getFromLookup(lookup, "unit_number")
      );

      const property_typeValue = this.#toString(
        this.#getFromLookup(lookup, "property_type")
      );

      const building_typeValue = this.#toString(
        this.#getFromLookup(lookup, "building_type")
      );

      const foundation_typeValue = this.#toString(
        this.#getFromLookup(lookup, "foundation_type")
      );

      const storiesValue = this.#toString(
        this.#getFromLookup(lookup, "stories")
      );

      const bedroomsValue = this.#toString(
        this.#getFromLookup(lookup, "bedrooms")
      );

      const manholeValue = this.#toString(
        this.#getFromLookup(lookup, "manhole")
      );

      const building_ageValue = this.#toString(
        this.#getFromLookup(lookup, "building_age")
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
        propertyStatus: property_statusValue,
        lotNumber: lot_numberValue,
        unitNumber: unit_numberValue,
        propertyType: property_typeValue,
        buildingType: building_typeValue,
        foundationType: foundation_typeValue,
        stories: storiesValue,
        bedrooms: bedroomsValue,
        manhole: manholeValue,
        buildingAge: building_ageValue,
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
        ) ||
        id ||
        `job-${index}`;
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
        ) ||
        id ||
        `inq-${index}`;
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
      fallbackMap.properties.push(
        `${properName}Property`,
        `${properName}Properties`
      );
      fallbackMap.jobs.push(`${properName}Job`, `${properName}Jobs`);
      fallbackMap.deals.push(`${properName}Deal`, `${properName}Deals`);
    }

    const hints = (hintsMap[type] || []).map((hint) => hint.toLowerCase());
    const state =
      typeof this.plugin.getState === "function" ? this.plugin.getState() : {};

    for (const [key, model] of Object.entries(state || {})) {
      const schema = model?.schema || {};
      const identifier = [
        schema.displayLabel,
        schema.label,
        schema.name,
        schema.apiName,
        key,
      ]
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
          map_url: `https://maps.google.com/?q=${encodeURIComponent(
            baseAddress
          )}`,
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

  async fetchAffiliationByPropertyId(id, callback) {
    try {
      this.affiliationQuery = this.affiliationModel.query();
      if (id) {
        this.affiliationQuery = this.affiliationQuery.where("property_id", id);
      }

      this.affiliationQuery = await this.affiliationQuery
        .deSelectAll()
        .select([
          "id",
          "role",
          "primary_owner_contact",
          "contact_id",
          "property_id",
        ])
        .include("Contact", (q) =>
          q
            .deSelectAll()
            .select(["first_name", "last_name", "sms_number", "email"])
        )
        .include("Company", (q) => q.deSelectAll().select(["name"]))
        .noDestroy();

      this.affiliationQuery.getOrInitQueryCalc?.();

      const payload = await this.affiliationQuery.fetchDirect().toPromise();
      this.affiliationCallback = callback;
      this.subscribeToAffiliationChanges();
      if (this.affiliationCallback) {
        this.affiliationCallback(payload.resp);
      }
    } catch (error) {
      console.warn("[NewInquiry] fetchAffiliationByPropertyId failed", error);
      return [];
    }
  }

  subscribeToAffiliationChanges() {
    let liveObs = null;
    try {
      if (typeof this.affiliationQuery.subscribe === "function")
        liveObs = this.affiliationQuery.subscribe();
    } catch (_) {}
    if (
      !liveObs &&
      typeof this.affiliationQuery.localSubscribe === "function"
    ) {
      try {
        liveObs = this.affiliationQuery.localSubscribe();
      } catch (_) {}
    }

    if (liveObs) {
      this.sub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : [];
            if (this.affiliationCallback) {
              this.affiliationCallback(data);
            }
          },
          error: () => {},
        });
    }
  }

  async createNewContact(contactObj) {
    let query = await this.contactModel.mutation();
    query.createOne(contactObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async createNewAffiliation(affiliationObj) {
    let query = await this.affiliationModel.mutation();
    query.createOne(affiliationObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateExistingAffiliation(affiliationObj, affiliationId) {
    let query = await this.affiliationModel.mutation();
    query.update((q) => q.where("id", affiliationId).set(affiliationObj));
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateContact(contactId, contactObj) {
    let query = await this.contactModel.mutation();
    query.update((q) => q.where("id", contactId).set(contactObj));
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchAffiliationByContactId(contactId, propertyId) {
    try {
      this.affiliationQuery = await this.affiliationModel.query();

      let query = await this.affiliationQuery
        .where("contact_id", contactId)
        .andWhere("property_id", propertyId)
        .deSelectAll()
        .select(["id"])
        .noDestroy();

      query.getOrInitQueryCalc?.();

      const payload = await query.fetchDirect().toPromise();
      return payload.resp;
    } catch (error) {
      console.warn("[NewInquiry] fetchAffiliationByPropertyId failed", error);
      return [];
    }
  }

  async createNewProperties(propertyDetails, contactId, propertyId = "") {
    let query = await this.propertyModel.mutation();
    if (contactId) {
      propertyDetails["individual_owner_id"] = contactId;
    } else if (propertyId) {
      propertyDetails["owner_company_id"] = propertyId;
    }

    if (propertyDetails.manhole.length == 0) {
      propertyDetails.manhole = false;
    }
    query.createOne(propertyDetails);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async createNewInquiry(inquiryObj) {
    let query = await this.dealModel.mutation();
    inquiryObj["Service_Inquiry"] = {
      service_name: inquiryObj["service_name"],
    };
    query.createOne(inquiryObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchcontactDetailsById(id) {
    let query = this.contactModel.query();
    query = query
      .where("id", id)
      .deSelectAll()
      .select([
        "first_name",
        "last_name",
        "email",
        "sms_number",
        "office_phone",
        "address",
        "address_2",
        "city",
        "state",
        "zip_code",
        "country",
        "postal_address",
        "postal_address_2",
        "postal_city",
        "postal_code",
        "postal_country",
        "postal_state",
      ])
      .include("Affiliations", (q) => q.deSelectAll().select(["role"]))
      .noDestroy();
    query.getOrInitQueryCalc();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async deleteAffiliationById(affiliationId) {
    let query = await this.affiliationModel.mutation();
    query.delete((q) => q.where("id", affiliationId));
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchPropertiesById(propertyId) {
    let query = this.propertyModel.query();
    query = await query
      .where("id", propertyId)
      .deSelectAll()
      .select([
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
        "lot_number",
        "unit_number",
        "property_type",
        "building_type",
        "foundation_type",
        "stories",
        "bedrooms",
        "manhole",
        "building_age",
        "individual_owner_id",
      ])
      .noDestroy();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async fetchCompanyById(id) {
    let query = this.companyModel.query();
    if (id) {
      query = query.where("id", id);
    }

    query = await query
      .deSelectAll()
      .select(["id", "account_type", "name"])
      .include("Primary_Person", (q) =>
        q
          .deSelectAll()
          .select([
            "id",
            "first_name",
            "last_name",
            "email",
            "sms_number",
            "office_phone",
            "address",
            "address_2",
            "city",
            "state",
            "country",
            "zip_code",
            "postal_address",
            "postal_address_2",
            "postal_code",
            "postal_city",
            "postal_country",
          ])
      )
      .noDestroy();
    query.getOrInitQueryCalc?.();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async fetchRelatedProperties(entityId) {
    let query = this.propertyModel.query();
    if (entityId) {
      query = query.where("Owner_Company", (q) => {
        if (typeof q?.where === "function") {
          return q.where("id", entityId);
        }
        return q;
      });
    }

    query
      .deSelectAll()
      .select([
        "id",
        "address_1",
        "address_2",
        "lot_number",
        "unit_number",
        "suburb_town",
        "postal_code",
        "state",
        "foundation_type",
        "building_type",
        "manhole",
        "property_type",
        "stories",
        "bedrooms",
        "building_age",
        "property_name",
      ])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    return query.fetchDirect().toPromise();
  }

  async fetchRelatedJobs(entityId) {
    let query = this.jobModel.query();
    if (entityId) {
      query = query.where("Client_Entity", (q) => {
        if (typeof q?.where === "function") {
          return q.where("id", entityId);
        }
        return q;
      });
    }

    query
      .deSelectAll()
      .select(["id", "unique_id", "job_status", "created_at", "date_completed"])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    return query.fetchDirect().toPromise();
  }

  async fetchRelatedInquiries(entityId, inquiryId) {
    let query = this.dealModel.query();
    if (entityId) {
      query = query.where("company_id", entityId);
    }

    if (inquiryId) {
      query = query.where("id", inquiryId);
    }

    query
      .deSelectAll()
      .select([
        "created_at",
        "inquiry_source",
        "type",
        "inquiry_status",
        "how_did_you_hear",
        "how_can_we_help",
        "admin_notes",
        "company_id",
        "noise_signs_options_as_text",
        "pest_active_times_options_as_text",
        "pest_location_options_as_text",
        "date_job_required_by",
        "renovations",
        "service_name",
        "company_id",
        "property_id",
        "primary_contact_id",
      ])
      .include("Service_Inquiry", (q) => {
        q.deSelectAll().select(["service_name"]);
      })
      .noDestroy();
    query.getOrInitQueryCalc?.();
    return query.fetchDirect().toPromise();
  }

  async fetchRelatedForEntity(entityId) {
    const [propertiesResp, jobsResp, inquiriesResp] = await Promise.all([
      this.fetchRelatedProperties(entityId),
      this.fetchRelatedJobs(entityId),
      this.fetchRelatedInquiries(entityId),
    ]);

    const properties = this.mapProperties(
      this.#extractCalcRecords(propertiesResp)
    );
    const jobs = this.#mapJobs(this.#extractCalcRecords(jobsResp));
    const inquiries = this.#mapInquiries(
      this.#extractCalcRecords(inquiriesResp)
    );

    const related = { properties, jobs, inquiries };
    this.relatedData = related;
    return this.#cloneRelated(related);
  }

  async createNewCompany(companyObj) {
    let query = await this.companyModel.mutation();
    query.createOne(companyObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateExistingCompany(companyId, companyObj) {
    let query = await this.companyModel.mutation();
    query.update((q) => q.where("id", companyId).set(companyObj));
    let result = await query.execute(true).toPromise();
    return result;
  }

  resetGooglePlacesSession() {
    this.googlePlacesSessionToken = null;
  }

  #ensureGooglePlacesSessionToken(forceNew = false) {
    const TokenCtor =
      window?.google?.maps?.places?.AutocompleteSessionToken || null;
    const hasTokenCtor = typeof TokenCtor === "function";
    const isCurrentTokenValid = hasTokenCtor
      ? this.googlePlacesSessionToken instanceof TokenCtor
      : typeof this.googlePlacesSessionToken === "string";

    if (forceNew || !this.googlePlacesSessionToken || !isCurrentTokenValid) {
      if (hasTokenCtor) {
        this.googlePlacesSessionToken = new TokenCtor();
      } else if (typeof crypto?.randomUUID === "function") {
        this.googlePlacesSessionToken = crypto.randomUUID();
      } else {
        this.googlePlacesSessionToken = `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 10)}`;
      }
    }
    return this.googlePlacesSessionToken;
  }

  #getPlacesLibrary() {
    return window?.google?.maps?.places || null;
  }

  #getAutocompleteService() {
    if (this.autocompleteService) return this.autocompleteService;
    const places = this.#getPlacesLibrary();
    if (!places?.AutocompleteService) return null;
    this.autocompleteService = new places.AutocompleteService();
    return this.autocompleteService;
  }

  #getPlacesDetailsService() {
    if (this.placesDetailsService) return this.placesDetailsService;
    const places = this.#getPlacesLibrary();
    if (!places?.PlacesService) return null;
    const anchor = document.createElement("div");
    this.placesDetailsService = new places.PlacesService(anchor);
    return this.placesDetailsService;
  }

  #getPlacesStatusConstants() {
    const defaultStatus = {
      OK: "OK",
      ZERO_RESULTS: "ZERO_RESULTS",
    };
    const places = this.#getPlacesLibrary();
    return places?.PlacesServiceStatus || defaultStatus;
  }

  #isPlacesStatusOk(status) {
    const statuses = this.#getPlacesStatusConstants();
    return status === statuses.OK || status === statuses.ZERO_RESULTS;
  }

  #formatPrediction(entry = {}) {
    const structured = entry.structured_formatting || {};
    const remainder = Array.isArray(entry.terms)
      ? entry.terms
          .slice(1)
          .map((term) => term.value)
          .join(", ")
      : "";
    return {
      id: entry.place_id,
      description: entry.description || "",
      mainText:
        structured.main_text ||
        entry.terms?.[0]?.value ||
        entry.description ||
        "",
      secondaryText: structured.secondary_text || remainder || "",
    };
  }

  async fetchProperties(propertyName) {
    const query = propertyName?.trim();
    if (!query) return [];
    const service = this.#getAutocompleteService();
    if (!service) {
      console.warn("[NewInquiry] Google Places library not ready");
      return [];
    }

    const request = {
      input: query,
      types: ["address"],
      componentRestrictions: { country: "au" },
    };
    const token = this.#ensureGooglePlacesSessionToken();
    if (token && typeof token === "object") {
      request.sessionToken = token;
    }

    return new Promise((resolve) => {
      service.getPlacePredictions(request, (predictions = [], status) => {
        if (!this.#isPlacesStatusOk(status)) {
          console.warn("[NewInquiry] fetchProperties returned", status);
          if (status === this.#getPlacesStatusConstants().INVALID_REQUEST) {
            this.#ensureGooglePlacesSessionToken(true);
          }
          resolve([]);
          return;
        }
        resolve(predictions.map((entry) => this.#formatPrediction(entry)));
      });
    });
  }

  async fetchPropertyDetails(placeId) {
    const id = placeId?.trim();
    if (!id) return null;
    const service = this.#getPlacesDetailsService();
    if (!service) {
      console.warn("[NewInquiry] Google Places library not ready");
      return null;
    }

    const request = {
      placeId: id,
      fields: ["address_components", "formatted_address"],
    };
    const token = this.#ensureGooglePlacesSessionToken();
    if (token && typeof token === "object") {
      request.sessionToken = token;
    }

    const statuses = this.#getPlacesStatusConstants();

    return new Promise((resolve) => {
      service.getDetails(request, (result, status) => {
        if (status !== statuses.OK) {
          console.warn("[NewInquiry] fetchPropertyDetails returned", status);
          resolve(null);
          return;
        }
        resolve(result || null);
      });
    });
  }
}
