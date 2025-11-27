export class JobDetailController {
  constructor(model, view) {
    this.model = model;
    this.view = view;

    this.contacts = [];
    this.properties = [];
    this.serviceProvider = [];
    this.inquiries = [];
    this.jobs = [];

    this.setupOptions();
    this.handleCreateAppointment();
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
  }

  async setupSearches() {
    try {
      await this.model.fetchContacts((data) => {
        this.view.setupClientSearch(data);
        this.contacts = data;
        this.setupOptions("contact");
      });
    } catch (err) {
      console.error("Failed to load contacts", err);
    }

    try {
      await this.model.fetchServiceProviders((data) => {
        this.serviceProvider = data;
        this.view.setupServiceProviderSearch(data);
        this.setupOptions("serviceProvider");
      });
    } catch (err) {
      console.error("Failed to load service providers", err);
    }

    try {
      await this.model.fetchPropertyOptions((data) => {
        this.properties = data;
        this.setupOptions("properties");
      });
    } catch (err) {
      console.error("Failed to load properties", err);
    }

    try {
      await this.model.fetchInquiries((data) => {
        this.inquiries = data;
        this.setupOptions("inquiry");
      });
    } catch (err) {
      console.error("Failed to load inquiries", err);
    }

    try {
      await this.model.fetchJobs((data) => {
        this.jobs = data;
        this.setupOptions("job");
      });
    } catch (err) {
      console.error("Failed to load jobs", err);
    }
  }

  onDealInfoButtonClicked() {
    let dealInfoBtn = document.getElementById("deal-info-btn");
    dealInfoBtn.addEventListener("click", (event) => {
      this.view.toggleDealInformation();
    });
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
    const input = document.querySelector('[data-field="properties"]');
    if (!input || !window.google?.maps?.places?.Autocomplete) return;

    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ["address"],
      componentRestrictions: { country: "au" },
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      input.value = place?.formatted_address || input.value;
      let parsedProperty = this.parseAddressComponents(place);
      let mappedPropertyObj = this.createPropertyObj(parsedProperty);
      let newObj = {
        Properties: mappedPropertyObj,
        property_name: place?.formatted_address,
      };
      let mutationResult = this.model.createNewProperty(newObj);
      return mutationResult;
    });
  }

  parseAddressComponents(place) {
    const components = place.address_components || [];

    const result = {
      "unit-number": "",
      "lot-number": "",
      "address-1": "",
      "address-2": "",
      "suburb-town": "",
      "suburb-town": "",
      state: "",
      "postal-code": "",
      street_number: "",
      street: "",
    };

    components.forEach((c) => {
      if (c.types.includes("subpremise")) result["unit-number"] = c.long_name;
      if (c.types.includes("premise")) result["lot-number"] = c.long_name;
      if (c.types.includes("lot_number")) result["lot-number"] = c.long_name;

      if (c.types.includes("street_number")) result.street_number = c.long_name;
      if (c.types.includes("route")) result.street = c.long_name;

      if (c.types.includes("locality")) result["suburb-town"] = c.long_name;

      if (
        c.types.includes("sublocality") ||
        c.types.includes("sublocality_level_1")
      ) {
        result["suburb-town"] = c.long_name;
      }

      if (c.types.includes("administrative_area_level_1"))
        result.state = c.short_name;

      if (c.types.includes("postal_code")) result["postal-code"] = c.long_name;
    });

    const formatted = place.formatted_address || "";

    const unitMatch =
      formatted.match(/(Unit|Apt|Apartment|Suite)\s*([\w-]+)/i) ||
      formatted.match(/^([\w-]+)\//);

    if (!result["unit-number"] && unitMatch) {
      result["unit-number"] = unitMatch[2] || unitMatch[1];
    }

    const lotMatch =
      formatted.match(/Lot\s*([\w-]+)/i) || formatted.match(/\bL(\d+)\b/i);

    if (!result["lot-number"] && lotMatch) {
      result["lot-number"] = lotMatch[1];
    }

    result["address-1"] = `${result.street_number} ${result.street}`.trim();
    result["address-2"] = result["unit-number"]
      ? `Unit ${result["unit-number"]}`
      : "";

    return result;
  }

  createPropertyObj(property) {
    const mapKeys = {
      "address-1": "address_1",
      "address-2": "address_2",
      "lot-number": "lot_number",
      "unit-number": "unit_number",
      "suburb-town": "suburb_town",
      "postal-code": "postal_code",
      state: "state",
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
    element.addEventListener("input", () => {
      let value = element.value;
      this.model.fetchProperties(value);
    });
  }

  resetSelectOptions(selectEl) {
    if (!selectEl) return;
    const placeholder =
      selectEl.querySelector("option[disabled][selected]")?.outerHTML ||
      '<option value="" disabled selected>Select</option>';
    selectEl.innerHTML = placeholder;
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
      let result = await this.model.createAppointment(getFieldValues);
      console.log(result);
    });
  }
}
