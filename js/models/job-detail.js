import { API_KEY, HTTP_ENDPOINT } from "../../sdk/config.js";

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

    this.appointmentQuery = null;
    this.appointmentCallback = null;

    this.materialQuery = null;
    this.materialCallback = null;

    this.serviceProviderQuery = null;
    this.serviceProviderCallback = null;

    this.inquiryQuery = null;
    this.inquiryCallback = null;

    this.jobQuery = null;
    this.jobCallback = null;
    this.jobInvoiceQuery = null;
    this.jobInvoiceCallback = null;

    this.contacts = [];
    this.properties = [];
    this.activities = [];
    this.materials = [];
    this.materialRecordsById = new Map();
    this.contactSub = null;
    this.propertySub = null;
    this.appointmentSub = null;
    this.activitySub = null;
    this.materialSub = null;
    this.serviceProviderSub = null;
    this.inquirySub = null;
    this.jobSub = null;
    this.uploadSub = null;
    this.jobDetailSub = null;
    this.jobInvoiceSub = null;
    window.jobModel = this.jobModel;
  }

  #logError(context, error) {
    console.error(`[JobDetailModel] ${context}`, error);
  }

  #emitActivities(records = []) {
    const safeRecords = Array.isArray(records) ? records : [];
    this.activities = safeRecords;
    if (this.activityCallback) this.activityCallback(safeRecords);
    return safeRecords;
  }

  #extractActivityRecords(payload) {
    if (Array.isArray(payload?.records)) return payload.records;
    if (payload?.records && typeof payload.records === "object") return [payload.records];
    if (Array.isArray(payload?.resp)) return payload.resp;
    if (payload?.resp && typeof payload.resp === "object") return [payload.resp];
    if (Array.isArray(payload?.data?.subscribeToCalcActivities)) {
      return payload.data.subscribeToCalcActivities;
    }
    if (
      payload?.data?.subscribeToCalcActivities &&
      typeof payload.data.subscribeToCalcActivities === "object"
    ) {
      return [payload.data.subscribeToCalcActivities];
    }
    if (Array.isArray(payload?.payload?.records)) return payload.payload.records;
    if (payload?.payload?.records && typeof payload.payload.records === "object") {
      return [payload.payload.records];
    }
    if (Array.isArray(payload?.payload?.resp)) return payload.payload.resp;
    if (payload?.payload?.resp && typeof payload.payload.resp === "object") {
      return [payload.payload.resp];
    }
    if (Array.isArray(payload?.payload?.data?.subscribeToCalcActivities)) {
      return payload.payload.data.subscribeToCalcActivities;
    }
    if (
      payload?.payload?.data?.subscribeToCalcActivities &&
      typeof payload.payload.data.subscribeToCalcActivities === "object"
    ) {
      return [payload.payload.data.subscribeToCalcActivities];
    }
    if (
      payload &&
      typeof payload === "object" &&
      (payload.id || payload.ID) &&
      ("task" in payload ||
        "Task" in payload ||
        "activity_status" in payload ||
        "Activity_Status" in payload)
    ) {
      return [payload];
    }
    const deepFound = this.#findActivityArrayDeep(payload);
    if (deepFound.length) return deepFound;
    if (Array.isArray(payload)) return payload;
    return [];
  }

  #looksLikeActivityRecord(record) {
    if (!record || typeof record !== "object") return false;
    return (
      "activity_status" in record ||
      "Activity_Status" in record ||
      "activity_price" in record ||
      "Activity_Price" in record ||
      "task" in record ||
      "Task" in record
    );
  }

  #findActivityArrayDeep(root, visited = new WeakSet()) {
    if (!root || typeof root !== "object") return [];
    if (visited.has(root)) return [];
    visited.add(root);

    if (Array.isArray(root)) {
      if (root.length && this.#looksLikeActivityRecord(root[0])) return root;
      for (const entry of root) {
        const nested = this.#findActivityArrayDeep(entry, visited);
        if (nested.length) return nested;
      }
      return [];
    }

    for (const value of Object.values(root)) {
      const nested = this.#findActivityArrayDeep(value, visited);
      if (nested.length) return nested;
    }
    return [];
  }

  #extractSingleActivityRecord(payload) {
    const candidate =
      payload?.data?.createActivity ??
      payload?.payload?.data?.createActivity ??
      payload?.data?.updateActivity ??
      payload?.payload?.data?.updateActivity ??
      payload?.data?.deleteActivity ??
      payload?.payload?.data?.deleteActivity ??
      null;
    return candidate && typeof candidate === "object" ? candidate : null;
  }

  #mergeActivityRecord(record) {
    if (!record || typeof record !== "object") return this.activities || [];
    const current = Array.isArray(this.activities) ? [...this.activities] : [];
    const id = String(record?.id ?? record?.ID ?? "");
    if (!id) return current;
    const index = current.findIndex(
      (item) => String(item?.id ?? item?.ID ?? "") === id
    );
    if (index >= 0) {
      current[index] = { ...current[index], ...record };
    } else {
      current.unshift(record);
    }
    return current;
  }

  #coalescePayloadValue(payload = {}, keys = [], fallback = "") {
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(payload, key)) continue;
      const value = payload[key];
      if (value === null || value === undefined) continue;
      if (typeof value === "string" && value.trim() === "") continue;
      return value;
    }
    return fallback;
  }

  #toIntegerOrFallback(value, fallback = null) {
    if (value === null || value === undefined || value === "") return fallback;
    const parsed = Number.parseInt(String(value), 10);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  #toBooleanOrFallback(value, fallback = false) {
    if (typeof value === "boolean") return value;
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim().toLowerCase();
    if (["true", "1", "yes", "y"].includes(normalized)) return true;
    if (["false", "0", "no", "n", ""].includes(normalized)) return false;
    return fallback;
  }

  #normalizeActivityPriceString(value) {
    if (value === null || value === undefined || value === "") return "";
    const normalized = String(value).replace(/[^0-9.-]+/g, "").trim();
    return normalized || "";
  }

  #toCurrencyScalarNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const normalized = String(value).replace(/[^0-9.-]+/g, "").trim();
    if (!normalized) return null;
    const parsed = Number(normalized);
    if (!Number.isFinite(parsed)) return null;
    return parsed;
  }

  #buildActivityMutationPayload(activityObj = {}, { includeJobId = true } = {}) {
    const source = { ...(activityObj || {}) };

    const jobId = this.#toIntegerOrFallback(
      this.#coalescePayloadValue(source, ["job_id", "Job_ID", "jobId"], null),
      null
    );
    const quantity = this.#toIntegerOrFallback(
      this.#coalescePayloadValue(source, ["quantity", "Quantity"], 1),
      1
    );
    const serviceId = this.#toIntegerOrFallback(
      this.#coalescePayloadValue(
        source,
        ["service_id", "Service_ID", "serviceId", "serviceid"],
        null
      ),
      null
    );
    const dateRequired = this.#toIntegerOrFallback(
      this.#coalescePayloadValue(
        source,
        ["date_required", "Date_Required", "daterequired"],
        null
      ),
      null
    );
    const activityPrice = this.#normalizeActivityPriceString(
      this.#coalescePayloadValue(
        source,
        ["activity_price", "Activity_Price", "activityPrice"],
        ""
      )
    );

    const payload = {
      note: this.#coalescePayloadValue(source, ["note", "Note"], ""),
      task: this.#coalescePayloadValue(source, ["task", "Task"], ""),
      option: this.#coalescePayloadValue(source, ["option", "Option"], ""),
      quantity,
      warranty: this.#coalescePayloadValue(source, ["warranty", "Warranty"], ""),
      service_id: serviceId,
      activity_text: this.#coalescePayloadValue(
        source,
        ["activity_text", "Activity_Text"],
        ""
      ),
      date_required: dateRequired,
      activity_price: activityPrice,
      activity_status: this.#coalescePayloadValue(
        source,
        ["activity_status", "Activity_Status", "Activity_status", "status", "Status"],
        "To Be Scheduled"
      ),
      include_in_quote: this.#toBooleanOrFallback(
        this.#coalescePayloadValue(
          source,
          ["include_in_quote", "Include_In_Quote"],
          false
        ),
        false
      ),
      invoice_to_client: this.#toBooleanOrFallback(
        this.#coalescePayloadValue(
          source,
          ["invoice_to_client", "Invoice_to_Client"],
          true
        ),
        true
      ),
      include_in_quote_subtotal: this.#toBooleanOrFallback(
        this.#coalescePayloadValue(
          source,
          ["include_in_quote_subtotal", "Include_In_Quote_Subtotal"],
          true
        ),
        true
      ),
    };

    if (includeJobId && jobId !== null) payload.job_id = jobId;
    if (!includeJobId && jobId !== null) payload.job_id = jobId;
    if (payload.service_id === null) delete payload.service_id;
    if (payload.date_required === null) delete payload.date_required;

    return payload;
  }

  async #graphqlRequest(query, variables = {}) {
    const response = await fetch(`${HTTP_ENDPOINT}/api/v1/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload?.errors?.[0]?.message ||
        payload?.message ||
        `Request failed (${response.status})`;
      throw new Error(message);
    }
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      throw new Error(payload.errors[0]?.message || "GraphQL error");
    }
    return payload?.data ?? null;
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
    } catch (_) {
      this.#logError("contact subscribe failed", _);
    }

    if (!liveObs && typeof this.contactQuery.localSubscribe === "function") {
      try {
        liveObs = this.contactQuery.localSubscribe();
      } catch (_) {
        this.#logError("contact localSubscribe failed", _);
      }

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
    } catch (_) {
      this.#logError("serviceProvider subscribe failed", _);
    }

    if (
      !liveObs &&
      typeof this.serviceProviderQuery.localSubscribe === "function"
    ) {
      try {
        liveObs = this.serviceProviderQuery.localSubscribe();
      } catch (_) {
        this.#logError("serviceProvider localSubscribe failed", _);
      }

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
      .select([
        "id",
        "photo_upload",
        "file_upload",
        "job_id",
        "type",
        "customer_id",
        "company_id",
        "property_name_id",
        "inquiry_id",
        "created_at",
        "photo_name",
        "file_name",
      ])
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
    } catch (_) {
      this.#logError("upload subscribe failed", _);
    }

    if (!liveObs && typeof this.uploadQuery?.localSubscribe === "function") {
      try {
        liveObs = this.uploadQuery.localSubscribe();
      } catch (_) {
        this.#logError("upload localSubscribe failed", _);
      }
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

  async deleteUpload(uploadId) {
    let query = this.uploadModel.mutation();
    query.delete((q) => q.where("id", uploadId));
    let result = await query.execute(true).toPromise();
    return result;
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
    } catch (_) {
      this.#logError("jobDetail subscribe failed", _);
    }

    if (!liveObs && typeof this.jobDetailQuery?.localSubscribe === "function") {
      try {
        liveObs = this.jobDetailQuery.localSubscribe();
      } catch (_) {
        this.#logError("jobDetail localSubscribe failed", _);
      }
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
    } catch (_) {
      this.#logError("property subscribe failed", _);
    }

    if (!liveObs && typeof this.propertyQuery.localSubscribe === "function") {
      try {
        liveObs = this.propertyQuery.localSubscribe();
      } catch (_) {
        this.#logError("property localSubscribe failed", _);
      }

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
    } catch (_) {
      this.#logError("inquiry subscribe failed", _);
    }

    if (!liveObs && typeof this.inquiryQuery.localSubscribe === "function") {
      try {
        liveObs = this.inquiryQuery.localSubscribe();
      } catch (_) {
        this.#logError("inquiry localSubscribe failed", _);
      }

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
    } catch (_) {
      this.#logError("job subscribe failed", _);
    }

    if (!liveObs && typeof this.jobQuery.localSubscribe === "function") {
      try {
        liveObs = this.jobQuery.localSubscribe();
      } catch (_) {
        this.#logError("job localSubscribe failed", _);
      }

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

  async fetchAppointmentByJobId(jobId, callback) {
    if (!jobId) return null;

    this.appointmentQuery = this.appointmentModel
      .query()
      .where("job_id", jobId)
      .deSelectAll()
      .select([
        "id",
        "status",
        "title",
        "start_time",
        "end_time",
        "description",
        "event_color",
        "inquiry_id",
        "job_id",
        "location_id",
        "host_id",
        "primary_guest_contact_id",
        "type",
      ])
      .include("Location", (q) => {
        q.select(["id", "property_name"]);
      })
      .include("Job", (q) => {
        q.select(["job_status"]);
      })
      .include("Host", (q) => {
        q.include("Contact_Information", (c) => {
          c.select(["id", "first_name", "last_name"]);
        });
      })
      .include("Primary_Guest", (q) => {
        q.select(["id", "first_name", "last_name"]);
      })
      .noDestroy();

    this.appointmentQuery.getOrInitQueryCalc?.();
    const result = await this.appointmentQuery.fetchDirect().toPromise();
    const appointments = Array.isArray(result?.resp)
      ? result.resp
      : Array.isArray(result)
      ? result
      : Array.isArray(result?.records)
      ? result.records
      : [];

    this.appointmentCallback = callback;
    this.subscribeToAppointmentChanges();
    if (typeof this.appointmentCallback === "function")
      this.appointmentCallback(appointments);
    return appointments;
  }

  subscribeToAppointmentChanges() {
    this.appointmentSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.appointmentQuery?.subscribe === "function") {
        liveObs = this.appointmentQuery.subscribe();
      }
    } catch (_) {
      this.#logError("appointment subscribe failed", _);
    }

    if (
      !liveObs &&
      typeof this.appointmentQuery?.localSubscribe === "function"
    ) {
      try {
        liveObs = this.appointmentQuery.localSubscribe();
      } catch (_) {
        this.#logError("appointment localSubscribe failed", _);
      }
    }

    if (!liveObs) return;

    this.appointmentSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          const appointments = Array.isArray(payload?.records)
            ? payload.records
            : Array.isArray(payload)
            ? payload
            : [];
          if (typeof this.appointmentCallback === "function") {
            this.appointmentCallback(appointments);
          }
        },
        error: () => {},
      });
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
        "status",
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
    const resp = this.#extractActivityRecords(result);
    this.#emitActivities(resp);
    this.subscribeToActivityChanges();
    return resp;
  }

  subscribeToActivityChanges() {
    this.activitySub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.activityQuery.subscribe === "function")
        liveObs = this.activityQuery.subscribe();
    } catch (_) {
      this.#logError("activity subscribe failed", _);
    }

    if (!liveObs && typeof this.activityQuery.localSubscribe === "function") {
      try {
        liveObs = this.activityQuery.localSubscribe();
      } catch (_) {
        this.#logError("activity localSubscribe failed", _);
      }
    }

    if (liveObs) {
      this.activitySub = liveObs
        .pipe(window.toMainInstance?.(true) ?? ((x) => x))
        .subscribe({
          next: (payload) => {
            const data = this.#extractActivityRecords(payload);
            if (data.length) {
              this.#emitActivities(data);
              return;
            }

            const singleRecord = this.#extractSingleActivityRecord(payload);
            if (singleRecord) {
              const merged = this.#mergeActivityRecord(singleRecord);
              this.#emitActivities(merged);
            }
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
    } catch (_) {
      this.#logError("material subscribe failed", _);
    }

    if (!liveObs && typeof this.materialQuery.localSubscribe === "function") {
      try {
        liveObs = this.materialQuery.localSubscribe();
      } catch (_) {
        this.#logError("material localSubscribe failed", _);
      }
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
    const payload = this.#buildActivityMutationPayload(acitivityObj, {
      includeJobId: true,
    });
    const activityPriceScalar = this.#toCurrencyScalarNumber(payload.activity_price);
    if (activityPriceScalar === null) {
      delete payload.activity_price;
    } else {
      payload.activity_price = activityPriceScalar;
    }

    let query = this.acitivityModel.mutation();
    query.createOne(payload);
    let result = await query.execute(true).toPromise();
    return result;
  }

  async updateActivity(activityId, activityObj = {}) {
    if (!activityId) throw new Error("Activity id is required");
    const payload = this.#buildActivityMutationPayload(activityObj, {
      includeJobId: false,
    });
    const activityPriceScalar = this.#toCurrencyScalarNumber(payload.activity_price);
    if (activityPriceScalar === null) {
      delete payload.activity_price;
    } else {
      payload.activity_price = activityPriceScalar;
    }

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

  async createUploads(uploadObjs = []) {
    const payload = Array.isArray(uploadObjs) ? uploadObjs.filter(Boolean) : [];
    if (!payload.length) return [];

    const mutation = `
      mutation createUploads($payload: [UploadCreateInput] = null) {
        createUploads(payload: $payload) {
          photo_upload
          file_upload
          job_id
          type
          customer_id
          company_id
          property_name_id
          file_name
          photo_name
          inquiry_id
        }
      }
    `;

    try {
      const data = await this.#graphqlRequest(mutation, { payload });
      const result = data?.createUploads;
      if (Array.isArray(result)) return result;
      if (result) return [result];
      return [];
    } catch (error) {
      this.#logError("createUploads failed; falling back to createNewUpload", error);
      const created = [];
      for (const item of payload) {
        const result = await this.createNewUpload(item);
        created.push(result?.resp ?? result ?? null);
      }
      return created.filter(Boolean);
    }
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
        "service_description",
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

  async fetchJobById(jobId, callback) {
    if (!jobId) return null;

    this.jobInvoiceQuery = this.jobModel
      .query()
      .where("id", jobId)
      .select([
        "id",
        "account_type",
        "client_entity_id",
        "client_individual_id",
        "contact_id",
        "property_id",
        "primary_service_provider_id",
        "priority",
        "job_priority",
        "priority_level",
        "invoice_number",
        "xero_invoice_status",
        "invoice_id",
        "invoice_date",
        "due_date",
        "invoice_total",
        "send_to_contact",
        "payment_id",
        "payment_method",
        "invoice_url_client",
        "xero_invoice_pdf",
      ])
      .include("Client_Entity", (q) => {
        q.select(["name", "id"]);
      })
      .include("Client_Individual", (q) => {
        q.select(["first_name", "last_name", "id"]);
      })
      .include("Primary_Service_Provider", (q) => {
        q.include("Contact_Information", (c) => {
          c.select(["first_name", "last_name", "id", "status"]);
        });
      })
      .include("Property", (q) => {
        q.select(["property_name", "id"]);
      })
      .noDestroy();
    this.jobInvoiceQuery.getOrInitQueryCalc?.();
    const result = await this.jobInvoiceQuery.fetchDirect().toPromise();
    const record = Array.isArray(result?.resp)
      ? result.resp?.[0] ?? null
      : Array.isArray(result)
      ? result?.[0] ?? null
      : result?.resp ?? result ?? null;
    this.jobInvoiceCallback = callback;
    this.subscribeToJobInvoiceChanges();
    if (this.jobInvoiceCallback) {
      this.jobInvoiceCallback(record);
    }
    return record;
  }

  subscribeToJobInvoiceChanges() {
    this.jobInvoiceSub?.unsubscribe?.();
    let liveObs = null;
    try {
      if (typeof this.jobInvoiceQuery?.subscribe === "function") {
        liveObs = this.jobInvoiceQuery.subscribe();
      }
    } catch (_) {
      this.#logError("jobInvoice subscribe failed", _);
    }

    if (
      !liveObs &&
      typeof this.jobInvoiceQuery?.localSubscribe === "function"
    ) {
      try {
        liveObs = this.jobInvoiceQuery.localSubscribe();
      } catch (_) {
        this.#logError("jobInvoice localSubscribe failed", _);
      }
    }

    if (!liveObs) return;

    this.jobInvoiceSub = liveObs
      .pipe(window.toMainInstance?.(true) ?? ((x) => x))
      .subscribe({
        next: (payload) => {
          const record = Array.isArray(payload?.records)
            ? payload.records?.[0]
            : Array.isArray(payload)
            ? payload[0]
            : payload ?? null;
          if (this.jobInvoiceCallback) {
            this.jobInvoiceCallback(record ?? null);
          }
        },
        error: () => {},
      });
  }
}
