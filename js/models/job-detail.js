export class JobDetailModal {
  constructor(plugin) {
    window.plugin = plugin;
    this.contactModel = plugin.switchTo("PeterpmContact");
    this.serviceProviderModel = plugin.switchTo("PeterpmServiceProvider");
    this.propertyModel = plugin.switchTo("PeterpmProperty");
    this.inquiryModel = plugin.switchTo("PeterpmDeal");
    this.jobModel = plugin.switchTo("PeterpmJob");
    this.appointmentModel = plugin.switchTo("PeterpmAppointment");

    this.contactQuery = null;
    this.contactCallback = null;

    this.propertyQuery = null;
    this.propertyCallback = null;

    this.serviceProviderQuery = null;
    this.serviceProviderCallback = null;

    this.inquiryQuery = null;
    this.inquiryCallback = null;

    this.jobQuery = null;
    this.jobCallback = null;

    this.contacts = [];
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
    if (this.contactCallback) {
      this.contactCallback(contact.resp);
    }
  }

  subscribeToContactChanges() {
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
        this.sub = liveObs
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
    if (callback) {
      this.serviceProviderCallback(serviceman.resp);
    }
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
        this.sub = liveObs
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
    if (this.propertyCallback) {
      this.propertyCallback(result.resp);
    }
    return result.resp;
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
    if (this.inquiryCallback) {
      this.inquiryCallback(result.resp);
    }
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
    if (this.jobCallback) {
      this.jobCallback(result.resp);
    }
  }

  subscribeToPropertyChanges() {
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
        this.sub = liveObs
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
        this.sub = liveObs
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
        this.sub = liveObs
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
}
