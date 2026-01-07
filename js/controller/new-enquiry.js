import { showLoader, hideLoader, createAlert } from "../helper.js";

export class NewInquiryController {
  constructor(model, view, plugin) {
    this.model = model;
    this.view = view;
    this.plugin = plugin;
    this.relatedRequestId = 0;
    this.#bindLoaderHelpers();
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
        placeholder: "Select",
        options: [
          "Pool Cleaning",
          "Pigeon Removal",
          "Lawn Maintenance",
          "Insulation Installation",
          "Vacuum, remove and dispose all dust and debris",
          "Wasp Removal",
          "Window Cleaning",
          "Possum Roof",
          "Rat Roof",
        ],
      },
      {
        id: "inquiry-source",
        placeholder: "Select",
        options: ["Web Form", "Phone Call", "Email", "SMS"],
      },
      {
        id: "inquiry-type",
        placeholder: "Select",
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

    this.services = null;
  }
  #bindLoaderHelpers() {
    // Cache the view's loader references so the controller can call helper-based loaders.
    this.loaderElement = this.view?.loaderElement || null;
    this.loaderMessageEl = this.view?.loaderMessageEl || null;
    this.loaderCounter = this.view?.loaderCounter || { count: 0 };
  }

  #showLoader(message) {
    showLoader(
      this.loaderElement,
      this.loaderMessageEl,
      this.loaderCounter,
      message
    );
  }

  #hideLoader(force = false) {
    hideLoader(this.loaderElement, this.loaderCounter, force);
  }

  #extractInquiryIdFromResult(result) {
    const managedData = result?.mutations?.PeterpmDeal?.managedData;
    if (managedData && typeof managedData === "object") {
      const keys = Object.keys(managedData);
      if (keys.length) return keys[0];
    }
    if (result?.resp?.id) return result.resp.id;
    if (result?.id) return result.id;
    return null;
  }

  async init() {
    if (!this.view?.isActive?.()) return;
    this.services = await this.fetchServices();

    this.view.onContactSelected((contact) => this.#handleSelection(contact));
    this.view.onManualAdd(() => {
      this.view.clearFeedback();
      this.view.clearRelated();
    });
    this.view.onSave((payload) => this.#handleSave(payload));

    this.#loadContacts();
    this.renderAllTabs();
    this.#initGlobalDropdownClose();

    flatpickr(".date-picker", {
      dateFormat: "d/m/Y",
      allowInput: true,
    });

    this.createInquiryDetailOption();
    this.showHideAddAddressModal();
    this.onSameAsContactCheckboxClicked();
    this.onAddPropertyButtonClick();

    this.renderDropdownForStates();
    this.onContactFieldChanges();
    this.onAddAffiliationButtonClicked();
    this.onAddPropertyContactButtonClicked();
    this.onAddContactSaveButtonClicked();
    this.onSubmitButtonClicked();
    this.onViewDetailLinkClicked();
    this.onEntityAddButtonClick();
  }

  renderAllTabs() {
    // Example: replace these with your actual data arrays
    const tabs = [
      { list: "noises-list", card: "noises-card", items: this.noises },
      { list: "services-list", card: "services-card", items: this.services },
      {
        list: "location-list",
        card: "location-card",
        items: this.pestLocations,
      },
      {
        list: "property-building-list",
        card: "property-building-card",
        items: this.buildingFeatures,
      },
      { list: "times-list", card: "times-card", items: this.times },
    ];

    tabs.forEach(({ list, card, items }) => {
      this.#renderDropdownOptionsForTab(items, list, card);
    });
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
      console.error("[NewInquiry] Failed to load contacts", error);
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
      this.#showLoader("Saving contact...");
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
      console.error("[NewInquiry] Failed to create contact", error);
      this.view.showFeedback(
        "Unable to save contact right now. Please try again."
      );
    } finally {
      this.view.setSaving(false);
      this.#hideLoader();
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
      console.error("[NewInquiry] Failed to load related data", error);
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
    if (!list || !card) return;

    // 1️⃣ Remove previously rendered dynamic items (keep static ones like "All")
    list
      .querySelectorAll('li[data-dynamic="true"]')
      .forEach((li) => li.remove());

    // 2️⃣ Track applied filters
    const applied = new Set(
      this.filters?.statuses?.map((x) => String(x.text).toLowerCase()) || []
    );

    // 3️⃣ Create a document fragment for better performance
    const frag = document.createDocumentFragment();

    // 4️⃣ Sort without mutating original array
    [...statuses]
      .sort((a, b) => a.text.localeCompare(b.text))
      .forEach(({ text = "", value = "" }) => {
        const textLower = text.toLowerCase();
        const id = `status-${textLower.replace(/[^a-z0-9]+/g, "-")}`;

        // 5️⃣ Create LI element with innerHTML for checkbox + label
        const li = document.createElement("li");
        li.className = "px-2 py-1 flex items-center gap-2";
        li.dataset.dynamic = "true"; // mark dynamic items for future cleanup
        li.innerHTML = `
            <input 
              id="${id}" 
              data-status 
              value="${value}" 
              type="checkbox" 
              class="h-4 w-4 accent-[#003882]"
              ${applied.has(textLower) ? "checked" : ""}
            >
            <label 
              for="${id}" 
              class="text-slate-700 text-sm font-normal font-['Inter'] leading-5 hover:!text-slate-700 active:!text-slate-700 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 "
            >
              ${text}
            </label>
          `;

        frag.appendChild(li);
      });

    // 6️⃣ Append all items at once for efficiency
    list.appendChild(frag);

    // 7️⃣ Initialize dropdown behavior once (important for memory)
    this.#initDropdownOnce(listId, cardId);
  }

  #initDropdownOnce(listId, cardId) {
    const card = document.getElementById(cardId);
    const btn = document.getElementById(`${listId.replace("-list", "-btn")}`);
    const allCheckbox = card?.querySelector(
      `#${listId.replace("-list", "-all")}`
    );
    const itemSelector = 'input[type="checkbox"]:not([id$="-all"])';

    if (!btn || !card) return;

    // 1️⃣ Prevent multiple initialization
    if (btn.dataset.initialized) return;
    btn.dataset.initialized = "true";

    // -----------------------------
    // BUTTON CLICK (toggle dropdown)
    // -----------------------------
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      card.classList.toggle("hidden");

      // Rotate icon if exists
      const icon = btn.querySelector("svg");
      if (icon) icon.classList.toggle("rotate-180");
    });

    // -----------------------------
    // CHECKBOX CHANGE (event delegation)
    // -----------------------------
    card.addEventListener("change", (e) => {
      const items = Array.from(card.querySelectorAll(itemSelector));
      if (e.target === allCheckbox) {
        // Toggle all checkboxes
        const next = allCheckbox.checked;
        items.forEach((c) => (c.checked = next));
      } else if (e.target.matches(itemSelector)) {
        // Update "All" checkbox based on individual items
        if (allCheckbox) {
          allCheckbox.checked = items.every((c) => c.checked);
        }
      }
    });

    // 3️⃣ Initialize "All" checkbox state
    if (allCheckbox) {
      const items = Array.from(card.querySelectorAll(itemSelector));
      allCheckbox.checked = items.every((c) => c.checked);
    }
  }

  #initGlobalDropdownClose() {
    // Ensure global listener is added only once
    if (window.__dropdownDocListenerAdded) return;
    window.__dropdownDocListenerAdded = true;

    document.addEventListener("click", (e) => {
      // Find all dropdown cards
      document.querySelectorAll("[data-dropdown-card]").forEach((card) => {
        const btnId = card.dataset.btn;
        const btn = document.getElementById(btnId);

        // If click is outside card and button → hide dropdown
        if (!card.contains(e.target) && e.target !== btn) {
          card.classList.add("hidden");
          btn?.querySelector("svg")?.classList.remove("rotate-180");
        }
      });
    });
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
    if (!saveBtn) return;

    saveBtn.addEventListener("click", async () => {
      let addressobj = {
        address_1: document.getElementById("adTopLine1").value,
        address_2: document.getElementById("adTopLine2").value,
        suburb_town: document.getElementById("adTopCity").value,
        state: document.getElementById("adTopState").value,
        postal_code: document.getElementById("adTopPostal").value,
      };
      document.getElementById("contact-address").value =
        JSON.stringify(addressobj);
      let elements = document.querySelectorAll(
        "#addressDetailsModalWrapper [data-contact-id]"
      );

      const isIndividual = this.view.getActiveTabs() === "individual";
      const contactId =
        typeof this.view.getContactId === "function"
          ? this.view.getContactId()
          : "";
      const loaderMessage = contactId
        ? "Updating contact..."
        : "Creating contact...";

      this.#showLoader(loaderMessage);
      try {
        if (isIndividual) {
          await this.view.getValuesFromContactDetailModal(elements, {
            skipLoader: true,
          });
        } else {
          await this.view.getEntityValuesFromContactDetailModal(elements, {
            skipLoader: true,
          });
        }
      } catch (error) {
        console.error("[NewInquiry] Failed to save contact from modal", error);
      } finally {
        this.#hideLoader();
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
      const residentImages = this.view.getResidentFeedbackImages?.() || [];
      const inquiryUniqueId = document.body.dataset.inquiryId;
      const isUpdating = Boolean(inquiryUniqueId);
      this.#showLoader(
        isUpdating ? "Updating inquiry..." : "Creating new enquiry..."
      );
      let result = null;
      try {
        if (isUpdating) {
          result = await this.model.updateExistingInquiry(
            inquiryUniqueId,
            dealsObj
          );
        } else {
          result = await this.model.createNewInquiry(dealsObj);
        }
      } catch (error) {
        console.error("[NewInquiry] Failed to save inquiry", error);
        this.view.customModalHeader.innerText = "Failed";
        this.view.customModalBody.innerText = isUpdating
          ? "Inquiry update failed."
          : "New inquiry creation failed.";
        this.view.toggleModal("statusModal");
        this.#hideLoader();
        return;
      }

      const isSuccessful = Boolean(result) && !result?.isCancelling;
      if (isSuccessful) {
        const inquiryId =
          this.#extractInquiryIdFromResult(result) || inquiryUniqueId || "";
        if (residentImages.length && inquiryId) {
          for (const img of residentImages) {
            const uploadObj = {
              type: "photo",
              property_name_id: selectedPropertyId,
              customer_id: contactId,
              company_id: companyId,
              job_id: "",
              inquiry_id: inquiryId,
            };
            uploadObj.photo_upload = img;
            await this.model.createNewUpload(uploadObj);
          }
        }
        if (inquiryId) {
          await createAlert(
            "Inquiry",
            isUpdating
              ? "Inquiry has been updated"
              : "New inquiry has been created",
            false,
            window.location.href,
            Date.now(),
            "",
            "",
            inquiryId,
            this.plugin
          );
        }
        this.view.customModalHeader.innerText = "Successful";
        this.view.customModalBody.innerText = isUpdating
          ? "Inquiry updated successfully."
          : "New inquiry created successfully.";
        this.view.toggleModal("statusModal");
      } else {
        this.view.customModalHeader.innerText = "Failed";
        this.view.customModalBody.innerText = isUpdating
          ? "Inquiry update failed."
          : "New inquiry creation failed.";
        this.view.toggleModal("statusModal");
      }
      this.#hideLoader();
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

      if (!contactId && !entityContactId) {
        this.view.showContactRequiredModal();
        return;
      }

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
    const checkbox = document.getElementById("same-as-contact");
    if (!checkbox) return;
    checkbox.addEventListener("change", () => {
      if (!checkbox.checked) return;
      let address = {};
      const addressField = document.getElementById("contact-address");
      if (addressField && addressField.value) {
        try {
          address = JSON.parse(addressField.value) || {};
        } catch (err) {
          console.warn("Unable to parse contact-address JSON", err);
        }
      }
      this.view.onSameAsContactCheckboxClicked(address);
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
    const inputs = document.querySelectorAll(
      '[placeholder="Search properties"], [data-contact-field="bot_address_line1"], [data-contact-field="bot_address_line2"], [data-contact-field="top_address_line1"], [data-contact-field="top_address_line2"]'
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

        if (
          input.getAttribute("data-contact-id") == "address" ||
          input.getAttribute("data-contact-id") == "address_2"
        ) {
          this.setAddressValuesToPopup(parsed);
        } else if (
          input.getAttribute("data-contact-id") == "postal_address" ||
          input.getAttribute("data-contact-id") == "postal_address_2"
        ) {
          this.setPostalAddressValuesToPopup(parsed);
        }

        if (input.matches('[placeholder="Search properties"]')) {
          const parsed = this.parseAddressComponents(place);
          this.view.setGoogleSearchAddress(parsed);
          return parsed;
        }
      });

      input.dataset.googlePlacesBound = "true";
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

  parseAddressComponents(place) {
    const components = place.address_components || [];

    const result = {
      "unit-number": "",
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
      if (c.types.includes("subpremise")) result["unit-number"] = c.long_name;
      if (c.types.includes("premise")) result["lot_number"] = c.long_name;
      if (c.types.includes("lot_number")) result["lot_number"] = c.long_name;

      if (c.types.includes("street_number")) result.street_number = c.long_name;
      if (c.types.includes("route")) result.street = c.long_name;

      if (c.types.includes("locality")) result["suburb_town"] = c.long_name;

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

    if (!result["unit-number"] && unitMatch) {
      result["unit-number"] = unitMatch[2] || unitMatch[1];
    }

    const lotMatch =
      formatted.match(/Lot\s*([\w-]+)/i) || formatted.match(/\bL(\d+)\b/i);

    if (!result["lot_number"] && lotMatch) {
      result["lot_number"] = lotMatch[1];
    }

    result["address_1"] = `${result.street_number} ${result.street}`.trim();
    result["address_2"] = result["unit-number"]
      ? `Unit ${result["unit-number"]}`
      : "";

    return result;
  }

  mapAddressToFields(parsed) {
    return {
      lot_number: parsed.lot_number || "",
      "unit-number": parsed.unit_number || "",
      address_1: `${parsed.street_number} ${parsed.street}`.trim(),
      suburb_town: parsed.city || parsed.suburb || "",
      postal_code: parsed.postcode || "",
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
          this.view.showContactRequiredModal();
          return;
        }

        const activeTab = this.view.getActiveTabs();
        let result = "";
        this.#showLoader("Adding new property...");

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
          this.view.setSelectedPropertyId(propertyId);
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
        console.error("[NewInquiry] Failed to create property", error);
        this.view.showFeedback("Unable to create property right now.");
      } finally {
        this.#hideLoader();
      }
    });
  }

  async fetchServices() {
    let services = await this.model.fetchServices();
    return services.resp.map((item) => {
      return { value: item.id, text: item.service_name };
    });
  }
}
