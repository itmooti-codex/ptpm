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
}
