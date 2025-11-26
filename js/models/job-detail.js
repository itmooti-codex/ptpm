export class JobDetailModal {
  constructor(plugin) {
    window.plugin = plugin;
    window.contactModel = plugin.switchTo("PeterpmContact");
    window.serviceProviderModel = plugin.switchTo("PeterpmServiceProvider");
    this.contactModel = null;
    this.contactModelName = null;
    this.contacts = [];
    window.jobModel = plugin.switchTo("PeterpmJob");
  }

  async fetchContacts() {
    let query = window.contactModel
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
    query.getOrInitQueryCalc?.();

    let contact = await query.fetchDirect().toPromise();
    return contact.resp;
  }

  async fetchServiceProviders() {
    let query = serviceProviderModel.query();
    query = query
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
    query.getOrInitQueryCalc();
    let serviceman = await query.fetchDirect().toPromise();
    return serviceman.resp;
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
}
