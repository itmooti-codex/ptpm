export class JobDetailController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this._autocompleteInitAttempts = 0;
    this._autocompleteReady = false;

    this.contacts = [];
    this.properties = [];
    this.serviceProvider = [];
    this.inquiries = [];
    this.jobs = [];

    this.setupOptions();
    this.handleCreateAppointment();

    this.stateOptions = [
      { value: "NSW", displayValue: "New South Wales" },
      { value: "QLD", displayValue: "Queensland" },
      { value: "VIC", displayValue: "Victoria" },
      { value: "TAS", displayValue: "Tasmania" },
      { value: "SA", displayValue: "South Australia" },
      { value: "ACT", displayValue: "Australian Capital Territory" },
      { value: "NT", displayValue: "Northern Territory" },
      { value: "WA", displayValue: "Western Australia" },
    ];

    this.buildingFeatures = [
      { value: "713", text: "Brick" },
      { value: "712", text: "Concrete" },
      { value: "711", text: "Flat Roof" },
      { value: "710", text: "Highset" },
      { value: "709", text: "Iron Roof" },
      { value: "708", text: "Lowset" },
      { value: "707", text: "PostWar" },
      { value: "706", text: "Queenslander" },
      { value: "705", text: "Raked Ceiling" },
      { value: "704", text: "Sloping Block" },
      { value: "703", text: "Super 6 / Fibro roof" },
      { value: "702", text: "Tile Roof" },
      { value: "701", text: "Town house" },
      { value: "700", text: "Unit Block" },
      { value: "699", text: "Warehouse" },
      { value: "698", text: "Wood" },
      { value: "697", text: "Wood & Brick" },
    ];
  }

  async init() {
    // Ensure UI wiring runs even if async loads fail
    this.initFlatpickr();
    try {
      await this.setupSearches();
    } catch (err) {
      console.error("JobDetailController init(): search setup failed", err);
    }
    // this.onDealInfoButtonClicked();
    this.onEditBtnClicked();
    this.initAutocomplete();
    this.setupSearches();
    this.handlePropertySearch();
    this.showHideAddAddressModal();
    this.view.renderBuildingFeaturesDropdown?.(this.buildingFeatures);
    this.renderDropdownForStates();
    this.bindAddPropertyFlow();
    this.renderServicesInActivitySection();
  }

  renderDropdownForStates() {
    this.view.renderDropdownOptionsForStates(this.stateOptions);
  }

  async setupSearches() {
    try {
      await this.model.fetchContacts((data) => {
        const list = Array.isArray(data) ? data : [];
        this.view.setupClientSearch(list);
        this.contacts = list;
        this.setupOptions("contact");
      });
    } catch (err) {
      console.error("Failed to load contacts", err);
    }

    try {
      await this.model.fetchServiceProviders((data) => {
        const list = Array.isArray(data) ? data : [];
        this.serviceProvider = list;
        this.view.setupServiceProviderSearch(list);
        this.setupOptions("serviceProvider");
      });
    } catch (err) {
      console.error("Failed to load service providers", err);
    }

    try {
      await this.model.fetchProperty((data) => {
        const list = Array.isArray(data) ? data : [];
        this.properties = list;
        if (!this._propertySearchInit) {
          this.view.setupPropertySearch(list);
          this._propertySearchInit = true;
        } else if (typeof this.view.updatePropertySearch === "function") {
          this.view.updatePropertySearch(list);
        }
        this.setupOptions("properties");
      });
    } catch (err) {
      console.error("Failed to load properties", err);
    }

    try {
      await this.model.fetchInquiries((data) => {
        const list = Array.isArray(data) ? data : [];
        this.inquiries = list;
        this.setupOptions("inquiry");
      });
    } catch (err) {
      console.error("Failed to load inquiries", err);
    }

    try {
      await this.model.fetchJobs((data) => {
        const list = Array.isArray(data) ? data : [];
        this.jobs = list;
        this.setupOptions("job");
      });
    } catch (err) {
      console.error("Failed to load jobs", err);
    }
  }

  onDealInfoButtonClicked() {
    let dealInfoBtn = document.getElementById("deal-info-btn");
    if (dealInfoBtn) {
      dealInfoBtn.addEventListener("click", () => {
        this.view.toggleDealInformation();
      });
    }
  }

  onEditBtnClicked() {
    let editBtn = document.querySelectorAll("#edit-note-btn");
    editBtn.forEach((item) => {
      item.addEventListener("click", (event) => {
        this.view.toggleTasksModal();
      });
    });
  }

  initFlatpickr() {
    flatpickr(".date-picker", {
      dateFormat: "d/m/Y",
      allowInput: true,
    });
  }

  initAutocomplete() {
    const inputs = document.querySelectorAll(
      '[data-field="modal-properties"], [data-contact-field="bot_address_line1"],[data-contact-field="bot_address_line2"], [data-contact-field="top_address_line1"], [data-contact-field="top_address_line2"]'
    );
    if (!inputs.length || !window.google?.maps?.places?.Autocomplete) return;
    inputs.forEach((input) => {
      if (input.dataset.googlePlacesBound === "true") return;
      const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ["address"],
        componentRestrictions: { country: "au" },
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        // Fill input
        input.value = place?.formatted_address || input.value;
        // Build property object
        const parsed = this.parseAddressComponents(place);
        const mapped = this.createPropertyObj(parsed);
        if (
          input.getAttribute("data-contact-id") == "address" ||
          input.getAttribute("data-contact-id") == "address_2"
        ) {
          this.setAddressValuesToPopup(mapped);
        } else if (
          input.getAttribute("data-contact-id") == "postal_address" ||
          input.getAttribute("data-contact-id") == "postal_address_2"
        ) {
          this.setPostalAddressValuesToPopup(mapped);
        }

        if (input.getAttribute("data-field") === "modal-properties") {
          this.view?.setGoogleSearchAddress?.(parsed);
          const newObj = {
            Properties: mapped,
            property_name: place?.formatted_address,
          };
          this.model.createNewProperty(newObj);
        }
      });
      input.dataset.googlePlacesBound = "true";
    });
  }

  parseAddressComponents(place) {
    const components = place.address_components || [];

    const result = {
      unit_number: "",
      lot_number: "",
      address_1: "",
      address_2: "",
      suburb_town: "",
      suburb_town: "",
      state: "",
      postal_code: "",
      street_number: "",
      street: "",
    };

    components.forEach((c) => {
      if (c.types.includes("subpremise")) result["unit_number"] = c.long_name;
      if (c.types.includes("premise")) result["lot_number"] = c.long_name;
      if (c.types.includes("lot_number")) result["lot_number"] = c.long_name;

      if (c.types.includes("street_number")) result.street_number = c.long_name;
      if (c.types.includes("route")) result.street = c.long_name;

      if (c.types.includes("locality")) result["suburb_town"] = c.long_name;
      if (c.types.includes("country")) result["country"] = c.short_name;

      if (
        c.types.includes("sublocality") ||
        c.types.includes("sublocality_level_1")
      ) {
        result["suburb_town"] = c.long_name;
      }

      if (c.types.includes("administrative_area_level_1"))
        result.state = c.short_name;

      if (c.types.includes("postal_code")) result["postal_code"] = c.long_name;
    });

    const formatted = place.formatted_address || "";

    const unitMatch =
      formatted.match(/(Unit|Apt|Apartment|Suite)\s*([\w-]+)/i) ||
      formatted.match(/^([\w-]+)\//);

    if (!result["unit_number"] && unitMatch) {
      result["unit_number"] = unitMatch[2] || unitMatch[1];
    }

    const lotMatch =
      formatted.match(/Lot\s*([\w-]+)/i) || formatted.match(/\bL(\d+)\b/i);

    if (!result["lot_number"] && lotMatch) {
      result["lot_number"] = lotMatch[1];
    }

    result["address_1"] = `${result.street_number} ${result.street}`.trim();
    result["address_2"] = result["unit_number"]
      ? `Unit ${result["unit_number"]}`
      : "";

    return result;
  }

  createPropertyObj(property) {
    const mapKeys = {
      address_1: "address_1",
      address_2: "address_2",
      lot_number: "lot_number",
      unit_number: "unit_number",
      suburb_town: "suburb_town",
      postal_code: "postal_code",
      state: "state",
      country: "country",
    };

    const newObj = {};

    for (const key in mapKeys) {
      if (property.hasOwnProperty(key)) {
        newObj[mapKeys[key]] = property[key];
      }
    }

    return newObj;
  }

  handlePropertySearch() {
    let element = document.querySelector('[data-field="properties"]');
    if (!element) return;
    element.addEventListener("input", () => {
      let value = element.value;
      this.model.fetchProperties(value);
    });
  }

  bindAddPropertyFlow() {
    const propertySearchInput = document.querySelector(
      '[data-field="properties"]'
    );
    const addBtn = document.getElementById("add-property-btn");
    const propertyHidden = document.querySelector('[data-field="property_id"]');

    // Open modal when "Add Property" is clicked from search dropdown
    if (propertySearchInput) {
      propertySearchInput.addEventListener("property:add", (e) => {
        this.view.toggleModal("jobAddPropertyModal");
        const modalSearch = document.querySelector(
          '#jobAddPropertyModal [data-field="properties"]'
        );
        if (modalSearch && e?.detail?.query) modalSearch.value = e.detail.query;
      });
    }

    // Save property from modal
    if (addBtn) {
      addBtn.addEventListener("click", async () => {
        const raw = this.view.getPropertyFormData?.() || {};

        let propertyName = document.querySelector(
          '[data-field="modal-properties"]'
        ).value;

        let payload = raw;
        payload.property_name = propertyName;

        this.view.startLoading?.("Creating property...");
        try {
          const result = await this.model.createNewProperty(payload);
          const newId =
            this.view?.extractCreatedRecordId?.(result, "PeterpmProperty") ||
            result?.resp?.id ||
            result?.resp?.data?.id ||
            result?.id ||
            result?.data?.id ||
            "";

          // Reflect selection in the main search input/hidden field
          if (propertySearchInput) propertySearchInput.value = propertyName;
          if (propertyHidden) propertyHidden.value = newId;

          // Refresh property options/search list
          await this.model.fetchProperty((data) => {
            this.properties = data;
            this.view.updatePropertySearch?.(data);
          });

          this.view.handleSuccess?.("Property created successfully.");
          this.view.toggleModal("jobAddPropertyModal");
        } catch (err) {
          console.error("Failed to create property", err);
          this.view.handleFailure?.("Property creation failed.");
        } finally {
          this.view.stopLoading?.();
        }
      });
    }
  }

  resetSelectOptions(selectEl) {
    if (!selectEl) return;
    const placeholder =
      selectEl.querySelector("option[disabled][selected]")?.outerHTML ||
      '<option value="" disabled selected>Select</option>';
    selectEl.innerHTML = placeholder;
  }

  setAddressValuesToPopup(data) {
    const fieldIdentifier = {
      address: "address_1",
      address_2: "address_2",
      city: "suburb_town",
      country: "",
      state: "state",
      zip_code: "postal_code",
      country: "country",
    };

    let elements = document.querySelectorAll(
      '[data-section="address"] input, [data-section="address"] select'
    );
    elements.forEach((item) => {
      let key = item.getAttribute("data-contact-id");
      let val = data[fieldIdentifier[key]];
      item.value = val;
    });
  }

  setPostalAddressValuesToPopup(data) {
    const fieldIdentifier = {
      postal_address: "address_1",
      postal_address_2: "address_2",
      postal_city: "suburb_town",
      country: "",
      postal_state: "state",
      postal_code: "postal_code",
      postal_country: "country",
    };

    let elements = document.querySelectorAll(
      '[data-section="postal-address"] input, [data-section="postal-address"] select'
    );
    elements.forEach((item) => {
      let key = item.getAttribute("data-contact-id");
      let val = data[fieldIdentifier[key]];
      item.value = val;
    });
  }

  async setupOptions(element) {
    if (element == "contact") {
      try {
        let guestElement = document.querySelector(
          '[data-field="primary_guest_id"]'
        );

        this.resetSelectOptions(guestElement);
        let mappedData = this.contacts.map((item) => {
          const first = item.First_Name || item.first_name || "";
          const last = item.Last_Name || item.last_name || "";
          return {
            id: item.Contact_ID || item.id || item.ID || null,
            name: `${first} ${last}`.trim(),
          };
        });
        this.view.createOptionsForSelectBox(guestElement, mappedData);
      } catch (e) {}
    } else if (element == "properties") {
      try {
        let locationElement = document.querySelector(
          '[data-field="location_id"]'
        );
        this.resetSelectOptions(locationElement);
        const mappedData = this.properties.map((item) => {
          return {
            id: item.ID || item.id || null,
            name: item.Property_Name || item.property_name || "",
          };
        });

        this.view.createOptionsForSelectBox(locationElement, mappedData);
      } catch (c) {}
    } else if (element == "serviceProvider") {
      try {
        let hostElement = document.querySelector('[data-field="host_id"]');
        this.resetSelectOptions(hostElement);
        const mappedData = this.serviceProvider.map((item) => {
          const contactInfo = item.Contact_Information || {};
          const first =
            contactInfo.first_name || item.Contact_Information_First_Name || "";
          const last =
            contactInfo.last_name || item.Contact_Information_Last_Name || "";
          return {
            id: item.ID || item.id || null,
            name: `${first} ${last}`.trim(),
          };
        });

        this.view.createOptionsForSelectBox(hostElement, mappedData);
      } catch (c) {}
    } else if (element == "inquiry") {
      try {
        const inquiryElement = document.querySelector(
          '[data-field="inquiry_id"]'
        );
        this.resetSelectOptions(inquiryElement);
        const mappedData = this.inquiries.map((item) => {
          return {
            id: item.ID || null,
            name: `${item.Deal_Name || null}`,
          };
        });
        this.view.createOptionsForSelectBox(inquiryElement, mappedData);
      } catch (e) {}
    } else if (element == "job") {
      try {
        const jobElement = document.querySelector('[data-field="job_id"]');
        this.resetSelectOptions(jobElement);
        const mappedData = this.jobs.map((item) => {
          return {
            id: item.ID || null,
            name: `${item.Unique_ID} - ${item.Property_Property_Name}`.trim(),
          };
        });
        this.view.createOptionsForSelectBox(jobElement, mappedData);
      } catch (e) {}
    }
  }

  handleCreateAppointment() {
    let button = document.getElementById("create-appointment");
    button.addEventListener("click", async () => {
      let getFieldValues = this.view.getApointmentsFieldValues();
      this.view.startLoading?.("Creating appointment...");
      getFieldValues.job_id = this.view.getJobId();
      try {
        let result = await this.model.createAppointment(getFieldValues);
        console.log(result);
        this.view.handleSuccess?.("Appointment created successfully.");
      } catch (err) {
        console.error("Failed to create appointment", err);
        this.view.handleFailure?.(
          "Failed to create appointment. Please try again."
        );
      } finally {
        this.view.stopLoading?.();
      }
    });
  }

  showHideAddAddressModal() {
    const element = document.querySelector(
      "[data-contact-id='add-new-contact']"
    );
    if (!element) return;

    element.addEventListener("click", () => {
      this.view.clearPropertyFieldValues(
        "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
      );
      document.querySelector("[data-search-panel]").classList.toggle("hidden");

      document.querySelector('[data-contact-id="contact-id"]').value = "";
      this.view.toggleModal("addressDetailsModalWrapper");
      // Re-run shared autocomplete init to ensure modal inputs are wired (idempotent via dataset flag).
      this.view.initializeAutoCompleteToModal({
        initAutocomplete: this.initAutocomplete.bind(this),
      });
      document
        .querySelector(
          '#addressDetailsModalWrapper [data-contact-field="account_type"]'
        )
        .closest("div")
        .classList.add("hidden");
    });
  }

  async renderServicesInActivitySection() {
    let services = await this.model.fetchServices();
    this.view.renderAddActivitiesServices(services.resp);
  }
}
