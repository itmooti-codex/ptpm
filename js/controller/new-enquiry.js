export class NewEnquiryController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.relatedRequestId = 0;
    this.noises = [
      { value: 768, text: "Fighting" },
      { value: 767, text: "Walking" },
      { value: 766, text: "Heavy" },
      { value: 765, text: "Footsteps" },
      { value: 764, text: "Running" },
      { value: 763, text: "Scurrying" },
      { value: 762, text: "Thumping" },
      { value: 761, text: "Hissing" },
      { value: 760, text: "Shuffle" },
      { value: 759, text: "Scratching" },
      { value: 758, text: "Can hear coming & going" },
      { value: 757, text: "Movement" },
      { value: 756, text: "Gnawing" },
      { value: 755, text: "Rolling" },
      { value: 754, text: "Dragging" },
      { value: 753, text: "Squeaking" },
      { value: 752, text: "Galloping" },
      { value: 751, text: "Poss Pee" },
      { value: 750, text: "Fast" },
      { value: 749, text: "Slow" },
      { value: 748, text: "Bad Smell" },
    ];
    this.pestLocations = [
      { value: 735, text: "Upper Ceiling" },
      { value: 734, text: "Between floors" },
      { value: 733, text: "In Walls" },
      { value: 732, text: "In House" },
      { value: 731, text: "Chimney" },
      { value: 730, text: "Garage" },
      { value: 729, text: "Kitchen" },
      { value: 728, text: "Hand Catch" },
      { value: 727, text: "On roof" },
      { value: 726, text: "Underneath House" },
      { value: 725, text: "Under Solar Panels" },
    ];

    this.times = [
      { value: "747", text: "Dawn" },
      { value: "746", text: "Dusk" },
      { value: "745", text: "Dusk & Dawn" },
      { value: "744", text: "During Day" },
      { value: "743", text: "Middle of night" },
      { value: "742", text: "Night" },
      { value: "741", text: "Early morning" },
      { value: "740", text: "Evening" },
      { value: "739", text: "1-2 am" },
      { value: "738", text: "3-4 am" },
      { value: "737", text: "7 - 8 pm" },
      { value: "736", text: "7.30-10 pm" },
    ];

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

    this.inquiryConfigs = [
      {
        id: "service-inquiry",
        placeholder: "Select Service",
        options: [
          "Insulation Installation",
          "Lawn Maintenance",
          "Materials",
          "Pigeon Removal",
          "Pigeon Removal - Option 1",
          "Pigeon Removal - Option 2",
          "Pool Cleaning",
          "Possum Roof",
          "R3.5 POLYESTER to ceiling cavity",
          "R4.1 ECOWOOL to ceiling cavity",
          "Rat Roof",
          "Vacuum, remove and dispose all dust and debris",
          "Wasp Removal",
          "Window Cleaning",
        ],
      },
      {
        id: "inquiry-source",
        placeholder: "Select Source",
        options: ["Web Form", "Phone Call", "Email", "SMS"],
      },
      {
        id: "inquiry-type",
        placeholder: "Select Type",
        options: [
          "General Inquiry",
          "Service Request or Quote",
          "Product or Service Information",
          "Customer Support or Technical Assistance",
          "Billing and Payment",
          "Appointment Scheduling or Rescheduling",
          "Feedback or Suggestions",
          "Complaint or Issue Reporting",
          "Partnership or Collaboration Inquiry",
          "Job Application or Career Opportunities",
          "Media or Press Inquiry",
        ],
      },
      {
        id: "referral-source",
        placeholder: "Select Referral Source",
        options: [
          "Google",
          "Bing",
          "Facebook",
          "Yellow Pages",
          "Referral",
          "Car Signage",
          "Returning Customers",
          "Other",
        ],
      },
    ];

    this.inputContactPopupFields = [
      "first_name",
      "last_name",
      "email",
      "sms_number",
      "office_phone",
    ];

    this.renderDropdownForStates();
    this.onContactFieldChanges();
    this.onAddAffiliationButtonClicked();
    this.onAddPropertyContactButtonClicked();
    this.onAddContactSaveButtonClicked();
    this.onSubmitButtonClicked();
    this.onViewDetailLinkClicked();
    this.onEntityAddButtonClick();
  }

  init() {
    if (!this.view?.isActive?.()) return;

    this.view.onContactSelected((contact) => this.#handleSelection(contact));
    this.view.onManualAdd(() => {
      this.view.clearFeedback();
      this.view.clearRelated();
    });
    this.view.onSave((payload) => this.#handleSave(payload));

    this.#loadContacts();
    this.#renderDropdownOptionsForTab(
      this.noises,
      "noises-list",
      "noises-card"
    );
    this.#renderDropdownOptionsForTab(
      this.pestLocations,
      "location-list",
      "location-card"
    );

    this.#renderDropdownOptionsForTab(this.times, "times-list", "times-card");

    flatpickr(".date-picker", {
      dateFormat: "d/m/Y",
      allowInput: true,
    });

    this.createInquiryDetailOption();
    this.showHideAddAddressModal();
    this.onSameAsContactCheckboxClicked();
    this.onAddPropertyButtonClick();
  }

  async #loadContacts() {
    try {
      const contacts = await this.model.loadContacts();
      if (!contacts.length) {
        this.view.showFeedback(
          "No contacts found. Try adding a new one.",
          "info"
        );
      }
      this.view.setContacts(contacts);
    } catch (error) {
      console.error("[NewEnquiry] Failed to load contacts", error);
      this.view.showFeedback("Unable to load contacts right now.");
    }
  }

  async #handleSave(payload = {}) {
    const normalized = this.#normalisePayload(payload);
    const validationError = this.#validate(normalized);
    if (validationError) {
      this.view.showFeedback(validationError);
      return;
    }

    const existing = this.#findByEmail(normalized.email);
    if (existing) {
      this.view.populateContactDetails(existing);
      this.view.showRelatedLoading();
      this.#loadRelated(existing.fields.email).catch(() => {});
      this.view.showFeedback(
        "Contact already exists. Selected existing contact.",
        "info"
      );
      return;
    }

    try {
      this.view.showLoader("Saving contact...");
      this.view.setSaving(true);
      const contact = await this.model.createContact(normalized);
      if (!contact) {
        this.view.showFeedback(
          "Unable to save contact right now. Please try again."
        );
        return;
      }

      this.view.setContacts(this.model.getContacts());
      this.view.populateContactDetails(contact);
      await this.#loadRelated(contact.fields.email);
      this.view.showFeedback("Contact saved and selected.", "success");
    } catch (error) {
      console.error("[NewEnquiry] Failed to create contact", error);
      this.view.showFeedback(
        "Unable to save contact right now. Please try again."
      );
    } finally {
      this.view.setSaving(false);
      this.view.hideLoader();
    }
  }

  #handleSelection(contact) {
    if (!contact) return;
    this.view.clearPropertyFieldValues(
      "#property-information input, #property-information select"
    );
    this.view.populateContactDetails(contact);
    this.view.showRelatedLoading();
    this.#loadRelated(contact.fields?.email).catch(() => {});
  }

  async #loadRelated(email) {
    const normalized = email?.trim();
    if (!normalized) {
      this.view.clearRelated();
      return;
    }

    const requestId = ++this.relatedRequestId;
    this.view.showRelatedLoading();
    try {
      const related = await this.model.fetchRelated(normalized);
      // this.view.createPropertyList(related.properties || []);
      if (this.relatedRequestId !== requestId) return;
      this.view.renderRelated(related);
    } catch (error) {
      console.error("[NewEnquiry] Failed to load related data", error);
      if (this.relatedRequestId !== requestId) return;
      this.view.renderRelated();
    }
  }

  #findByEmail(email) {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) return null;
    return this.model
      .getContacts()
      .find((entry) => (entry.fields.email || "").toLowerCase() === normalized);
  }

  #normalisePayload(payload) {
    if (!payload) return {};
    const result = { ...payload };
    ["first_name", "last_name", "email", "sms_number", "office_phone"].forEach(
      (key) => {
        if (result[key]) result[key] = result[key].trim();
      }
    );
    return result;
  }

  #validate(payload) {
    if (!payload.first_name) return "First name is required.";
    if (!payload.email) return "Email is required.";
    return null;
  }

  #renderDropdownOptionsForTab(statuses, listId, cardId) {
    const list = document.getElementById(listId);
    const card = document.getElementById(cardId);
    if (!card || !list) return;

    // Remove previous dynamic items (keep static ones like 'All')
    Array.from(list.querySelectorAll('li[data-dynamic="true"]')).forEach((n) =>
      n.remove()
    );

    // Sort alphabetically by text
    statuses.sort((a, b) => a.text.localeCompare(b.text));

    const frag = document.createDocumentFragment();

    // Get applied filters (lowercased)
    const applied = Array.isArray(this.filters?.statuses)
      ? this.filters.statuses.map((x) => String(x.text).toLowerCase())
      : [];

    statuses.forEach((s) => {
      const text = s.text || "";
      const value = s.value || "";
      const textLower = text.toLowerCase();

      const id = `status-${textLower.replace(/[^a-z0-9]+/g, "-")}`;

      const li = document.createElement("li");
      li.className = "px-2 py-1 flex items-center gap-2";
      li.setAttribute("data-dynamic", "true");

      const checkedAttr = applied.includes(textLower) ? "checked" : "";

      li.innerHTML = `
        <input 
          id="${id}" 
          data-status 
          value="${value}" 
          ${checkedAttr} 
          type="checkbox" 
          class="h-4 w-4 accent-[#003882]"
        >
        <label for="${id}">${text}</label>
      `;

      frag.appendChild(li);
    });

    list.appendChild(frag);

    // Re-bind dropdown interactions depending on which list is rendered
    if (listId === "noises-list") {
      this.#initDropdown(
        "noises-btn",
        "noises-card",
        "noise-all",
        'input[type="checkbox"]:not(#noise-all)'
      );
    } else if (listId == "location-list") {
      this.#initDropdown(
        "location-btn",
        "location-card",
        "location-all",
        'input[type="checkbox"]:not(#location-all)'
      );
    } else if (listId == "times-list") {
      this.#initDropdown(
        "times-btn",
        "times-card",
        "times-all",
        'input[type="checkbox"]:not(#times-all)'
      );
    }
  }

  #initDropdown(dropdownId, cardId, allCheckboxId, itemSelector) {
    const btn = document.getElementById(dropdownId);
    const card = document.getElementById(cardId);
    if (!btn || !card) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");

      const icon = btn.querySelector("svg");
      if (icon) icon.classList.toggle("rotate-180");
    });

    document.addEventListener("click", (e) => {
      if (
        !card.classList.contains("hidden") &&
        !card.contains(e.target) &&
        e.target !== btn
      ) {
        card.classList.add("hidden");
        const icon = btn.querySelector("svg");
        if (icon) icon.classList.remove("rotate-180");
      }
    });

    const allToggle = card.querySelector(`#${allCheckboxId}`);
    const itemBoxes = Array.from(card.querySelectorAll(itemSelector));

    const syncAllCheckbox = () => {
      const allChecked = itemBoxes.every((c) => c.checked);
      if (allToggle) allToggle.checked = allChecked;
    };

    itemBoxes.forEach((box) => {
      box.addEventListener("change", () => {
        syncAllCheckbox();
      });
    });

    if (allToggle) {
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        itemBoxes.forEach((c) => (c.checked = next));
      });
    }

    syncAllCheckbox();
  }

  createInquiryDetailOption() {
    this.view.createOptionsForSelectbox(this.inquiryConfigs);
  }

  showHideAddAddressModal() {
    const element = document.querySelector(
      "[data-contact-id='add-new-contact']"
    );

    element.addEventListener("click", () => {
      this.view.clearPropertyFieldValues(
        "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
      );
      document.querySelector("[data-search-panel]").classList.toggle("hidden");

      document.querySelector('[data-contact-id="contact-id"]').value = "";
      this.view.toggleModal("addressDetailsModalWrapper");
      // document
      //   .querySelector(
      //     '#addressDetailsModalWrapper [data-contact-field="affiliationsrole"]'
      //   )
      //   .closest(".hidden")
      //   ?.classList.remove("hidden");

      document
        .querySelector(
          '#addressDetailsModalWrapper [data-contact-field="account_type"]'
        )
        .closest("div")
        .classList.add("hidden");
    });
  }

  renderDropdownForStates() {
    this.view.renderDropdownOptionsForStates(this.stateOptions);
  }

  onContactFieldChanges() {
    this.view.onContactFieldChanges(this.inputContactPopupFields);
  }

  onAddAffiliationButtonClicked() {
    let addContactBtn = document.getElementById("add-contact-btn");
    addContactBtn.addEventListener("click", () => {
      // Reset modal fields before opening (preserve search input)
      if (typeof this.view.resetAffiliationModal === "function") {
        this.view.resetAffiliationModal({ preserveSearch: true });
      } else {
        this.view.affiliationId = null;
      }
      const saveBtn = document.getElementById("pcSaveBtn");
      saveBtn.classList = "hover:[#003882]";
      if (saveBtn) saveBtn.textContent = "Save Contact";
      this.view.toggleModal("propertyContactModalWrapper");
      const contacts = this.model.getContacts();
      if (typeof this.view.setAffiliationContacts === "function") {
        this.view.setAffiliationContacts(contacts);
      }
    });
  }

  onAddPropertyContactButtonClicked() {
    let element = document.querySelector(
      "[data-contact-id='add-new-property-contact']"
    );

    element.addEventListener("click", () => {
      if (this.view.getActiveTabs() === "individual") {
        document.querySelector("[data-contact-field='contact_id']").value = "";
      }
      this.view.toggleModal("addressDetailsModalWrapper");
    });
  }

  onAddContactSaveButtonClicked() {
    let saveBtn = document.getElementById("updateAddressDetailsBtn");
    saveBtn.addEventListener("click", () => {
      let addressobj = {
        "address-1": document.getElementById("adTopLine1").value,
        "address-2": document.getElementById("adTopLine2").value,
        "suburb-town": document.getElementById("adTopCity").value,
        state: document.getElementById("adTopState").value,
        "postal-code": document.getElementById("adTopPostal").value,
      };
      document.getElementById("contact-address").value =
        JSON.stringify(addressobj);
      let elements = document.querySelectorAll(
        "#addressDetailsModalWrapper [data-contact-id]"
      );

      if (this.view.getActiveTabs() === "individual") {
        this.view.getValuesFromContactDetailModal(elements);
      } else {
        this.view.getEntityValuesFromContactDetailModal(elements);
      }
    });
  }

  onSubmitButtonClicked() {
    let submitBtn = document.getElementById("submit-btn");
    let dealsObj = {};
    submitBtn.addEventListener("click", async () => {
      let inquiryValues = this.view.getValuesFromFields(
        "[data-inquiry-id]",
        "data-inquiry-id"
      );
      let feedbackValues = this.view.getValuesFromFields(
        "[data-feedback-id]",
        "data-feedback-id"
      );
      let accountType = null;
      let contactId = "";
      let companyId = "";
      let activeTab = this.view.getActiveTabs();
      if (activeTab === "individual") {
        accountType = "contact";
        contactId = document.querySelector(
          '[data-contact-field="contact_id"]'
        ).value;
      } else if (activeTab === "entity") {
        accountType = "company";
        companyId = document.querySelector(
          '[data-contact-field="entity-id"]'
        ).value;
      }

      Object.assign(dealsObj, inquiryValues, feedbackValues);
      dealsObj["account_type"] = accountType;
      const selectedPropertyInput = document.getElementById(
        "selected-property-id"
      );
      const selectedPropertyId = selectedPropertyInput?.value?.trim();
      if (selectedPropertyId) {
        dealsObj.property_id = selectedPropertyId;
      } else {
        this.view.customModalBody.innerText =
          "Please add or select a property before saving inquiry details.";
        this.view.customModalHeader.innerText = "Failed";
        this.view.toggleModal("statusModal");
        return;
      }

      if (!contactId && !companyId) {
        this.view.customModalBody.innerText =
          "Please select a contact before saving inquiry details.";
        this.view.customModalHeader.innerText = "Failed";
        this.view.toggleModal("statusModal");
        return;
      }
      if (contactId) {
        dealsObj["primary_contact_id"] = contactId;
      } else {
        dealsObj["company_id"] = companyId;
      }
      this.view.showLoader("creating new enquiry...");
      let result = await this.model.createNewInquiry(dealsObj);

      if (!result.isCancelling) {
        this.view.customModalHeader.innerText = "Successful";
        this.view.customModalBody.innerText =
          "New inquiry created successfully.";
        this.view.toggleModal("statusModal");
      } else {
        this.view.customModalHeader.innerText = "Failed";
        this.view.customModalBody.innerText = "New inquiry creation failed.";
        this.view.toggleModal("statusModal");
      }
      this.view.hideLoader();
      return;
    });
  }

  onViewDetailLinkClicked() {
    let link = document.getElementById("view-contact-detail");
    link.addEventListener("click", () => {
      let contactId = document.querySelector(
        "[data-contact-field='contact_id']"
      ).value;

      let entityContactId = document.querySelector(
        "[data-contact-field='entity-id']"
      ).value;

      let activeTab = this.view.getActiveTabs();
      if (activeTab == "individual") {
        this.view.onViewDetailLinkClicked(contactId, "individual");
        // document
        //   .getElementById("affiliations-role-section")
        //   .classList.remove("hidden");
        document
          .getElementById("account-type-section")
          .closest("div")
          .classList.add("hidden");
      } else {
        // document
        //   .getElementById("affiliations-role-section")
        //   .classList.add("hidden");
        document
          .getElementById("account-type-section")
          .closest("div")
          .classList.remove("hidden");
        this.view.onViewDetailLinkClicked(entityContactId, "entity");
        document
          .getElementById("company-name-section")
          .classList.remove("hidden");
      }
    });
  }

  onSameAsContactCheckboxClicked() {
    let checkbox = document.getElementById("same-as-contact");
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        let address = JSON.parse(
          document.getElementById("contact-address").value
        );
        this.view.onSameAsContactCheckboxClicked(address);
      }
    });
  }

  onEntityAddButtonClick() {
    let addEntityBtn = document.querySelector(
      '[data-entity-id="add-new-entity"]'
    );
    if (addEntityBtn) {
      addEntityBtn.addEventListener("click", () => {
        this.view.clearPropertyFieldValues(
          "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
        );
        document.querySelector('[data-contact-id="entity-id"]').value = "";
        const primaryContactID = document.querySelector(
          "[data-contact-field='contact_id']"
        );
        if (primaryContactID) primaryContactID.value = "";
        this.view.toggleModal("addressDetailsModalWrapper");
        document;
        // .querySelector(
        //   '#addressDetailsModalWrapper [data-contact-field="affiliationsrole"]'
        // )
        // .closest("div")
        // .classList.add("hidden");
        document
          .querySelector(
            '#addressDetailsModalWrapper [data-contact-field="account_type"]'
          )
          .closest("div")
          .classList.remove("hidden");
      });
    }
  }

  initAutocomplete() {
    const input = document.querySelector('[placeholder="Search properties"]');
    const autocomplete = new google.maps.places.Autocomplete(input, {
      types: ["address"],
      componentRestrictions: { country: "au" },
    });
    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      const parsed = this.parseAddressComponents(place);
      this.view.setGoogleSearchAddress(parsed);
      return parsed;
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

  mapAddressToFields(parsed) {
    return {
      "lot-number": parsed.lot_number || "",
      "unit-number": parsed.unit_number || "",
      "address-1": `${parsed.street_number} ${parsed.street}`.trim(),
      "suburb-town": parsed.city || parsed.suburb || "",
      "postal-code": parsed.postcode || "",
      state: parsed.state || "",
    };
  }

  onAddPropertyButtonClick() {
    let button = document.getElementById("add-property-btn");
    button.addEventListener("click", async () => {
      try {
        const details = this.view.getValuesFromFields(
          "[data-property-id]",
          "data-property-id"
        );

        const propertyName = document.querySelector(
          '[placeholder="Search properties"]'
        ).value;
        details["property_name"] = propertyName;

        const contactField = document.querySelector(
          "[data-contact-field='contact_id']"
        );
        const entityField = document.querySelector(
          "[data-contact-field='entity-id']"
        );

        const contactId = contactField?.value || "";
        const entityId = entityField?.value || "";

        if (!contactId && !entityId) {
          this.view.customModalBody.innerText =
            "Please select a contact or a company";
          this.view.customModalHeader.innerText = "failed";
          return;
        }

        const activeTab = this.view.getActiveTabs();
        let result = "";
        this.view.showLoader("Adding new company...");

        if (activeTab === "individual") {
          result = await this.model.createNewProperties(details, contactId, "");
        } else {
          result = await this.model.createNewProperties(details, "", entityId);
        }

        if (!result.isCancelling) {
          let propertyId = Object.keys(
            result.mutations.PeterpmProperty.managedData
          )[0];
          document.getElementById("selected-property-id").value = propertyId;
          this.view.customModalHeader.innerText = "Successful";
          this.view.customModalBody.innerText =
            "New Property created successfully.";
          this.view.toggleModal("statusModal");
        } else {
          this.view.customModalHeader.innerText = "Failed";
          this.view.customModalBody.innerText = "Properties create failed.";
          this.view.toggleModal("statusModal");
        }
      } catch (error) {
        console.error("[NewEnquiry] Failed to create property", error);
        this.view.showFeedback("Unable to create property right now.");
      } finally {
        this.view.hideLoader();
      }
    });
  }
}
