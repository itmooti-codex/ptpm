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
    this.handlePropertySearch();
    this.showHideAddAddressModal();
    this.view.renderBuildingFeaturesDropdown?.(this.buildingFeatures);
    this.renderDropdownForStates();
    this.bindAddPropertyFlow();
    this.renderServicesInActivitySection();
    this.populateJobDetails();
    const existingJobId = this.view.getJobId?.();
    if (existingJobId) {
      this.loadExistingUploads(existingJobId);
    }
    this.handleInfoSubmit();
    this.renderAppointment();
  }

  loadExistingUploads(jobid) {
    this.model.fetchUploads(jobid, (data) => {
      this.view.renderExistingUploads(data);
    });
  }

  handleInfoSubmit() {
    let element = document.getElementById("submit-information-btn");
    element.addEventListener("click", async () => {
      await this.view.handleJobInformation();
    });
  }

  renderDropdownForStates() {
    this.view.renderDropdownOptionsForStates(this.stateOptions);
  }

  async setupSearches() {
    if (this._searchesLoaded) return;
    if (this._searchesPromise) return this._searchesPromise;

    this._searchesPromise = (async () => {
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
      this._searchesLoaded = true;
    })().finally(() => {
      this._searchesPromise = null;
    });

    return this._searchesPromise;
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

        const previous = guestElement?.value || "";
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
        if (previous) guestElement.value = previous;
      } catch (e) {
        console.error("[JobDetail] Failed to setup contact options", e);
      }
    } else if (element == "properties") {
      try {
        let locationElement = document.querySelector(
          '[data-field="location_id"]'
        );
        const previous = locationElement?.value || "";
        this.resetSelectOptions(locationElement);
        const mappedData = this.properties.map((item) => {
          return {
            id: item.ID || item.id || null,
            name: item.Property_Name || item.property_name || "",
          };
        });

        this.view.createOptionsForSelectBox(locationElement, mappedData);
        if (previous) locationElement.value = previous;
      } catch (c) {
        console.error("[JobDetail] Failed to setup property options", c);
      }
    } else if (element == "serviceProvider") {
      try {
        let hostElement = document.querySelector('[data-field="host_id"]');
        const previous = hostElement?.value || "";
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
        if (previous) hostElement.value = previous;
      } catch (c) {
        console.error("[JobDetail] Failed to setup service provider options", c);
      }
    } else if (element == "inquiry") {
      try {
        const inquiryElement = document.querySelector(
          '[data-field="inquiry_id"]'
        );
        const previous = inquiryElement?.value || "";
        this.resetSelectOptions(inquiryElement);
        const mappedData = this.inquiries.map((item) => {
          return {
            id: item.ID || null,
            name: `${item.Deal_Name || null}`,
          };
        });
        this.view.createOptionsForSelectBox(inquiryElement, mappedData);
        if (previous) inquiryElement.value = previous;
      } catch (e) {
        console.error("[JobDetail] Failed to setup inquiry options", e);
      }
    } else if (element == "job") {
      try {
        const jobElement = document.querySelector('[data-field="job_id"]');
        const previous = jobElement?.value || "";
        this.resetSelectOptions(jobElement);
        const mappedData = this.jobs.map((item) => {
          return {
            id: item.ID || null,
            name: `${item.Unique_ID} - ${item.Property_Property_Name}`.trim(),
          };
        });
        this.view.createOptionsForSelectBox(jobElement, mappedData);
        if (previous) jobElement.value = previous;
      } catch (e) {
        console.error("[JobDetail] Failed to setup job options", e);
      }
    }
  }

  handleCreateAppointment() {
    let button = document.getElementById("create-appointment");
    if (!button) return;
    button.addEventListener("click", async () => {
      let getFieldValues = this.view.getApointmentsFieldValues();
      this.view.startLoading?.("Creating appointment...");
      const jobId = this.view.getJobId();
      getFieldValues.job_id = jobId;
      if (!jobId) {
        this.view.handleFailure?.("Please save the job first before adding appointments.");
        this.view.stopLoading?.();
        return;
      }
      try {
        await this.model.createAppointment(getFieldValues);
        this.view.clearAppointmentForm?.();
        this.renderAppointment();
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

  populateJobDetails() {
    let jobId = this.view.getJobId();
    if (!jobId) return;

    this.view.startLoading?.("Loading job details...");
    let hasStoppedLoader = false;
    const stopLoader = () => {
      if (hasStoppedLoader) return;
      hasStoppedLoader = true;
      this.view.stopLoading?.();
    };

    this.model.fetchJobById(jobId, (data) => {
      if (!data) {
        stopLoader();
        return;
      }

      const normalizedEntries = Object.entries(data || {}).map(([key, value]) => ({
        key,
        normalizedKey: String(key || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, ""),
        value,
      }));

      const getValueByKey = (key = "") => {
        const normalizedKey = String(key || "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "");
        const match = normalizedEntries.find(
          (entry) => entry.normalizedKey === normalizedKey
        );
        return match?.value;
      };

      const pick = (keys = [], fallback = "") => {
        for (const key of keys) {
          const value = getValueByKey(key);
          if (value !== undefined && value !== null && value !== "") return value;
        }
        return fallback;
      };

      const extractPriority = () => {
        const explicit = pick(
          [
            "priority",
            "Priority",
            "priorty",
            "Priorty",
            "job_priority",
            "Job_Priority",
            "priority_level",
            "Priority_Level",
          ],
          ""
        );
        if (explicit !== "") return explicit;

        const fuzzy = normalizedEntries.find((entry) =>
          entry.normalizedKey.includes("priority")
        )?.value;
        return fuzzy ?? "";
      };

      const normalizePriorityValue = (rawValue) => {
        if (rawValue === undefined || rawValue === null || rawValue === "") return "";

        const optionByNumber = {
          125: "Low",
          124: "Medium",
          123: "High",
          1: "Low",
          2: "Medium",
          3: "High",
        };

        if (typeof rawValue === "number" && optionByNumber[rawValue]) {
          return optionByNumber[rawValue];
        }

        if (typeof rawValue === "object") {
          const nested =
            rawValue.value ??
            rawValue.label ??
            rawValue.name ??
            rawValue.priority ??
            rawValue.Priority ??
            "";
          return normalizePriorityValue(nested);
        }

        const text = String(rawValue).trim();
        if (!text) return "";
        const lower = text.toLowerCase();
        if (["l", "low"].includes(lower)) return "Low";
        if (["m", "med", "medium"].includes(lower)) return "Medium";
        if (["h", "high"].includes(lower)) return "High";

        if (optionByNumber[Number(lower)]) return optionByNumber[Number(lower)];
        if (lower.includes("high")) return "High";
        if (lower.includes("med")) return "Medium";
        if (lower.includes("low")) return "Low";

        return text;
      };

      const accountTypeRaw = String(
        pick(
          ["account_type", "Account_Type", "contact_type", "Contact_Type"],
          ""
        )
      ).toLowerCase();
      const hasEntityId = !!pick(
        ["client_entity_id", "Client_Entity_ID", "cliententityid"],
        ""
      );
      const initialType =
        accountTypeRaw.includes("entity") ||
        accountTypeRaw.includes("company") ||
        hasEntityId
          ? "entity"
          : "individual";

      const targetToggle = document.querySelector(
        `[data-contact-toggle="${initialType}"]`
      );
      // Drive the same UI/state changes the user would trigger
      targetToggle?.click();

      const section = document.querySelector(
        '[data-job-section="job-section-individual"]'
      );
      if (!section) {
        stopLoader();
        return;
      }

      const fields = [...section.querySelectorAll("input, select")].filter(
        (el) => !el.disabled && el.offsetParent !== null
      );

      const cleanText = (value) => {
        if (value === undefined || value === null) return "";
        const text = String(value).trim();
        return /^null$/i.test(text) ? "" : text;
      };

      const serviceProviderFirstName = pick(
        [
          "Primary_Service_Provider_Contact_Information_First_Name",
          "primary_service_provider_contact_information_first_name",
          "Contact_First_Name",
          "contact_first_name",
        ],
        ""
      );
      const serviceProviderLastName = pick(
        [
          "Primary_Service_Provider_Contact_Information_Last_Name",
          "primary_service_provider_contact_information_last_name",
          "Contact_Last_Name",
          "contact_last_name",
        ],
        ""
      );
      const serviceProviderName = [
        cleanText(serviceProviderFirstName),
        cleanText(serviceProviderLastName),
      ]
        .filter(Boolean)
        .join(" ");

      const priorityValue = normalizePriorityValue(extractPriority());

      let JobDetailObj = {
        priority: priorityValue,
        properties: pick(
          [
            "Property_Property_Name",
            "property_property_name",
            "property_name",
            "Property_Name",
          ],
          ""
        ),
        serviceman: serviceProviderName,
      };

      this.view.populateFieldsWithData(fields, JobDetailObj);

      const priorityEl = document.querySelector('[data-field="priority"]');
      if (priorityEl && JobDetailObj.priority) {
        const match = Array.from(priorityEl.options || []).find(
          (opt) =>
            String(opt.value || "").toLowerCase() ===
              String(JobDetailObj.priority).toLowerCase() ||
            String(opt.textContent || "").trim().toLowerCase() ===
              String(JobDetailObj.priority).toLowerCase()
        );
        priorityEl.value = match ? match.value : JobDetailObj.priority;
        priorityEl.dispatchEvent(new Event("change", { bubbles: true }));
      }

      const propertyId = pick(
        ["property_id", "Property_ID", "Property_Id", "propertyid"],
        ""
      );
      const propertyIdElement = document.querySelector('[data-field="property_id"]');
      if (propertyIdElement) propertyIdElement.value = propertyId || "";

      const serviceProviderId = pick(
        [
          "primary_service_provider_id",
          "Primary_Service_Provider_ID",
          "primaryserviceproviderid",
        ],
        ""
      );
      const serviceProviderIdElement = document.querySelector(
        '[data-serviceman-field="serviceman_id"]'
      );
      if (serviceProviderIdElement) {
        serviceProviderIdElement.value = serviceProviderId || "";
      }

      if (initialType === "individual") {
        const contactIdElement = document.querySelector('[data-field="client_id"]');
        const contactNameElement = document.querySelector('[data-field="client"]');
        const contactId = pick(
          [
            "client_individual_id",
            "Client_Individual_Contact_ID",
            "Client_Individual_ID",
            "clientindividualid",
          ],
          ""
        );
        const contactName = [
          pick(
            ["Client_Individual_First_Name", "client_individual_first_name"],
            ""
          ),
          pick(
            ["Client_Individual_Last_Name", "client_individual_last_name"],
            ""
          ),
        ]
          .filter(Boolean)
          .join(" ");
        if (contactNameElement) contactNameElement.value = contactName;
        if (contactIdElement) contactIdElement.value = contactId || "";
      } else {
        const entityIDElement = document.querySelector('[data-field="company_id"]');
        const entityNameElement = document.querySelector(
          '[data-field="entity_name"]'
        );
        const entityContactIdElement = document.querySelector(
          '[data-entity-id="entity-contact-id"]'
        );
        const entityId = pick(
          ["client_entity_id", "Client_Entity_ID", "cliententityid"],
          ""
        );
        const entityName = pick(
          ["Client_Entity_Name", "client_entity_name", "name"],
          ""
        );
        const entityContactId = pick(
          ["contact_id", "Contact_ID", "contactid"],
          ""
        );

        if (entityNameElement) entityNameElement.value = entityName;
        if (entityIDElement) entityIDElement.value = entityId || "";
        if (entityContactIdElement) {
          entityContactIdElement.value = entityContactId || "";
        }
      }

      this.view.setupColorMappedDropdowns?.();
      stopLoader();
    });
  }

  renderAppointment() {
    let jobId = this.view.getJobId();
    if (!jobId) {
      this.view.renderAppointmentsTable?.([]);
      return;
    }
    this.model.fetchAppointmentByJobId(jobId, (appointments) => {
      this.view.renderAppointmentsTable?.(appointments);
    });
  }
}
