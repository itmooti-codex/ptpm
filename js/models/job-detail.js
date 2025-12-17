export class JobDetailModal {
  constructor(plugin) {
    window.plugin = plugin;
    this.contactModel = plugin.switchTo("PeterpmContact");
    this.companyModel = plugin.switchTo("PeterpmCompany");
    this.serviceProviderModel = plugin.switchTo("PeterpmServiceProvider");
    this.propertyModel = plugin.switchTo("PeterpmProperty");
    this.inquiryModel = plugin.switchTo("PeterpmDeal");
    this.jobModel = plugin.switchTo("PeterpmJob");
    this.appointmentModel = plugin.switchTo("PeterpmAppointment");
    this.acitivityModel = plugin.switchTo("PeterpmActivity");
    this.materialModel = plugin.switchTo("PeterpmMaterial");
    this.uploadModel = plugin.switchTo("PeterpmUpload");
    this.serviceModel = plugin.switchTo("PeterpmService");

    this.activityQuery = null;
    this.activityCallback = null;

    this.contactQuery = null;
    this.contactCallback = null;

    this.propertyQuery = null;
    this.propertyCallback = null;

    this.materialQuery = null;
    this.materialCallback = null;

    this.serviceProviderQuery = null;
    this.serviceProviderCallback = null;

    this.inquiryQuery = null;
    this.inquiryCallback = null;

    this.jobQuery = null;
    this.jobCallback = null;

    this.contacts = [];
    this.properties = [];
    this.activities = [];
    this.materials = [];
    this.materialRecordsById = new Map();
    this.contactSub = null;
    this.propertySub = null;
    this.activitySub = null;
    this.materialSub = null;
    this.serviceProviderSub = null;
    this.inquirySub = null;
    this.jobSub = null;
    this.uploadSub = null;
    this.jobDetailSub = null;
    window.jobModel = this.jobModel;
  }

  async fetchContacts(callback) {
    this.contactQuery = this.contactModel
      .query()
      .deSelectAll()
      .select([
        "first_name",
        "last_name",
        "email",
        "id",
        "profile_image",
        "sms_number",
      ])
      .noDestroy();
    this.contactQuery.getOrInitQueryCalc?.();

    let contact = await this.contactQuery.fetchDirect().toPromise();
    this.contactCallback = callback;
    this.subscribeToContactChanges();
    const contactData = Array.isArray(contact?.resp)
      ? contact.resp
      : contact?.resp || [];
    if (this.contactCallback) {
      this.contactCallback(contactData);
    }
    return contactData;
  }

  subscribeToContactChanges() {
    this.contactSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.contactQuery.subscribe === "function")
        liveObs = this.contactQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.contactQuery.localSubscribe === "function") {
      try {
        liveObs = this.contactQuery.localSubscribe();
      } catch (_) {}

      if (liveObs) {
        this.contactSub = liveObs
          .pipe(window.toMainInstance?.(true) ?? ((x) => x))
          .subscribe({
            next: (payload) => {
              const data = Array.isArray(payload?.records)
                ? payload.records
                : Array.isArray(payload)
                ? payload
                : [];
              if (this.contactCallback) {
                this.contactCallback(data);
              }
            },
            error: () => {},
          });
      }
    }
  }

  async fetchServiceProviders(callback) {
    this.serviceProviderQuery = this.serviceProviderModel.query();
    this.serviceProviderQuery = this.serviceProviderQuery
      .deSelectAll()
      .select(["status", "id"])
      .include("Contact_Information", (q) =>
        q
          .deSelectAll()
          .select([
            "first_name",
            "last_name",
            "sms_number",
            "profile_image",
            "id",
          ])
      )
      .noDestroy();
    this.serviceProviderQuery.getOrInitQueryCalc();
    let serviceman = await this.serviceProviderQuery.fetchDirect().toPromise();
    this.serviceProviderCallback = callback;
    this.subscribeToServiceProviderChanges();
    const serviceProviders = Array.isArray(serviceman?.resp)
      ? serviceman.resp
      : serviceman?.resp || [];
    if (callback) {
      this.serviceProviderCallback(serviceProviders);
    }
    return serviceProviders;
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

  resetGooglePlacesSession() {
    this.googlePlacesSessionToken = null;
  }

  subscribeToServiceProviderChanges() {
    this.serviceProviderSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.serviceProviderQuery.subscribe === "function")
        liveObs = this.serviceProviderQuery.subscribe();
    } catch (_) {}

    if (
      !liveObs &&
      typeof this.serviceProviderQuery.localSubscribe === "function"
    ) {
      try {
        liveObs = this.serviceProviderQuery.localSubscribe();
      } catch (_) {}

      if (liveObs) {
        this.serviceProviderSub = liveObs
          .pipe(window.toMainInstance?.(true) ?? ((x) => x))
          .subscribe({
            next: (payload) => {
              const data = Array.isArray(payload?.records)
                ? payload.records
                : Array.isArray(payload)
                ? payload
                : [];
              if (this.serviceProviderCallback) {
                this.serviceProviderCallback(data);
              }
            },
            error: () => {},
          });
      }
    }
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

  async createNewJob(jobDeails) {
    let query = jobModel.mutation();
    query.createOne(jobDeails);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateJob(jobId, payload = {}) {
    if (!jobId) throw new Error("Job id is required");
    const query = this.jobModel.mutation();
    query.update((q) => q.where("id", jobId).set(payload));
    return await query.execute(true).toPromise();
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

  async createNewProperty(propertyObj) {
    let query = this.propertyModel.mutation();
    query.createOne(propertyObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchProperty(callback) {
    this.propertyQuery = this.propertyModel
      .query()
      .deSelectAll()
      .select(["id", "property_name"])
      .noDestroy();
    this.propertyQuery.getOrInitQueryCalc();
    let result = await this.propertyQuery.fetchDirect().toPromise();
    this.propertyCallback = callback;
    this.subscribeToPropertyChanges();
    const resp = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
    if (this.propertyCallback) {
      this.propertyCallback(resp);
    }
    return resp;
  }

  async fetchMaterials(jobId, callback) {
    if (!jobId) return [];
    this.materialQuery = this.materialModel.query().where("job_id", jobId);
    this.materialQuery
      .deSelectAll()
      .select([
        "id",
        "material_name",
        "status",
        "total",
        "tax",
        "description",
        "created_at",
        "transaction_type",
        "service_provider_id",
      ])
      .include("Service_Provider", (q) =>
        q
          .deSelectAll()
          .select(["id"])
          .include("Contact_Information", (cq) =>
            cq.deSelectAll().select(["first_name", "last_name"])
          )
      )
      .noDestroy();
    this.materialQuery.getOrInitQueryCalc?.();
    const result = await this.materialQuery.fetchDirect().toPromise();
    this.materialCallback = callback;
    const resp = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
    this.materials = resp;
    this.subscribeToMaterialChanges();
    if (this.materialCallback) this.materialCallback(resp);
    return resp;
  }

  async fetchUploads(jobId, callback) {
    if (!jobId) return [];
    this.uploadQuery = this.uploadModel
      .query()
      .where("job_id", jobId)
      .deSelectAll()
      .select(["id", "photo_upload", "type", "created_at"])
      .noDestroy();
    this.uploadQuery.getOrInitQueryCalc?.();
    const result = await this.uploadQuery.fetchDirect().toPromise();
    this.uploadCallback = callback;
    this.subscribeToUploadChanges();
    if (this.uploadCallback) this.uploadCallback(result?.resp ?? []);
    return result?.resp ?? [];
  }

  subscribeToUploadChanges() {
    this.uploadSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.uploadQuery?.subscribe === "function") {
        liveObs = this.uploadQuery.subscribe();
      }
    } catch (_) {}

    if (!liveObs && typeof this.uploadQuery?.localSubscribe === "function") {
      try {
        liveObs = this.uploadQuery.localSubscribe();
      } catch (_) {}
    }

    if (!liveObs) return;

    this.uploadSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          const data = Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload)
            ? payload
            : [];
          if (this.uploadCallback) this.uploadCallback(data);
        },
        error: () => {},
      });
  }

  async fetchInquiries(callback) {
    this.inquiryQuery = this.inquiryModel
      .query()
      .deSelectAll()
      .select(["id", "deal_name"])
      .noDestroy();
    this.inquiryQuery.getOrInitQueryCalc?.();
    const result = await this.inquiryQuery.fetchDirect().toPromise();
    this.inquiryCallback = callback;
    this.subscribeToInquiryChanges();
    const resp = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
    if (this.inquiryCallback) {
      this.inquiryCallback(resp);
    }
    return resp;
  }

  async fetchJobs(callback) {
    this.jobQuery = this.jobModel
      .query()
      .deSelectAll()
      .select(["id", "unique_id"])
      .include("Property", (q) => q.deSelectAll().select(["property_name"]))
      .noDestroy();
    this.jobQuery.getOrInitQueryCalc?.();
    const result = await this.jobQuery.fetchDirect().toPromise();
    this.jobCallback = callback;
    this.subscribeToJobChanges();
    const resp = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
    if (this.jobCallback) {
      this.jobCallback(resp);
    }
    return resp;
  }

  async fetchJobDetail(jobId, callback) {
    if (!jobId) return null;
    this.jobDetailQuery = this.jobModel
      .query()
      .where("id", jobId)
      .deSelectAll()
      .select([
        "id",
        "unique_id",
        "job_status",
        "date_started",
        "date_booked",
        "date_job_required_by",
        "payment_status",
        "job_total",
      ])
      .include("Property", (q) =>
        q.deSelectAll().select(["id", "property_name", "address_1"])
      )
      .include("Client_Individual", (q) =>
        q.deSelectAll().select(["id", "first_name", "last_name", "email"])
      )
      .include("Primary_Service_Provider", (q) =>
        q
          .deSelectAll()
          .select(["id"])
          .include("Contact_Information", (cq) =>
            cq.deSelectAll().select(["first_name", "last_name", "sms_number"])
          )
      )
      .noDestroy();
    this.jobDetailQuery.getOrInitQueryCalc?.();
    const result = await this.jobDetailQuery.fetchDirect().toPromise();
    this.jobDetailCallback = callback;
    this.subscribeToJobDetailChanges();
    if (this.jobDetailCallback) {
      this.jobDetailCallback(result?.resp?.[0] ?? null);
    }
    return result?.resp?.[0] ?? null;
  }

  subscribeToJobDetailChanges() {
    this.jobDetailSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.jobDetailQuery?.subscribe === "function") {
        liveObs = this.jobDetailQuery.subscribe();
      }
    } catch (_) {}

    if (!liveObs && typeof this.jobDetailQuery?.localSubscribe === "function") {
      try {
        liveObs = this.jobDetailQuery.localSubscribe();
      } catch (_) {}
    }

    if (!liveObs) return;

    this.jobDetailSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          const record = Array.isArray(payload?.records)
            ? payload.records[0]
            : Array.isArray(payload)
            ? payload[0]
            : payload ?? null;
          if (this.jobDetailCallback) this.jobDetailCallback(record ?? null);
        },
        error: () => {},
      });
  }

  subscribeToPropertyChanges() {
    this.propertySub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.propertyQuery.subscribe === "function")
        liveObs = this.propertyQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.propertyQuery.localSubscribe === "function") {
      try {
        liveObs = this.propertyQuery.localSubscribe();
      } catch (_) {}

      if (liveObs) {
        this.propertySub = liveObs
          .pipe(window.toMainInstance?.(true) ?? ((x) => x))
          .subscribe({
            next: (payload) => {
              const data = Array.isArray(payload?.records)
                ? payload.records
                : Array.isArray(payload)
                ? payload
                : [];
              if (this.propertyCallback) {
                this.propertyCallback(data);
              }
            },
            error: () => {},
          });
      }
    }
  }

  subscribeToInquiryChanges() {
    this.inquirySub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.inquiryQuery.subscribe === "function")
        liveObs = this.inquiryQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.inquiryQuery.localSubscribe === "function") {
      try {
        liveObs = this.inquiryQuery.localSubscribe();
      } catch (_) {}

      if (liveObs) {
        this.inquirySub = liveObs
          .pipe(window.toMainInstance?.(true) ?? ((x) => x))
          .subscribe({
            next: (payload) => {
              const data = Array.isArray(payload?.records)
                ? payload.records
                : Array.isArray(payload)
                ? payload
                : [];
              if (this.inquiryCallback) {
                this.inquiryCallback(data);
              }
            },
            error: () => {},
          });
      }
    }
  }

  subscribeToJobChanges() {
    this.jobSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.jobQuery.subscribe === "function")
        liveObs = this.jobQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.jobQuery.localSubscribe === "function") {
      try {
        liveObs = this.jobQuery.localSubscribe();
      } catch (_) {}

      if (liveObs) {
        this.jobSub = liveObs
          .pipe(window.toMainInstance?.(true) ?? ((x) => x))
          .subscribe({
            next: (payload) => {
              const data = Array.isArray(payload?.records)
                ? payload.records
                : Array.isArray(payload)
                ? payload
                : [];
              if (this.jobCallback) {
                this.jobCallback(data);
              }
            },
            error: () => {},
          });
      }
    }
  }

  async createAppointment(appointmentObj) {
    let query = this.appointmentModel.mutation();
    query.createOne(appointmentObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async createContact(contactObj) {
    let query = this.contactModel.mutation();
    query.createOne(contactObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateContact(contactId, contactObj) {
    let query = await this.contactModel.mutation();
    query.update((q) => q.where("id", contactId).set(contactObj));
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchActivities(jobId, callback) {
    if (!jobId) return [];
    this.activityQuery = this.acitivityModel.query().where("job_id", jobId);
    this.activityQuery
      .deSelectAll()
      .select([
        "id",
        "service_id",
        "task",
        "option",
        "quantity",
        "activity_price",
        "activity_text",
        "activity_status",
        "date_required",
        "quoted_price",
        "quoted_text",
        "note",
        "include_in_quote_subtotal",
        "include_in_quote",
        "invoice_to_client",
      ])
      .include("Service", (q) => {
        q.deSelectAll().select(["id", "service_name"]);
      })
      .noDestroy();
    this.activityQuery.getOrInitQueryCalc?.();
    let result = await this.activityQuery.fetchDirect().toPromise();
    this.activityCallback = callback;
    const resp = Array.isArray(result?.resp) ? result.resp : result?.resp || [];
    this.activities = resp;
    this.subscribeToActivityChanges();
    if (this.activityCallback) {
      this.activityCallback(resp);
    }
    return resp;
  }

  subscribeToActivityChanges() {
    this.activitySub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.activityQuery.subscribe === "function")
        liveObs = this.activityQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.activityQuery.localSubscribe === "function") {
      try {
        liveObs = this.activityQuery.localSubscribe();
      } catch (_) {}
    }

    if (liveObs) {
      this.activitySub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : [];
            this.activities = data;
            if (this.activityCallback) this.activityCallback(data);
          },
          error: () => {},
        });
    }
  }

  subscribeToMaterialChanges() {
    this.materialSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.materialQuery.subscribe === "function")
        liveObs = this.materialQuery.subscribe();
    } catch (_) {}

    if (!liveObs && typeof this.materialQuery.localSubscribe === "function") {
      try {
        liveObs = this.materialQuery.localSubscribe();
      } catch (_) {}
    }

    if (liveObs) {
      this.materialSub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = Array.isArray(payload?.records)
              ? payload.records
              : Array.isArray(payload)
              ? payload
              : [];
            this.materials = data;
            if (this.materialCallback) this.materialCallback(data);
          },
          error: () => {},
        });
    }
  }

  async addNewActivity(acitivityObj) {
    if (acitivityObj.service_id) {
      acitivityObj["Service"] = { id: acitivityObj["service_id"] };
      delete acitivityObj["service_id"];
    } else {
      acitivityObj["Service"] = {
        service_name: acitivityObj["service_name"],
      };
      delete acitivityObj["service_name"];
    }
    let query = this.acitivityModel.mutation();
    query.createOne(acitivityObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateActivity(activityId, activityObj = {}) {
    if (!activityId) throw new Error("Activity id is required");
    const payload = { ...activityObj };
    const query = this.acitivityModel.mutation();
    query.update((q) => q.where("id", activityId).set(payload));
    return await query.execute(true).toPromise();
  }

  async deleteActivity(activityId) {
    if (!activityId) throw new Error("Activity id is required");
    const query = this.acitivityModel.mutation();
    query.delete((q) => q.where("id", activityId));
    return await query.execute(true).toPromise();
  }

  async addNewMaterial(materialObj) {
    let query = this.materialModel.mutation();
    query.createOne(materialObj);
    const result = await query.execute(true).toPromise();
    return result;
  }

  async updateMaterial(materialId, materialObj = {}) {
    if (!materialId) throw new Error("Material id is required");
    const query = this.materialModel.mutation();
    query.update((q) => q.where("id", materialId).set(materialObj));
    const result = await query.execute(true).toPromise();
    return result;
  }

  async deleteMaterial(materialId) {
    if (!materialId) throw new Error("Material id is required");
    const query = this.materialModel.mutation();
    query.delete((q) => q.where("id", materialId));
    const result = await query.execute(true).toPromise();
    return result;
  }

  async createNewJob(jobDeails) {
    let query = this.jobModel.mutation();
    query.createOne(jobDeails);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async createNewUpload(uploadObj) {
    let query = this.uploadModel.mutation();
    query.createOne(uploadObj);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async getInvoiceByJobId(jobID) {
    let query = this.jobModel.query();
    query = query
      .where("id", jobID)
      .deSelectAll()
      .select([
        "id",
        "account_type",
        "invoice_date",
        "due_date",
        "xero_invoice_status",
        "invoice_number",
        "invoice_id",
      ])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async createInvoiceForJob(invoiceObj) {
    let query = this.jobModel.mutation();
    query.update((q) =>
      q.where("id", invoiceObj.jobId).set({
        invoice_date: invoiceObj.invoice_date,
        due_date: invoiceObj.due_date,
        xero_invoice_status: invoiceObj.xero_invoice_status,
      })
    );
    let result = await query.execute(true).toPromise();
    return result;
  }

  async fetchServices() {
    let query = this.serviceModel.query();
    query = query
      .deSelectAll()
      .select([
        "id",
        "service_name",
        "description",
        "service_price",
        "standard_warranty",
        "primary_service_id",
        "service_type",
      ])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    let result = await query.fetchDirect().toPromise();
    return result;
  }

  async fetchJobById(jobId) {
    let query = this.jobModel.query();
    if (jobId) {
      query = query.where("id", jobId);
    }

    query = await query
      .deSelectAll()
      .select(["id", "unique_id", "job_status", "job_total"]);
  }
}
