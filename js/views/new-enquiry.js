import {
  initOperationLoader,
  initCustomModal,
  showLoader,
  hideLoader,
  showUnsavedChangesModal,
  showResetConfirmModal,
  resetFormFields,
  showAlertModal,
  uploadImage,
  initFileUploadArea,
  buildUploadCard,
  ensureFilePreviewModal,
} from "../helper.js";

export class NewInquiryView {
  constructor(model) {
    this.model = model;
    this.sections = {
      individual: document.querySelector('[data-contact-section="individual"]'),
      entity: document.querySelector('[data-contact-section="entity"]'),
    };
    this.section = this.sections.individual;

    this.feedbackEl = document.querySelector("[data-contact-feedback]");
    this.searchRoot = document.querySelector(
      '[data-search-root="contact-individual"]'
    );
    this.searchInput = this.searchRoot?.querySelector("[data-search-input]");
    this.resultsContainer = this.searchRoot?.querySelector(
      "[data-search-results]"
    );
    this.emptyState = this.searchRoot?.querySelector("[data-search-empty]");
    this.addButton = this.searchRoot?.querySelector("[data-search-add]");
    this.panel = this.searchRoot?.querySelector("[data-search-panel]");

    this.contactIdInput = this.section?.querySelector(
      '[data-contact-field="contact_id"]'
    );
    this.manualInputs = Array.from(
      this.section?.querySelectorAll("[data-contact-field]") || []
    ).filter(
      (input) =>
        input.dataset.contactField &&
        input.dataset.contactField !== "contact_id"
    );

    this.saveFooter = document.getElementById("contact-add-new-footer");
    this.saveButton = this.saveFooter?.querySelector("[data-contact-save]");
    this.saveLabel = this.saveFooter?.querySelector(
      "[data-contact-save-label]"
    );
    this.saveIcon = this.saveFooter?.querySelector("[data-contact-save-icon]");
    this.baseSaveLabel =
      this.saveButton?.dataset.baseLabel || "Add New Contact";
    this.loadingSaveLabel =
      this.saveButton?.dataset.loadingLabel || "Adding...";

    this.sameAsCheckbox = this.section?.querySelector("[data-same-as-contact]");
    this.firstNameInput = this.section?.querySelector(
      '[data-contact-field="first_name"]'
    );
    this.lastNameInput = this.section?.querySelector(
      '[data-contact-field="last_name"]'
    );
    this.workRequestedInput = this.section?.querySelector(
      '[data-contact-field="work_requested_by"]'
    );

    this.tabs = {
      individual: document.getElementById("individual"),
      entity: document.getElementById("entity"),
    };

    this.related = {
      container: document.querySelector("[data-related]"),
      banner: document.querySelector("[data-related-banner]"),
      bannerText: document.querySelector("[data-related-banner-text]"),
      tabButtons: Array.from(document.querySelectorAll("[data-related-tab]")),
      panels: new Map(
        Array.from(document.querySelectorAll("[data-related-panel]")).map(
          (panel) => [panel.dataset.relatedPanel, panel]
        )
      ),
    };
    this.relatedData = this.#emptyRelated();
    this.relatedHasContact = false;
    this.relatedLoading = false;
    this.activeRelatedTab = "properties";

    this.contacts = [];
    this.filteredContacts = [];
    this.selectHandler = null;
    this.manualHandler = null;

    this.#bindContactListDropdown();
    this.#bindSameAsContact();
    this.#bindTabs();
    this.#bindRelatedTabs();
    this.#updateRelatedUI();
    this.#handleRelatedPropertiesClick();
    this.#createContactDetailsModalUI();
    this.#createPropertyContactModalUI();
    this.affiliationId = null;
    this.onAddNewContactButtonClick();
    this.contactId = null;
    this.propertyId = null;
    this.selectedPropertyInput = document.getElementById(
      "selected-property-id"
    );
    this.selectedPropertyCard = null;
    const customModal = initCustomModal();
    this.statusModel = customModal.modal;
    this.customModalHeader = customModal.headerEl;
    this.customModalBody = customModal.bodyEl;
    this.customModalIcon = customModal.iconEl;

    this.loaderCounter = { count: 0 };
    this.loaderElement = initOperationLoader();
    this.loaderMessageEl =
      this.loaderElement?.querySelector("[data-loader-message]") || null;
    this.createSwithcAccountTypeModal();
    this.companyId = null;
    this.entityContactId = null;
    this.entityRelatedRequestId = 0;

    this.entityRelatedData = { properties: [], jobs: [], inquiries: [] };
    this.propertySearchData = [];
    this.propertySearchElements = null;
    this._propertySearchInitialized = false;
    this._propertyFooterInitialized = false;
    this._propertyPredictionRequestId = 0;

    this.bindCancelPrompt();
    this.bindResetPrompt();
    this.bindContactActionGuards();
    this.checkInquiryId();
    this.initResidentFeedbackUploads();
  }

  isActive() {
    return document.body?.dataset?.page === "new-inquiry";
  }

  setContacts(contacts = []) {
    this.contacts = Array.isArray(contacts) ? [...contacts] : [];
    this.#renderFiltered(this.searchInput?.value || "");
  }

  onContactSelected(handler) {
    this.selectHandler = typeof handler === "function" ? handler : null;
  }

  onManualAdd(handler) {
    this.manualHandler = typeof handler === "function" ? handler : null;
  }

  onSave(handler) {
    if (!this.saveButton || this._saveListenerBound) return;
    this.saveButton.addEventListener("click", (event) => {
      event.preventDefault();
      if (typeof handler === "function") handler(this.getFormValues());
    });
    this._saveListenerBound = true;
  }

  populateContactDetails(contact) {
    if (contact.id) {
      document.getElementById("view-contact-detail").classList.remove("hidden");
    }
    if (!contact?.fields || !this.section) return;

    Object.entries(contact.fields).forEach(([field, value]) => {
      const input = this.section.querySelector(
        `[data-contact-field="${field}"]`
      );
      if (!input) return;
      input.value = value || "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });

    if (this.contactIdInput && contact.fields.contact_id) {
      this.contactIdInput.value = contact.fields.contact_id;
    }

    if (this.searchInput && contact.label) {
      this.searchInput.value = contact.label;
      this.searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      this.searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    }

    this.exitManualMode();
    this.clearFeedback();
    this.relatedHasContact = true;
    this.#syncWorkRequested();
  }

  showFeedback(message, tone = "error") {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = message;
    this.feedbackEl.classList.remove(
      "hidden",
      "text-rose-600",
      "text-emerald-600",
      "text-slate-600"
    );
    const toneClass =
      tone === "success"
        ? "text-emerald-600"
        : tone === "info"
        ? "text-slate-600"
        : "text-rose-600";
    this.feedbackEl.classList.add(toneClass);
  }

  clearFeedback() {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = "";
    this.feedbackEl.classList.add("hidden");
    this.feedbackEl.classList.remove(
      "text-rose-600",
      "text-emerald-600",
      "text-slate-600"
    );
  }

  enterManualMode() {
    this.clearFeedback();
    this.#closePanel();
    this.showFooter();
    if (this.contactIdInput) this.contactIdInput.value = "";
    if (this.sameAsCheckbox) this.sameAsCheckbox.checked = false;
    this.manualInputs.forEach((input) => {
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    if (this.workRequestedInput) {
      this.workRequestedInput.value = "";
      this.workRequestedInput.dispatchEvent(
        new Event("input", { bubbles: true })
      );
      this.workRequestedInput.dispatchEvent(
        new Event("change", { bubbles: true })
      );
    }
    if (this.searchInput) {
      this.searchInput.value = "";
      this.searchInput.dispatchEvent(new Event("input", { bubbles: true }));
      this.searchInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
    this.showFeedback(
      "Enter contact details and click Add New Contact.",
      "info"
    );
    this.manualInputs?.[0]?.focus?.();
  }

  exitManualMode() {
    this.hideFooter();
  }

  showFooter() {
    this.saveFooter?.classList.remove("hidden");
  }

  hideFooter() {
    this.saveFooter?.classList.add("hidden");
  }

  bindCancelPrompt() {
    const cancelBtn = document.querySelector(
      '[data-nav-action="cancel"], #cancel-btn'
    );
    if (!cancelBtn || cancelBtn.dataset.boundCancelModal) return;
    cancelBtn.dataset.boundCancelModal = "true";
    cancelBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showUnsavedChangesModal({
        onDiscard: () => window.history.back(),
        onSave: () => window.history.back(),
      });
    });
  }

  bindResetPrompt() {
    const resetBtn = document.querySelector(
      '[data-nav-action="reset"], #reset-btn'
    );
    if (!resetBtn || resetBtn.dataset.boundResetModal) return;
    resetBtn.dataset.boundResetModal = "true";
    resetBtn.addEventListener("click", (e) => {
      e.preventDefault();
      showResetConfirmModal({
        onConfirm: () => resetFormFields(document),
      });
    });
  }

  hasSelectedContact() {
    const contactId =
      document.querySelector("[data-contact-field='contact_id']")?.value || "";
    const entityId =
      document.querySelector("[data-contact-field='entity-id']")?.value || "";
    return Boolean(contactId || entityId);
  }

  showContactRequiredModal() {
    showAlertModal({
      title: "Select a Contact",
      message: "Please select a contact first.",
      buttonLabel: "OK",
    });
  }

  bindContactActionGuards() {
    const viewBtn = document.getElementById("view-contact-detail");
    const addPropertyBtn = document.getElementById("add-property-btn");
    const guard = (handler) => (e) => {
      if (!this.hasSelectedContact()) {
        e?.preventDefault?.();
        e?.stopImmediatePropagation?.();
        this.showContactRequiredModal();
        return;
      }
      handler?.(e);
    };

    if (viewBtn && !viewBtn.dataset.boundContactGuard) {
      viewBtn.dataset.boundContactGuard = "true";
      viewBtn.addEventListener(
        "click",
        guard(() => {
          // passthrough: actual logic handled in controller listener
        }),
        { capture: true }
      );
    }

    if (addPropertyBtn && !addPropertyBtn.dataset.boundContactGuard) {
      addPropertyBtn.dataset.boundContactGuard = "true";
      addPropertyBtn.addEventListener(
        "click",
        guard(() => {
          // passthrough; controller handles real action
        }),
        { capture: true }
      );
    }
  }

  setSaving(isSaving) {
    if (!this.saveButton) return;
    const active = Boolean(isSaving);
    this.saveButton.disabled = active;
    this.saveButton.classList.toggle("!opacity-70", active);
    this.saveButton.classList.toggle("!pointer-events-none", active);
    if (this.saveLabel) {
      this.saveLabel.textContent = active
        ? this.loadingSaveLabel
        : this.baseSaveLabel;
    }
    this.saveIcon?.classList.toggle("animate-pulse", active);
  }

  getFormValues() {
    const payload = {};
    const allow = new Set([
      "first_name",
      "last_name",
      "email",
      "sms_number",
      "office_phone",
    ]);
    this.manualInputs.forEach((input) => {
      const field = input.dataset.contactField;
      if (!field || field === "contact_id" || !allow.has(field)) return;
      const value = input.value?.trim();
      if (value) payload[field] = value;
    });
    return payload;
  }

  clearRelated() {
    this.relatedHasContact = false;
    this.relatedLoading = false;
    this.relatedData = this.#emptyRelated();
    this.#setSelectedProperty("");
    this.#setActiveRelatedTab("properties");
  }

  showRelatedLoading() {
    this.relatedHasContact = true;
    this.relatedLoading = true;
    this.relatedData = this.#emptyRelated();
    this.#setSelectedProperty("");
    this.#setActiveRelatedTab(this.activeRelatedTab);
  }

  renderRelated(related = {}) {
    this.relatedHasContact = true;
    this.relatedLoading = false;
    this.relatedData = {
      properties: Array.isArray(related.properties)
        ? [...related.properties]
        : [],
      jobs: Array.isArray(related.jobs) ? [...related.jobs] : [],
      inquiries: Array.isArray(related.inquiries) ? [...related.inquiries] : [],
    };
    this.#setActiveRelatedTab(this.activeRelatedTab);
  }

  async #loadEntityRelated(entityId) {
    const normalized = entityId ? String(entityId).trim() : "";
    if (!normalized) {
      this.clearRelated();
      return;
    }

    const requestId = ++this.entityRelatedRequestId;
    this.showRelatedLoading();
    try {
      const related = await this.model.fetchRelatedForEntity(normalized);
      if (this.entityRelatedRequestId !== requestId) return;
      // this.createPropertyList(related.properties || []);
      this.renderRelated(related);
    } catch (error) {
      console.error("[NewInquiry] Failed to load entity related data", error);
      if (this.entityRelatedRequestId !== requestId) return;
      this.renderRelated();
    }
  }

  #bindContactListDropdown() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener("focus", () => {
      this.#openPanel();
      this.#renderFiltered(this.searchInput.value || "");
    });

    this.searchInput.addEventListener("input", (event) => {
      this.#renderFiltered(event.target.value || "");
      this.#openPanel();
    });

    const emailInput = this.manualInputs.find(
      (input) => input.dataset.contactField === "email"
    );
    if (emailInput) {
      emailInput.addEventListener("blur", () => {
        const value = emailInput.value?.trim();
        if (!value) return;
        const match = this.contacts.find(
          (entry) =>
            (entry.fields.email || "").toLowerCase() === value.toLowerCase()
        );
        if (match && this.selectHandler) {
          this.#closePanel();
          this.selectHandler(match);
        } else if (!match) {
          this.showFeedback(
            "No matching contact found. Use Add New Contact to create one.",
            "info"
          );
        }
      });
    }

    this.resultsContainer?.addEventListener("mousedown", (event) => {
      const button = event.target.closest("button[data-option-index]");
      if (!button) return;
      event.preventDefault();
      const index = Number(button.dataset.optionIndex);
      const contact = this.filteredContacts?.[index];
      document.querySelector("[data-contact-id]").value = contact.id;
      if (contact) {
        this.#closePanel();
        if (this.selectHandler) this.selectHandler(contact);
      }
    });

    this.addButton?.addEventListener("click", (event) => {
      event.preventDefault();
      this.enterManualMode();
      if (this.manualHandler) this.manualHandler();
    });

    document.addEventListener("click", (event) => {
      if (!this.searchRoot) return;
      if (!this.searchRoot.contains(event.target)) {
        this.#closePanel();
      }
    });
  }

  #bindSameAsContact() {
    if (!this.sameAsCheckbox) return;

    if (!this.sameAsCheckbox.dataset.boundSameAs) {
      this.sameAsCheckbox.addEventListener("change", () =>
        this.#syncWorkRequested()
      );
      this.sameAsCheckbox.dataset.boundSameAs = "true";
    }

    [this.firstNameInput, this.lastNameInput]
      .filter(Boolean)
      .forEach((input) => {
        if (input.dataset.boundSameAs) return;
        input.addEventListener("input", () => this.#syncWorkRequested());
        input.dataset.boundSameAs = "true";
      });
  }

  #bindTabs() {
    const { individual, entity } = this.tabs;
    if (
      !individual ||
      !entity ||
      !this.sections.individual ||
      !this.sections.entity
    )
      return;

    individual.addEventListener("click", (event) => {
      event.preventDefault();
      this.#switchSection("individual");
    });

    entity.addEventListener("click", (event) => {
      event.preventDefault();
      this.toggleModal("switchAccountTypeModalWrapper");
    });

    this.#switchSection("individual");
  }

  #bindRelatedTabs() {
    if (!this.related?.tabButtons?.length) return;
    this.related.tabButtons.forEach((button) => {
      const tab = button.dataset.relatedTab;
      if (!tab) return;
      if (!button.dataset.baseLabel) {
        button.dataset.baseLabel = button.textContent
          .trim()
          .replace(/\s*\(.*?\)$/, "");
      }
      button.addEventListener("click", (event) => {
        event.preventDefault();
        this.#setActiveRelatedTab(tab);
      });
    });
    this.#setActiveRelatedTab(this.activeRelatedTab);
  }

  #renderFiltered(query = "") {
    if (!this.resultsContainer) return;

    const term = query.trim().toLowerCase();
    const items = term
      ? this.contacts.filter((item) =>
          [item.label, item.meta]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(term))
        )
      : [...this.contacts];

    this.filteredContacts = items;
    this.resultsContainer.innerHTML = "";

    if (!items.length) {
      this.resultsContainer.classList.add("hidden");
      this.emptyState?.classList.remove("hidden");
      return;
    }

    this.resultsContainer.classList.remove("hidden");
    this.emptyState?.classList.add("hidden");

    items.forEach((item, index) => {
      const li = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.optionIndex = String(index);
      button.className =
        "!flex !w-full !flex-col !gap-1 !px-4 !py-2 !text-left !text-sm !text-slate-700 !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent hover:!text-slate-700 active:!text-slate-700 focus:!text-slate-700 focus-visible:!text-slate-700";

      const label = document.createElement("span");
      label.className =
        "font-normal text-xs font-['Inter'] justify-start text-neutral-700";
      label.textContent = item.label || "Unnamed Contact";
      button.appendChild(label);

      if (item.meta) {
        const meta = document.createElement("span");
        meta.className = "text-xs text-neutral-700";
        meta.textContent = item.meta;
        button.appendChild(meta);
      }

      li.appendChild(button);
      this.resultsContainer.appendChild(li);
    });
  }

  #openPanel() {
    this.panel?.classList.remove("hidden");
  }

  #closePanel() {
    this.panel?.classList.add("hidden");
  }

  #syncWorkRequested() {
    if (!this.workRequestedInput) return;
    if (!this.sameAsCheckbox?.checked) return;

    const first = this.firstNameInput?.value?.trim() || "";
    const last = this.lastNameInput?.value?.trim() || "";
    const full = [first, last].filter(Boolean).join(" ").trim();
    this.workRequestedInput.value = full;
    this.workRequestedInput.dispatchEvent(
      new Event("input", { bubbles: true })
    );
    this.workRequestedInput.dispatchEvent(
      new Event("change", { bubbles: true })
    );
  }

  #switchSection(type) {
    const targetKey = type === "entity" ? "entity" : "individual";
    const isIndividual = targetKey === "individual";

    Object.entries(this.sections).forEach(([key, section]) => {
      if (!section) return;
      const active = key === targetKey;
      section.classList.toggle("hidden", !active);
      if (active) {
        section.setAttribute("data-active-section", "true");
      } else {
        section.removeAttribute("data-active-section");
      }
    });

    Object.entries(this.tabs).forEach(([key, button]) => {
      if (!button) return;
      let span = button.querySelector("span");
      span.classList.remove("hidden");

      const active = key === targetKey;
      if (active) {
        button.setAttribute("data-active-tab", "true");
      } else {
        button.removeAttribute("data-active-tab");
      }

      /* Background */
      button.classList.toggle("!bg-blue-700", active);
      button.classList.toggle("!bg-white", !active);
      button.classList.toggle("hover:!bg-blue-700", active);
      button.classList.toggle("active:!bg-blue-700", active);
      button.classList.toggle("focus:!bg-blue-700", active);
      button.classList.toggle("focus-visible:!bg-blue-700", active);
      button.classList.toggle("hover:!bg-white", !active);
      button.classList.toggle("active:!bg-white", !active);
      button.classList.toggle("focus:!bg-white", !active);
      button.classList.toggle("focus-visible:!bg-white", !active);

      /* Outline */
      button.classList.toggle("!outline", !active);
      button.classList.toggle("!outline-1", !active);
      button.classList.toggle("!outline-slate-500", !active);
      /* Shadow */
      button.classList.toggle("!shadow-sm", active);

      /* Text */
      span.classList.toggle("!text-white", active);
      span.classList.toggle("!text-slate-500", !active);
      span.classList.toggle("hover:!text-white", active);
      span.classList.toggle("active:!text-white", active);
      span.classList.toggle("focus:!text-white", active);
      span.classList.toggle("focus-visible:!text-white", active);
      span.classList.toggle("hover:!text-slate-500", !active);
      span.classList.toggle("active:!text-slate-500", !active);
      span.classList.toggle("focus:!text-slate-500", !active);
      span.classList.toggle("focus-visible:!text-slate-500", !active);
    });

    if (document?.body) {
      document.body.dataset.activeContactTab = targetKey;
      document
        .getElementById(targetKey)
        .setAttribute("data-active-tab", "true");
    }

    // Clear the opposite tab's selected contact/entity id when switching
    const individualIdInput = document.querySelector(
      "[data-contact-field='contact_id']"
    );
    const entityIdInput = document.querySelector(
      "[data-contact-field='entity-id']"
    );
    if (isIndividual) {
      if (entityIdInput) entityIdInput.value = "";
      this.entityContactId = null;
    } else {
      if (individualIdInput) individualIdInput.value = "";
      this.contactId = null;
    }
    const companySection = document.getElementById("company-name-section");
    if (companySection) {
      companySection.classList.toggle("hidden", isIndividual);
    }

    // Repoint section-scoped references to the active tab
    this.section = this.sections[targetKey] || this.section;
    this.contactIdInput = this.section?.querySelector(
      '[data-contact-field="contact_id"]'
    );
    this.manualInputs = Array.from(
      this.section?.querySelectorAll("[data-contact-field]") || []
    ).filter(
      (input) =>
        input.dataset.contactField &&
        input.dataset.contactField !== "contact_id"
    );
    this.sameAsCheckbox = this.section?.querySelector("[data-same-as-contact]");
    this.firstNameInput = this.section?.querySelector(
      '[data-contact-field="first_name"]'
    );
    this.lastNameInput = this.section?.querySelector(
      '[data-contact-field="last_name"]'
    );
    this.workRequestedInput = this.section?.querySelector(
      '[data-contact-field="work_requested_by"]'
    );

    // Ensure "Same as contact" binding is applied for the active tab
    this.#bindSameAsContact();

    if (!isIndividual) {
      this.#closePanel();
    }
  }

  #setActiveRelatedTab(tab) {
    const target = ["properties", "jobs", "inquiries"].includes(tab)
      ? tab
      : "properties";
    this.activeRelatedTab = target;

    if (this.related?.tabButtons?.length) {
      this.related.tabButtons.forEach((button) => {
        const isActive = button.dataset.relatedTab === target;
        button.dataset.active = isActive ? "true" : "false";
      });
    }

    if (this.related?.panels?.size) {
      this.related.panels.forEach((panel, key) => {
        panel.classList.toggle("hidden", key !== target);
      });
    }

    this.#updateRelatedUI();
  }

  #updateRelatedUI() {
    if (!this.related?.container) return;

    const counts = {
      properties: this.relatedData.properties.length,
      jobs: this.relatedData.jobs.length,
      inquiries: this.relatedData.inquiries.length,
    };

    if (this.related.tabButtons?.length) {
      this.related.tabButtons.forEach((button) => {
        const tab = button.dataset.relatedTab;
        if (!tab) return;
        const base =
          button.dataset.baseLabel ||
          button.textContent.trim().replace(/\s*\(.*?\)$/, "");
        button.dataset.baseLabel = base;
        button.textContent = `${base} (${counts[tab] ?? 0})`;
      });
    }

    if (this.related.panels?.size) {
      this.related.panels.forEach((panel, key) => {
        if (!panel) return;
        const items = this.relatedData[key] || [];

        if (this.relatedLoading) {
          panel.innerHTML = "";
          return;
        }

        if (!items.length) {
          if (!this.relatedHasContact) {
            panel.innerHTML = "";
            return;
          }
          if (key === this.activeRelatedTab) {
            const message = this.#emptyStateFor(key);
            panel.innerHTML = message;
          } else {
            panel.innerHTML = "";
          }
          return;
        }

        panel.innerHTML = items
          .map((item) => this.#renderRelatedCard(key, item))
          .join("");
      });
    }

    if (this.related.banner) {
      const activeItems = this.relatedData[this.activeRelatedTab] || [];
      let message = "Select a contact to view related details.";
      let show = true;

      if (!this.relatedHasContact) {
        message = "Select a contact to view related details.";
      } else if (this.relatedLoading) {
        message = "Loading related data...";
      } else if (activeItems.length >= 1) {
        message = this.#activeMessageFor(this.activeRelatedTab);
      } else {
        show = false;
      }

      this.related.banner.classList.toggle("hidden", !show);
      if (this.related.bannerText) {
        this.related.bannerText.textContent = message;
      } else if (show) {
        this.related.banner.textContent = message;
      }
    }
  }

  #renderRelatedCard(type, item = {}) {
    switch (type) {
      case "jobs":
        return this.#renderJobCard(item);
      case "inquiries":
        return this.#renderInquiryCard(item);
      case "properties":
      default:
        return this.#renderPropertyCard(item);
    }
  }

  #renderPropertyCard(item = {}) {
    const title = this.#escapeHtml(
      item.property_name ||
        item.label ||
        item.unique_id ||
        item.id ||
        "Property"
    );
    const address = this.#escapeHtml(
      item.address ||
        item.address_line ||
        item.Address_1 ||
        item.address_1 ||
        "Address unavailable"
    );
    const mapUrl = item.map_url || item.mapLink || null;
    const owner = this.#escapeHtml(
      item.owner_name ||
        item.primary_owner_contact ||
        item.primary_owner_contact_for_property ||
        ""
    );
    const status = this.#escapeHtml(item.status || "");
    const hasStatus = Boolean(status);

    return `
      <article id=${item.id} class="flex gap-1 items-stretched justify-between">
        <div class="flex rounded justify-center items-center gap-3 bg-white p-3">
          <span class="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M3 10.5 12 4l9 6.5v8.5a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />
            </svg>
          </span>
          <div class="space-y-1">
            <p class="text-sm font-semibold text-slate-800">${title}</p>
            <p class="text-xs text-slate-500">${address}</p>
            ${
              owner
                ? `<p class="text-[11px] text-slate-400">Owner: <span class="font-medium text-slate-600">${owner}</span></p>`
                : ""
            }
          </div>
        </div>
        <div class="flex items-center rounded justify-center flex-col bg-white p-3">
          <a 
            class="items-center gap-1 text-xs hover:text-sky-900 mb-[-10px]"
            href="${this.#escapeHtml(mapUrl)}"
            target="_blank"
            rel="noopener noreferrer"
            
          >
            <svg width="74" height="31" viewBox="0 0 74 31" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path fill-rule="evenodd" clip-rule="evenodd"
                d="M32.9165 2.33341C32.7618 2.33341 32.6134 2.39487 32.504 2.50427C32.3946 2.61367 32.3332 2.76204 32.3332 2.91675V11.0834C32.3332 11.2381 32.3946 11.3865 32.504 11.4959C32.6134 11.6053 32.7618 11.6667 32.9165 11.6667H41.0832C41.2379 11.6667 41.3863 11.6053 41.4956 11.4959C41.605 11.3865 41.6665 11.2381 41.6665 11.0834V8.16675C41.6665 7.84458 41.9277 7.58341 42.2498 7.58341C42.572 7.58341 42.8332 7.84458 42.8332 8.16675V11.0834C42.8332 11.5475 42.6488 11.9927 42.3206 12.3209C41.9924 12.649 41.5473 12.8334 41.0832 12.8334H32.9165C32.4524 12.8334 32.0073 12.649 31.6791 12.3209C31.3509 11.9927 31.1665 11.5475 31.1665 11.0834V2.91675C31.1665 2.45262 31.3509 2.0075 31.6791 1.67931C32.0073 1.35112 32.4524 1.16675 32.9165 1.16675H35.8332C36.1553 1.16675 36.4165 1.42792 36.4165 1.75008C36.4165 2.07225 36.1553 2.33341 35.8332 2.33341H32.9165ZM39.3332 2.33341C39.011 2.33341 38.7498 2.07225 38.7498 1.75008C38.7498 1.42792 39.011 1.16675 39.3332 1.16675H42.2498C42.572 1.16675 42.8332 1.42792 42.8332 1.75008V4.66675C42.8332 4.98891 42.572 5.25008 42.2498 5.25008C41.9277 5.25008 41.6665 4.98891 41.6665 4.66675V3.15837L38.2873 6.53756C38.0595 6.76537 37.6902 6.76537 37.4624 6.53756C37.2346 6.30975 37.2346 5.94041 37.4624 5.7126L40.8415 2.33341H39.3332Z"
                fill="#0052CC"
              />
            </svg>
          </a>
          <div class="justify-start text-blue-700 text-xs font-normal leading-3">View on Map</div>
        </div>
      </article>
    `;
  }

  #renderJobCard(item = {}) {
    const unique = this.#escapeHtml(item.unique_id || item.id || "—");
    const status = this.#escapeHtml(
      item.status || item.job_status || "Status Unknown"
    );
    const created = this.#formatDate(
      item.created_at || item.createdAt || item.date_added
    );
    const completed = this.#formatDate(
      item.completed_at || item.date_completed
    );
    const assignee = this.#escapeHtml(
      item.provider_name || item.assigned_to || item.assignee || "—"
    );
    const property = this.#escapeHtml(
      item.property_name || item.property || item.address || "—"
    );

    return `
      <article class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="flex items-start justify-between gap-3">
          <div class="space-y-1">
            <a href="#" class="text-sm font-semibold text-sky-900 hover:text-sky-600">#${unique}</a>
            <p class="text-xs text-slate-500">Created On: ${created}</p>
            <p class="text-xs text-slate-500">Completed On: ${completed}</p>
            <p class="text-xs text-slate-500">${assignee}</p>
            <p class="text-xs text-slate-500">${property}</p>
          </div>
          <span class="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
            ${status}
          </span>
        </div>
      </article>
    `;
  }

  #renderInquiryCard(item = {}) {
    const unique = this.#escapeHtml(item.unique_id || item.id || "—");
    const service = this.#escapeHtml(
      item.service_name || item.service || "Service name unavailable"
    );
    const jobId = this.#escapeHtml(
      item.previous_job_id || item.related_job_id || item.job_id || "—"
    );
    const property = this.#escapeHtml(
      item.property_name || item.property || item.address || "—"
    );
    const posted = this.#formatDateTime(item.created_at || item.createdAt);

    return `
      <article class="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="space-y-1">
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-sky-900">#${unique}</span>
          </div>
          <p class="flex items-center gap-2 text-xs text-slate-600">
            <span class="flex h-5 w-5 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 4h14l-1 12H4L3 4Z" />
                <path d="M7 9h6" />
              </svg>
            </span>
            ${service}
            <span class="text-slate-400">•</span>
            <span class="text-slate-500">Previous job ID: <span class="font-medium text-sky-700">${jobId}</span></span>
          </p>
          <p class="flex items-center gap-2 text-xs text-slate-500">
            <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <path d="M10 18s6-4.35 6-10a6 6 0 1 0-12 0c0 5.65 6 10 6 10Z" />
              <circle cx="10" cy="8" r="2.5" />
            </svg>
            ${property}
          </p>
          <p class="text-xs text-slate-500">Posted on: ${posted}</p>
        </div>
      </article>
    `;
  }

  #emptyMessageFor(tab) {
    switch (tab) {
      case "jobs":
        return "No related jobs found.";
      case "inquiries":
        return "No previous inquiries found.";
      case "properties":
      default:
        return "No related properties found.";
    }
  }
  #emptyStateFor(tab) {
    if (tab === "properties") {
      return `
      <div class="flex flex-col items-center justify-center gap-4 px-4 text-center hover:text-center active:text-center focus:text-center focus-visible:text-center">
          <svg width="200" height="100" viewBox="0 0 200 132" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_5351_49300)">
            <path d="M91.6627 3.50666C93.3094 3.09985 93.2497 -0.0949624 97.2155 0.0796518C98.06 0.116653 98.8863 0.273389 99.6247 0.703065C101.136 1.58237 101.528 3.17926 102.677 3.95546C103.502 4.51256 104.627 4.27974 105.43 4.98319C105.868 5.3663 106.121 5.93109 106.26 6.48383C106.535 7.5708 106.392 8.94881 105.77 9.90004C105.462 10.3707 105.012 10.7394 104.442 10.8286C103.937 10.9078 103.462 10.7382 103.014 10.5239C102.999 10.5652 102.982 10.6064 102.968 10.648C102.848 10.997 102.891 11.5065 102.877 11.8798C102.815 13.5919 102.812 15.892 101.079 16.81C100.997 16.8534 100.913 16.8921 100.83 16.933L100.408 17.1415C100.344 17.2525 100.305 17.306 100.295 17.4359C99.9053 17.7423 99.6952 18.9253 99.5639 19.4184C97.4531 19.3149 95.3115 19.0746 93.2846 18.4513C93.4322 18.1175 93.5163 17.8496 93.5612 17.4868C93.5334 16.9696 93.4226 16.4462 93.3416 15.9344C91.7687 15.2208 90.1823 14.6859 89.1094 13.2508C88.1305 11.9409 87.9094 10.2642 88.1767 8.68626C88.5163 6.67986 89.47 5.25655 91.1276 4.08933C90.5871 4.22383 90.0299 4.34938 89.504 4.53356C88.1499 5.0073 88.0827 5.8968 87.5186 7.02805L87.4159 7.03928L87.2514 6.77112C87.2353 6.29322 87.2996 5.86666 87.4896 5.42368C87.8086 4.67907 88.3311 4.2679 89.0794 3.98997C89.1351 3.96918 89.1915 3.95006 89.2474 3.92948C89.9683 3.66548 91.0165 3.94091 91.5846 3.52828C91.2503 3.27384 90.9648 3.08676 90.8931 2.64648C90.8088 2.12783 90.986 1.48904 91.3132 1.07932C91.466 0.888072 91.5178 0.845042 91.7449 0.787253C91.8848 1.02465 91.8635 1.20155 91.8015 1.46513C91.6205 2.23364 91.4414 2.69678 91.6627 3.50666Z" fill="#263238"/>
            <path d="M102.9 9.39697C102.916 9.78196 102.947 10.1445 103.015 10.5241C102.999 10.5654 102.983 10.6066 102.969 10.6482C102.849 10.9972 102.891 11.5067 102.878 11.88C102.816 13.5921 102.812 15.8922 101.08 16.8102C100.998 16.8536 100.914 16.8923 100.83 16.9332L100.408 17.1417C100.344 17.2527 100.306 17.3062 100.295 17.4361C99.9058 17.7425 99.6958 18.9255 99.5645 19.4186C97.4536 19.3151 95.3121 19.0748 93.2852 18.4516C93.4328 18.1177 93.5169 17.8498 93.5618 17.487L93.6526 17.6072C94.8751 17.8718 97.582 17.0923 98.6609 16.4242C99.7703 15.7371 99.8981 14.4032 100.186 13.2354C99.7257 13.1597 99.3175 13.1013 98.9626 12.7741C98.7023 12.534 98.4 12.1862 98.4442 11.8067C98.4724 11.5647 98.6311 11.3547 98.8027 11.1922C99.7797 10.2657 99.9305 11.3707 100.79 11.3996C101.604 11.077 102.326 10.0437 102.9 9.39697Z" fill="#F7999A"/>
            <path d="M18.6579 102.87C18.5278 102.704 18.555 102.43 18.537 102.22C16.5475 99.8305 15.1685 97.0438 13.7529 94.3C12.6523 92.167 11.5416 90.017 10.6077 87.8052C6.97022 79.1901 4.64769 69.2335 5.30421 59.8509C6.23907 46.4903 12.6758 32.9344 22.9042 24.134C33.2969 15.1923 45.7815 11.2082 59.4654 12.2391C67.6562 12.8562 75.68 16.235 82.0923 21.282C83.5042 22.3933 84.8212 23.4564 85.9999 24.82C85.4579 25.3515 85.0385 25.896 84.6383 26.5395C83.9412 27.6606 83.3706 28.8671 82.7543 30.0337C81.5247 32.3604 80.3216 34.687 79.1675 37.0526C78.2748 38.8821 77.2362 40.717 76.5573 42.6354C76.3844 43.1242 76.2924 43.595 76.2944 44.1143C76.3001 45.4638 76.9535 46.6667 77.9134 47.5885C79.5673 49.1768 82.0786 50.1885 84.1063 51.2423C84.2001 52.5612 84.4128 57.0742 85.2671 57.8872C85.2911 58.1977 85.3579 58.4944 85.1825 58.7706C83.4024 59.0635 81.4825 58.6623 79.6821 58.8382C71.8782 58.6979 64.0452 58.7802 56.2393 58.8245L53.1811 67.1816C52.6986 68.4769 51.9036 70.0102 51.6798 71.3657C51.4483 72.7686 51.6498 74.4435 51.6552 75.8803L51.651 85.7548L51.6614 116.95C51.6621 121.406 51.7531 125.88 51.6535 130.334L45.4245 130.334C43.47 130.331 29.3391 130.51 28.8592 130.221L28.7042 130.381C25.3936 130.154 21.9955 130.395 18.6721 130.319C18.8443 127.169 18.7036 123.918 18.7063 120.757L18.6579 102.87Z" fill="#ECECED"/>
            <path d="M28.8281 80.3532L45.412 80.3203L45.4233 112.072C45.4176 118.152 45.2969 124.258 45.4243 130.334C43.4698 130.331 29.3389 130.51 28.859 130.221L28.704 130.381C25.3934 130.154 21.9953 130.395 18.6719 130.32C18.8441 127.169 18.7034 123.919 18.7061 120.757L18.6577 102.87C18.6911 100.823 18.6185 98.7706 18.6222 96.722L18.6567 80.339C21.9679 80.3438 25.2876 80.3956 28.5978 80.3216L28.8281 80.3532Z" fill="#003882"/>
            <path d="M34.3359 101.046L38.1871 101.047L38.194 107.259L34.346 107.26L34.3359 101.046Z" fill="#C0C9D5"/>
            <path d="M36.2547 113.655L38.1875 113.628C38.1466 115.744 38.1831 117.865 38.1856 119.981L36.091 119.976L34.2627 119.979C34.2684 117.879 34.2625 115.779 34.2451 113.679L36.2547 113.655Z" fill="#C0C9D5"/>
            <path d="M34.2686 88.3654L38.196 88.3594L38.1962 94.7656L34.3144 94.7478C34.2785 92.6205 34.2632 90.4931 34.2686 88.3654Z" fill="#C0C9D5"/>
            <path d="M18.6567 80.3387C21.9679 80.3435 25.2876 80.3953 28.5978 80.3213L28.8281 80.3529C28.9309 91.2679 28.9566 102.183 28.9051 113.099L28.9095 124.119C28.9101 126.134 29.0078 128.213 28.859 130.221L28.7041 130.381C25.3934 130.153 21.9953 130.395 18.6719 130.319C18.8441 127.169 18.7034 123.918 18.7061 120.757L18.6577 102.87C18.6911 100.822 18.6185 98.7703 18.6222 96.7217L18.6567 80.3387Z" fill="#003882"/>
            <path d="M28.5976 80.3213L28.8278 80.3529C28.9307 91.2679 28.9564 102.183 28.9049 113.099L28.9092 124.119C28.9099 126.134 29.0076 128.213 28.8587 130.221L28.7038 130.381C28.3863 129.258 28.5965 127.248 28.5971 126.036L28.6034 117.723L28.5976 80.3213Z" fill="#010714"/>
            <path d="M152.746 10.7475C154.33 10.4914 155.945 10.1513 157.541 10.0068C156.991 12.0492 156.496 14.13 155.865 16.1478C154.823 20.5232 153.71 24.8808 152.528 29.2206L152.649 29.2192C154.797 29.178 156.858 28.8957 159.026 29.0113C159.496 29.0378 159.965 29.0728 160.434 29.1165C160.903 29.1601 161.37 29.2124 161.837 29.2732C162.304 29.3341 162.769 29.4034 163.234 29.4813C163.698 29.5593 164.16 29.6457 164.621 29.7405C165.082 29.8355 165.541 29.9388 165.999 30.0505C166.456 30.1622 166.911 30.2822 167.363 30.4107C167.816 30.5392 168.266 30.6758 168.714 30.8206C169.162 30.9656 169.607 31.1187 170.048 31.28C170.49 31.4412 170.929 31.6105 171.365 31.7879C171.801 31.9653 172.233 32.1505 172.662 32.3437C173.091 32.5369 173.516 32.7379 173.938 32.9468C174.359 33.1556 174.776 33.3721 175.19 33.5962C175.603 33.8203 176.012 34.0519 176.417 34.2911C176.822 34.5301 177.222 34.7766 177.618 35.0305C178.014 35.2842 178.405 35.5452 178.791 35.8134C179.177 36.0815 179.558 36.3567 179.934 36.6388C181.118 37.5106 182.302 38.3814 183.37 39.3954C192.745 48.2974 197.371 60.3082 197.615 73.0943C197.901 88.0276 191.972 102.718 183.071 114.548C182.127 115.803 181.131 116.988 180.089 118.162C179.622 118.688 178.784 119.388 178.451 119.971C178.387 120.084 178.389 120.112 178.367 120.224C180.324 120.587 182.17 121.42 183.326 123.109C184.332 124.581 184.843 126.615 184.48 128.367C184.346 129.014 184.13 129.683 183.861 130.285C184.15 130.363 184.416 130.378 184.713 130.389C185.98 130.152 188.788 130.337 190.182 130.34C193.072 130.347 195.998 130.239 198.883 130.313C199.235 130.322 199.551 130.44 199.764 130.738C199.936 130.977 199.946 131.18 199.915 131.459C199.792 131.648 199.747 131.767 199.525 131.851C198.823 132.114 193.643 131.919 192.494 131.922L168.871 131.939L45.5181 131.952L12.6665 131.995C8.90417 131.992 5.11592 132.074 1.35722 132.005C1.0022 131.998 0.704021 131.974 0.381098 131.823C0.214501 131.63 0.0809729 131.446 0.0903048 131.175C0.0984259 130.94 0.181724 130.778 0.349741 130.622C0.606025 130.384 1.01893 130.329 1.35348 130.299C2.96999 130.154 4.7325 130.337 6.37083 130.332L18.6712 130.32C21.9945 130.395 25.3927 130.154 28.7033 130.381L28.8582 130.221C29.3382 130.51 43.4691 130.331 45.4236 130.335L51.6526 130.334C51.7522 125.881 51.6611 121.406 51.6605 116.95L51.6501 85.7551L51.6542 75.8807C51.6488 74.4438 51.4474 72.769 51.6789 71.366C51.9027 70.0105 52.6977 68.4772 53.1801 67.182L56.2384 58.8248C64.0442 58.7805 71.8772 58.6982 79.6812 58.8385C81.4816 58.6627 83.4014 59.0639 85.1816 58.771C85.357 58.4947 85.2902 58.1981 85.2662 57.8875C84.4119 57.0745 84.1991 52.5616 84.1054 51.2426C82.0776 50.1889 79.5664 49.1772 77.9125 47.5888C76.9526 46.6671 76.2991 45.4641 76.2935 44.1146C76.2914 43.5953 76.3835 43.1245 76.5563 42.6358C77.2353 40.7173 78.2739 38.8824 79.1666 37.0529C80.3206 34.6873 81.5238 32.3608 82.7534 30.034C83.3697 28.8675 83.9403 27.661 84.6373 26.5399C85.0376 25.8963 85.457 25.3519 85.9989 24.8204C87.3463 23.6538 88.6816 22.6487 90.234 21.7717C90.6046 20.4132 90.7837 19.0373 90.9601 17.6433C91.7505 17.8468 92.5198 18.168 93.2845 18.4517C95.3114 19.0749 97.453 19.3152 99.5639 19.4187C99.6952 18.9257 99.9052 17.7427 100.295 17.4363C101.129 17.4464 101.965 17.4697 102.799 17.4379C102.185 18.708 101.504 19.9415 100.757 21.1385C102.544 22.2716 104.457 22.7356 106.053 23.7078C106.211 22.6175 106.561 21.5152 106.846 20.4511C107.475 18.1044 108.166 15.7645 108.571 13.3663C109.909 13.4199 111.267 13.6226 112.598 13.7637L120.401 14.6208C121.881 14.7846 123.401 15.0266 124.891 15.0195C126.114 15.0137 127.351 14.7503 128.555 14.5562L133.819 13.7203C140.136 12.78 146.445 11.7891 152.746 10.7475Z" fill="#374349"/>
            <path d="M79.5322 110.29H80.9032C80.5341 112.425 80.5397 114.681 80.375 116.843L80.317 117.112C80.0382 117.216 79.9199 117.246 79.6295 117.171C79.3487 116.772 79.5272 111.202 79.5322 110.29Z" fill="#C0C9D5"/>
            <path d="M79.6338 94.2261L82.367 94.2762C82.023 96.2069 81.9584 98.2931 81.8077 100.251C81.7781 100.379 81.7294 100.497 81.6831 100.62C81.1081 100.862 80.2363 100.722 79.6152 100.692L79.6338 94.2261Z" fill="#C0C9D5"/>
            <path d="M79.6438 79.3283C80.9744 79.3168 82.3048 79.3249 83.635 79.3526C83.3762 81.386 83.258 83.4677 83.1472 85.5142L83.0357 85.6547C82.0108 85.8699 80.6956 85.7227 79.6367 85.7175L79.6438 79.3283Z" fill="#C0C9D5"/>
            <path d="M112.216 77.8398C112.865 78.9923 113.391 80.2144 114.003 81.3881C115.133 83.5566 116.337 85.6807 117.257 87.9496C116.252 88.1313 112.481 87.9777 111.161 88.0244C111.191 85.8773 111.179 83.7252 111.166 81.5778C111.158 80.3803 111.087 79.158 111.185 77.9654C111.488 77.8299 111.883 77.8554 112.216 77.8398Z" fill="#003882"/>
            <path d="M93.9879 100.298C94.1691 103.03 93.9797 105.862 93.9996 108.606L94.0234 120.32C94.0309 122.571 93.9595 124.858 94.1438 127.103C93.2741 126.856 91.8442 126.667 91.3864 125.793C90.9632 124.985 91.5503 123.601 90.481 123.248C89.9557 123.074 89.2998 123.165 88.752 123.198C88.9342 122.631 89.0914 122.094 89.1818 121.504L90.7785 121.574L92.6169 109.253C93.0396 106.267 93.3983 103.258 93.9879 100.298Z" fill="#FEFEFE"/>
            <path d="M156.973 10.3359L157.041 10.3771C157.161 11.0699 156.211 13.9571 155.973 14.8325C151.476 15.1189 146.98 15.9323 142.505 16.4634C142.282 15.9336 143.218 13.1418 143.401 12.4718L156.973 10.3359Z" fill="#FEFEFE"/>
            <path d="M135.766 37.0425C135.153 40.2988 134.361 43.5502 133.54 46.7608C131.976 46.7666 126.038 47.0554 125.031 46.3646C124.652 45.7073 124.899 44.85 125.027 44.1443C125.371 43.5741 134.373 38.0332 135.766 37.0425Z" fill="#FEFEFE"/>
            <path d="M110.366 49.605C113.11 50.4049 115.881 51.0819 118.632 51.8486C117.478 56.5908 116.414 61.375 115.172 66.0931C113.793 65.6416 112.381 65.2005 110.955 64.9228C110.913 61.866 110.738 58.8007 110.746 55.746C110.788 53.6583 110.603 51.6794 110.366 49.605Z" fill="#FEFEFE"/>
            <path d="M147.713 88.1821C147.955 88.1846 148.13 88.1803 148.359 88.2734C148.494 88.47 148.55 88.6421 148.565 88.8781C148.606 89.5323 148.475 90.2303 148.48 90.8961L148.519 98.337L148.528 120.885C146.944 121.244 145.772 121.911 144.565 122.971L144.485 88.184C145.528 88.2698 146.669 88.259 147.713 88.1821Z" fill="#FEFEFE"/>
            <path d="M96.5654 81.1685C97.0769 85.696 97.3245 90.2557 97.7306 94.794C98.3655 101.799 99.1544 108.786 100.097 115.756C100.254 116.903 100.501 120.428 101.128 121.243C101.826 121.646 102.788 121.673 103.576 121.781C103.46 122.453 103.383 123.126 103.376 123.809C102.94 123.981 102.677 124.095 102.456 124.534C102.32 124.806 102.283 125.17 102.23 125.467C101.927 126.988 101.462 128.687 101.471 130.235C99.7128 130.396 97.8953 130.191 96.1227 130.303C96.0045 129.959 96.0742 129.509 95.9947 129.134C95.7723 128.086 95.2893 127.674 94.4187 127.133C94.2573 125.186 94.2928 123.188 94.2826 121.233C94.26 116.983 94.3544 112.722 94.25 108.474C94.3302 106.12 94.2947 103.75 94.2968 101.394C94.2974 100.453 94.2416 99.4944 94.3001 98.5555C94.4105 96.7842 94.7352 94.9794 94.9604 93.2166L96.5654 81.1685Z" fill="#ECECED"/>
            <path d="M111.188 88.2063C113.116 88.0698 115.095 88.1583 117.028 88.1681L117.037 101.676C117.038 103.758 116.847 106.331 117.101 108.371C117.03 110.803 117.082 113.247 117.083 115.68C117.05 119.526 117.052 123.372 117.089 127.217C115.757 126.986 114.013 126.915 113.183 125.697C112.662 124.933 112.434 123.449 111.359 123.254C111.044 123.197 110.666 123.261 110.35 123.303C110.467 122.749 110.537 122.255 110.539 121.686C110.721 121.637 110.882 121.581 111.054 121.503C111.195 121.255 111.202 121.027 111.217 120.749C111.263 119.927 111.196 119.08 111.194 118.254L111.195 112.347C111.281 104.3 111.278 96.2531 111.188 88.2063Z" fill="#FEFEFE"/>
            <path d="M108.799 13.6021C111.549 14.0145 114.357 14.2134 117.124 14.5117C119.654 14.7846 122.205 15.1703 124.744 15.306C124.269 17.3737 123.751 19.4309 123.192 21.4778C122.137 21.2354 120.916 20.8774 119.836 20.8955C120.166 21.2468 122.545 21.5805 123.146 21.6944C122.538 23.9276 122.113 26.2435 121.447 28.4526C118.617 27.8933 115.799 27.2771 112.994 26.6042C113.378 24.8002 113.91 22.9265 114.074 21.0943L114.021 21.0392C113.481 22.4458 112.928 25.1854 112.781 26.7357C114.61 27.249 116.481 27.6633 118.339 28.0582C119.346 28.2723 120.416 28.428 121.398 28.7286C120.686 31.5451 119.825 34.3909 119.282 37.2409C116.951 33.2753 112.81 28.6478 109.201 25.7876C108.273 25.052 107.218 24.4749 106.277 23.7534C107.068 20.3561 108.048 17.0112 108.799 13.6021Z" fill="#FEFEFE"/>
            <path d="M109.418 43.9238C111.544 45.3494 113.73 47.1771 116.291 47.7387C119.182 48.3728 122.48 45.6299 124.781 44.1408C124.676 44.8156 124.368 45.9431 124.872 46.5306C125.547 47.317 132.214 46.9835 133.489 46.9943C132.699 50.4696 131.876 53.9371 131.021 57.397C129.865 57.4712 125.267 57.5479 124.578 57.8414L124.556 57.9639C126.207 58.1967 129.113 57.662 130.923 57.6788C130.303 60.3028 129.786 62.9491 129.16 65.5716C124.603 65.7645 119.958 65.7812 115.423 66.2046C116.393 61.3314 117.777 56.5224 118.909 51.6834C117.156 51.2195 115.405 50.7449 113.658 50.2594C112.564 49.9576 111.429 49.5859 110.308 49.4017C110.274 47.6379 109.736 45.6706 109.418 43.9238Z" fill="#FEFEFE"/>
            <path d="M56.5205 59.0875C59.2347 59.0603 61.9506 59.0824 64.665 59.0878C67.1211 59.2414 69.6351 59.148 72.0963 59.148L85.261 59.1466C85.06 61.4407 84.895 63.7373 84.7658 66.0364C84.6785 67.7869 84.7545 69.8022 84.3865 71.4987C81.8178 71.3282 79.1604 71.4498 76.5819 71.4473L61.0844 71.4773C60.8216 70.0132 60.1057 68.5298 59.5583 67.1477C58.5063 64.4908 57.3719 61.8159 56.5205 59.0875Z" fill="#003882"/>
            <path d="M112.516 77.7539C116.917 77.8743 121.338 77.7959 125.742 77.7934L143.969 77.8662C145.048 79.5878 146.043 82.3768 146.883 84.3105C147.293 85.2555 147.836 86.1724 148.218 87.1155C148.321 87.3704 148.371 87.5876 148.356 87.8649L148.229 88.0168C147.939 88.0291 147.657 88.0329 147.374 88.1025L147.713 88.1821C146.669 88.259 145.528 88.2698 144.485 88.184C143.764 87.894 142.735 88.0441 141.967 88.0715L141.969 88.1281L141.803 88.1152L142.011 88.0807L141.927 88.4008L142.018 88.1308C142.593 88.1811 143.171 88.1123 143.739 88.1757C143.81 88.1836 143.881 88.1929 143.951 88.2017C141.461 88.426 138.797 88.2451 136.287 88.2484C131.317 88.2666 126.347 88.2538 121.376 88.2102C120.696 87.8449 118.694 88.3906 117.74 87.9821C117.473 87.868 117.485 87.7341 117.404 87.4774C115.957 84.1583 114.099 81.0138 112.516 77.7539Z" fill="#003882"/>
            <path d="M125.001 15.321C127.008 15.1163 129.02 14.7323 131.014 14.4213L143.139 12.5347C142.294 15.7668 141.479 19.0068 140.696 22.2544C140.24 24.0798 139.657 25.9006 139.304 27.7473C138.752 27.634 138.379 27.5785 137.892 27.9024C136.904 28.5595 136.178 29.8294 135.424 30.7367C135.195 30.5272 135.013 30.3042 134.687 30.2771C133.195 30.6534 130.846 32.2912 129.214 32.9687C129.693 30.7054 130.189 28.4458 130.702 26.1899C129.837 25.3131 128.965 24.4633 127.968 23.7343L127.937 23.7971C128.758 24.6288 129.665 25.4305 130.44 26.302C129.91 28.5351 129.419 30.7769 128.968 33.0273C127.539 33.7813 120.658 37.3577 119.676 37.5313L119.513 37.4369C119.959 34.7572 120.808 32.058 121.471 29.4213C122.609 24.7116 123.786 20.0115 125.001 15.321Z" fill="#FEFEFE"/>
            <path d="M142.283 16.7888C146.801 16.147 151.327 15.5722 155.862 15.0645C154.37 21.3682 152.691 27.6275 151.072 33.9005C149.021 34.0602 146.957 34.1082 144.903 34.208C144.067 37.4072 143.357 40.6348 142.549 43.84C139.855 43.9989 137.12 44.0109 134.436 44.2383C134.967 41.9307 135.682 39.5264 135.971 37.1808C135.989 37.1488 135.999 37.1112 136.025 37.0848C136.546 36.5457 136.685 35.8394 136.843 35.1104C136.552 33.6349 136.213 32.0386 135.424 30.7371C136.178 29.8297 136.904 28.5598 137.892 27.9028C138.379 27.5789 138.752 27.6344 139.304 27.7477C139.204 28.1185 139.023 28.5694 139.069 28.9534L139.185 28.9866C140.354 24.962 141.236 20.8467 142.283 16.7888Z" fill="#FEFEFE"/>
            <path d="M135.424 30.7367C136.178 29.8293 136.904 28.5594 137.892 27.9024C138.379 27.5785 138.752 27.634 139.304 27.7473C139.204 28.1181 139.024 28.569 139.069 28.953L139.185 28.9862C139.24 28.9787 139.295 28.9725 139.349 28.9636C140.729 28.7403 142.264 26.9401 143.743 27.9917C144.075 28.2277 144.232 28.5917 144.269 28.9872C144.398 30.343 143.352 32.2596 142.454 33.2404C141.524 34.2546 138.789 35.6962 137.428 35.66C137.27 35.6558 137.176 35.5608 137.069 35.4503C136.985 35.3623 136.906 35.2104 136.844 35.11C136.552 33.6345 136.213 32.0382 135.424 30.7367Z" fill="#F7999A"/>
            <path d="M149.431 34.2398C149.922 34.1915 150.438 34.2117 150.933 34.2007C150.119 36.8143 149.554 39.5457 148.886 42.2028C147.946 45.9427 146.933 49.6665 146.039 53.4172C143.668 53.4094 141.298 53.4141 138.927 53.4313L137.466 59.4376C137.217 60.4704 136.838 61.6058 136.757 62.6626L136.811 62.6599C137.216 62.0244 138.799 54.9598 139.118 53.7138C141.397 53.5604 143.714 53.6375 145.996 53.7063C145.418 56.1577 144.802 58.5995 144.147 61.0318C143.682 62.8651 143.193 64.6962 142.801 66.5467C140.134 66.3972 137.469 66.2147 134.806 65.9992C133.008 65.8697 131.179 65.8034 129.394 65.5626C130.005 63.1029 130.483 60.6109 131.062 58.1432L134.336 44.4817C137.138 44.3848 139.937 44.2429 142.734 44.056C143.686 40.914 144.247 37.6069 145.112 34.4296C146.553 34.405 147.993 34.3418 149.431 34.2398Z" fill="#FEFEFE"/>
            <path d="M121.377 88.2102C126.347 88.2538 131.317 88.2666 136.288 88.2484C138.798 88.2451 141.461 88.426 143.952 88.2017L144.171 88.3386C144.345 89.5971 144.214 91.0202 144.213 92.2961L144.197 100.196C144.146 107.876 144.168 115.556 144.264 123.235C143.07 124.927 142.351 126.566 142.715 128.68C142.812 129.245 142.974 129.778 143.167 130.316C141.564 130.624 139.395 130.402 137.736 130.4L125.622 130.413C123.613 130.42 121.39 130.266 119.405 130.531C119.39 129.989 119.365 129.44 119.166 128.928C118.825 128.051 118.149 127.682 117.342 127.315C117.338 121.248 117.454 115.162 117.318 109.097C117.403 106.512 117.328 103.911 117.325 101.324L117.293 88.2229L121.377 88.2102Z" fill="#FEFEFE"/>
            <path d="M121.561 94.1206L126.25 94.1162C126.236 96.3617 126.237 98.607 126.252 100.852L121.557 100.857L121.561 94.1206Z" fill="#C0C9D5"/>
            <path d="M138.231 94.115C138.637 94.0523 139.046 93.9818 139.442 94.1115C139.711 94.8715 139.513 99.7008 139.508 100.849L135.695 100.846C135.313 100.859 134.988 100.916 134.679 100.663C134.42 99.1961 134.618 95.7915 134.619 94.1161L138.231 94.115Z" fill="#C0C9D5"/>
            <path d="M121.635 110.122H126.233L126.252 117.172L121.446 117.176C121.49 115.585 121.188 111.351 121.635 110.122Z" fill="#C0C9D5"/>
            <path d="M134.631 110.035L139.49 110.035C139.49 112.347 139.536 114.669 139.459 116.98C137.845 116.966 136.237 117.032 134.624 117.058L134.631 110.035Z" fill="#C0C9D5"/>
            <path d="M61.0848 71.4769L76.5823 71.4469C79.1608 71.4494 81.8182 71.3278 84.3869 71.4983C84.0972 73.9895 83.893 76.522 83.7491 79.0258C82.28 79.0219 80.8034 78.9901 79.3358 79.0477L79.3372 85.9601L83.0938 85.9676C82.8823 88.6315 82.7341 91.3176 82.4443 93.9732L79.3598 93.9474C79.3321 96.2736 79.324 98.5997 79.3356 100.926C80.1456 100.996 80.9431 101.025 81.756 101.027L80.9537 109.987L79.2506 110.021C79.2262 112.421 79.0727 114.948 79.2708 117.336L79.3961 117.461C79.6617 117.45 79.9199 117.444 80.1861 117.455C80.5245 118.224 80.0001 120.498 79.9295 121.435L81.4333 121.487L81.2086 123.256C80.5544 123.418 79.9577 123.358 79.5646 123.984C79.3281 125.518 78.3721 129.015 78.4013 130.281C76.5886 130.458 74.6147 130.317 72.7855 130.319L60.9675 130.313L60.974 92.7287L60.9788 79.1377C60.9848 76.6068 60.8846 73.9976 61.0848 71.4769Z" fill="#FEFEFE"/>
            <path d="M65.7151 94.0166C67.2433 93.9996 68.7734 94.0191 70.3017 94.0239L70.2972 100.865L65.7109 100.87L65.7151 94.0166Z" fill="#C0C9D5"/>
            <path d="M65.8088 110.054C67.1749 110.037 68.8802 109.825 70.2044 110.096C70.2491 110.161 70.3161 110.215 70.3384 110.289C70.3695 110.394 70.3758 116.296 70.3847 116.862L65.7113 116.876C65.7179 115.605 65.4812 110.902 65.8088 110.054Z" fill="#C0C9D5"/>
            <path d="M65.7162 79.0492L70.2851 79.0488C70.2777 80.8906 70.5101 84.3806 70.2063 86.0016L65.7109 85.9964L65.7162 79.0492Z" fill="#C0C9D5"/>
            <path d="M56.2384 58.8248C64.0442 58.7806 71.8772 58.6982 79.6812 58.8385C79.7277 58.8467 79.7741 58.8556 79.8208 58.8631C80.8952 59.0377 83.0618 58.6359 83.9246 58.9267L83.9085 59.0236C82.4311 59.2907 79.4238 59.093 77.7924 59.0905L64.6647 59.0878C61.9503 59.0824 59.2344 59.0603 56.5202 59.0876C57.3716 61.8159 58.506 64.4909 59.558 67.1477C60.1054 68.5299 60.8213 70.0132 61.0841 71.4773C60.8839 73.998 60.9841 76.6072 60.9781 79.1381L60.9732 92.7291L60.9668 130.313L72.7847 130.32C74.614 130.317 76.5879 130.459 78.4006 130.282C78.3714 129.015 79.3273 125.519 79.5639 123.985C79.957 123.358 80.5536 123.419 81.2079 123.257L81.4325 121.487C84.0131 121.496 86.6018 121.448 89.181 121.504C89.0906 122.095 88.9334 122.632 88.7511 123.198C89.2989 123.166 89.9549 123.075 90.4801 123.248C91.5494 123.601 90.9624 124.985 91.3856 125.793C91.8434 126.668 93.2732 126.856 94.143 127.103C93.9586 124.859 94.03 122.571 94.0225 120.32L93.9987 108.607L94.124 107.932C94.1684 108.112 94.2102 108.293 94.2494 108.474C94.3538 112.723 94.2595 116.983 94.282 121.234C94.2922 123.189 94.2568 125.186 94.4181 127.134C95.2887 127.675 95.7718 128.087 95.9941 129.134C96.0737 129.509 96.0039 129.96 96.1221 130.304C97.8948 130.192 99.7123 130.396 101.47 130.235C101.461 128.688 101.926 126.988 102.229 125.468C102.283 125.17 102.319 124.806 102.455 124.534C102.676 124.096 102.939 123.981 103.375 123.809C103.382 123.127 103.459 122.453 103.575 121.782C105.774 122.183 108.307 121.807 110.538 121.686C110.537 122.255 110.466 122.749 110.349 123.303C110.666 123.261 111.043 123.197 111.359 123.254C112.433 123.449 112.661 124.933 113.182 125.697C114.012 126.915 115.756 126.986 117.088 127.217C117.051 123.372 117.049 119.526 117.082 115.68C117.081 113.247 117.029 110.803 117.101 108.371C117.189 108.613 117.272 108.843 117.317 109.098C117.454 115.162 117.337 121.249 117.341 127.315C118.148 127.683 118.824 128.051 119.165 128.928C119.364 129.44 119.389 129.99 119.405 130.531C121.389 130.266 123.612 130.42 125.621 130.413L137.735 130.4C139.395 130.403 141.563 130.624 143.166 130.316C144.045 130.225 144.986 130.287 145.874 130.271C148.964 130.215 152.044 130.309 155.132 130.324C162.701 130.392 170.271 130.37 177.84 130.258C179.294 130.248 180.748 130.275 182.202 130.338C182.981 130.366 183.958 130.541 184.713 130.389C185.98 130.152 188.788 130.337 190.182 130.34C193.072 130.347 195.998 130.239 198.883 130.313C199.235 130.322 199.551 130.44 199.764 130.738C199.936 130.977 199.946 131.18 199.915 131.459C199.792 131.648 199.747 131.767 199.525 131.851C198.823 132.114 193.643 131.919 192.494 131.922L168.871 131.939L45.5181 131.952L12.6665 131.995C8.90417 131.992 5.11592 132.074 1.35722 132.005C1.0022 131.998 0.704021 131.974 0.381098 131.823C0.214501 131.63 0.0809729 131.446 0.0903048 131.175C0.0984259 130.94 0.181724 130.778 0.349741 130.622C0.606025 130.384 1.01893 130.329 1.35348 130.299C2.96999 130.154 4.7325 130.337 6.37083 130.332L18.6712 130.32C21.9945 130.395 25.3927 130.154 28.7033 130.381L28.8582 130.221C29.3382 130.51 43.4691 130.331 45.4236 130.335L51.6526 130.334C51.7522 125.881 51.6611 121.406 51.6605 116.95L51.6501 85.7551L51.6542 75.8807C51.6488 74.4439 51.4474 72.769 51.6789 71.3661C51.9027 70.0105 52.6977 68.4773 53.1801 67.182L56.2384 58.8248Z" fill="#263238"/>
            <path d="M110.539 121.686C110.538 122.254 110.467 122.749 110.35 123.302C109.42 124.176 107.838 124.252 106.626 124.209C106.168 124.193 105.687 124.116 105.232 124.133C104.607 124.045 103.99 123.959 103.376 123.809C103.383 123.126 103.46 122.453 103.576 121.781C105.775 122.183 108.308 121.806 110.539 121.686Z" fill="#F7999A"/>
            <path d="M81.4326 121.487C84.0132 121.495 86.6019 121.448 89.1811 121.504C89.0907 122.094 88.9335 122.631 88.7512 123.198C87.5324 124.143 85.1287 124.283 83.6356 124.041C83.3767 123.999 83.1366 123.929 82.8909 123.841C82.3402 123.533 81.8464 123.3 81.208 123.256L81.4326 121.487Z" fill="#F7999A"/>
            <path d="M56.2602 59.5029C56.9625 61.1144 60.7343 70.4793 60.6947 71.486C57.7751 71.4224 54.8464 71.47 51.9258 71.4756C52.2047 70.0621 52.9715 68.5743 53.4736 67.2119C54.4189 64.6472 55.2932 62.06 56.2602 59.5029Z" fill="#003882"/>
            <path d="M51.9251 71.4755C54.8457 71.4699 57.7743 71.4223 60.694 71.4859C60.5197 78.5052 60.6468 85.5565 60.6451 92.5799L60.6324 130.3L51.9391 130.343C52.0597 124.431 51.9462 118.497 51.9153 112.584L51.9282 84.1038C51.9405 79.8973 51.8468 75.6804 51.9251 71.4755Z" fill="#FEFEFE"/>
            <path d="M100.295 17.436C101.129 17.4462 101.965 17.4695 102.799 17.4377C102.185 18.7078 101.505 19.9413 100.757 21.1383C102.545 22.2714 104.458 22.7354 106.053 23.7076L106.277 23.7533C107.218 24.4749 108.273 25.0519 109.201 25.7876C112.81 28.6477 116.951 33.2752 119.282 37.2408L119.513 37.4371L119.676 37.5314C120.659 37.3579 127.539 33.7814 128.968 33.0274C129.419 30.777 129.91 28.5352 130.44 26.3021C129.665 25.4307 128.759 24.6289 127.937 23.7972L127.968 23.7344C128.965 24.4634 129.837 25.3132 130.702 26.19C130.189 28.4459 129.694 30.7055 129.215 32.9688C130.847 32.2913 133.195 30.6535 134.688 30.2772C135.014 30.3043 135.195 30.5273 135.424 30.7369C136.213 32.0384 136.552 33.6346 136.844 35.1101C136.685 35.8391 136.546 36.5455 136.025 37.0845C136 37.1109 135.99 37.1485 135.972 37.1805L135.766 37.0423C134.373 38.033 125.371 43.5739 125.027 44.1441L124.781 44.1408C122.48 45.6298 119.181 48.3727 116.29 47.7387C113.729 47.177 111.544 45.3494 109.418 43.9238C109.735 45.6705 110.274 47.6378 110.308 49.4017L110.367 49.6052C110.603 51.6795 110.788 53.6585 110.746 55.7462C109.939 56.5178 109.041 56.9805 108.041 57.4638C104.455 59.1965 100.731 59.686 96.7854 59.6095C94.2291 59.5598 91.5232 59.3698 89.0144 58.857C87.7777 58.6042 86.5128 58.0006 85.2666 57.8873C84.4124 57.0743 84.1996 52.5613 84.1059 51.2424C82.0781 50.1887 79.5668 49.1769 77.913 47.5886C76.9531 46.6669 76.2996 45.4639 76.294 44.1144C76.2919 43.5951 76.384 43.1243 76.5568 42.6356C77.2357 40.7171 78.2744 38.8822 79.167 37.0527C80.3211 34.6871 81.5243 32.3606 82.7539 30.0338C83.3702 28.8672 83.9407 27.6607 84.6378 26.5397C85.038 25.8961 85.4574 25.3517 85.9994 24.8201C87.3468 23.6535 88.6821 22.6485 90.2345 21.7715C90.605 20.413 90.7842 19.0371 90.9606 17.6431C91.751 17.8466 92.5203 18.1678 93.285 18.4515C95.3119 19.0747 97.4535 19.315 99.5643 19.4185C99.6957 18.9255 99.9057 17.7424 100.295 17.436Z" fill="#003882"/>
            <path d="M152.529 29.2203L152.649 29.2189C154.797 29.1777 156.858 28.8954 159.026 29.011C159.496 29.0375 159.966 29.0725 160.434 29.1162C160.903 29.1598 161.371 29.2121 161.837 29.2729C162.304 29.3338 162.77 29.4031 163.234 29.481C163.698 29.559 164.161 29.6454 164.622 29.7402C165.083 29.8351 165.542 29.9385 165.999 30.0502C166.456 30.1618 166.911 30.2819 167.364 30.4104C167.816 30.5389 168.267 30.6755 168.714 30.8203C169.162 30.9653 169.607 31.1184 170.049 31.2797C170.491 31.4409 170.93 31.6102 171.365 31.7876C171.801 31.9649 172.233 32.1502 172.662 32.3434C173.091 32.5366 173.516 32.7376 173.938 32.9465C174.359 33.1553 174.777 33.3718 175.19 33.5959C175.604 33.8199 176.013 34.0516 176.418 34.2908C176.822 34.5298 177.223 34.7763 177.618 35.0302C178.014 35.2839 178.405 35.5449 178.791 35.813C179.177 36.0812 179.558 36.3564 179.934 36.6385C181.119 37.5103 182.302 38.3811 183.37 39.3951C192.746 48.2971 197.371 60.3079 197.616 73.094C197.901 88.0273 191.972 102.718 183.071 114.548C182.127 115.802 181.131 116.987 180.089 118.162C179.622 118.688 178.784 119.388 178.451 119.971C178.387 120.084 178.389 120.112 178.368 120.223C176.776 120.227 175.796 120.395 174.344 121.108C174.082 117.892 173.241 115.2 170.928 112.842C170.796 112.707 170.661 112.576 170.523 112.447C170.385 112.319 170.244 112.194 170.099 112.073C169.955 111.952 169.807 111.834 169.657 111.721C169.506 111.607 169.353 111.497 169.197 111.391C169.041 111.284 168.883 111.182 168.722 111.084C168.56 110.986 168.397 110.892 168.231 110.802C168.065 110.712 167.897 110.626 167.727 110.545C167.557 110.463 167.384 110.386 167.21 110.313C167.036 110.24 166.86 110.172 166.682 110.108C166.505 110.044 166.326 109.984 166.145 109.929C165.964 109.874 165.782 109.824 165.599 109.778C165.416 109.732 165.232 109.691 165.046 109.654C164.861 109.617 164.675 109.586 164.488 109.558C164.301 109.531 164.114 109.508 163.926 109.49C163.738 109.472 163.549 109.459 163.36 109.451C163.172 109.442 162.983 109.439 162.794 109.44C162.61 109.441 162.426 109.446 162.243 109.456C162.059 109.465 161.876 109.48 161.693 109.498C161.51 109.517 161.328 109.54 161.146 109.568C160.964 109.595 160.783 109.627 160.603 109.664C160.422 109.7 160.243 109.741 160.065 109.786C159.887 109.831 159.71 109.881 159.534 109.934C159.358 109.988 159.184 110.046 159.011 110.109C158.838 110.171 158.667 110.238 158.497 110.308C158.327 110.379 158.159 110.453 157.994 110.532C157.828 110.611 157.664 110.694 157.502 110.781C157.34 110.868 157.18 110.958 157.023 111.053C156.865 111.148 156.71 111.246 156.557 111.348C156.405 111.45 156.255 111.556 156.108 111.666C155.96 111.775 155.816 111.888 155.674 112.005C155.532 112.121 155.393 112.241 155.257 112.365C155.121 112.488 154.988 112.614 154.858 112.744C152.603 115.004 151.461 117.961 151.489 121.123C150.61 120.924 149.714 120.872 148.816 120.837C148.983 113.219 148.824 105.552 148.794 97.9293L148.792 91.4794C148.793 90.3567 148.893 89.1111 148.712 88.0006C148.49 86.6372 144.942 78.7833 144.182 77.5352L123.344 77.5082C119.423 77.5053 115.48 77.4194 111.562 77.5381L111.23 77.5022C110.741 76.8089 110.957 66.7857 110.956 65.1709C112.521 65.4717 114.045 66.1828 115.622 66.3462C116.869 66.4753 118.245 66.2857 119.499 66.2331C122.516 66.1063 125.55 65.9001 128.568 65.8533C130.764 65.8194 133.052 66.1219 135.243 66.2932C137.805 66.4936 140.382 66.6035 142.939 66.8428C144.588 60.9492 145.904 54.942 147.397 49.0062L150.66 36.1735C151.27 33.8501 151.953 31.555 152.529 29.2203Z" fill="#ECECED"/>
            <path d="M133.618 3.35565C135.361 3.24382 136.833 3.42217 138.335 4.37881C140.027 5.45622 141.312 7.2217 141.741 9.18091C142.837 14.1938 137.613 22.0951 134.931 26.2472C134.81 26.428 134.796 26.4421 134.587 26.5457C134.495 26.4983 134.455 26.4833 134.375 26.4255C133.659 25.9054 133.051 24.7214 132.585 23.9682C130.494 20.5911 127.957 16.2233 127.277 12.2928C126.913 10.187 127.253 8.04882 128.515 6.28813C129.792 4.50686 131.503 3.72213 133.618 3.35565Z" fill="#374349"/>
            <path d="M134.125 5.12435C135.217 5.04473 136.437 5.36569 137.375 5.91572C138.655 6.66636 139.545 7.97222 139.895 9.39969C140.264 10.9059 140.077 12.449 139.249 13.7777C138.307 15.2923 136.903 16.0288 135.211 16.4105C133.799 16.5254 132.595 16.3117 131.407 15.4879C130.153 14.6188 129.25 13.3125 129.007 11.7957C128.761 10.257 129.11 8.66985 130.052 7.41637C131.064 6.06976 132.475 5.33908 134.125 5.12435Z" fill="#FEFEFE"/>
            </g>
            <defs>
            <clipPath id="clip0_5351_49300">
            <rect width="200" height="132" fill="white"/>
            </clipPath>
            </defs>
            </svg>
            <p class="text-sm font-medium text-slate-600 hover:!text-slate-600 active:!text-slate-600  hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">No Related Jobs.</p>
      </div>
    `;
    }

    if (tab === "jobs") {
      return `
        <div class="flex flex-col items-center justify-center gap-4 px-4 text-center hover:text-center active:text-center focus:text-center focus-visible:text-center">
            <svg width="166" height="100" viewBox="0 0 170 132" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_5351_49859)">
            <path d="M9.71281 131.415C13.5116 131.45 17.312 131.39 21.11 131.453C22.3085 131.546 26.2259 131.302 27.0192 131.663C27.0245 131.744 27.0422 131.828 27.0179 131.906C20.6283 131.99 14.2229 131.895 7.83147 131.898L2.50295 131.9C1.72279 131.9 0.803729 132.006 0.0464546 131.856C-0.0196943 131.669 -0.0374684 131.72 0.0481739 131.515C0.452302 131.317 8.65484 131.427 9.71281 131.415Z" fill="#000001"/>
            <path d="M45.3517 131.516L104.13 131.444C104.435 131.55 104.808 131.634 105.092 131.779C104.263 131.779 98.951 131.66 98.6224 131.876L36.4281 131.908L36.2998 131.753C36.382 131.688 36.6213 131.721 36.7327 131.721L36.7794 131.644L36.4575 131.582L36.5012 131.53C39.4486 131.435 42.4066 131.635 45.3517 131.516Z" fill="#000001"/>
            <path d="M129.086 48.2834C130.525 47.6766 131.888 47.4839 133.389 48.0733C134.871 48.6549 136.137 49.7229 136.773 51.1878C138.912 51.5256 141.24 52.0315 142.562 53.9141C143.342 55.0257 143.402 56.2313 143.309 57.5298C144.434 59.3351 145.138 60.9766 144.641 63.132C144.285 64.6731 143.368 65.9304 142.017 66.7642C141.435 67.1231 140.795 67.3437 140.163 67.5957C139.869 68.365 139.491 69.0763 139.031 69.7616C139.25 70.8065 139.027 71.9698 139.031 73.0344C135.547 73.0371 132.082 73.2048 128.601 73.2851L128.624 70.639C127.319 70.2733 126.129 69.7803 125.284 68.6661C124.014 66.9916 124.15 64.7529 124.458 62.7916C124.171 62.6388 123.851 62.4995 123.623 62.2666C123.478 61.98 121.337 60.8039 120.82 60.3486C119.533 59.2155 118.719 57.7369 118.621 56.0184C118.543 54.6357 118.967 53.2006 119.929 52.1734C120.839 51.2011 122.163 50.8485 123.459 50.812C123.927 50.7809 124.436 50.833 124.907 50.8481C126.327 50.079 127.711 49.1363 129.086 48.2834Z" fill="#263238"/>
            <path d="M124.458 62.7915C124.495 62.8297 124.533 62.8673 124.57 62.9061C125.221 63.5975 126.045 65.7137 126.694 65.9408C127.378 65.6347 127.677 63.9368 128.65 64.3547C128.924 64.4725 129.125 64.8421 129.192 65.1134C129.342 65.7114 129.174 66.613 128.816 67.1172C128.527 67.5237 128.081 67.6418 127.613 67.7176C127.812 68.5319 129.394 69.9189 130.16 70.3754C131.947 71.4406 134.479 71.7673 136.495 71.2558C137.48 71.006 138.356 70.52 139.031 69.7615C139.25 70.8064 139.027 71.9697 139.032 73.0343C135.547 73.0369 132.082 73.2047 128.601 73.285L128.624 70.6389C127.319 70.2732 126.129 69.7802 125.284 68.666C124.014 66.9915 124.15 64.7528 124.458 62.7915Z" fill="#F6A9A5"/>
            <path d="M139.032 73.0347C140.046 73.0955 141.636 72.9961 142.353 73.8274C142.711 74.242 142.772 74.7415 142.773 75.2661C146.817 76.1218 150.315 78.799 152.52 82.1988C153.662 83.9587 154.618 85.9252 155.328 87.8971C156.794 91.9682 157.582 96.3476 158.35 100.593C159.047 104.448 159.721 108.331 160.219 112.217C161.037 118.59 161.563 124.997 162.301 131.38L167.421 131.369C168.245 131.368 169.219 131.268 170.022 131.422C170.09 131.652 170.115 131.646 170.003 131.853C169.815 131.892 169.674 131.909 169.484 131.887C166.494 132.031 163.43 131.897 160.433 131.894L142.59 131.886L110.707 131.865C106.682 131.854 102.646 131.947 98.6225 131.876C98.9512 131.66 104.263 131.779 105.092 131.779L110.673 131.777C111.705 131.778 112.739 131.793 113.771 131.777L114.988 131.772C115.238 130.533 115.331 129.251 115.467 127.996C115.577 127.269 115.555 126.467 115.592 125.73C115.68 124.216 115.853 122.701 115.968 121.188L116.953 108.201C114.828 111.84 112.895 115.897 109.869 118.912C108.89 119.889 107.648 120.868 106.186 120.841C105.329 120.825 104.459 120.519 103.748 120.052C102.128 118.988 100.761 117.173 99.5022 115.723C98.4792 114.545 97.4382 113.383 96.3793 112.237C95.6092 111.296 94.8312 110.362 94.0452 109.435C93.0917 108.23 92.1043 107.039 91.2336 105.773C91.0375 105.32 90.9313 104.836 90.8076 104.359C91.5375 103.489 92.7073 102.753 93.1211 101.667C93.7904 101.649 94.8614 102.812 95.3238 103.245C98.6327 106.35 101.46 109.915 104.684 113.092C105.254 111.414 105.761 109.742 106.434 108.097C106.779 107.43 107.006 106.662 107.261 105.956C107.624 104.944 108.005 103.938 108.402 102.939C110.172 98.3714 111.526 93.6707 113.42 89.1434C113.85 88.3661 114.166 87.4107 114.516 86.5885C116.794 81.9743 118.719 79.3302 123.565 77.099C124.279 76.9999 125.261 76.7661 125.777 76.2504C126.059 75.9688 126.088 75.6398 126.079 75.2635C126.301 74.6662 126.558 74.1673 127.057 73.7482C127.513 73.3659 128.019 73.2534 128.601 73.2854C132.082 73.205 135.547 73.0373 139.032 73.0347Z" fill="#374349"/>
            <path d="M170.022 131.422C170.09 131.652 170.115 131.646 170.003 131.853C169.815 131.891 169.674 131.908 169.484 131.886C168.077 131.617 165.178 131.816 163.615 131.807C163.078 131.803 162.48 131.853 161.962 131.711L161.961 131.62C162.804 131.26 168.504 131.516 170.022 131.422Z" fill="#000001"/>
            <path d="M75.5337 7.02293C75.3269 5.84036 75.1722 4.65667 75.5252 3.48271C75.9068 2.21439 76.8312 1.15071 78.0019 0.529469C78.0774 0.4899 78.1537 0.452206 78.2311 0.416382C78.3084 0.380433 78.3865 0.346416 78.4655 0.314337C78.5444 0.282257 78.6241 0.252115 78.7046 0.223905C78.7851 0.195695 78.8662 0.16948 78.9479 0.145264C79.0297 0.120924 79.1121 0.0985832 79.195 0.0782371C79.2778 0.0580158 79.3611 0.0397903 79.4449 0.0235633C79.5286 0.00721157 79.6127 -0.00701762 79.6972 -0.0191254C79.7817 -0.031358 79.8664 -0.0414692 79.9513 -0.0494578C80.0363 -0.0575713 80.1214 -0.0636252 80.2066 -0.0676195C80.2919 -0.071489 80.3772 -0.0733612 80.4626 -0.0732363C80.548 -0.0729867 80.6333 -0.070677 80.7185 -0.0663082C80.8038 -0.0620642 80.8888 -0.0557002 80.9737 -0.0472122C81.0586 -0.0387243 81.1433 -0.0282393 81.2278 -0.0157571C81.3121 -0.00314996 81.3961 0.0114559 81.4798 0.0280573C81.5635 0.0446588 81.6467 0.063319 81.7295 0.0840396C81.8123 0.104635 81.8946 0.127292 81.9762 0.152007C82.0576 0.176971 82.1385 0.203871 82.2187 0.232705C82.2989 0.261539 82.3784 0.292307 82.4571 0.32501C82.5356 0.357714 82.6134 0.39229 82.6903 0.428738C82.7673 0.465186 82.8433 0.503507 82.9185 0.5437C82.9936 0.583892 83.0676 0.625896 83.1405 0.669709C83.2135 0.713397 83.2854 0.758893 83.3562 0.8062C83.4268 0.853383 83.4963 0.902316 83.5647 0.952994C83.633 1.00367 83.7 1.05591 83.7657 1.10971C83.8314 1.16363 83.8958 1.21912 83.9589 1.27616C84.0219 1.33308 84.0834 1.39156 84.1435 1.4516C84.2035 1.51164 84.2621 1.57305 84.3193 1.63583C84.3764 1.69875 84.4318 1.76297 84.4857 1.8285C84.5396 1.89403 84.5919 1.96081 84.6425 2.02884C84.693 2.09699 84.7419 2.16627 84.7891 2.23667C84.8362 2.3072 84.8816 2.37878 84.9253 2.45143C84.9688 2.52407 85.0107 2.59772 85.0507 2.67236C85.8136 4.11051 85.7031 5.47844 85.2367 6.96789L96.347 6.97538C98.3281 6.96938 100.437 6.80967 102.397 7.02424C102.747 7.06244 103.036 7.14988 103.332 7.34161C104.081 7.82561 104.391 8.61461 104.579 9.442C109.451 9.52787 114.323 9.54635 119.195 9.49742C121.114 9.49236 124.401 9.30138 126.146 9.58242C126.815 9.69027 127.495 10.1185 127.963 10.5916C128.418 11.0526 128.795 11.6925 128.905 12.3348C129.044 13.1505 128.966 14.0451 128.959 14.8723C128.941 16.203 128.943 17.5336 128.963 18.8642C129.078 26.7915 128.95 34.7162 128.977 42.6435C128.981 43.668 128.815 47.5372 129.085 48.2837C127.71 49.1366 126.326 50.0793 124.906 50.8484C124.436 50.8333 123.926 50.7812 123.459 50.8123C123.546 50.7689 123.538 50.7923 123.571 50.6943C123.745 50.1804 123.565 45.2176 123.567 44.1891C123.589 35.3282 123.734 26.4578 123.602 17.5981C123.596 17.2248 123.606 16.7505 123.421 16.4159C123.153 15.9338 122.512 15.473 121.973 15.3449C120.456 14.9836 118.154 15.1935 116.541 15.1951L106.26 15.2116L106.255 19.9584L54.3274 20.0035L54.3268 15.1757L44.7392 15.1596C43.1978 15.1581 41.4463 14.9847 39.9397 15.2551C39.4656 15.3401 39.0729 15.6033 38.741 15.942C38.432 16.2571 38.1403 16.6898 38.0912 17.1375C37.98 18.1544 38.051 19.2482 38.0544 20.2718L38.0689 26.0358L38.0529 45.0146L38.0096 94.6588C38.0249 101.994 38.1118 109.332 38.05 116.667C38.0317 118.855 38.1213 121.066 38.0355 123.25C38.0572 124.001 38.1664 124.717 38.769 125.25C39.0999 125.543 39.5156 125.694 39.9546 125.727C40.884 125.8 41.8581 125.749 42.7912 125.75L48.3949 125.748L66.0768 125.723L92.9138 125.742C100.473 125.789 108.033 125.785 115.592 125.73C115.554 126.467 115.576 127.269 115.466 127.996C115.33 129.251 115.238 130.533 114.987 131.772L113.771 131.778C112.739 131.793 111.704 131.778 110.673 131.777L105.092 131.779C104.808 131.634 104.434 131.55 104.129 131.444L45.3514 131.516C42.4062 131.635 39.4482 131.435 36.5008 131.531L36.4571 131.582L36.779 131.645L36.7324 131.721C36.6209 131.721 36.3816 131.688 36.2994 131.753L36.4277 131.908C33.2923 131.915 30.1515 131.961 27.0169 131.906C27.0412 131.828 27.0235 131.744 27.0182 131.663C26.2248 131.303 22.3075 131.546 21.109 131.453C23.1325 131.385 25.1712 131.44 27.1963 131.444C26.7403 128.843 26.0271 126.246 25.4553 123.665C25.0639 121.897 24.6865 119.291 24.0407 117.669C23.7682 117.677 23.6488 117.713 23.4121 117.57C23.1699 116.986 23.2555 116.296 23.2531 115.672L26.6863 115.661C26.2129 114.632 25.6548 113.639 25.1572 112.621C24.3945 111.343 23.9187 109.709 22.9297 108.596C22.6835 108.686 22.4347 108.768 22.1832 108.842C21.9316 108.916 21.6779 108.981 21.422 109.039C21.1661 109.096 20.9086 109.145 20.6496 109.186C20.3904 109.227 20.1303 109.26 19.8691 109.284C19.6078 109.308 19.346 109.323 19.0837 109.33C18.8215 109.338 18.5594 109.336 18.2972 109.326C18.035 109.317 17.7734 109.298 17.5123 109.272C17.2514 109.245 16.9916 109.21 16.733 109.166C14.7525 108.85 13.0155 107.823 11.8383 106.204C10.1616 103.898 9.51876 100.64 9.97039 97.8558C10.2086 96.3866 10.8177 95.0392 12.0941 94.1667C13.2901 93.3491 14.765 93.1893 16.1667 93.4389C19.1715 93.9739 21.2025 96.1211 22.8702 98.4905C22.833 97.8691 22.628 97.3111 22.434 96.7243L22.3709 96.5334C21.9204 95.8324 21.602 94.989 21.1655 94.2588C19.392 91.2929 17.4098 88.5422 16.7355 85.0808C16.7109 84.9494 16.688 84.8176 16.6667 84.6856C16.6454 84.5535 16.6257 84.4212 16.6076 84.2888C16.5896 84.1562 16.5732 84.0236 16.5585 83.8907C16.5436 83.7578 16.5304 83.6247 16.519 83.4916C16.5074 83.3583 16.4975 83.2249 16.4893 83.0914C16.4811 82.958 16.4745 82.8245 16.4695 82.6909C16.4646 82.5573 16.4613 82.4236 16.4597 82.2899C16.458 82.1562 16.458 82.0225 16.4597 81.8888C16.4613 81.7551 16.4646 81.6215 16.4697 81.4878C16.4746 81.3542 16.4811 81.2207 16.4893 81.0873C16.4975 80.9538 16.5074 80.8205 16.519 80.6872C16.5304 80.554 16.5436 80.4209 16.5585 80.288C16.5732 80.1552 16.5896 80.0225 16.6076 79.8899C16.6257 79.7575 16.6454 79.6252 16.6667 79.4932C16.688 79.3611 16.7109 79.2294 16.7355 79.0979C16.76 78.9665 16.7862 78.8354 16.814 78.7046C16.8417 78.5736 16.8711 78.4431 16.902 78.313C16.9332 78.1829 16.9658 78.0531 16.9999 77.9238C17.0341 77.7945 17.0699 77.6656 17.1072 77.5371C17.1446 77.4087 17.1836 77.2807 17.2241 77.1531C17.2645 77.0256 17.3066 76.8986 17.3503 76.7721C17.394 76.6455 17.4392 76.5195 17.4859 76.3941C17.5326 76.2688 17.5809 76.1439 17.6308 76.0196C17.6805 75.8954 17.7318 75.7718 17.7847 75.6487C17.8376 75.5257 17.892 75.4034 17.9479 75.2817C18.0037 75.16 18.0611 75.039 18.12 74.9187C18.1788 74.7983 18.2391 74.6788 18.301 74.5599C18.3627 74.4411 18.4259 74.323 18.4906 74.2057C18.5553 74.0884 18.6215 73.9718 18.6891 73.8561C18.7566 73.7404 18.8256 73.6255 18.896 73.5114C18.9665 73.3975 19.0383 73.2843 19.1115 73.172C19.1846 73.0596 19.2592 72.9482 19.3351 72.8378C20.8653 70.6205 23.2425 68.5993 25.9731 68.1105C28.4762 67.6622 30.7346 68.4237 32.7772 69.8345L32.7579 34.9049L32.7222 20.7532C32.7181 18.0843 32.6204 15.385 32.7581 12.7212C32.9514 11.8963 33.2715 11.1705 33.8771 10.5523C34.3544 10.0647 35.0027 9.67398 35.6835 9.55677C37.3649 9.26731 39.7533 9.45173 41.5298 9.44087L56.4446 9.45473C56.6564 8.80634 56.9059 8.13342 57.3947 7.63519C57.6373 7.38804 57.9886 7.15493 58.3352 7.08865C59.8089 6.80649 62.2086 7.00084 63.7644 7.00084L75.5337 7.02293Z" fill="#003882"/>
            <path d="M28.7256 112.157C30.0926 112.123 31.3489 111.905 32.6751 111.588C32.6824 112.464 32.8621 114.953 32.6029 115.63L28.9719 115.641C28.9207 114.482 28.8491 113.311 28.7256 112.157Z" fill="#FEFEFE"/>
            <path d="M115.429 126.354C109.918 126.235 104.383 126.334 98.8687 126.324L59.4555 126.305C54.6018 126.322 49.7483 126.306 44.8948 126.259C43.3132 126.243 41.6958 126.399 40.1224 126.298C39.4418 126.254 38.7032 126.035 38.2548 125.494C38.0465 125.243 37.8878 124.909 37.8377 124.586C37.6502 123.376 37.7442 117.801 37.8644 116.403L37.9057 116.502L37.9226 116.28C37.9486 118.428 37.7399 121.18 38.0363 123.25C38.058 124.001 38.1672 124.716 38.7697 125.25C39.1006 125.543 39.5164 125.693 39.9554 125.727C40.8847 125.799 41.8588 125.749 42.7919 125.749L48.3957 125.747L66.0776 125.723L92.9145 125.742C100.474 125.788 108.033 125.784 115.593 125.73C115.555 126.467 115.577 127.269 115.467 127.996C115.331 129.251 115.239 130.533 114.988 131.772L113.771 131.777C112.74 131.793 111.705 131.778 110.673 131.777L105.093 131.779C104.808 131.634 104.435 131.55 104.13 131.444C107.747 131.337 111.363 131.338 114.98 131.448C115.088 130.289 115.155 129.125 115.238 127.964C115.272 127.421 115.348 126.891 115.429 126.354Z" fill="#263238"/>
            <path d="M26.8894 82.9883C26.8627 79.8885 26.4081 76.2305 26.1414 73.0807C26.0486 71.9876 25.7398 70.8462 25.9128 69.7515C26.1671 71.0756 26.2555 72.3636 26.3875 73.7004C26.6653 76.5138 26.8427 79.3388 27.1496 82.1479C27.2822 82.1376 27.3399 82.0306 27.4218 81.9344C27.6878 81.6225 27.8748 81.2428 28.1336 80.9205C28.7157 80.195 29.3887 79.5603 29.8812 78.7675C30.2693 78.1427 31.4661 76.4863 32.1342 76.2307C30.7159 78.4672 28.64 80.3017 27.2197 82.5186L27.8034 92.9131C27.9443 95.3098 28.1203 97.7203 28.0958 100.122C28.6209 99.6458 32.2396 96.1788 32.7156 96.1751C31.8352 97.4591 29.4001 99.2004 28.1738 100.385C28.3346 102.158 28.3578 103.95 28.4386 105.729C28.5363 107.872 28.6744 110.012 28.7248 112.158C28.8483 113.311 28.9199 114.482 28.9711 115.641L32.6021 115.63C32.7844 116.076 32.7604 117.464 32.6025 117.939L32.5681 124.533C32.5521 125.804 32.3256 127.403 32.6042 128.632C32.7298 129.185 33.067 129.695 33.4619 130.097C34.0292 130.674 34.7972 131.141 35.5915 131.329C36.3572 131.512 37.2611 131.431 38.0459 131.432C40.1885 131.436 43.3457 131.256 45.3514 131.516C42.4062 131.635 39.4482 131.435 36.5008 131.53L36.4572 131.582L36.779 131.644L36.7324 131.721C36.6209 131.721 36.3816 131.688 36.2994 131.753L36.4277 131.908C33.2923 131.915 30.1515 131.961 27.0169 131.906C27.0412 131.828 27.0235 131.744 27.0182 131.663C26.2248 131.302 22.3075 131.546 21.109 131.453C23.1325 131.385 25.1712 131.44 27.1963 131.444C26.7403 128.843 26.0271 126.246 25.4553 123.665C25.0639 121.897 24.6865 119.291 24.0407 117.669C23.7682 117.676 23.6488 117.713 23.4121 117.57C23.17 116.986 23.2555 116.296 23.2531 115.672L26.6863 115.66C26.213 114.632 25.6548 113.639 25.1573 112.621C24.3945 111.343 23.9187 109.709 22.9297 108.596C22.6835 108.686 22.4347 108.768 22.1832 108.842C21.9316 108.916 21.6779 108.981 21.422 109.039C21.1661 109.096 20.9086 109.145 20.6496 109.186C20.3905 109.227 20.1303 109.26 19.8691 109.283C19.6078 109.308 19.346 109.323 19.0837 109.33C18.8215 109.337 18.5594 109.336 18.2972 109.326C18.035 109.316 17.7734 109.298 17.5123 109.272C17.2514 109.245 16.9916 109.21 16.733 109.166C14.7525 108.85 13.0155 107.823 11.8383 106.204C10.1616 103.898 9.51876 100.64 9.97039 97.8557C10.2086 96.3864 10.8177 95.0391 12.0941 94.1666C13.2901 93.3489 14.765 93.1892 16.1667 93.4388C19.1716 93.9737 21.2025 96.1209 22.8702 98.4904C22.833 97.869 22.628 97.311 22.434 96.7242L22.3709 96.5332C23.0398 96.5681 27.0696 99.4803 27.9084 100.051C27.8185 96.5443 27.589 93.0321 27.3689 89.5314C27.2394 87.4694 27.1627 85.3945 26.973 83.3375C25.7866 82.3244 20.5045 78.6634 19.2173 78.0854C19.0212 77.9974 18.8011 77.802 18.7192 77.6024C18.7073 77.5733 18.7033 77.5417 18.6954 77.5114C19.1942 77.4711 26.0316 82.3126 26.8894 82.9883Z" fill="#263238"/>
            <path d="M24.0412 117.669L23.8213 117.513C24.0495 117.336 24.4212 117.344 24.7096 117.328C26.122 117.248 27.5605 117.382 28.9755 117.398C29.9502 117.409 31.4358 117.201 32.3466 117.414C32.4392 117.435 32.4682 117.463 32.5381 117.51L32.5608 117.677C30.8695 117.699 29.1782 117.693 27.4871 117.661C26.352 117.64 25.169 117.546 24.0412 117.669Z" fill="#000001"/>
            <path d="M23.9904 106.062C24.7917 108.299 25.9817 110.886 28.2569 111.989C28.3426 112.031 28.4289 112.071 28.5158 112.11C28.6649 113.281 28.6785 114.462 28.8012 115.635L26.8946 115.624C26.3398 114.57 25.8504 113.458 25.2545 112.429C24.5841 111.096 23.9492 109.719 23.1689 108.445C23.5632 107.677 23.7947 106.9 23.9904 106.062Z" fill="#FEFEFE"/>
            <path d="M22.4346 96.7241C24.3027 97.7554 26.2246 99.049 27.9242 100.338C28.1549 104.261 28.3521 108.184 28.5158 112.11C28.429 112.071 28.3426 112.031 28.2569 111.989C25.9817 110.887 24.7917 108.299 23.9904 106.063C24.3839 103.015 23.9736 101.429 22.9062 98.5884C22.8939 98.5558 22.8826 98.5231 22.8707 98.4903C22.8335 97.8689 22.6286 97.3109 22.4346 96.7241Z" fill="#003882"/>
            <path d="M75.5344 7.02293C75.3276 5.84036 75.1729 4.65667 75.5259 3.48271C75.9075 2.21439 76.8319 1.15071 78.0026 0.529469C78.078 0.4899 78.1544 0.452206 78.2317 0.416382C78.309 0.380433 78.3872 0.346416 78.4661 0.314337C78.5451 0.282257 78.6248 0.252115 78.7053 0.223905C78.7857 0.195695 78.8668 0.16948 78.9486 0.145264C79.0304 0.120924 79.1128 0.0985832 79.1956 0.0782371C79.2785 0.0580158 79.3618 0.0397903 79.4455 0.0235633C79.5293 0.00721157 79.6134 -0.00701762 79.6979 -0.0191254C79.7824 -0.031358 79.8671 -0.0414692 79.9519 -0.0494578C80.0369 -0.0575713 80.1221 -0.0636252 80.2073 -0.0676195C80.2926 -0.071489 80.3779 -0.0733612 80.4633 -0.0732363C80.5486 -0.0729867 80.634 -0.070677 80.7192 -0.0663082C80.8045 -0.0620642 80.8895 -0.0557002 80.9744 -0.0472122C81.0593 -0.0387243 81.144 -0.0282393 81.2285 -0.0157571C81.3128 -0.00314996 81.3968 0.0114559 81.4804 0.0280573C81.5642 0.0446588 81.6474 0.063319 81.7301 0.0840396C81.813 0.104635 81.8952 0.127292 81.9768 0.152007C82.0583 0.176971 82.1392 0.203871 82.2194 0.232705C82.2996 0.261539 82.379 0.292307 82.4577 0.32501C82.5363 0.357714 82.6141 0.39229 82.691 0.428738C82.768 0.465186 82.844 0.503507 82.9192 0.5437C82.9942 0.583892 83.0682 0.625896 83.1411 0.669709C83.2142 0.713397 83.2861 0.758893 83.3568 0.8062C83.4275 0.853383 83.497 0.902316 83.5654 0.952994C83.6336 1.00367 83.7006 1.05591 83.7664 1.10971C83.8321 1.16363 83.8965 1.21912 83.9596 1.27616C84.0226 1.33308 84.0841 1.39156 84.1441 1.4516C84.2042 1.51164 84.2628 1.57305 84.32 1.63583C84.377 1.69875 84.4325 1.76297 84.4864 1.8285C84.5403 1.89403 84.5926 1.96081 84.6432 2.02884C84.6937 2.09699 84.7425 2.16627 84.7898 2.23667C84.8369 2.3072 84.8823 2.37878 84.9259 2.45143C84.9695 2.52407 85.0113 2.59772 85.0514 2.67236C85.8143 4.11051 85.7038 5.47844 85.2374 6.96789L96.3477 6.97538C98.3288 6.96938 100.438 6.80967 102.397 7.02424C102.747 7.06244 103.036 7.14988 103.333 7.34161C104.082 7.82561 104.392 8.61461 104.58 9.442C104.644 11.1619 105.165 12.9642 105.452 14.6683C101.45 14.5449 97.4387 14.5967 93.4348 14.6014L75.061 14.6089L60.8073 14.6063C58.6351 14.6072 56.3882 14.4653 54.2275 14.5943C54.3076 14.4451 54.4682 14.3717 54.6333 14.3316C54.8207 14.2865 55.0299 14.2803 55.2222 14.2659C55.6181 12.6692 56.1415 11.0674 56.4453 9.45473C56.657 8.80634 56.9065 8.13342 57.3954 7.63519C57.6379 7.38804 57.9893 7.15493 58.3359 7.08865C59.8096 6.80649 62.2092 7.00084 63.7651 7.00084L75.5344 7.02293Z" fill="#263238"/>
            <path d="M79.9613 2.34913C80.5123 2.30475 80.97 2.31992 81.4832 2.54254C82.173 2.84193 82.7198 3.38472 82.9895 4.08572C83.2583 4.78504 83.2032 5.55046 82.886 6.22412C82.4813 7.08353 81.7895 7.54824 80.9127 7.85755C80.3147 7.93488 79.7979 7.88901 79.2431 7.63418C79.159 7.59599 79.0771 7.55373 78.9974 7.50742C78.9177 7.46099 78.8405 7.41075 78.7658 7.3567C78.6911 7.30265 78.6194 7.24499 78.5507 7.1837C78.4819 7.12254 78.4164 7.05806 78.3542 6.99028C78.2919 6.92251 78.2332 6.85179 78.1782 6.77815C78.1231 6.7045 78.072 6.62824 78.0248 6.54935C77.9776 6.47059 77.9344 6.3897 77.8954 6.30669C77.8564 6.22356 77.8216 6.13875 77.7911 6.05224C77.7612 5.96412 77.7357 5.87474 77.7146 5.78412C77.6936 5.6935 77.6772 5.60207 77.6653 5.50983C77.6535 5.41758 77.6463 5.32496 77.6436 5.23197C77.6411 5.13898 77.6432 5.04611 77.6498 4.95337C77.6565 4.86062 77.6678 4.76844 77.6837 4.67682C77.6997 4.58508 77.7201 4.49439 77.745 4.40477C77.77 4.31515 77.7994 4.22696 77.8333 4.14021C77.867 4.05346 77.905 3.96858 77.9473 3.88557C78.3782 3.02167 79.0748 2.63672 79.9613 2.34913Z" fill="#FEFEFE"/>
            <path d="M38.0356 123.25C38.1214 121.067 38.0319 118.855 38.0502 116.667C38.112 109.332 38.0251 101.994 38.0098 94.6588L38.053 45.0147L38.0691 26.0359L38.0545 20.2719C38.0511 19.2483 37.9801 18.1544 38.0914 17.1376C38.1405 16.6899 38.4321 16.2572 38.7411 15.9421C39.073 15.6034 39.4657 15.3401 39.9398 15.2551C41.4464 14.9848 43.198 15.1581 44.7393 15.1596L54.3269 15.1757L54.3275 20.0036L106.255 19.9584L106.26 15.2117L116.541 15.1952C118.154 15.1935 120.456 14.9836 121.974 15.345C122.512 15.4731 123.153 15.9338 123.421 16.416C123.606 16.7506 123.596 17.2248 123.602 17.5982C123.734 26.4579 123.589 35.3283 123.568 44.1891C123.565 45.2176 123.745 50.1804 123.572 50.6944C123.538 50.7923 123.546 50.7689 123.459 50.8124C122.163 50.8489 120.839 51.2014 119.928 52.1737C118.967 53.2009 118.543 54.6361 118.621 56.0188C118.718 57.7372 119.533 59.2158 120.819 60.3489C121.337 60.8043 123.477 61.9803 123.622 62.267C123.851 62.4999 124.171 62.6392 124.458 62.792C124.15 64.7532 124.013 66.992 125.284 68.6664C126.129 69.7807 127.319 70.2736 128.624 70.6393L128.601 73.2855C128.018 73.2535 127.513 73.366 127.057 73.7483C126.558 74.1674 126.3 74.6663 126.078 75.2636C126.088 75.64 126.059 75.9689 125.777 76.2505C125.26 76.7662 124.279 77 123.565 77.0991C118.718 79.3304 116.794 81.9745 114.515 86.5887C114.166 87.4108 113.849 88.3663 113.42 89.1435C111.525 93.6708 110.171 98.3715 108.402 102.939C108.005 103.938 107.624 104.944 107.261 105.956C107.006 106.662 106.779 107.43 106.433 108.098C105.761 109.742 105.254 111.414 104.684 113.092C101.46 109.915 98.6323 106.35 95.3234 103.246C94.861 102.812 93.79 101.649 93.1207 101.668C92.7069 102.753 91.5371 103.489 90.8072 104.359C90.9309 104.836 91.0371 105.32 91.2332 105.773C92.104 107.039 93.0913 108.23 94.0448 109.435C94.8308 110.362 95.6088 111.296 96.3789 112.237C97.4378 113.383 98.4788 114.545 99.5018 115.723C100.76 117.173 102.128 118.988 103.748 120.052C104.458 120.519 105.329 120.825 106.185 120.841C107.648 120.869 108.889 119.889 109.869 118.913C112.894 115.898 114.828 111.84 116.953 108.201L115.967 121.188C115.852 122.701 115.68 124.216 115.592 125.73C108.033 125.785 100.473 125.789 92.9139 125.742L66.077 125.723L48.3951 125.748L42.7913 125.75C41.8582 125.749 40.8841 125.8 39.9548 125.728C39.5158 125.694 39.1 125.543 38.7691 125.25C38.1665 124.717 38.0574 124.001 38.0356 123.25Z" fill="#FEFEFE"/>
            <path d="M82.7822 62.9698C84.3333 62.9744 85.8842 62.9694 87.4351 62.9548C88.1841 62.9502 89.0397 62.867 89.7785 62.9631C89.9923 62.991 90.2554 63.0943 90.4058 63.2522C90.6642 63.5239 90.8669 63.9764 90.8474 64.354C90.8336 64.622 90.7018 64.8388 90.5 65.0082C89.5575 65.7997 85.404 65.3756 83.9996 65.4819C83.6324 64.6248 83.2068 63.7996 82.7822 62.9698Z" fill="#C0C9D5"/>
            <path d="M91.2339 105.773C89.4591 105.929 87.6108 105.876 85.8279 105.881C84.9652 105.883 84.007 105.963 83.1536 105.86C82.906 105.83 82.6778 105.74 82.4662 105.612C82.1191 105.4 81.791 105.056 81.7216 104.644C81.675 104.368 81.7851 104.103 81.9693 103.9C82.9292 102.839 87.1116 103.223 88.6325 103.128C89.1429 103.437 90.2611 104.416 90.8079 104.359C90.9317 104.836 91.0378 105.32 91.2339 105.773Z" fill="#C0C9D5"/>
            <path d="M81.6627 32.3C83.2454 32.2705 87.7766 32.145 89.1004 32.3777C89.4806 32.4448 89.8236 32.6273 90.0429 32.9497C90.2367 33.2347 90.3017 33.617 90.2209 33.9507C90.1179 34.3759 89.8089 34.5807 89.4576 34.8045C89.3735 34.8122 89.2893 34.8187 89.205 34.8219C87.7589 34.8796 83.2186 34.9868 82.0084 34.7923C81.7373 34.7489 81.4066 34.629 81.2224 34.4158C80.9765 34.131 80.9107 33.8239 80.9483 33.4592C81.0048 32.9093 81.2481 32.6417 81.6627 32.3Z" fill="#C0C9D5"/>
            <path d="M81.8179 56.3816L87.0388 56.345C87.9241 56.3382 88.9399 56.2388 89.8124 56.3824C90.0823 56.427 90.3207 56.5651 90.4541 56.8084C90.6403 57.1478 90.6105 57.6891 90.5 58.0482C90.3902 58.4056 90.1537 58.6494 89.8324 58.8324C88.1445 58.8232 86.4566 58.8259 84.7687 58.8404C83.8566 58.8548 82.7935 59.0003 81.9 58.8501C81.6637 58.8103 81.4477 58.7108 81.2879 58.5277C81.0274 58.2295 81.0123 57.8035 81.0899 57.4354C81.1962 56.9314 81.3938 56.6672 81.8179 56.3816Z" fill="#C0C9D5"/>
            <path d="M123.623 62.2666C123.852 62.4995 124.172 62.6388 124.459 62.7916C124.15 64.7529 124.014 66.9916 125.284 68.6661C126.13 69.7803 127.32 70.2733 128.624 70.639L128.602 73.2851C128.019 73.2531 127.514 73.3657 127.058 73.748C126.558 74.167 126.301 74.666 126.079 75.2633C126.089 75.6396 126.06 75.9686 125.777 76.2502C125.261 76.7658 124.279 76.9997 123.565 77.0987C123.509 73.7882 123.543 70.4731 123.539 67.1617C123.537 66.0369 123.357 63.2535 123.623 62.2666Z" fill="#003882"/>
            <path d="M94.0451 109.435C94.8312 110.362 95.6092 111.296 96.3792 112.237C93.0233 112.264 89.6674 112.273 86.3115 112.266C84.9677 112.27 83.2399 112.415 81.9434 112.328C81.7462 112.314 81.5447 112.26 81.3614 112.188C80.9585 112.031 80.6097 111.724 80.4512 111.319C80.3227 110.99 80.3163 110.627 80.4852 110.311C80.6767 109.953 81.0577 109.754 81.4425 109.666C82.6738 109.382 84.1846 109.534 85.4492 109.539L91.9143 109.561C92.4658 109.562 93.46 109.682 93.9496 109.486C93.9832 109.473 94.0134 109.452 94.0451 109.435Z" fill="#C0C9D5"/>
            <path d="M93.7702 62.9191L106.758 62.9339C109.388 62.9285 112.048 62.8131 114.675 62.8858C114.951 62.8934 115.237 62.8893 115.49 63.011C115.815 63.1674 116.042 63.5641 116.139 63.8933C116.243 64.2453 116.237 64.5931 116.045 64.9131C115.887 65.1754 115.613 65.2668 115.334 65.3475C108.074 65.4881 100.781 65.4237 93.5177 65.4299C93.3955 65.302 93.281 65.1675 93.1743 65.0266C92.9457 64.7272 92.7551 64.3344 92.8467 63.947C92.9689 63.4295 93.3405 63.1887 93.7702 62.9191Z" fill="#C0C9D5"/>
            <path d="M93.5817 56.3632C96.0881 56.2728 98.6296 56.3486 101.14 56.3481L115.291 56.3554C115.524 56.5082 115.76 56.6739 115.936 56.8929C116.137 57.1438 116.273 57.4795 116.227 57.8036C116.159 58.2713 115.818 58.5445 115.46 58.8124C114.58 58.9581 113.569 58.8407 112.671 58.833L107.792 58.8209L98.6592 58.8212C97.0979 58.8212 95.4817 58.9111 93.9298 58.7915C93.5696 58.7638 93.3033 58.643 93.077 58.3562C92.846 58.063 92.808 57.6973 92.8707 57.341C92.9604 56.8306 93.1631 56.6418 93.5817 56.3632Z" fill="#C0C9D5"/>
            <path d="M93.1621 32.3094C97.8913 32.1787 102.651 32.2929 107.383 32.2901L112.179 32.2778C113.035 32.2753 113.951 32.2139 114.8 32.3135C115.145 32.354 115.482 32.5346 115.688 32.8162C115.903 33.1117 115.938 33.4802 115.877 33.8311C115.791 34.3263 115.558 34.5392 115.151 34.8108C112.46 34.9136 109.725 34.8234 107.03 34.8241L93.2601 34.8067C93.1023 34.6728 92.9547 34.5288 92.8172 34.3746C92.5696 34.0922 92.419 33.7112 92.4683 33.3334C92.5265 32.8881 92.8295 32.5811 93.1621 32.3094Z" fill="#C0C9D5"/>
            <path d="M85.2373 86.5992C94.9896 86.7505 104.761 86.6146 114.516 86.5884C114.166 87.4105 113.85 88.366 113.42 89.1432C107.734 88.9897 102.016 89.1007 96.3272 89.1278L91.0349 89.1524C89.9924 89.158 88.8789 89.0996 87.8478 89.2436C86.9216 88.5092 86.0654 87.4497 85.2373 86.5992Z" fill="#C0C9D5"/>
            <path d="M83.3615 80.1921L103.618 80.1938L111.225 80.1683C112.406 80.1646 113.621 80.0934 114.799 80.1621C115.155 80.1829 115.592 80.2116 115.873 80.454C116.132 80.6772 116.227 81.0286 116.216 81.3572C116.204 81.7448 116.046 82.214 115.738 82.4702C115.492 82.6748 115.174 82.7049 114.865 82.7224C112.752 82.8416 110.581 82.7506 108.46 82.7525L96.2693 82.7531L86.9553 82.769C85.2155 82.7834 83.4065 82.9028 81.6738 82.7961C82.317 81.9921 82.837 81.0753 83.3615 80.1921Z" fill="#C0C9D5"/>
            <path d="M81.7488 38.7729C84.1033 38.645 86.5279 38.7607 88.8884 38.7615L103.184 38.7691L111.167 38.7575C112.227 38.7562 113.983 38.581 114.976 38.8319C115.298 38.9131 115.632 39.1097 115.798 39.4046C115.96 39.692 115.994 40.1601 115.894 40.4711C115.766 40.8684 115.505 41.0373 115.148 41.224C114.355 41.2869 113.519 41.2329 112.721 41.232L107.869 41.2322C102.905 41.2686 97.9419 41.2786 92.9785 41.262L85.3575 41.2653C84.2153 41.2681 82.8825 41.3973 81.7601 41.2187C81.4783 41.1738 81.2522 41.0201 81.0883 40.7892C80.9058 40.5319 80.8816 40.2144 80.9381 39.9129C81.0433 39.3494 81.283 39.0887 81.7488 38.7729Z" fill="#C0C9D5"/>
            <path d="M44.1465 50.6421L68.3643 50.646C68.3399 52.0222 68.3645 53.4012 68.3715 54.7775C63.1619 54.7275 58.9352 56.0065 55.1224 59.6904C53.9149 60.8572 52.9687 62.0385 52.0759 63.4541L51.2132 65.0211C50.0885 67.7223 49.5734 70.1493 49.5725 73.071C49.534 72.8248 49.4883 72.5816 49.4401 72.3371C48.5024 71.9407 45.6349 72.6316 44.3386 72.1871C44.1731 71.9506 44.2007 71.7076 44.193 71.4253C44.1095 68.3902 44.1999 65.3293 44.205 62.2918L44.1465 50.6421Z" fill="#DEE2E6"/>
            <path d="M49.5945 61.0791C50.476 61.8071 51.1366 62.8022 52.0755 63.4543L51.2129 65.0213C50.344 64.1042 49.3302 63.2905 48.4268 62.3985C48.8002 61.9481 49.2055 61.5172 49.5945 61.0791Z" fill="#CF5455"/>
            <path d="M49.6244 73.9839C49.7701 74.8512 49.8619 75.7441 50.0666 76.5992C51.0419 80.6711 53.1597 83.4285 56.262 86.1438C56.7852 86.4677 57.2695 86.8461 57.7599 87.2159C61.0205 89.1768 64.2316 90.1072 68.0475 89.9765C67.8855 90.7297 68.1061 94.9015 68.107 95.9283L52.9111 95.9552C50.074 95.9577 47.0673 96.1762 44.2589 95.8272C44.1506 94.7526 44.208 93.6311 44.2077 92.5502L44.2069 86.7617C44.2035 82.6341 44.0224 78.4567 44.2065 74.335C45.5675 74.308 48.2965 74.4392 49.5204 74.1882L49.6244 73.9839Z" fill="#DEE2E6"/>
            <path d="M49.6251 86.0151C50.8504 87.0826 52.014 88.2226 53.1875 89.3455C54.2738 88.3353 55.2015 87.1788 56.2619 86.1434C56.7851 86.4673 57.2694 86.8457 57.7598 87.2155C56.2931 88.7394 54.8112 90.2488 53.3141 91.7436C51.759 90.179 50.0518 88.7128 48.5996 87.0567L49.6251 86.0151Z" fill="#CF5455"/>
            <path d="M48.1408 98.4381L68.1822 98.3909C68.1136 102.393 68.1028 106.395 68.1499 110.397C68.1681 112.765 68.2791 115.174 68.177 117.539C68.1632 117.857 68.1618 118.582 67.9529 118.811C67.3819 119.436 65.3355 119.185 64.4817 119.174H51.101C49.282 119.174 46.3008 119.37 44.5929 119.069C44.3836 118.882 44.3142 118.798 44.2676 118.519C44.1484 117.806 44.2109 116.992 44.2075 116.266L44.2009 112.005C44.2005 107.895 44.0719 103.74 44.2266 99.6339C44.2379 99.3317 44.217 98.8837 44.39 98.6345C45.3932 98.2177 47.0526 98.4341 48.1408 98.4381Z" fill="#DEE2E6"/>
            <path d="M60.6196 103.826C60.8603 103.924 61.1865 104.036 61.3875 104.199C61.5839 104.358 61.6551 104.527 61.6668 104.775C61.6748 104.942 61.6455 105.063 61.5531 105.204C60.8779 106.235 58.4002 108.574 57.4471 109.559C58.666 110.701 60.2339 111.896 61.2114 113.242C61.3605 113.448 61.6002 113.81 61.5327 114.076C61.423 114.509 60.8977 114.793 60.5503 115.035L60.0063 114.565C58.7272 113.285 57.3466 112.092 56.0363 110.842C54.4462 112.337 52.8656 113.878 51.3856 115.48C50.9466 115.031 50.4791 114.636 49.9922 114.239C51.5175 112.631 53.1583 111.115 54.7189 109.538C53.4927 107.985 51.8461 106.603 50.3577 105.296C50.8722 104.858 51.3528 104.365 51.8427 103.899C53.3057 105.196 54.7189 106.617 56.0551 108.042C57.564 106.656 59.0012 105.075 60.6196 103.826Z" fill="#CF5455"/>
            <path d="M44.1737 47.1765C44.1312 43.246 44.1841 39.3154 44.1656 35.3846C44.1535 32.7879 44.0245 30.1571 44.1199 27.5652C44.1344 27.1727 44.1414 26.3686 44.4261 26.1042L44.4659 26.2229L44.3469 26.0975L44.4268 26.0302C45.6724 25.7131 47.2169 25.8844 48.5006 25.8891L54.1193 25.8947C58.3217 25.8913 62.5681 25.7123 66.7656 25.8644C67.2671 25.8825 67.7886 25.9209 68.2529 26.1201C68.5203 26.6453 68.3594 45.0725 68.3655 47.2437L66.5521 47.2364C63.3439 47.441 60.0321 47.2819 56.8138 47.2796C53.2551 47.2772 49.6354 47.4128 46.0841 47.2544C45.4553 47.1725 44.8078 47.1866 44.1737 47.1765Z" fill="#DEE2E6"/>
            <path d="M53.1451 33.7079C52.9712 33.4169 52.7942 33.1271 52.688 32.8037C52.4989 32.2274 52.454 31.5626 52.7505 31.013C53.2105 30.1608 54.7698 29.5507 55.6664 29.2858C56.4422 29.0564 58.2159 28.7748 58.7497 29.5154C59.1176 30.0254 59.0201 30.4551 59.6694 30.7923C59.6984 30.8075 59.7279 30.8219 59.7574 30.8365C60.1129 31.3325 59.798 32.5965 59.7653 33.2218C59.6918 33.5291 59.6469 33.8302 59.4521 34.0885L59.3277 34.0344C59.2249 33.6925 59.1456 32.9432 58.8868 32.7532C58.624 32.7873 58.4542 32.8451 58.281 33.0646C58.1191 33.2698 58.0797 33.5549 58.0323 33.8045L57.9163 33.8729C57.2784 33.5961 57.1724 32.6444 56.3585 32.1945C55.3051 32.5641 54.498 32.7056 53.3835 32.6981C53.325 33.0378 53.2987 33.3975 53.1451 33.7079Z" fill="#263238"/>
            <path d="M56.3589 32.1943C57.1729 32.6443 57.2788 33.596 57.9167 33.8727L58.0327 33.8044C58.0801 33.5548 58.1196 33.2696 58.2815 33.0644C58.4547 32.845 58.6245 32.7871 58.8872 32.753C59.146 32.9431 59.2253 33.6924 59.3281 34.0343L59.4526 34.0884C59.6473 33.83 59.6923 33.5289 59.7657 33.2217C60.0275 34.3704 59.3202 36.0231 58.6692 36.9905C58.4802 37.2714 58.2588 37.5316 58.0004 37.7514C57.6052 38.0475 57.1831 38.3643 56.681 38.4438C55.725 38.5951 54.9113 38.0497 54.1644 37.5372C53.7868 37.1841 53.3805 36.7209 53.1594 36.2543C52.86 35.623 52.8141 34.681 53.0536 34.0259C53.101 33.8959 53.0806 33.9646 53.124 33.7969C53.1316 33.7673 53.1384 33.7375 53.1456 33.7078C53.2991 33.3973 53.3254 33.0376 53.3839 32.698C54.4984 32.7055 55.3055 32.5639 56.3589 32.1943Z" fill="#F6A9A5"/>
            <path d="M54.1643 37.5371C54.9112 38.0496 55.7249 38.595 56.6809 38.4437C57.1829 38.3641 57.6051 38.0473 58.0003 37.7513L58.1211 38.161C58.463 37.9698 58.94 37.6143 59.3434 37.6375C59.8162 38.0984 60.4054 39.3048 60.5306 39.9298C60.5724 39.9582 60.6137 39.9874 60.656 40.0153C61.2612 40.4126 62.1271 40.5574 62.7886 40.8817C64.587 41.7637 65.9402 43.8701 66.3854 45.7647C66.4955 46.2492 66.5509 46.7397 66.5516 47.2362C63.3434 47.4409 60.0316 47.2817 56.8133 47.2795C53.2546 47.277 49.6349 47.4126 46.0836 47.2542C46.0523 45.6915 46.4803 44.0912 47.3843 42.8027C48.5373 41.1597 50.0922 40.5608 52.0138 40.2136C52.2393 39.4699 52.4981 38.457 53.098 37.9236C53.3623 37.6888 53.6509 37.6919 53.9826 37.703L54.1643 37.5371Z" fill="#003882"/>
            <path d="M54.1641 37.5371C54.911 38.0496 55.7247 38.595 56.6807 38.4437C57.1828 38.3641 57.6049 38.0473 58.0001 37.7513L58.121 38.161C57.308 38.6931 56.8354 39.4115 56.4076 40.2571L56.213 40.4239C55.6501 39.1795 55.0206 38.5635 53.9824 37.703L54.1641 37.5371Z" fill="#FEFEFE"/>
            <path d="M68.3712 54.7778C69.6034 54.8654 70.8281 54.9437 72.0364 55.2161C75.4721 55.9912 78.9182 58.218 81.2038 60.8518C81.7841 61.5205 82.2708 62.2503 82.7825 62.9696C83.2071 63.7995 83.6327 64.6246 83.9999 65.4818C85.7838 70.5908 85.7097 75.244 83.3613 80.1922C82.8367 81.0754 82.3167 81.9922 81.6736 82.7962L81.6133 83.017C82.1507 83.773 84.4852 86.011 85.2369 86.5993C86.065 87.4497 86.9213 88.5093 87.8474 89.2436C88.8785 89.0996 89.992 89.1581 91.0345 89.1524L96.3268 89.1279C102.016 89.1008 107.733 88.9897 113.42 89.1433C111.525 93.6706 110.172 98.3713 108.402 102.939C108.005 103.938 107.624 104.944 107.261 105.956C107.006 106.661 106.779 107.43 106.434 108.097C105.761 109.742 105.254 111.413 104.684 113.092C101.46 109.915 98.6326 106.35 95.3236 103.245C94.8612 102.812 93.7902 101.648 93.121 101.667C92.7071 102.753 91.5373 103.489 90.8075 104.359C90.2606 104.416 89.1424 103.437 88.632 103.128C88.0181 102.452 87.0705 101.804 86.78 100.911C86.688 100.628 86.695 100.353 86.8584 100.095C87.0225 99.8369 87.235 99.7336 87.5199 99.6561C86.293 98.5183 85.2987 96.923 84.2984 95.5763C82.1093 92.6292 79.9892 89.61 77.6976 86.7409C74.8603 88.8282 71.5705 89.877 68.0475 89.9763C64.2316 90.107 61.0204 89.1766 57.7598 87.2157C57.2695 86.8459 56.7852 86.4675 56.262 86.1436C53.1596 83.4283 51.0418 80.6709 50.0666 76.599C49.8618 75.7439 49.77 74.8509 49.6244 73.9837L49.5723 73.0713C49.5732 70.1495 50.0883 67.7226 51.213 65.0213L52.0756 63.4544C52.9685 62.0387 53.9146 60.8574 55.1222 59.6906C58.9349 56.0068 63.1617 54.7278 68.3712 54.7778Z" fill="#263238"/>
            <path d="M104.38 105.902C105.184 105.855 106.521 105.694 107.261 105.956C107.006 106.661 106.779 107.43 106.434 108.097C105.739 107.376 105.064 106.633 104.38 105.902Z" fill="#FEFEFE"/>
            <path d="M101.568 102.961C103.846 102.894 106.124 102.887 108.402 102.939C108.005 103.938 107.624 104.944 107.261 105.956C106.52 105.694 105.184 105.855 104.379 105.902C103.386 105.053 102.486 103.909 101.568 102.961Z" fill="#C0C9D5"/>
            <path d="M90.2765 99.4172C90.1182 98.7544 89.7665 97.7692 90.1726 97.1429C90.2963 96.9523 90.2278 97.0206 90.4357 96.9141C90.7215 97.1264 92.2855 100.763 93.121 101.667C92.7071 102.753 91.5373 103.489 90.8075 104.359C90.2606 104.416 89.1424 103.436 88.632 103.128C88.0182 102.452 87.0705 101.804 86.78 100.911C86.688 100.628 86.695 100.352 86.8584 100.095C87.0225 99.8368 87.235 99.7334 87.5199 99.6559C87.8958 99.9304 88.0215 99.9914 88.4994 99.9119C89.098 99.8123 89.6974 99.5977 90.2765 99.4172Z" fill="#F6A9A5"/>
            <path d="M87.8477 89.2434C88.8788 89.0994 89.9923 89.1579 91.0348 89.1522L96.3271 89.1277C102.016 89.1006 107.733 88.9895 113.42 89.1431C111.526 93.6704 110.172 98.3711 108.403 102.938C106.124 102.887 103.846 102.894 101.569 102.961C99.6991 101.208 97.9968 99.2601 96.1824 97.4486C93.4263 94.697 90.5612 92.0323 87.8477 89.2434Z" fill="#FEFEFE"/>
            <path d="M69.2504 56.5356C73.1045 56.7195 76.9712 58.8392 79.538 61.6252C79.6243 61.7197 79.7093 61.8153 79.793 61.9121C79.8769 62.0087 79.9595 62.1063 80.0409 62.2049C80.1223 62.3036 80.2025 62.4033 80.2813 62.5039C80.3603 62.6045 80.4379 62.7061 80.5142 62.8085C80.5905 62.9111 80.6656 63.0146 80.7394 63.119C80.8132 63.2233 80.8856 63.3286 80.9568 63.4348C81.0279 63.5409 81.0977 63.6479 81.1661 63.7558C81.2346 63.8637 81.3017 63.9725 81.3674 64.0819C81.4332 64.1914 81.4976 64.3017 81.5607 64.413C81.6236 64.5241 81.6852 64.6359 81.7454 64.7485C81.8056 64.8611 81.8643 64.9744 81.9216 65.0885C81.9791 65.2025 82.035 65.3172 82.0894 65.4326C82.1439 65.5481 82.197 65.6642 82.2486 65.7809C82.3002 65.8976 82.3503 66.0149 82.399 66.1329C82.4476 66.251 82.4947 66.3696 82.5404 66.4886C82.5861 66.6077 82.6303 66.7274 82.673 66.8476C82.7157 66.9678 82.7569 67.0885 82.7966 67.2097C82.8362 67.331 82.8744 67.4527 82.911 67.5748C82.9477 67.697 82.9828 67.8196 83.0164 67.9427C83.0501 68.0656 83.0821 68.189 83.1126 68.3129C83.1431 68.4367 83.172 68.5608 83.1993 68.6853C83.2267 68.8098 83.2526 68.9347 83.2769 69.0599C83.3011 69.185 83.3238 69.3104 83.3449 69.4361C83.3661 69.5618 83.3856 69.6877 83.4037 69.8139C83.4217 69.9401 83.438 70.0666 83.4528 70.1933C83.4676 70.3198 83.4809 70.4466 83.4926 70.5735C83.5042 70.7003 83.5143 70.8273 83.5228 70.9545C83.5313 71.0817 83.5381 71.209 83.5434 71.3363C83.5487 71.4636 83.5524 71.591 83.5546 71.7185C83.5567 71.8459 83.5572 71.9733 83.5561 72.1008C83.5551 72.2282 83.5524 72.3556 83.5482 72.4829C83.5439 72.6104 83.538 72.7377 83.5306 72.8649C83.5238 72.9984 83.5153 73.1319 83.5051 73.2652C83.4949 73.3985 83.4831 73.5317 83.4696 73.6647C83.4561 73.7978 83.441 73.9307 83.4242 74.0634C83.4075 74.1961 83.389 74.3285 83.3689 74.4607C83.3488 74.5929 83.327 74.7248 83.3037 74.8565C83.2803 74.9882 83.2553 75.1196 83.2286 75.2506C83.202 75.3818 83.1737 75.5126 83.1437 75.6429C83.1139 75.7733 83.0824 75.9033 83.0491 76.0329C83.016 76.1625 82.9812 76.2916 82.9448 76.4205C82.9086 76.5492 82.8706 76.6775 82.8309 76.8054C82.7914 76.9332 82.7503 77.0606 82.7076 77.1874C82.6648 77.3142 82.6205 77.4405 82.5746 77.5662C82.5288 77.6918 82.4813 77.817 82.4322 77.9416C82.3832 78.0661 82.3327 78.1901 82.2807 78.3136C82.2286 78.4369 82.1749 78.5595 82.1198 78.6815C82.0646 78.8036 82.008 78.9249 81.9498 79.0455C81.8916 79.1662 81.8319 79.2861 81.7707 79.4053C81.7095 79.5244 81.6469 79.6428 81.5828 79.7605C81.5187 79.8781 81.4531 79.9949 81.3861 80.111C81.3191 80.2271 81.2507 80.3423 81.1808 80.4567C81.1109 80.571 81.0396 80.6845 80.9668 80.7971C80.894 80.9098 80.8199 81.0215 80.7445 81.1322C80.6689 81.243 80.592 81.3529 80.5138 81.4617C80.4355 81.5707 80.3559 81.6787 80.2751 81.7857C80.1941 81.8926 80.1118 81.9986 80.0282 82.1036C79.9447 82.2086 79.8599 82.3125 79.7736 82.4153C79.6875 82.5182 79.6001 82.62 79.5114 82.7207C79.4226 82.8214 79.3327 82.921 79.2415 83.0195C79.1503 83.1181 79.058 83.2156 78.9644 83.3118C78.8707 83.408 78.7759 83.5032 78.6799 83.5971C78.584 83.6911 78.4868 83.7839 78.3885 83.8754C78.2902 83.967 78.1908 84.0574 78.0902 84.1465C75.4658 86.4873 71.7602 88.2383 68.183 88.3057C68.2584 83.62 68.1713 78.9199 68.1919 74.2319L68.1885 72.4455C68.1895 69.1105 68.1706 65.7756 68.1318 62.4408C68.118 60.5295 68.0179 58.5666 68.1522 56.6607C68.434 56.5023 68.9268 56.548 69.2504 56.5356Z" fill="#FEFEFE"/>
            <path d="M56.7215 60.6024C57.1394 60.234 57.5756 59.8881 58.0301 59.565C61.0025 57.4652 65.5792 55.9225 69.2507 56.5357C68.9271 56.5481 68.4343 56.5024 68.1525 56.6608C68.0182 58.5666 68.1183 60.5296 68.1321 62.4409C68.1709 65.7757 68.1897 69.1105 68.1887 72.4456L68.1921 74.232C68.1716 78.9199 68.2586 83.6201 68.1833 88.3058C64.3522 88.3518 60.9501 87.4142 57.8318 85.1633C54.1271 82.4892 52.195 78.6769 51.4747 74.2728C51.3933 73.6457 51.3767 73.0157 51.3516 72.3847C51.4541 69.2856 52.2214 66.6984 53.7918 64.0172C54.6118 62.7277 55.6033 61.6435 56.7215 60.6024Z" fill="#DEE2E6"/>
            <path d="M56.7217 60.6021C56.6939 61.5294 56.6359 62.5043 55.8968 63.1767C55.3178 63.7032 54.539 63.8678 53.792 64.0168C54.612 62.7273 55.6034 61.6431 56.7217 60.6021Z" fill="#969292"/>
            </g>
            <defs>
            <clipPath id="clip0_5351_49859">
            <rect width="170" height="100" fill="white"/>
            </clipPath>
            </defs>
            </svg>

          <p class="text-sm font-medium text-slate-600 hover:!text-slate-600 active:!text-slate-600  hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">No Related Jobs.</p>
        </div>
      `;
    }

    if (tab === "inquiries") {
      return `
        <div class="flex flex-col items-center justify-center gap-4 px-4 text-center hover:text-center active:text-center focus:text-center focus-visible:text-center">
            <svg width="166" height="122" viewBox="0 0 166 122" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g clip-path="url(#clip0_5351_50014)">
            <path d="M143.444 106.74L143.64 106.669L142.775 115.341C142.584 117.31 142.459 119.316 142.147 121.268L159.219 121.272L163.804 121.27C164.518 121.271 165.309 121.183 166.006 121.325L166.079 121.42C165.837 121.587 165.688 121.576 165.394 121.583C164.216 121.613 163.023 121.544 161.842 121.545L152.448 121.561L146.243 121.569C145.205 121.57 144.127 121.63 143.094 121.561C141.577 121.345 135.695 121.798 134.967 121.455C135.958 121.102 140.257 121.562 141.74 121.347C141.795 121.339 141.85 121.33 141.906 121.321C142.216 119.318 142.345 117.262 142.542 115.243L143.444 106.74Z" fill="#020203"/>
            <path d="M34.6083 113.38C34.6826 113.314 34.69 113.3 34.7941 113.253C35.1876 113.074 38.1314 112.765 38.538 112.894C38.5182 113.582 38.5131 114.27 38.5224 114.959C39.2909 114.715 40.2068 114.433 40.9832 114.799C41.2062 114.904 41.3684 115.054 41.431 115.301C41.638 116.116 41.4042 116.629 42.182 117.175C43.6462 118.202 45.6318 118.212 47.0373 119.297C48.5552 120.468 47.2688 121.34 49.5878 121.3L49.6071 121.373C49.4241 121.397 49.2592 121.423 49.0836 121.481L49.202 121.553L49.2832 121.494L49.3792 121.575C50.8671 121.64 52.3659 121.543 53.8486 121.622L53.8293 121.695L25.2661 121.817L19.8936 121.836C19.0367 121.844 17.9585 122.019 17.1377 121.813C17.1162 121.776 17.0476 121.654 17.0231 121.626C16.9908 121.588 16.9605 121.542 16.9143 121.525C16.7629 121.469 5.68618 121.545 4.37976 121.549C2.99225 121.553 1.34582 121.73 -0.0117188 121.471L-2.65287e-05 121.36C1.17971 121.057 6.1672 121.252 7.6678 121.249C10.2676 121.244 12.8727 121.275 15.4719 121.23C17.6317 121.192 19.7733 121.093 21.938 121.094L28.5496 121.101C29.9393 121.102 31.3478 121.149 32.7336 121.035L32.656 120.981C29.906 120.747 26.5466 120.92 23.7419 120.917C22.0841 120.915 18.3168 120.722 16.8342 121.032C17.0821 119.338 17.415 116.776 17.9729 115.21C18.1961 115.112 18.3509 115.173 18.5869 115.206L18.5821 112.97C20.4277 113.248 22.7517 113.434 24.5108 113.881L24.5499 114.216C24.9519 114.266 25.3119 114.369 25.6973 114.488C26.5768 118.244 29.9761 117.764 32.4726 119.629C32.6325 118.401 32.6312 117.082 32.9793 115.892C33.1718 115.844 33.1083 115.849 33.2806 115.842C33.3164 115.84 33.3523 115.84 33.388 115.84C33.6904 115.41 33.5695 114.181 33.5738 113.631L33.6419 113.628C33.893 113.421 34.2867 113.428 34.6083 113.38Z" fill="#263238"/>
            <path d="M18.582 112.97C20.4277 113.248 22.7517 113.434 24.5108 113.881L24.5499 114.216C23.3625 114.51 22.6221 114.873 21.8282 115.845C20.737 115.669 19.6646 115.452 18.5869 115.206L18.582 112.97Z" fill="#F9AE9E"/>
            <path d="M34.6084 113.38C35.8487 113.299 37.1226 113.223 38.345 112.995C38.355 113.559 38.5053 114.607 38.2559 115.111C37.622 115.45 37.6307 115.814 37.4398 115.901C36.7554 116.211 34.4076 115.908 33.5713 115.911C33.6788 115.175 33.6611 114.372 33.642 113.628C33.8932 113.421 34.2869 113.428 34.6084 113.38Z" fill="#F9AE9E"/>
            <path d="M32.157 6.67682C33.3933 5.9047 34.6708 5.14692 36.1904 5.31122C37.0755 5.40689 37.915 5.7798 38.4693 6.49854C39.3648 7.65954 39.2822 8.9587 39.1001 10.3218C39.3129 10.3572 39.5332 10.3895 39.7403 10.4512C40.1221 10.5652 40.4566 10.8898 40.621 11.2491C40.7675 11.5692 40.7598 11.9292 40.6358 12.2552C40.3446 13.0217 39.725 13.3472 39.0254 13.6559C39.0371 13.7042 39.0494 13.7523 39.0608 13.8008C39.193 14.3672 39.2609 14.9265 38.9137 15.4314C38.408 16.1672 37.2247 16.2455 36.4235 16.362C36.4033 16.38 36.3808 16.3956 36.3629 16.4158C36.191 16.6097 36.1072 16.9815 36.0237 17.2255C35.3673 19.1415 35.1315 20.8646 32.7412 21.1654C32.1267 21.2428 30.9636 21.1077 30.4506 21.3791C30.1017 21.0712 29.4653 20.9997 29.0403 20.79C28.7442 20.6438 28.4265 20.2805 28.1171 20.2352C27.9832 20.558 28.0492 21.0568 28.1815 21.3773C28.3475 21.7796 28.6531 22.0869 29.0571 22.2444C29.3628 22.3634 29.7964 22.4235 30.1033 22.2734C30.2379 22.2075 30.3608 22.1098 30.4806 22.02L30.5201 21.9911C30.5953 22.2565 30.6859 22.5434 30.6846 22.8215C30.6823 23.2852 30.5037 23.7864 30.1556 24.0992C29.7247 24.4863 29.0643 24.5705 28.5113 24.5077C27.4466 24.3868 26.8307 23.7575 26.1981 22.9653C26.242 22.5635 26.2481 22.1603 26.2604 21.7565C26.4303 21.6841 26.5198 21.5973 26.6478 21.4651C27.0043 20.9254 27.2059 20.3817 27.4005 19.77C27.0225 19.7268 26.6745 19.6506 26.3335 19.4728C25.2902 18.9293 25.7229 17.6445 25.1765 17.0917C24.7492 16.6592 24.2202 16.6018 24.0347 15.9127C23.8447 15.2063 24.1771 14.4109 24.5046 13.7995C24.0224 13.6766 23.58 13.5317 23.209 13.1815C22.8908 12.881 22.6923 12.5085 22.6934 12.0633C22.6952 11.3655 23.0914 10.9701 23.5383 10.5008L23.5297 10.3319L23.6305 10.3737L23.5308 10.2758C23.5479 9.79871 23.6648 9.47828 23.9257 9.07271C24.2855 8.51354 24.7832 8.13665 25.4417 8.00847C26.2075 7.85961 26.7663 8.05949 27.3868 8.50138C27.5355 7.77664 27.704 7.1759 28.2158 6.6111C28.2751 6.5455 28.3374 6.48299 28.4029 6.42356C28.4684 6.36426 28.5367 6.30834 28.6077 6.25581C28.6787 6.20328 28.7522 6.15451 28.828 6.10948C28.9039 6.06434 28.9818 6.02313 29.0618 5.98585C29.1418 5.94857 29.2234 5.91535 29.3067 5.88618C29.3899 5.85713 29.4744 5.83232 29.5602 5.81175C29.6459 5.79117 29.7325 5.77495 29.8198 5.76309C29.9071 5.75111 29.9948 5.74361 30.0829 5.74058C30.9723 5.71516 31.5422 6.09187 32.157 6.67682Z" fill="#263238"/>
            <path d="M30.6333 16.6359C30.5599 16.2848 30.4978 15.6483 30.2052 15.4435L30.063 15.6635C30.0567 15.9379 30.1757 16.1136 30.3037 16.3456L30.3627 16.4509L30.3062 16.5678C30.1453 16.5972 30.1698 16.6308 30.0599 16.5444C29.8717 16.3959 29.7028 16.1249 29.6808 15.8828C29.6527 15.5753 29.7595 15.3967 29.9621 15.1855C30.3318 15.0497 30.6983 15.1127 31.0826 15.1432C31.7428 14.8203 31.2713 13.3218 31.9256 12.6876C32.1271 12.4925 32.4137 12.3519 32.6973 12.3846C33.143 12.4358 33.4198 13.192 33.693 13.5031C34.3835 14.2896 35.3387 13.4659 36.1613 13.5509C36.3324 13.5687 36.4561 13.6228 36.5485 13.7787C36.8926 14.3598 36.5644 15.7202 36.4237 16.3623C36.4035 16.3803 36.3809 16.3959 36.363 16.4161C36.1911 16.61 36.1074 16.9818 36.0238 17.2258C35.3674 19.1418 35.1316 20.8649 32.7413 21.1657C32.1268 21.243 30.9637 21.108 30.4507 21.3794C30.1018 21.0715 29.4654 21 29.0405 20.7903C28.7444 20.6441 28.4266 20.2808 28.1172 20.2355C27.9833 20.5582 28.0493 21.0571 28.1816 21.3776C28.3476 21.7799 28.6532 22.0872 29.0572 22.2446C29.3629 22.3637 29.7965 22.4238 30.1034 22.2737C30.238 22.2078 30.3609 22.1101 30.4807 22.0202L30.5202 21.9914C30.5954 22.2568 30.686 22.5437 30.6848 22.8218C30.6824 23.2855 30.5038 23.7867 30.1557 24.0995C29.7248 24.4866 29.0644 24.5708 28.5114 24.508C27.4467 24.3871 26.8308 23.7578 26.1982 22.9656C26.2421 22.5638 26.2482 22.1606 26.2605 21.7568C26.4305 21.6844 26.52 21.5976 26.6479 21.4654C27.0044 20.9257 27.206 20.382 27.4007 19.7703C27.6681 19.5144 28.0239 19.3337 28.3333 19.1307C29.4098 18.4249 30.0462 17.7994 30.6333 16.6359Z" fill="#F9AE9E"/>
            <path d="M78.5417 12.2393C78.5776 10.4726 78.8062 2.10873 79.2932 0.961892C79.7389 0.792871 80.2456 0.784518 80.7176 0.766C83.621 0.651989 86.5332 0.667421 89.4382 0.608055L110.72 0.248409L120.224 0.0733985C121.419 0.0625057 122.727 -0.0731129 123.91 0.0753931C124.137 0.295429 124.119 0.695379 124.123 1.00274C124.162 3.58162 123.884 6.23966 123.752 8.81982L122.734 29.9412L122.538 34.635C122.511 35.1994 122.377 35.9403 122.441 36.4929C122.454 36.6042 122.483 36.6934 122.545 36.7836C122.394 37.0389 122.352 37.2529 122.317 37.5474C122.05 39.8173 122.041 42.1805 121.909 44.4671C121.628 48.8179 121.408 53.1718 121.248 57.5289C118.007 57.6607 114.73 57.5673 111.485 57.5664C110.067 57.5659 107.428 57.7393 106.138 57.4713L85.2023 57.4517C84.1033 57.5472 82.9384 57.472 81.8318 57.474L74.8614 57.4817C68.4184 57.5142 61.9755 57.5067 55.5327 57.4591C55.5366 57.1273 55.5004 56.9673 55.7386 56.7264C55.9619 56.6549 56.1196 56.6175 56.3547 56.6353C56.7753 56.6671 57.1952 56.6738 57.6169 56.6836C57.6356 54.1183 57.6368 51.553 57.6203 48.9878C57.625 47.5071 57.7675 45.8693 57.5521 44.4062C57.5422 44.271 57.5508 44.1828 57.6059 44.0575C57.6856 43.8761 57.6957 43.7755 57.8848 43.7064C58.2516 43.4498 58.604 42.8371 58.9225 42.4878C59.3799 41.7279 59.8723 40.9988 60.3656 40.2626L60.3451 40.0275C61.0096 40.2452 61.5691 40.1437 62.2333 40.0121L62.3674 39.7283C61.9192 39.4534 61.3903 39.4523 60.9396 39.1573C60.9185 39.1435 60.8981 39.1287 60.8772 39.1143C60.8941 38.4616 61.8686 37.315 62.269 36.8043C63.1927 36.8698 64.1291 36.7801 65.0576 36.8391C67.7828 37.0129 69.9025 37.3923 72.6861 36.8911C72.4932 36.8793 72.5818 36.91 72.4212 36.7963L72.5056 36.7021C72.8791 36.6131 73.2285 36.6327 73.6083 36.6449C73.8867 36.482 74.2324 36.3757 74.533 36.2589L74.4904 36.1558C74.8787 35.6511 76.5602 35.0322 77.2031 34.5522C78.6606 33.464 79.8641 32.0423 80.9457 30.5885C82.6872 27.3776 83.7209 23.2639 82.6426 19.6568C81.5788 16.0981 79.5568 12.7623 76.232 10.9775C72.6814 9.07162 68.734 8.576 64.8675 9.77494C64.7552 9.80919 64.6434 9.8449 64.5319 9.88205C64.4205 9.91909 64.3096 9.95751 64.1991 9.99733C64.0887 10.0372 63.9788 10.0784 63.8693 10.121C63.7598 10.1634 63.6509 10.2073 63.5425 10.2526C63.4342 10.2979 63.3264 10.3445 63.2192 10.3924C63.1119 10.4403 63.0053 10.4896 62.8993 10.5402C62.7932 10.5908 62.6878 10.6426 62.583 10.6957C62.4782 10.7489 62.3742 10.8033 62.2708 10.8591C62.1674 10.9149 62.0647 10.972 61.9627 11.0303C61.8606 11.0887 61.7594 11.1482 61.6588 11.209C61.5582 11.2699 61.4584 11.332 61.3593 11.3953C61.2603 11.4586 61.1621 11.5231 61.0646 11.5888C60.9671 11.6545 60.8704 11.7214 60.7747 11.7896C60.6788 11.8577 60.5838 11.9271 60.4898 11.9976C60.3956 12.0681 60.3023 12.1397 60.2099 12.2126C60.1175 12.2854 60.0261 12.3594 59.9356 12.4344C59.8451 12.5095 59.7555 12.5857 59.6668 12.663C59.578 12.7403 59.4903 12.8187 59.4035 12.8981C59.3168 12.9776 59.231 13.0582 59.1462 13.1397C59.0614 13.2214 58.9777 13.3041 58.8949 13.3877C58.8121 13.4714 58.7304 13.5561 58.6497 13.6419C58.569 13.7276 58.4893 13.8143 58.4108 13.9019C58.3322 13.9896 58.2548 14.0783 58.1784 14.1678C58.102 14.2575 58.0267 14.3481 57.9525 14.4396C57.8783 14.531 57.8053 14.6234 57.7334 14.7167C57.6615 14.81 57.5907 14.9041 57.5211 14.9992C57.4515 15.0943 57.3831 15.1902 57.3157 15.2869C57.2485 15.3836 57.1824 15.4812 57.1176 15.5796C57.0528 15.678 56.9891 15.7771 56.9267 15.8771C56.8643 15.9771 56.8031 16.0778 56.743 16.1792C56.6831 16.2808 56.6244 16.383 56.5669 16.4858C56.5096 16.5888 56.4534 16.6925 56.3984 16.7968C54.7833 19.8643 54.521 24.0391 55.5455 27.3333C55.9859 28.7492 56.5853 30.0596 57.4655 31.2546C57.8228 31.7395 59.0192 32.8377 59.1271 33.2894L59.0308 33.4186C58.9849 33.381 58.9402 33.3422 58.8958 33.303C56.3607 31.0563 54.8853 27.5069 54.668 24.1515C54.4149 20.2446 55.6079 16.5332 58.1991 13.5902C60.6933 10.7573 64.4828 8.96197 68.2333 8.75283C71.8548 8.55095 75.8139 9.79346 78.5417 12.2393Z" fill="#263238"/>
            <path d="M77.6999 34.5459C77.6689 35.2597 77.6388 35.9721 77.5745 36.6838C76.2519 36.7317 74.9299 36.7187 73.6084 36.6448C73.8868 36.4819 74.2325 36.3755 74.5331 36.2588C75.674 35.9226 76.7276 35.2131 77.6999 34.5459Z" fill="#FEFEFE"/>
            <path d="M111.802 48.6221C112.035 49.2631 111.86 55.4873 111.872 56.7311L110.756 56.7365C110.788 54.4968 110.774 52.2321 110.683 49.9942C111.121 49.577 111.454 49.1161 111.802 48.6221Z" fill="#C0C9D5"/>
            <path d="M81.227 30.8761C81.6958 30.182 82.026 29.4168 82.3784 28.6592C82.3391 31.3392 82.02 34.0163 81.9369 36.6952C80.7906 36.7319 79.6392 36.709 78.4922 36.7054C78.6216 35.7098 78.7269 34.6985 78.7816 33.6959C79.7469 32.8682 80.5275 31.937 81.227 30.8761Z" fill="#4E83D0"/>
            <path d="M87.4609 37.4058C87.6452 38.8129 87.438 40.3031 87.4952 41.7237C87.3047 43.1365 87.4364 45.0996 87.4369 46.5723L87.4294 56.6738L85.502 56.679C85.5742 51.0086 85.5874 45.3379 85.5413 39.6671C86.1984 38.9299 86.8125 38.1517 87.4609 37.4058Z" fill="#C0C9D5"/>
            <path d="M87.6849 47.4148C93.3917 47.258 99.1302 47.4168 104.84 47.4475L109.539 47.468C110.268 47.4702 111.124 47.3816 111.83 47.5203L111.933 47.7313C111.901 48.3093 111.549 48.7116 111.205 49.1428C111.066 49.3227 110.881 49.4926 110.725 49.6593C108.013 49.3968 105.173 49.5535 102.449 49.552L87.6719 49.5522L87.6849 47.4148Z" fill="#FEFEFE"/>
            <path d="M87.6885 49.7508L101.869 49.7446C104.563 49.7474 107.307 49.6464 109.995 49.8223C109.951 50.7539 109.975 51.6945 109.973 52.6273C102.548 52.5675 95.1226 52.5568 87.697 52.5951L87.6885 49.7508Z" fill="#FEFEFE"/>
            <path d="M62.2688 36.8043C63.1925 36.8699 64.1289 36.7802 65.0574 36.8392C67.7825 37.0129 69.9023 37.3924 72.6859 36.8911C75.71 36.8082 78.7577 36.8977 81.785 36.8779C83.4333 36.867 85.9226 36.6838 87.4875 36.8793C87.4371 37.0177 87.3911 37.16 87.3303 37.2942C86.7117 38.026 86.0869 38.7526 85.456 39.474L71.3465 39.4892C68.2704 39.4914 63.7937 39.6955 60.877 39.1144C60.8939 38.4617 61.8684 37.315 62.2688 36.8043Z" fill="#FEFEFE"/>
            <path d="M91.9082 52.7852L109.991 52.826C110.043 54.1207 110.069 55.4158 110.068 56.7115C108.782 56.6833 107.495 56.6679 106.208 56.6654C100.035 56.7226 93.8611 56.7332 87.6875 56.697L87.6947 52.8073L91.9082 52.7852Z" fill="#FEFEFE"/>
            <path d="M80.1279 1.84015L123.067 0.96582C122.944 5.13651 122.601 9.30194 122.405 13.4695C121.689 27.8883 121.053 42.3106 120.498 56.7365L116.744 56.7345C117.102 46.8064 117.586 36.8846 118.198 26.9691C118.41 22.9832 118.496 18.9904 118.699 15.0033C118.878 11.4807 119.134 7.96339 119.27 4.4381L83.272 5.07533C83.0817 7.8731 82.9163 10.6724 82.7756 13.4732C82.7024 15.0339 82.6964 16.6116 82.5616 18.1676C81.7977 16.3848 80.9767 14.3577 79.4811 13.058C79.4134 9.45644 79.8936 5.46421 80.1279 1.84015Z" fill="#4E83D0"/>
            <path d="M60.5159 40.418C61.0605 40.3714 62.0875 40.3854 62.4808 39.9409C62.5451 39.8685 62.579 39.7717 62.6463 39.702C62.7538 39.5904 62.8197 39.6194 62.9565 39.6169C65.2509 39.5748 67.535 39.6624 69.8283 39.6686L84.1208 39.6688L85.3515 39.6695L85.2591 56.6617L68.9547 56.6941C65.257 56.6985 61.528 56.7847 57.8343 56.6765L57.8242 47.8324C57.8204 46.7263 57.6544 44.7011 57.8843 43.7064C58.2511 43.4499 58.6035 42.8372 58.922 42.4879C59.3794 41.7279 59.8718 40.9988 60.3651 40.2626L60.5159 40.418Z" fill="#FEFEFE"/>
            <path d="M58.9219 42.4879C59.3793 41.728 59.8717 40.9989 60.365 40.2627L60.5158 40.4181C60.6506 40.8464 60.9166 41.4193 60.7158 41.8578C60.6012 42.1078 60.3204 42.328 60.1115 42.5008L58.9219 42.4879Z" fill="#F9AE9E"/>
            <path d="M83.2716 5.07522L119.27 4.43799C119.134 7.96328 118.878 11.4806 118.698 15.0031C118.495 18.9903 118.41 22.9831 118.198 26.969C117.586 36.8845 117.101 46.8063 116.744 56.7344C115.181 56.7497 113.618 56.7498 112.055 56.735C112.036 53.5799 112.034 50.4249 112.047 47.27L87.6733 47.2309L87.7048 41.2066C87.699 39.6858 87.7095 38.1651 87.7366 36.6445C85.8076 36.6099 83.8659 36.6701 81.9365 36.695C82.0197 34.0161 82.3387 31.339 82.378 28.659C83.4866 24.5315 83.5879 22.3429 82.5612 18.1675C82.696 16.6115 82.7019 15.0338 82.7752 13.4731C82.9158 10.6724 83.0813 7.87311 83.2716 5.07522Z" fill="#FEFEFE"/>
            <path d="M98.7197 36.0427C99.1147 35.9971 99.4703 36.0022 99.8541 36.1208C100.464 36.3089 100.974 36.7055 101.261 37.2847C101.294 37.3506 101.324 37.4181 101.349 37.4871C101.375 37.5561 101.397 37.6263 101.416 37.6977C101.434 37.7691 101.449 37.8413 101.46 37.9143C101.471 37.9873 101.478 38.0606 101.481 38.1343C101.484 38.208 101.483 38.2817 101.479 38.3553C101.474 38.429 101.466 38.5022 101.453 38.5749C101.441 38.6476 101.425 38.7194 101.405 38.7904C101.385 38.8615 101.362 38.9313 101.334 38.9998C101.05 39.724 100.49 40.135 99.809 40.4463C99.3951 40.4826 99.0171 40.5006 98.6169 40.3683C98.5419 40.3438 98.4684 40.3156 98.3964 40.2837C98.3243 40.2517 98.2541 40.2161 98.1856 40.1769C98.1171 40.1378 98.0507 40.0953 97.9866 40.0493C97.9224 40.0034 97.8607 39.9543 97.8015 39.9021C97.7422 39.8498 97.6857 39.7946 97.6321 39.7367C97.5784 39.6787 97.5278 39.6181 97.4803 39.5548C97.4328 39.4916 97.3886 39.4262 97.3477 39.3585C97.3068 39.2907 97.2694 39.2211 97.2355 39.1495C96.9785 38.6011 96.9352 37.9479 97.1673 37.3831C97.469 36.6485 98.0319 36.3377 98.7197 36.0427Z" fill="#4E83D0"/>
            <path d="M99.5227 13.9243C99.7781 13.9264 100.033 13.9338 100.288 13.9465C102.341 14.0596 104.276 15.0895 105.633 16.6232C107.116 18.2998 107.772 20.5383 107.619 22.763C107.444 25.2903 106.295 27.2782 104.272 28.7524C103.498 29.3165 102.627 29.8255 101.921 30.4726C100.837 31.4654 100.967 32.5133 100.891 33.8682C100.089 33.6783 99.2596 33.6264 98.4405 33.5689C98.5016 32.5725 98.5042 31.4967 98.7759 30.5332C99.31 28.6391 100.799 28.2192 102.271 27.275C103.146 26.7133 103.898 26.0517 104.506 25.2028C104.808 24.6921 105.061 24.1767 105.214 23.5999C105.237 23.5096 105.259 23.4188 105.278 23.3274C105.297 23.236 105.314 23.1442 105.328 23.052C105.343 22.9598 105.355 22.8672 105.365 22.7744C105.375 22.6816 105.383 22.5886 105.388 22.4954C105.394 22.4022 105.397 22.3089 105.398 22.2154C105.399 22.1221 105.397 22.0288 105.394 21.9355C105.39 21.8422 105.384 21.749 105.376 21.6561C105.368 21.563 105.357 21.4702 105.344 21.3778C105.332 21.2853 105.316 21.1932 105.299 21.1014C105.282 21.0097 105.262 20.9184 105.241 20.8277C105.219 20.7369 105.195 20.6467 105.169 20.5572C105.142 20.4676 105.114 20.3788 105.084 20.2906C105.053 20.2024 105.02 20.115 104.986 20.0285C104.951 19.942 104.914 19.8563 104.875 19.7716C104.836 19.6869 104.795 19.6032 104.752 19.5205C104.708 19.4379 104.663 19.3563 104.616 19.2758C104.565 19.1889 104.512 19.1033 104.456 19.0189C104.401 18.9347 104.343 18.8519 104.284 18.7705C104.224 18.6891 104.163 18.6092 104.099 18.5309C104.036 18.4526 103.971 18.3759 103.903 18.3009C103.836 18.2258 103.767 18.1525 103.696 18.0808C103.625 18.0093 103.553 17.9395 103.478 17.8715C103.404 17.8035 103.328 17.7374 103.25 17.6733C103.173 17.6091 103.094 17.5469 103.013 17.4866C102.933 17.4265 102.85 17.3683 102.767 17.3122C102.683 17.256 102.599 17.202 102.512 17.1502C102.426 17.0983 102.339 17.0486 102.25 17.0012C102.162 16.9536 102.072 16.9084 101.981 16.8654C101.89 16.8223 101.798 16.7816 101.705 16.7432C101.612 16.7047 101.518 16.6687 101.424 16.635C101.329 16.6012 101.234 16.5699 101.138 16.541C101.041 16.5119 100.944 16.4853 100.847 16.4613C100.754 16.439 100.66 16.4191 100.566 16.4015C100.471 16.384 100.377 16.3687 100.282 16.3558C100.187 16.343 100.091 16.3325 99.9958 16.3244C99.9003 16.3161 99.8046 16.3103 99.7087 16.3069C99.613 16.3036 99.5172 16.3025 99.4213 16.3039C99.3254 16.3052 99.2297 16.3089 99.1341 16.3151C99.0383 16.3212 98.9428 16.3296 98.8475 16.3405C98.7522 16.3513 98.6573 16.3645 98.5628 16.3801C98.4681 16.3956 98.3739 16.4135 98.2802 16.4337C98.1864 16.454 98.0932 16.4766 98.0006 16.5014C97.9079 16.5262 97.816 16.5533 97.7247 16.5827C97.6334 16.6121 97.5429 16.6438 97.4531 16.6778C97.3634 16.7117 97.2745 16.7478 97.1864 16.7861C97.0985 16.8244 97.0115 16.8649 96.9255 16.9075C96.8395 16.9502 96.7546 16.995 96.6708 17.0419C96.587 17.0887 96.5045 17.1376 96.423 17.1885C94.6701 18.2822 93.5597 20.3939 93.5768 22.4649C93.5823 23.1135 93.7724 24.0058 93.6017 24.6295C93.5528 24.8086 93.5922 24.7442 93.4193 24.8384C92.6936 24.8128 91.9964 24.4183 91.3474 24.1204C91.2741 23.7534 91.2221 23.3834 91.1913 23.0104C91.1802 22.8706 91.1727 22.7306 91.1686 22.5905C91.1645 22.4505 91.1639 22.3104 91.1669 22.1702C91.17 22.0299 91.1764 21.8899 91.1863 21.7501C91.1962 21.6103 91.2097 21.4708 91.2267 21.3316C91.2436 21.1925 91.2641 21.0538 91.288 20.9157C91.3118 20.7776 91.3391 20.6402 91.3699 20.5034C91.4007 20.3667 91.4349 20.2308 91.4724 20.0958C91.5101 19.9608 91.551 19.8268 91.5953 19.6939C91.6396 19.561 91.6871 19.4293 91.738 19.2987C91.7889 19.1682 91.843 19.0391 91.9004 18.9112C91.9578 18.7836 92.0183 18.6573 92.0819 18.5325C92.1456 18.4079 92.2123 18.2848 92.2822 18.1635C92.352 18.0422 92.4248 17.9227 92.5006 17.8051C92.5765 17.6874 92.6552 17.5718 92.7367 17.4581C92.8183 17.3445 92.9027 17.233 92.9899 17.1237C93.0771 17.0143 93.167 16.9072 93.2595 16.8024C94.9685 14.8722 96.9936 14.0694 99.5227 13.9243Z" fill="#4E83D0"/>
            <path d="M59.0303 33.4185L59.1266 33.2893C59.0187 32.8376 57.8222 31.7394 57.465 31.2545C56.5848 30.0596 55.9854 28.7491 55.545 27.3333C54.5205 24.0391 54.7828 19.8642 56.3979 16.7968C56.4529 16.6924 56.509 16.5888 56.5664 16.4858C56.6239 16.3829 56.6826 16.2807 56.7425 16.1792C56.8025 16.0777 56.8638 15.977 56.9262 15.8771C56.9886 15.7771 57.0523 15.6779 57.1171 15.5795C57.1819 15.4811 57.248 15.3835 57.3152 15.2868C57.3826 15.1901 57.451 15.0942 57.5206 14.9991C57.5902 14.9041 57.661 14.8099 57.7329 14.7166C57.8047 14.6233 57.8778 14.5309 57.952 14.4396C58.0262 14.3481 58.1015 14.2575 58.1779 14.1678C58.2543 14.0782 58.3317 13.9896 58.4103 13.9018C58.4888 13.8142 58.5685 13.7275 58.6492 13.6418C58.7299 13.556 58.8116 13.4713 58.8944 13.3877C58.9771 13.304 59.0609 13.2214 59.1457 13.1397C59.2305 13.0581 59.3163 12.9776 59.403 12.898C59.4898 12.8186 59.5775 12.7403 59.6663 12.6629C59.7549 12.5856 59.8446 12.5094 59.9351 12.4344C60.0256 12.3593 60.117 12.2854 60.2094 12.2125C60.3018 12.1397 60.3951 12.068 60.4893 11.9976C60.5833 11.927 60.6783 11.8577 60.7742 11.7895C60.8699 11.7214 60.9666 11.6544 61.0641 11.5887C61.1616 11.523 61.2598 11.4585 61.3588 11.3952C61.4579 11.3319 61.5577 11.2698 61.6583 11.2089C61.7588 11.1482 61.8601 11.0886 61.9621 11.0303C62.0641 10.9719 62.1669 10.9149 62.2703 10.8591C62.3737 10.8033 62.4777 10.7488 62.5825 10.6957C62.6872 10.6426 62.7927 10.5907 62.8988 10.5401C63.0047 10.4895 63.1114 10.4403 63.2187 10.3923C63.3259 10.3444 63.4336 10.2978 63.542 10.2525C63.6504 10.2073 63.7593 10.1634 63.8688 10.1209C63.9783 10.0783 64.0882 10.0371 64.1986 9.99727C64.3091 9.95745 64.42 9.91903 64.5313 9.88199C64.6429 9.84483 64.7547 9.80913 64.867 9.77488C68.7335 8.57594 72.6809 9.07156 76.2315 10.9774C79.5563 12.7622 81.5783 16.098 82.6421 19.6567C83.7204 23.2639 82.6867 27.3776 80.9451 30.5884C79.8636 32.0422 78.6601 33.4639 77.2026 34.5521C76.5597 35.0321 74.8782 35.651 74.4899 36.1557L74.5325 36.2589C74.2319 36.3756 73.8862 36.482 73.6078 36.6448C73.2279 36.6327 72.8786 36.6131 72.5051 36.702L72.4207 36.7962C72.5813 36.9099 72.4927 36.8792 72.6856 36.891C69.902 37.3923 67.7822 37.0128 65.0571 36.8391C64.1286 36.7801 63.1922 36.8698 62.2685 36.8042C61.8681 37.3149 60.8936 38.4616 60.8766 39.1142C60.8976 39.1286 60.918 39.1435 60.9391 39.1573C61.3898 39.4523 61.9187 39.4534 62.3669 39.7282L62.2328 40.012C61.5686 40.1436 61.0091 40.2451 60.3445 40.0274L60.3651 40.2625C59.8718 40.9987 59.3794 41.7278 58.922 42.4878C58.6035 42.8371 58.2511 43.4498 57.8843 43.7063C57.6952 43.7755 57.6851 43.8761 57.6054 44.0574C57.5503 44.1827 57.5417 44.2709 57.5516 44.4062C57.767 45.8693 57.6245 47.507 57.6198 48.9877C57.6363 51.553 57.6351 54.1182 57.6164 56.6835C57.1947 56.6737 56.7748 56.667 56.3542 56.6352C56.1191 56.6174 55.9614 56.6548 55.738 56.7264C55.4999 56.9673 55.5361 57.1272 55.5322 57.4591L55.4916 121.301L49.5879 121.3C47.269 121.34 48.5553 120.468 47.0375 119.297C45.6319 118.212 43.6464 118.202 42.1822 117.175C41.4043 116.629 41.6381 116.116 41.4312 115.301C41.3686 115.054 41.2064 114.904 40.9834 114.799C40.2069 114.433 39.2911 114.715 38.5226 114.958C38.5132 114.27 38.5184 113.582 38.5381 112.894C38.1316 112.764 35.1878 113.074 34.7943 113.253C34.6901 113.3 34.6827 113.314 34.6084 113.38C34.2869 113.428 33.8932 113.421 33.642 113.628L33.574 113.631C33.5696 114.181 33.6905 115.41 33.3881 115.84C33.3524 115.84 33.3165 115.84 33.2808 115.842C33.1085 115.849 33.172 115.844 32.9794 115.892C32.6314 117.082 32.6326 118.401 32.4728 119.629C29.9763 117.764 26.5769 118.244 25.6975 114.488C25.312 114.369 24.9521 114.266 24.5501 114.216L24.5109 113.881C22.7519 113.434 20.4279 113.248 18.5822 112.97L15.9924 112.417C16.1396 110.702 16.0736 108.935 16.0817 107.212L17.4768 65.8152C17.5342 64.4102 17.6647 62.9551 17.5732 61.5513C17.5245 60.8036 17.3035 60.0726 17.2962 59.3232C17.2731 56.9183 17.6006 54.4986 17.8671 52.1132C17.4897 51.9232 17.086 51.7387 16.7293 51.5112C15.9978 51.0448 15.5168 50.413 15.3194 49.5596C15.021 48.2684 15.3376 46.6833 15.4361 45.3673C15.8701 39.571 16.961 30.3426 20.1004 25.3827C21.7885 22.7158 23.6988 22.1081 26.6476 21.4653C26.5197 21.5974 26.4302 21.6842 26.2602 21.7567C26.248 22.1604 26.2418 22.5636 26.198 22.9654C26.8306 23.7577 27.4464 24.3869 28.5112 24.5078C29.0642 24.5706 29.7246 24.4864 30.1555 24.0993C30.5035 23.7865 30.6821 23.2853 30.6845 22.8216C30.6858 22.5435 30.5952 22.2566 30.5199 21.9912L30.4804 22.0201C30.3606 22.1099 30.2377 22.2076 30.1031 22.2735C29.7962 22.4237 29.3626 22.3636 29.057 22.2445C28.653 22.0871 28.3473 21.7797 28.1813 21.3774C28.0491 21.057 27.983 20.5581 28.1169 20.2353C28.4264 20.2807 28.7441 20.6439 29.0402 20.7901C29.4651 20.9998 30.1015 21.0713 30.4505 21.3792C30.5062 21.3995 30.5618 21.4204 30.6177 21.4402C31.4656 21.7394 32.414 21.8249 33.2847 22.0911C36.5486 23.0885 38.5697 25.2565 40.0622 28.272C41.3493 30.8723 41.8657 33.6103 42.5324 36.4043C45.3315 36.4066 48.1861 36.0383 50.9737 35.7696C52.2652 35.6451 53.584 35.4713 54.8831 35.4944C55.3552 35.5027 55.8019 35.5392 56.2364 35.7447L56.2949 35.7941C56.5731 36.0298 56.7956 36.2839 57.0287 36.564C57.3513 35.7896 58.4828 34.0649 59.0303 33.4185Z" fill="#003882"/>
            <path d="M63.1369 35.9473C63.4541 36.1898 63.8763 36.3476 64.2334 36.5289L64.0764 36.5812C63.582 36.589 63.086 36.6148 62.5918 36.6324L63.1369 35.9473Z" fill="#F2F4F5"/>
            <path d="M57.0569 36.8369C58.1523 37.6945 59.6227 38.5061 60.8767 39.1142C60.8976 39.1286 60.918 39.1435 60.9391 39.1573C61.3899 39.4523 61.9187 39.4534 62.3669 39.7282L62.2328 40.012C61.5687 40.1436 61.0091 40.2451 60.3446 40.0274C59.129 39.1382 57.6698 38.5239 56.418 37.6591C56.6123 37.3623 56.8207 37.1011 57.0569 36.8369Z" fill="#F9AE9E"/>
            <path d="M53.1319 42.0376C53.0101 42.5552 52.0577 43.6467 51.7193 44.125C50.6587 45.6244 49.6775 47.1649 48.6621 48.6937C48.1768 49.4246 47.6006 50.1361 47.1607 50.8924C47.0424 51.0959 46.9883 51.3239 46.9415 51.5527C45.1298 51.6362 43.3996 50.4264 41.8273 49.6054C41.2685 49.2941 40.7228 48.9531 40.1731 48.6254C40.1243 47.3333 39.8946 46.006 39.7041 44.7265C44.231 45.2862 49.0326 43.9119 53.1319 42.0376Z" fill="#FEFEFE"/>
            <path d="M29.3035 114.23C29.4281 110.935 29.8419 107.63 30.139 104.348C30.4673 100.522 30.7563 96.6927 31.0059 92.8609C31.2097 89.997 31.3849 87.1314 31.5315 84.264C31.6231 82.4024 31.5915 80.4292 31.901 78.5952C32.3622 80.1454 33.5476 82.8746 33.6821 84.3134C33.8425 86.029 33.2189 90.2546 33.0469 92.159L31.9827 103.932C31.681 107.184 31.3458 110.425 31.1792 113.688C31.916 113.64 32.8587 113.465 33.5738 113.631C33.5695 114.181 33.6904 115.41 33.388 115.84C33.3522 115.84 33.3163 115.84 33.2806 115.842C33.1083 115.849 33.1718 115.844 32.9793 115.892C32.6312 117.082 32.6325 118.401 32.4726 119.629C29.9761 117.764 26.5767 118.244 25.6973 114.488C25.3119 114.369 24.9519 114.265 24.5499 114.216L24.5107 113.881C26.1063 114.013 27.7035 114.166 29.3035 114.23Z" fill="#FEFEFE"/>
            <path d="M67.8534 11.112C68.0384 11.0959 68.2236 11.0839 68.4091 11.0761C68.5946 11.0683 68.7802 11.0648 68.9659 11.0655C69.1515 11.0661 69.3371 11.0709 69.5226 11.0799C69.7081 11.0889 69.8932 11.1022 70.0781 11.1196C70.263 11.1371 70.4474 11.1586 70.6312 11.1843C70.8151 11.21 70.9984 11.2399 71.181 11.2739C71.3636 11.308 71.5452 11.3461 71.726 11.3885C71.907 11.4307 72.0868 11.477 72.2655 11.5274C72.4444 11.5777 72.622 11.6321 72.7984 11.6906C72.9747 11.7491 73.1497 11.8114 73.3232 11.8778C73.4968 11.9441 73.6688 12.0143 73.8393 12.0884C74.0097 12.1626 74.1785 12.2405 74.3454 12.3222C74.5123 12.404 74.6773 12.4895 74.8405 12.5787C75.0036 12.6679 75.1646 12.7608 75.3235 12.8572C75.4826 12.9537 75.6394 13.0537 75.7939 13.1573C75.9484 13.2609 76.1005 13.368 76.2503 13.4785C76.4042 13.5922 76.5553 13.7099 76.7035 13.8314C76.8517 13.9528 76.9968 14.0779 77.1387 14.2067C77.2807 14.3354 77.4193 14.4677 77.5546 14.6033C77.69 14.7391 77.8219 14.8782 77.9503 15.0205C78.0787 15.1629 78.2034 15.3084 78.3245 15.4572C78.4458 15.6058 78.5632 15.7574 78.6768 15.9119C78.7904 16.0666 78.9001 16.224 79.0059 16.3841C79.1117 16.5443 79.2135 16.7069 79.3112 16.8721C79.4088 17.0375 79.5024 17.2051 79.5917 17.375C79.6811 17.545 79.7662 17.7171 79.8469 17.8914C79.9276 18.0656 80.004 18.2418 80.076 18.4198C80.1481 18.598 80.2156 18.7779 80.2787 18.9594C80.3417 19.1408 80.4001 19.3238 80.454 19.5082C80.508 19.6927 80.5574 19.8784 80.602 20.0654C80.6466 20.2523 80.6866 20.4402 80.722 20.6293C80.7573 20.8182 80.788 21.0079 80.8138 21.1984C80.8443 21.4012 80.8696 21.6045 80.89 21.8086C80.9103 22.0127 80.9256 22.2171 80.936 22.4221C80.9462 22.6268 80.9514 22.8318 80.9515 23.037C80.9516 23.242 80.9467 23.4469 80.9367 23.6517C80.9267 23.8566 80.9117 24.0611 80.8916 24.2651C80.8715 24.4692 80.8464 24.6726 80.8162 24.8755C80.786 25.0783 80.7508 25.2803 80.7108 25.4813C80.6706 25.6823 80.6255 25.8823 80.5755 26.0811C80.5254 26.2799 80.4705 26.4773 80.4107 26.6734C80.3511 26.8694 80.2865 27.0639 80.2171 27.2568C80.1477 27.4496 80.0736 27.6406 79.9948 27.8298C79.9159 28.0189 79.8324 28.2059 79.7444 28.3908C79.6563 28.5757 79.5638 28.7584 79.4667 28.9387C79.3696 29.119 79.2682 29.2968 79.1623 29.4721C79.0564 29.6474 78.9463 29.8198 78.8319 29.9895C78.7175 30.1593 78.599 30.3261 78.4763 30.4898C76.4839 33.1343 73.4535 34.4797 70.2468 34.9394C66.7666 35.0186 63.9385 34.4452 61.156 32.1801C61.008 32.0602 60.8631 31.9368 60.7213 31.8097C60.5795 31.6826 60.4409 31.552 60.3056 31.4179C60.1703 31.2838 60.0384 31.1464 59.9099 31.0056C59.7814 30.8649 59.6566 30.721 59.5353 30.5739C59.4141 30.4269 59.2966 30.2768 59.1828 30.1239C59.069 29.9707 58.959 29.8149 58.8529 29.6564C58.7469 29.4978 58.6449 29.3367 58.5469 29.1731C58.449 29.0093 58.3552 28.8433 58.2654 28.6749C58.1757 28.5064 58.0902 28.3358 58.009 28.163C57.9278 27.9902 57.851 27.8155 57.7786 27.6388C57.7062 27.4622 57.6382 27.2839 57.5745 27.1038C57.511 26.9237 57.452 26.7422 57.3974 26.5592C57.3429 26.376 57.2929 26.1917 57.2476 26.0062C57.2024 25.8206 57.1617 25.634 57.1256 25.4463C57.0897 25.2587 57.0584 25.0703 57.0318 24.8811C57.0052 24.6918 56.9833 24.502 56.9661 24.3118C56.6601 21.1556 57.5709 17.8022 59.6012 15.3548C61.6793 12.8498 64.6447 11.3968 67.8534 11.112Z" fill="#DEE2E6"/>
            <path d="M71.2952 28.6814C71.5529 28.6669 71.7753 28.6533 72.0186 28.7662C72.2329 28.8657 72.3015 29.0115 72.3845 29.2181C72.3562 29.5518 72.2142 29.7922 72.0151 30.0539C71.253 31.057 68.9902 32.8089 67.7735 33.0048C67.3677 32.8817 66.9673 32.7162 66.5684 32.5706C67.3736 31.4569 70.0645 29.2682 71.2952 28.6814Z" fill="#FEFEFE"/>
            <path d="M67.2278 12.1058C67.6801 12.0359 68.5621 11.9092 68.9917 12.0651C69.2463 12.1576 69.2768 12.2418 69.385 12.4689C69.38 12.7389 69.3767 12.9268 69.2488 13.174C68.8138 13.3313 68.3028 13.3291 67.843 13.3727C65.259 13.6176 62.7622 14.8158 61.0995 16.8673C59.311 19.074 58.7388 22.118 59.0026 24.892C59.0357 25.0612 59.079 25.2419 59.0773 25.4145C59.075 25.6505 58.9839 25.8412 58.8235 26.0078C58.6125 26.0438 58.564 26.0458 58.3818 25.9C58.0397 25.6266 57.9011 24.9416 57.8394 24.5367C57.4218 21.7957 58.1905 18.6241 59.8606 16.4197C61.716 13.9707 64.2024 12.5114 67.2278 12.1058Z" fill="#FEFEFE"/>
            <path d="M57.5521 44.4062C57.7675 45.8693 57.625 47.5071 57.6203 48.9878C57.6368 51.5531 57.6356 54.1183 57.6169 56.6836C57.1952 56.6738 56.7753 56.6671 56.3547 56.6353C56.1196 56.6175 55.9619 56.6549 55.7386 56.7264C55.5004 56.9674 55.5366 57.1273 55.5327 57.4592L55.4921 121.301L49.5884 121.3C47.2695 121.34 48.5558 120.468 47.038 119.297C45.6324 118.212 43.6469 118.202 42.1827 117.175C41.4048 116.629 41.6387 116.116 41.4317 115.301C41.3691 115.054 41.2069 114.904 40.9839 114.799C40.2074 114.433 39.2916 114.715 38.5231 114.959C38.5137 114.27 38.5189 113.582 38.5386 112.894C39.784 113.033 41.7859 112.464 43.0711 112.223C43.7977 106.905 44.4608 101.579 45.0604 96.2455C45.564 92.0703 46.8321 84.1817 46.2152 80.2902C45.8536 78.0093 45.1759 75.7619 44.5455 73.5443C43.4677 69.828 42.3686 66.1181 41.2484 62.4145C40.6854 60.6157 39.998 58.8574 39.5029 57.0376C40.667 57.3698 41.84 57.6567 43.0161 57.9424L43.3694 57.0026L43.5011 56.9528C43.9138 55.768 45.0985 52.8522 45.6858 51.796C46.3561 51.6389 47.1475 51.7647 47.7704 51.548C47.8269 51.4445 47.7823 51.5028 47.9441 51.4133C48.831 51.4412 50.4998 52.8656 51.551 53.2024C53.311 50.1373 55.664 47.3974 57.5521 44.4062Z" fill="#FEFEFE"/>
            <path d="M43.6924 57.0244C43.7341 57.0493 43.7759 57.0736 43.8172 57.0988C45.1799 57.9307 46.7069 59.8399 48.525 59.4305C48.6374 59.4052 48.7458 59.3696 48.8557 59.3355L49.0002 59.2912C49.0296 59.282 49.0585 59.2718 49.0877 59.262C49.0567 59.2859 49.0269 59.3117 48.9946 59.3339C48.353 59.7738 47.719 59.5995 47.014 59.4633C46.8172 59.8293 46.5696 60.3838 46.2352 60.6336C46.0851 60.7458 45.9269 60.7574 45.7436 60.7204C45.1763 60.6058 44.2681 60.0786 43.9652 59.5706C43.6036 58.9644 44.0404 58.6504 44.128 58.0897C44.2007 57.6248 43.9573 57.3614 43.6924 57.0244Z" fill="#263238"/>
            <path d="M47.7702 51.5479C47.9624 51.6061 48.0124 51.5722 48.1154 51.7555C49.001 52.312 51.5034 53.5218 51.7353 54.5648C51.7923 54.821 51.7151 55.0221 51.5671 55.2305C51.2606 55.6624 51.1139 55.8102 51.05 56.3627C50.3245 56.9249 49.8712 58.9399 49.088 59.2622C49.0587 59.272 49.0299 59.2821 49.0004 59.2914L48.8559 59.3357C48.746 59.3698 48.6376 59.4054 48.5252 59.4307C46.7071 59.84 45.1801 57.9309 43.8175 57.099C43.7761 57.0738 43.7343 57.0495 43.6926 57.0246L43.501 56.9527C43.9136 55.7679 45.0984 52.8521 45.6857 51.7958C46.356 51.6388 47.1474 51.7646 47.7702 51.5479Z" fill="#F9AE9E"/>
            <path d="M48.1155 51.7554C49.001 52.3118 51.5035 53.5217 51.7354 54.5646C51.7924 54.8208 51.7151 55.022 51.5672 55.2304C51.2606 55.6623 51.1139 55.8101 51.0501 56.3625C51.0315 56.1174 51.0069 55.968 50.9001 55.7409C50.5972 55.4649 49.9981 55.4479 49.5992 55.3397C50.044 55.1904 50.6156 55.5394 51.0887 55.4473C51.3602 55.3945 51.3952 55.3362 51.5571 55.1298C51.6182 54.8361 51.6383 54.5169 51.4627 54.2546C50.8207 53.2956 48.184 53.2484 47.0879 53.1313C47.4157 52.8993 47.8017 52.7713 48.1236 52.5446C48.312 52.412 48.3508 52.312 48.3933 52.0931L48.1155 51.7554Z" fill="#263238"/>
            <path d="M30.5201 21.9913L30.4806 22.0201C30.3607 22.11 30.2379 22.2077 30.1033 22.2736C29.7963 22.4237 29.3628 22.3636 29.0571 22.2445C28.6531 22.0871 28.3475 21.7798 28.1815 21.3775C28.0492 21.057 27.9832 20.5581 28.117 20.2354C28.4265 20.2807 28.7442 20.644 29.0403 20.7902C29.4652 20.9998 30.1016 21.0714 30.4506 21.3793C30.5064 21.3996 30.5619 21.4205 30.6179 21.4403C31.4657 21.7395 32.4141 21.825 33.2849 22.0911C36.5488 23.0886 38.5698 25.2566 40.0624 28.2721C41.3494 30.8724 41.8658 33.6103 42.5325 36.4043C45.3316 36.4067 48.1863 36.0383 50.9738 35.7697C52.2653 35.6451 53.5841 35.4714 54.8833 35.4944C55.3553 35.5028 55.802 35.5393 56.2365 35.7448L56.295 35.7942L56.8377 36.7767C56.0474 37.6953 55.6757 38.7447 55.0067 39.735C54.6352 40.2657 54.2198 41.0091 53.7359 41.4243C52.259 42.6921 47.6726 43.8923 45.7881 44.2222C45.2828 44.3158 44.7748 44.3923 44.2643 44.4516C43.7539 44.5111 43.2421 44.5532 42.7288 44.578C42.2155 44.6027 41.702 44.6101 41.1883 44.6001C40.6745 44.5902 40.1617 44.563 39.6497 44.5184C39.2771 41.4672 38.7798 38.4833 38.0613 35.4953C37.9863 35.1831 37.9742 34.6519 37.7846 34.401C37.7077 35.7633 38.574 38.5749 38.8276 40.0852C39.3004 42.8985 39.6201 45.7437 39.9965 48.57C38.2481 47.6242 36.399 46.7981 34.5452 46.0841C33.1937 43.2819 31.9718 40.4701 30.4394 37.7563C30.1686 37.2765 29.9528 36.7188 29.5901 36.3072L29.4914 36.3606C29.8218 37.3646 30.6132 38.4035 31.1088 39.3638C32.2605 41.5948 33.3399 43.8209 34.3011 46.1433C34.0808 46.5681 33.9985 46.9092 33.9299 47.3765L33.9904 47.524L34.0856 47.5063C34.2571 47.1313 34.2672 46.6476 34.5234 46.3357C34.7058 46.3806 34.8348 46.4267 34.9947 46.5264C35.0928 46.8393 35.0365 47.1465 35.0055 47.4666C35.2258 47.2692 35.3048 46.9247 35.4026 46.6493C38.8995 47.9746 42.1895 49.9634 45.5225 51.6573C44.8195 53.4237 44.1588 55.2806 43.2772 56.9639C43.1319 57.1863 43.0365 57.4642 42.9305 57.7093C41.2092 57.4071 39.5097 56.8364 37.856 56.2784C36.4952 55.8192 35.1224 55.3784 33.8269 54.7503C28.8305 52.3275 25.2445 48.0078 22.7105 43.1534C22.2349 42.2424 21.1228 39.1808 20.5781 38.6813C22.2215 43.0599 24.3846 47.1373 27.6607 50.5088C28.1582 51.0206 28.6728 51.5334 29.2271 51.9833C29.63 52.3101 30.1056 52.5497 30.4538 52.9375C30.3696 52.9807 30.3624 52.9884 30.2566 53.019C29.4032 53.2659 28.2365 53.1799 27.3446 53.1803C24.0345 53.1823 19.9868 53.2349 17.0672 51.4655C16.2854 50.9917 15.773 50.4914 15.5636 49.5705C15.2403 48.1483 15.5627 46.3835 15.6833 44.9318C16.1571 39.232 17.1987 30.1573 20.3376 25.3234C21.8547 22.9873 23.6379 22.2999 26.2604 21.7567C26.2481 22.1605 26.242 22.5637 26.1981 22.9655C26.8307 23.7577 27.4465 24.387 28.5113 24.5079C29.0643 24.5707 29.7247 24.4865 30.1556 24.0994C30.5036 23.7866 30.6823 23.2854 30.6846 22.8217C30.6859 22.5435 30.5953 22.2567 30.5201 21.9913Z" fill="#FEFEFE"/>
            <path d="M30.5203 21.9913L30.4808 22.0201C30.361 22.11 30.2381 22.2077 30.1035 22.2736C29.7966 22.4237 29.363 22.3636 29.0574 22.2445C28.6534 22.0871 28.3477 21.7798 28.1817 21.3775C28.0495 21.057 27.9834 20.5581 28.1173 20.2354C28.4268 20.2807 28.7445 20.644 29.0406 20.7902C29.4655 20.9998 30.1019 21.0714 30.4509 21.3793C30.5066 21.3996 30.5622 21.4205 30.6181 21.4403C31.466 21.7395 32.4144 21.825 33.2851 22.0911C36.549 23.0886 38.5701 25.2566 40.0626 28.2721C41.3497 30.8724 41.8661 33.6103 42.5328 36.4043C45.3319 36.4067 48.1865 36.0383 50.9741 35.7697C52.2656 35.6451 53.5844 35.4714 54.8835 35.4944C55.3556 35.5028 55.8023 35.5393 56.2368 35.7448L56.2953 35.7942L56.838 36.7767C56.0477 37.6953 55.676 38.7447 55.007 39.735C54.8162 39.5446 54.6982 39.4108 54.6003 39.1506C54.0932 38.2104 54.1495 36.7315 54.096 35.6738C50.1769 36.0147 46.27 36.4893 42.3377 36.6576C41.8836 34.3592 41.4042 32.0999 40.5928 29.8955C39.5147 26.9664 37.5844 24.1564 34.7026 22.8264C34.0065 22.5051 31.2892 21.5056 30.6151 21.7589L30.5203 21.9913Z" fill="#263238"/>
            <path d="M54.5999 39.1507C54.5402 38.4243 54.0034 36.4267 54.322 35.8676C54.7143 35.5757 55.0824 35.5907 55.5472 35.6535L56.2364 35.7449L56.2949 35.7942L56.8377 36.7768C56.0473 37.6954 55.6756 38.7448 55.0066 39.7351C54.8159 39.5446 54.6979 39.4108 54.5999 39.1507Z" fill="#F9AE9E"/>
            <path d="M122.545 36.7837L123.157 36.7446C125.373 36.768 127.59 36.7779 129.806 36.7742C130.918 36.7744 132.085 36.7031 133.191 36.7906C133.466 36.8122 133.64 36.8153 133.861 36.9772C134.124 37.9249 133.953 42.1005 133.953 43.3793L133.962 60.0873C134.47 60.1334 134.985 60.1759 135.482 60.291C136.551 60.5384 137.726 61.0626 138.831 61.0076C142.614 60.8195 143.093 54.4388 144.239 51.6849C144.977 49.9116 146.082 48.4779 147.342 47.0576C149.144 45.2837 151.515 43.803 154.124 43.8308C155.734 43.848 157.285 44.4217 158.415 45.5916C160.396 47.6411 161.218 50.488 161.151 53.2985C161.066 56.9405 159.738 60.6223 157.845 63.6979C156.174 66.4133 151.725 71.0804 151.68 74.1896L151.656 74.4966C151.826 76.6958 153.028 78.4191 154.052 80.3006C156.656 85.088 154.775 89.5305 151.478 93.3962C150.527 94.5068 149.496 95.5371 148.386 96.4872C147.77 97.0126 142.993 100.802 142.958 100.855L143.066 100.941C144.137 100.904 145.208 100.922 146.28 100.934C146.026 102.201 145.908 103.489 145.668 104.757L143.944 104.743C143.819 105.35 143.836 106.106 143.641 106.67L143.444 106.74L142.542 115.244C142.346 117.262 142.217 119.318 141.906 121.322C141.851 121.33 141.796 121.339 141.74 121.347C140.258 121.562 135.958 121.102 134.967 121.456C135.695 121.798 141.577 121.345 143.095 121.561C140.11 121.751 137.052 121.629 134.06 121.641C130.176 121.656 126.286 121.774 122.403 121.695L53.8296 121.695L53.8489 121.622C52.3663 121.543 50.8674 121.64 49.3795 121.575L49.2835 121.494L49.2023 121.553L49.084 121.481C49.2595 121.424 49.4245 121.397 49.6074 121.373L49.5881 121.3L55.4918 121.301L55.5324 57.4592C61.9752 57.5068 68.4181 57.5143 74.8611 57.4817L81.8314 57.4741C82.9381 57.4721 84.1029 57.5473 85.202 57.4518L106.138 57.4714C107.428 57.7393 110.066 57.566 111.484 57.5665C114.73 57.5674 118.007 57.6607 121.248 57.5289C121.408 53.1719 121.628 48.818 121.909 44.4671C122.041 42.1805 122.05 39.8173 122.317 37.5474C122.351 37.253 122.394 37.0389 122.545 36.7837Z" fill="#003882"/>
            <path d="M49.6074 121.373C51.786 121.37 55.6202 121.134 57.6238 121.592L53.8489 121.621C52.3663 121.543 50.8674 121.64 49.3795 121.575L49.2835 121.494L49.2023 121.553L49.084 121.481C49.2595 121.423 49.4245 121.397 49.6074 121.373Z" fill="#020203"/>
            <path d="M87.3085 84.844C87.4693 84.8476 87.5462 84.8052 87.6636 84.9295C87.7701 85.0423 87.7896 85.1072 87.8253 85.2532L87.7659 85.425C87.1562 85.684 84.2287 85.1492 83.3094 85.1354C76.4624 85.0165 69.6156 85.0308 62.769 85.1782C61.4336 85.2002 59.9129 84.8878 58.6142 85.2182C58.8078 85.3988 77.2105 85.3311 79.087 85.3284L78.9048 85.3945L79.135 85.3808C78.4427 85.6081 72.2355 85.4611 71.0557 85.4633C67.1338 85.4703 63.2046 85.5557 59.2838 85.5302C59.0571 85.5286 58.7665 85.5486 58.5629 85.4466C58.4413 85.3856 58.3901 85.0934 58.3525 84.9609L77.842 84.9595C79.3885 84.962 86.4291 85.1461 87.3085 84.844Z" fill="#263238"/>
            <path d="M99.126 84.9189L113.377 85.0012C114.636 85.0048 119.146 84.8494 119.901 85.0863L119.686 85.0508L119.784 85.1806C118.619 85.6194 113.887 85.4796 112.313 85.5037L95.7329 85.5044C95.0265 85.5037 91.7594 85.6184 91.3814 85.5269C91.3204 85.5121 91.2751 85.4596 91.2221 85.426C91.2102 85.2045 91.2154 85.1978 91.3383 85.013C93.1522 84.9035 95.0125 85.0035 96.8318 85.0032C97.5541 85.003 98.339 85.0689 99.0495 84.9349C99.075 84.93 99.1004 84.9242 99.126 84.9189Z" fill="#263238"/>
            <path d="M66.4766 106.477L78.3591 106.489L78.3488 108.089C77.1401 108.268 75.7413 108.137 74.5093 108.138L66.4791 108.139L66.4766 106.477Z" fill="#FEFEFE"/>
            <path d="M100.26 79.6154L107.449 79.6105C108.747 79.6112 110.067 79.5604 111.362 79.6212C111.682 79.6363 111.823 79.6338 112.039 79.8745C112.16 80.3402 112.107 80.81 111.886 81.2365C109.417 81.3084 106.942 81.2719 104.472 81.2688C103.105 81.2671 101.618 81.3826 100.265 81.2121C100.13 81.1951 100.122 81.1259 100.042 81.0226C99.9451 80.5397 99.9994 80.0364 100.26 79.6154Z" fill="#FEFEFE"/>
            <path d="M68.1634 92.8771C69.4532 92.8811 77.0536 92.7673 77.6205 93.046C77.8428 93.1552 77.9534 93.2785 78.0285 93.5151C78.1317 93.8404 78.0137 94.5475 77.8066 94.8164C77.6063 95.0758 77.3889 95.0484 77.0911 95.0945C75.818 95.0982 68.4472 95.2449 67.856 95.0096C67.6418 94.9243 67.5234 94.7607 67.4391 94.5501C67.2919 94.1823 67.3839 93.6845 67.5463 93.3384C67.6822 93.0489 67.8861 92.9766 68.1634 92.8771Z" fill="#263238"/>
            <path d="M101.502 63.6437C102.654 63.6284 109.534 63.5208 110.109 63.6969C110.46 63.8042 110.747 64.0276 110.913 64.3602C111.097 64.7297 111.095 65.2711 110.932 65.649C110.819 65.9127 110.745 65.9168 110.495 66.02C109.362 66.1191 101.912 66.2843 101.325 65.907C101.163 65.8026 101.089 65.5477 101.067 65.3635C100.996 64.7635 101.116 64.1102 101.502 63.6437Z" fill="#263238"/>
            <path d="M93.3472 89.1832C102.252 89.0362 111.175 89.1409 120.082 89.1442L120.125 113.02L118.658 113.016L91.3289 113.007C91.2428 108.773 91.3244 104.521 91.3198 100.285C91.3159 96.6096 91.2082 92.8941 91.3563 89.2235L93.3472 89.1832Z" fill="#FEFEFE"/>
            <path d="M96.9945 89.4574C104.6 89.29 112.23 89.4067 119.839 89.4007L119.872 112.748L114.531 112.741L91.5972 112.738L91.5889 89.4819C93.3908 89.4898 95.1927 89.4816 96.9945 89.4574Z" fill="#003882"/>
            <path d="M100.88 92.2251L106.659 92.2139C107.731 92.2079 108.881 92.1186 109.943 92.2319C110.231 92.2626 110.486 92.2542 110.654 92.524C111.04 93.1405 110.768 94.3763 110.575 95.0359C108.752 95.0478 106.926 94.991 105.103 94.9794C103.668 94.9702 102.214 95.0308 100.782 94.9351C100.741 94.0517 100.666 93.0911 100.88 92.2251Z" fill="#263238"/>
            <path d="M58.3044 60.4617C59.3662 60.3981 60.4642 60.4519 61.5295 60.4524L67.8626 60.4562L87.2537 60.4677C87.3979 66.3298 87.2737 72.2198 87.2772 78.0845C87.2784 80.3262 87.1931 82.6067 87.3084 84.8442C86.4289 85.1463 79.3884 84.9622 77.8419 84.9597L58.3524 84.9612C58.4729 82.9216 58.2847 80.7805 58.282 78.7274C58.2741 72.6491 58.146 66.5362 58.3044 60.4617Z" fill="#F2F4F5"/>
            <path d="M58.573 60.6909C61.9652 60.806 65.385 60.7294 68.78 60.7356L87.0505 60.7546C87.0804 68.718 86.8847 76.6956 87.0368 84.6565C86.2073 84.8349 85.1384 84.7049 84.2756 84.7L78.4104 84.6646L58.6138 84.6705C58.4492 76.6849 58.5293 68.6783 58.573 60.6909Z" fill="#003882"/>
            <path d="M67.2119 79.5558C68.7768 79.548 77.5066 79.263 78.3203 79.729C78.4443 79.8 78.4445 79.8862 78.473 80.0158C78.5538 80.3833 78.5518 80.8951 78.3243 81.2111C78.2263 81.3473 78.1246 81.3221 77.9708 81.3502C76.1293 81.3299 67.5863 81.5915 66.6063 80.9212C66.5908 80.8849 66.5772 80.8479 66.5656 80.8101C66.554 80.7725 66.5444 80.7343 66.5367 80.6956C66.5291 80.6567 66.5236 80.6176 66.5201 80.5783C66.5166 80.5389 66.5152 80.4995 66.5158 80.4601C66.5164 80.4205 66.5191 80.3811 66.5239 80.3419C66.5286 80.3027 66.5354 80.2639 66.5443 80.2255C66.553 80.1869 66.5639 80.149 66.5767 80.1117C66.5895 80.0744 66.6042 80.0379 66.6209 80.002C66.7541 79.709 66.9203 79.6535 67.2119 79.5558Z" fill="#EA8578"/>
            <path d="M68.5081 63.6513C69.964 63.6205 76.667 63.4346 77.5885 63.7704C77.7675 63.9364 77.8687 64.0678 77.9454 64.3036C78.1025 64.7873 78.1023 65.3156 77.8766 65.7727C77.6484 65.9935 77.4189 66.0116 77.1206 66.0641C74.3989 66.0882 71.4089 66.2431 68.7187 66.0703C68.3827 66.0487 68.1001 66.0203 67.8888 65.7235C67.6588 65.4004 67.6772 64.8953 67.7546 64.5242C67.8441 64.0941 68.1651 63.875 68.5081 63.6513Z" fill="#263238"/>
            <path d="M123.157 36.7446C125.374 36.768 127.59 36.7779 129.806 36.7742C130.918 36.7744 132.085 36.7031 133.191 36.7906C133.466 36.8122 133.641 36.8153 133.862 36.9772C134.124 37.9249 133.953 42.1005 133.954 43.3793L133.963 60.0873C134.47 60.1334 134.985 60.1759 135.482 60.291C136.551 60.5384 137.726 61.0626 138.832 61.0076C142.614 60.8195 143.093 54.4388 144.24 51.6849C144.978 49.9116 146.083 48.4779 147.343 47.0576C149.144 45.2837 151.515 43.803 154.125 43.8308C155.734 43.848 157.285 44.4217 158.416 45.5916C160.396 47.6411 161.218 50.488 161.152 53.2985C161.066 56.9405 159.738 60.6223 157.845 63.6979C156.174 66.4133 151.725 71.0804 151.68 74.1896L151.656 74.4966C151.826 76.6958 153.029 78.4191 154.053 80.3006C156.657 85.088 154.776 89.5305 151.478 93.3962C150.527 94.5068 149.496 95.5371 148.387 96.4872C147.77 97.0126 142.993 100.802 142.958 100.855L143.066 100.941C144.138 100.904 145.209 100.922 146.281 100.934C146.027 102.201 145.909 103.489 145.668 104.757L143.944 104.743C143.82 105.35 143.836 106.106 143.641 106.67L143.444 106.74L142.543 115.244C142.346 117.262 142.217 119.318 141.906 121.322C141.851 121.33 141.796 121.339 141.741 121.347C140.258 121.562 135.959 121.102 134.968 121.456C135.696 121.798 141.578 121.345 143.095 121.561C140.11 121.751 137.053 121.629 134.061 121.641C130.177 121.656 126.287 121.774 122.403 121.695C121.958 121.449 110.372 121.629 108.667 121.598C109.385 121.39 110.477 121.501 111.232 121.489C115.096 121.427 119.073 121.83 122.917 121.465L123.042 121.453C123.119 119.667 123.1 117.869 123.102 116.08C121.263 116.027 119.414 116.08 117.573 116.06C111.014 115.989 104.455 115.968 97.896 115.995L57.5973 115.994C56.9788 116.018 56.2298 116.12 55.6336 115.952L55.5371 115.73C56.4005 115.484 59.1963 115.649 60.2188 115.647L70.9937 115.623L123.122 115.633L123.218 55.9883L123.248 43.1037C123.257 41.5618 123.481 38.0603 123.157 36.7446Z" fill="#263238"/>
            <path d="M133.987 85.0454C134.379 85.6901 134.679 87.5664 134.882 88.3701C135.559 91.0525 136.169 93.8808 137.054 96.4969L135.506 99.3541C135.253 99.8234 134.973 100.514 134.567 100.862C134.384 101.02 134.301 101.033 134.068 101.01C133.864 100.52 133.962 86.9242 133.987 85.0454Z" fill="#274E82"/>
            <path d="M135.113 101.074C136.74 100.973 138.418 101.054 140.047 101.086L146.013 101.157C145.836 102.082 145.819 103.744 145.408 104.514L145.182 104.55L133.983 104.573L133.979 101.133L135.113 101.074Z" fill="#FEFEFE"/>
            <path d="M133.99 104.758L143.738 104.743C143.586 105.395 143.527 106.076 143.444 106.74L142.543 115.244C142.346 117.262 142.217 119.318 141.906 121.322C141.01 121.193 140.025 121.271 139.115 121.272L134.012 121.284L133.99 104.758Z" fill="#FEFEFE"/>
            <path d="M151.656 74.4966C151.826 76.6959 153.028 78.4191 154.052 80.3007C156.656 85.0881 154.775 89.5305 151.478 93.3962C150.526 94.5068 149.496 95.5372 148.386 96.4873C147.769 97.0127 142.993 100.802 142.957 100.855L143.065 100.941C143.056 100.941 143.046 100.943 143.036 100.941C142.071 100.76 140.965 100.865 139.981 100.865L135 100.851C136.939 97.3878 138.715 93.8419 140.327 90.2132C142.237 85.8629 143.888 81.3952 145.578 76.9555C147.569 76.1352 149.607 75.1422 151.656 74.4966Z" fill="#274E82"/>
            <path d="M147.343 47.0573C149.144 45.2834 151.515 43.8027 154.125 43.8305C155.734 43.8477 157.285 44.4214 158.416 45.5913C160.396 47.6408 161.218 50.4876 161.152 53.2982C161.066 56.9402 159.738 60.622 157.846 63.6976C156.174 66.413 151.725 71.08 151.68 74.1892C149.65 74.821 147.65 75.7845 145.678 76.5931C146.335 74.853 146.843 73.0257 147.425 71.2563C149.492 64.9003 151.321 58.4757 152.911 51.9823C153.945 51.6984 159.373 50.3026 159.908 49.9141C160.041 49.8183 160.137 49.7772 160.164 49.6131C159.371 49.9208 158.515 50.1164 157.697 50.3495C156.127 50.7883 154.562 51.2412 153 51.708C153.49 50.0191 153.872 48.2925 154.298 46.5858C154.449 45.9785 154.725 45.3015 154.803 44.6899C154.825 44.5142 154.803 44.4488 154.734 44.2934C154.155 45.1505 152.735 51.525 152.408 52.9714C152.142 51.5497 150.855 46.1697 150.292 45.0917C150.3 45.2113 150.311 45.3313 150.317 45.451C150.408 47.2038 152.377 52.5805 152.198 53.5166C151.669 56.2757 150.785 59.0211 150.031 61.7285C148.838 66.0401 147.517 70.3114 146.067 74.5423C144.617 78.7733 143.041 82.9563 141.339 87.0911C140.058 90.1522 138.751 93.2009 137.192 96.1318C136.504 93.2223 135.653 90.3499 134.91 87.4533C134.615 86.3024 134.24 85.1055 134.062 83.9325C133.901 82.8692 133.964 81.7519 133.965 80.6775L133.969 75.9451L133.963 60.087C134.47 60.1331 134.985 60.1756 135.482 60.2907C136.551 60.5381 137.726 61.0622 138.832 61.0072C142.614 60.8191 143.093 54.4385 144.24 51.6846C144.978 49.9112 146.083 48.4775 147.343 47.0573Z" fill="#274E82"/>
            </g>
            <defs>
            <clipPath id="clip0_5351_50014">
            <rect width="166" height="122" fill="white"/>
            </clipPath>
            </defs>
            </svg>
    <p class="text-sm font-medium text-slate-600 hover:!text-slate-600 active:!text-slate-600  hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">No Previous Inquiries.</p>
        </div>
      `;
    }

    const message = this.#emptyMessageFor(tab);
    return `<p class="rounded-lg border border-dashed border-slate-200 bg-[#DEE7F6] px-4 py-3 text-sm text-neutral-700 text-center hover:!border-slate-200 active:!border-slate-200 hover:!bg-[#DEE7F6] active:!bg-[#DEE7F6] font-medium font-['Inter'] hover:!text-neutral-700 active:!text-neutral-700 hover:border active:border focus:border focus-visible:border hover:border-dashed active:border-dashed focus:border-dashed focus-visible:border-dashed hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:bg-[#DEE7F6] active:bg-[#DEE7F6] focus:bg-[#DEE7F6] focus-visible:bg-[#DEE7F6]  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-center active:text-center focus:text-center focus-visible:text-center">${this.#escapeHtml(
      message
    )}</p>`;
  }

  #activeMessageFor(tab) {
    switch (tab) {
      case "jobs":
        return "Select a job to preview.";
      case "inquiries":
        return "Select an inquiry to preview.";
      case "properties":
      default:
        return "Select a property to auto-fill details.";
    }
  }

  #emptyRelated() {
    return { properties: [], jobs: [], inquiries: [] };
  }

  #formatDate(value) {
    const date = this.#coerceDate(value);
    if (!date) return "—";
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(date);
  }

  #formatDateTime(value) {
    const date = this.#coerceDate(value);
    if (!date) return "—";
    return new Intl.DateTimeFormat(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  #coerceDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) return null;
      const ms = value > 1e12 ? value : value * 1000;
      const date = new Date(ms);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const numeric = Number(trimmed);
      if (!Number.isNaN(numeric)) {
        return this.#coerceDate(numeric);
      }
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(trimmed)
        ? `${trimmed}T00:00:00`
        : trimmed;
      const date = new Date(iso);
      return Number.isNaN(date.getTime()) ? null : date;
    }
    return null;
  }

  #escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  #handleRelatedPropertiesClick() {
    const element = document.querySelector('[data-related-panel="properties"]');
    if (element) {
      element.addEventListener("click", async (e) => {
        let article = e.target.closest("article");
        if (article) {
          document.getElementById("add-contact-btn").classList.remove("hidden");

          const propertyId = article.id || "";
          // Toggle selection if the same property is clicked again
          if (
            this.propertyId &&
            String(this.propertyId) === String(propertyId)
          ) {
            this.#setSelectedProperty("");
            return;
          }

          this.#setSelectedProperty(propertyId, article);

          let propertyData = this.relatedData.properties.filter(
            (item) => item.id == this.propertyId
          )[0];
          const fields = document.querySelectorAll(
            "#property-information input, #property-information select"
          );

          document.querySelector('[placeholder="Search properties"]').value =
            "";

          const fieldIds = Array.from(fields).map((field) =>
            field.getAttribute("data-property-id")
          );
          if (propertyData && propertyData.length != 0) {
            let values = this.generatePropertyInformationKeys(
              fieldIds,
              propertyData
            );
            await this.model.fetchAffiliationByPropertyId(
              this.propertyId,
              (affiliationData) => {
                this.setPropertyInformationToFields(fieldIds, values);
                this.createPropertyContactTable(affiliationData);
              }
            );
          }
        }
      });
    }
  }

  #getSelectedPropertyInput() {
    if (!this.selectedPropertyInput) {
      this.selectedPropertyInput = document.getElementById(
        "selected-property-id"
      );
    }
    return this.selectedPropertyInput;
  }

  #clearSelectedPropertyHighlight() {
    if (!this.selectedPropertyCard) return;
    this.selectedPropertyCard.classList.remove("bg-blue-50");
    this.selectedPropertyCard.classList.add("bg-white");
    this.selectedPropertyCard = null;
  }

  #setSelectedProperty(propertyId, sourceCard = null) {
    const normalized = propertyId ? String(propertyId) : "";
    this.propertyId = normalized || null;

    const input = this.#getSelectedPropertyInput();
    if (input) input.value = normalized;

    if (this.selectedPropertyCard && this.selectedPropertyCard !== sourceCard) {
      this.#clearSelectedPropertyHighlight();
    }

    if (sourceCard && normalized) {
      this.selectedPropertyCard = sourceCard;
      sourceCard.classList.add("bg-blue-50");
      sourceCard.classList.remove("bg-white");
    } else if (!normalized) {
      this.#clearSelectedPropertyHighlight();
    } else if (!sourceCard) {
      this.selectedPropertyCard = null;
    }
  }

  /**
   * Exposed for controller to set a newly created property as selected.
   * Ensures both the internal propertyId and the hidden input stay in sync.
   */
  setSelectedPropertyId(propertyId) {
    this.#setSelectedProperty(propertyId);
  }

  generatePropertyInformationKeys(fieldIds, data) {
    const mappedValues = {};

    fieldIds.forEach((key) => {
      switch (key) {
        case "lot_number":
          mappedValues[key] = data.lotNumber || "";
          break;
        case "unit-number":
          mappedValues[key] = data.unitNumber || "";
          break;
        case "address_1":
          mappedValues[key] = data.address_1 || "";
          break;
        case "address_2":
          mappedValues[key] = data.address_2 || "";
          break;
        case "suburb_town":
          mappedValues[key] = data.suburb_town || "";
          break;
        case "postal_code":
          mappedValues[key] = data.postal_code || "";
          break;
        case "state":
          mappedValues[key] = data.state || "";
          break;
        case "property-type":
          mappedValues[key] = data.propertyType || "";
          break;
        case "building-type":
          mappedValues[key] = data.buildingType || "";
          break;
        case "foundation-type":
          mappedValues[key] = data.foundationType || "";
          break;
        case "stories":
          mappedValues[key] = data.stories || "";
          break;
        case "bedrooms":
          mappedValues[key] = data.bedrooms || "";
          break;
        case "building-age":
          mappedValues[key] = data.buildingAge || "";
          break;
        case "manhole":
          mappedValues[key] = data.manhole || "";
          break;
        case "building-features":
          mappedValues[key] =
            data.building_features || data.buildingFeatures || "";
          break;
        case "search-properties":
          mappedValues[key] = data.property_name || "";
          break;
        default:
          mappedValues[key] = "";
      }
    });

    return mappedValues;
  }

  setPropertyInformationToFields(keys, values) {
    if (!keys || !keys.length || !values) return;

    keys.forEach((key) => {
      if (!key) return;

      // Find the element by data-property-id
      const el = document.querySelector(
        `#property-information [data-property-id="${key}"]`
      );
      if (!el) return;

      const v = values[key] ?? "";

      if (el.tagName === "SELECT") {
        el.value = v;
      } else if (el.type === "checkbox") {
        el.checked = v === true || v === "true";
      } else {
        el.value = v;
      }
    });
  }

  createPropertyContactTable(rows = []) {
    const container = document.querySelector(
      '[data-property-contact-id="table"]'
    );
    if (!container) return;

    // Clear previous table if exists
    container.innerHTML = "";

    // SVG visibility
    const svg = document.getElementById("property-contact-svg");
    if (!rows || rows.length === 0) {
      if (svg) svg.style.display = "block";
      return;
    } else if (svg) svg.style.display = "none";

    // Create table
    const table = document.createElement("table");
    table.className =
      "min-w-full table-auto border-collapse text-sm text-slate-700";

    // Table header
    const thead = document.createElement("thead");
    thead.className =
      "bg-slate-50 text-xs font-semibold text-slate-500 border-b border-slate-200";
    thead.innerHTML = `
      <tr>
        <th class="w-7 px-4 py-2">&nbsp;</th>
        <th class="px-4 py-2 text-left">Role</th>
        <th class="px-4 py-2 text-left">Contact</th>
        <th class="px-4 py-2 text-left">SMS Number</th>
        <th class="px-4 py-2 text-left">Company</th>
        <th class="w-20 px-4 py-2 text-right">Action</th>
      </tr>
    `;
    table.appendChild(thead);

    // Table body
    const tbody = document.createElement("tbody");
    tbody.className = "divide-y divide-slate-200";

    // Helper functions
    const starIcon = (filled) => `
      <button type="button" class="star-btn" title="Set as Primary">
        <svg class="h-4 w-4 ${
          filled ? "text-amber-500" : "text-slate-300"
        }" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.802 2.035a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118L10.5 14.347a1 1 0 00-1.175 0L6.625 16.282c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.99 8.72c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.06-3.292z"/>
        </svg>
      </button>
    `;

    const actionCell = () => `
      <div class="flex items-center justify-end gap-3 text-slate-500">
        <button type="button" class="edit-btn !text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500" title="Edit">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
        </button>
        <button type="button" class="delete-btn !text-rose-600 hover:!text-rose-600 active:!text-rose-600 focus:!text-rose-600 focus-visible:!text-rose-600" title="Delete">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
            <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"/>
          </svg>
        </button>
      </div>
    `;

    const toName = (c) =>
      [c?.first_name, c?.last_name].filter(Boolean).join(" ").trim() || "—";
    const toPhone = (c) => c?.sms_number || c?.sms || "";
    const toEmail = (c) => c?.email || "";
    const toCompany = (co) => co?.name || co?.company || "";

    // Render rows
    rows.forEach((row, idx) => {
      const tr = document.createElement("tr");
      tr.id = row.ID;
      tr.className = `${idx % 2 === 1 ? "bg-slate-50/50" : ""}`;

      const primary = Boolean(row?.Primary_Owner_Contact);
      const role = row?.Role || "";
      const contact = {
        first_name: row.Contact_First_Name,
        last_name: row.Contact_Last_Name,
        email: row.ContactEmail,
        sms_number: row.Contact_SMS_Number,
      };
      const company = row?.CompanyName;

      tr.dataset.affiliationId = row?.ID || row?.id || "";
      tr.dataset.contactId = row?.Contact_ID || row?.contact_id || "";
      tr.dataset.propertyId = row?.Property_ID || row?.property_id || "";
      tr.dataset.role = role;
      tr.dataset.firstName = contact.first_name || "";
      tr.dataset.lastName = contact.last_name || "";
      tr.dataset.email = contact.email || "";
      tr.dataset.sms = contact.sms_number || "";
      tr.dataset.company =
        typeof company === "object"
          ? company?.name || company?.company || ""
          : company || "";

      tr.innerHTML = `
        <td class="px-4 py-2">${
          row.Role !== "Owner"
            ? `<span class="invisible">${starIcon(primary)}</span>`
            : starIcon(primary)
        }</td>
        <td class="px-4 py-2">${role}</td>
        <td class="px-4 py-2">
          <div class="font-medium">${toName(contact)}</div>
          <div class="text-xs text-slate-500">(${toEmail(contact)})</div>
        </td>
        <td class="px-4 py-2">${toPhone(contact)}</td>
        <td class="px-4 py-2">${toCompany(company)}</td>
        <td class="px-4 py-2 text-right">${actionCell()}</td>
      `;

      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Attach events
    tbody.querySelectorAll(".star-btn").forEach((btn, i) =>
      btn.addEventListener("click", (e) => {
        console.log("✏️ Edit clicked:", i);
      })
    );
    tbody.querySelectorAll(".edit-btn").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        this.affiliationId = tr.id;
        this.contactId = tr.dataset.contactId || "";
        this.#setSelectedProperty(tr.dataset.propertyId || "");

        document.getElementById("pcSaveBtn").textContent = "Update Contact";
        this.toggleModal("propertyContactModalWrapper");

        // populate modal from dataset immediately
        const $ = (id) => document.getElementById(id);
        const roleInput = $("pcRole");
        const firstNameInput = $("pcFirstName");
        const lastNameInput = $("pcLastName");
        const emailInput = $("pcEmail");
        const smsInput = $("pcSms");

        if (roleInput) roleInput.value = tr.dataset.role || "";
        if (firstNameInput) firstNameInput.value = tr.dataset.firstName || "";
        if (lastNameInput) lastNameInput.value = tr.dataset.lastName || "";
        if (emailInput) emailInput.value = tr.dataset.email || "";
        if (smsInput) smsInput.value = tr.dataset.sms || "";
      })
    );
    tbody.querySelectorAll(".delete-btn").forEach((btn) =>
      btn.addEventListener("click", async (e) => {
        const tr = e.target.closest("tr");
        if (!tr) return;
        showLoader(
          this.loaderElement,
          this.loaderMessageEl,
          this.loaderCounter,
          "Deleting affiliation..."
        );
        try {
          const result = await this.model.deleteAffiliationById(
            tr.getAttribute("data-affiliation-id")
          );
          if (!result.isCancelling) {
            this.customModalHeader.innerText = "Successful";
            this.customModalBody.innerText =
              "Affiliation deleted successfully.";
            this.toggleModal("statusModal");
          }
        } catch (error) {
          console.error("[NewInquiry] Failed to delete affiliation", error);
          this.showFeedback("Unable to delete affiliation right now.");
        } finally {
          hideLoader(this.loaderElement, this.loaderCounter);
        }
      })
    );
  }

  createOptionsForSelectbox(configs) {
    configs.forEach(({ id, options, placeholder }) => {
      const element = document.getElementById(id);
      if (!element) return;

      element.innerHTML = "";

      if (placeholder) {
        const placeholderOption = document.createElement("option");
        placeholderOption.text = placeholder;
        placeholderOption.value = ""; // empty value
        placeholderOption.disabled = true; // prevent selection
        placeholderOption.selected = true; // show initially
        element.add(placeholderOption);
      }

      options.forEach((opt) => {
        const option = document.createElement("option");
        option.text = opt;
        option.value = opt;
        element.add(option);
      });
    });
  }

  #createContactDetailsModalUI() {
    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.id = "addressDetailsModalWrapper";
    wrapper.className =
      "fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/50";
    wrapper.innerHTML = `
      <div modal-name="contact-detail-modal" id="addressDetailsModalBox" class="bg-white rounded-lg shadow-xl w-[40vw] max-w-3xl max-h-[90vh] overflow-auto">
        <div class="flex items-center justify-between px-5 py-3 bg-[#003882] text-white rounded-t-lg">
          <h3 class="text-base font-semibold">Contact Details</h3>
          <button id="closeAddressDetailsBtn" class="!p-1 !rounded !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent" aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>

        

        
 
        <div class="px-5 py-5 space-y-6">
        <div class="hidden" id="account-type-section">
                <label class="block text-sm font-medium text-slate-600">Entity Type</label>
                <select id="account-type" data-contact-id="account-type" data-contact-field="account_type" class="!block w-full appearance-none rounded-lg border border-slate-200 bg-white my-2 px-4 py-3 text-sm text-slate-600 focus:border-brand-200 focus:outline-none focus:ring-2 focus:ring-brand-100">
                  <option clas="font-medium text-slate-600" value="Body Corp">Body Corp</option>
                  <option clas="font-medium text-slate-600" value="Body Corp Company">Body Corp Company</option>
                  <option clas="font-medium text-slate-600" value="Business &amp; Gov">Business &amp; Gov</option>
                  <option clas="font-medium text-slate-600" value="Closed Real Estate">Closed Real Estate</option>
                  <option clas="font-medium text-slate-600" value="School/Childcare">School/Childcare</option>
                  <option clas="font-medium text-slate-600" value="Real Estate Agent">Real Estate Agent</option>
                  <option clas="font-medium text-slate-600" value="Tenant to Pay">Tenant to Pay</option>
                  <option clas="font-medium text-slate-600" value="Wildlife Rescue">Wildlife Rescue</option>
                </select>
              </div>
              <div id="company-name-section" class="hidden">
                <label class="text-sm font-medium text-slate-600">Company Name</label>
                <input type="tel" data-contact-field="company_name" data-contact-id="company_name" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
              </div>
        <div class="hidden" id="affiliations-role-section">
                <label class="block text-sm font-medium text-slate-600"
                  >Role</label
                >
                <input
                  type="text"
                  data-contact-id="affiliationsrole"
                  data-contact-field="affiliationsrole"
                  placeholder="Resident, Owner, Property Manager..."
                  class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"
                />
              </div>
          <div class="space-y-3">
           <div class="flex gap-4">
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">First Name <span class="text-rose-500">*</span></label>
                  <input type="text" data-contact-field="first_name" data-contact-id="first_name" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default">
                </div>
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">Last Name</label>
                  <input type="text" data-contact-field="last_name" data-contact-id="last_name" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default">
                </div>
              </div>

              <div class="flex gap-4">
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">Email <span class="text-rose-500">*</span></label>
                  <input type="email" data-contact-field="email" data-contact-id="email" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
                </div>
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">SMS Number</label>
                  <input type="tel" data-contact-field="sms_number" data-contact-id="sms_number" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
                </div>
              </div>
              <div  class="hidden">
              <input id="contact-address" type="text" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
              </div>
              

              <div>
                <label class="text-sm font-medium text-slate-600">Office Number</label>
                <input type="tel" data-contact-field="office_phone" data-contact-id="office_phone" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
              </div>
            <div>
              <label class="block text-sm  font-medium text-gray-700 mb-1">Address</label>
            <div class="relative hidden">
              <input id="adTopSearch" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 pr-9 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor"><path d="M21 20l-5.6-5.6a7.5 7.5 0 10-1.4 1.4L20 21l1-1Zm-13.5-5A5.5 5.5 0 1113 9.5 5.51 5.51 0 017.5 15Z"/></svg>
              </div>
            </div>
            <div data-section="address">
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block font-medium text-sm text-gray-700 mb-1">Address line 1</label>
                <input id="adTopLine1" data-contact-id="address" data-contact-field="top_address_line1" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="flex-1">
                <label class="block font-medium text-sm text-gray-700 mb-1">Address line 2</label>
                <input id="adTopLine2" data-contact-id="address_2" data-contact-field="top_address_line2" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
            </div>
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input id="adTopCity" data-contact-id="city" data-contact-field="top_city" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">State*</label>
                 <select id="adTopState" data-contact-id="state" data-contact-field="top_state" class="!block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                </select>
              </div>
            </div>
            <div class="flex gap-3">
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code*</label>
                <input id="adTopPostal" data-contact-id="zip_code" data-contact-field="top_postal" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="flex-1">
                <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select id="adTopCountry" data-contact-id="country" data-contact-field="top_country" class="!block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                   <option value="AU">Australia</option>
                </select>
              </div>
            </div>
            </div>
          </div>
  
          <div class="pt-2">
            <div class="mb-2 flex items-center justify-between">
              <h4 class="text-sm font-medium text-gray-900">Postal Address</h4>
              <div class="flex items-center gap-2">
              <input
                id="adSameAsAbove"
                name="adSameAsAbove"
                type="checkbox"
                class="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 accent-blue-600"
              />
              <label for="adSameAsAbove" class="text-sm text-gray-700 select-none cursor-pointer">
                Same as above
              </label>
            </div>

            </div>
  
            <div class="space-y-3" data-section="postal-address">
              <div class="hidden">
                <label class="block font-medium text-sm text-gray-700 mb-1">Address</label>
              <input id="adBotSearch" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block font-medium text-sm text-gray-700 mb-1">Address line 1</label>
                  <input id="adBotLine1" data-contact-id="postal_address"  data-contact-field="bot_address_line1" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Address line 2</label>
                  <input id="adBotLine2" data-contact-id="postal_address_2"  data-contact-field="bot_address_line2" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input id="adBotCity" data-contact-id="postal_city" data-contact-field="bot_city" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">State*</label>
                  <select id="adBotState" data-contact-id="postal_state" data-contact-field="bot_state" class="!block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    
                  </select>
                </div>
              </div>
              <div class="flex gap-3">
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Postal Code*</label>
                  <input id="adBotPostal" data-contact-id="postal_code" data-contact-field="bot_postal" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
                <div class="flex-1">
                  <label class="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <select id="adBotCountry" data-contact-id="postal_country" data-contact-field="bot_country" class="!block w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    <option value="AU">Australia</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
  
        <div class="flex justify-end gap-3 px-5 py-4 border-t rounded-b-lg">
          <button id="cancelAddressDetailsBtn" class="!text-sm !text-slate-600 !font-medium hover:!text-slate-600 active:!text-slate-600 focus:!text-slate-600 focus-visible:!text-slate-600">Cancel</button>
          <button id="updateAddressDetailsBtn" class="!px-4 !py-2 !bg-[#003882] !text-white !text-sm !font-medium !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    // Refs
    const $ = (id) => document.getElementById(id);
    const modal = $("addressDetailsModalWrapper");
    const modalBox = $("addressDetailsModalBox");
    const closeBtn = $("closeAddressDetailsBtn");
    const cancelBtn = $("cancelAddressDetailsBtn");
    const sameAsAboveBtn = $("adSameAsAbove");

    const topInputs = [
      $("adTopSearch"),
      $("adTopLine1"),
      $("adTopLine2"),
      $("adTopCity"),
      $("adTopState"),
      $("adTopPostal"),
      $("adTopCountry"),
    ];
    const botInputs = [
      $("adBotSearch"),
      $("adBotLine1"),
      $("adBotLine2"),
      $("adBotCity"),
      $("adBotState"),
      $("adBotPostal"),
      $("adBotCountry"),
    ];

    sameAsAboveBtn.addEventListener("change", () => {
      const isChecked = sameAsAboveBtn.checked;
      if (isChecked) {
        botInputs.forEach((input, idx) => {
          input.value = topInputs[idx].value;
          input.disabled = true;
        });
      } else {
        botInputs.forEach((input) => {
          input.disabled = false;
          if (input.id === "adBotCountry") return;
          input.value = "";
        });
      }
    });

    const hide = () => {
      // reset fields (preserve search)
      this.resetAffiliationModal?.({ preserveSearch: true });
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    };

    modal.addEventListener("click", (e) => {
      // Prevent bubbling to other modals under this overlay
      e.stopPropagation();
      if (e.currentTarget === modal && !modalBox.contains(e.target)) hide();
    });
    closeBtn.onclick = hide;
    cancelBtn.onclick = hide;
    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("hidden") && e.key === "Escape") hide();
    });
  }

  toggleModal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    let isHidden = el.classList.toggle("hidden");
    el.classList.toggle("flex", !isHidden);
    document.body.style.overflow = isHidden ? "" : "hidden";
  }

  renderDropdownOptionsForStates(states) {
    let elements = document.querySelectorAll("#adTopState, #adBotState");
    if (!elements) return;
    elements.forEach((el) => {
      const placeholderOption = document.createElement("option");
      placeholderOption.text = "Select";
      placeholderOption.value = "";
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      el.add(placeholderOption);
      states.forEach((state) => {
        let option = document.createElement("option");
        option.value = state.value;
        option.text = state.displayValue;
        el.add(option);
      });
    });
  }

  onContactFieldChanges(data) {
    if (!Array.isArray(data) || data.length === 0) return;
    data.forEach((item) => {
      const source = document.querySelector(
        `#addressDetailsModalBox [data-contact-field="${item}"]`
      );
      const target = document.querySelector(
        `[data-contact-section="individual"] [data-contact-field="${item}"]`
      );

      if (!source || !target) return;

      target.value = source.value ?? "";
      source.addEventListener("input", (e) => {
        target.value = e.target.value;
        const evt = new Event("input", { bubbles: true });
        target.dispatchEvent(evt);
      });
    });
  }

  #createPropertyContactModalUI() {
    const wrapper = document.createElement("div");
    wrapper.id = "propertyContactModalWrapper";
    wrapper.className =
      "fixed inset-0 z-[999] hidden items-center justify-center bg-black/50";

    wrapper.innerHTML = `
      <div id="propertyContactModalBox" class="bg-white rounded-lg shadow-xl w-[95vw] max-w-md max-h-[90vh] overflow-auto">
        <!-- Header -->
        <div class="flex items-center justify-between px-5 py-3 bg-[#003882] text-white rounded-t-lg">
          <h3 class="text-base font-semibold">Add Property Contact</h3>
          <button id="pcCloseBtn" class="!p-1 !rounded !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent" aria-label="Close">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-5 py-5 space-y-5">
          <!-- Contact search -->
          <div>
            <label class="block font-medium text-sm text-gray-700 mb-1">Contact</label>
            <div class="relative">
              <input id="pcSearch" type="text" placeholder="Search by name, email, phone"
                     class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default pr-9"/>
              <div id="pcSearchList" class="absolute z-10 mt-1 left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-md hidden">
                <div id="pcSearchScroll" class="max-h-64 overflow-auto"></div>
                <div id="pcSearchFooter" data-contact-id="add-new-property-contact" class="border-t sticky bottom-0 bg-white"></div>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fill-rule="evenodd" d="M12.9 14.32a8 8 0 111.414-1.414l3.387 3.386a1 1 0 01-1.414 1.415l-3.387-3.387zM14 8a6 6 0 11-12 0 6 6 0 0112 0z" clip-rule="evenodd"></path>
                    </svg>
            </div>
          </div>

           <!-- Role -->
           <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <input id="pcRole" type="text" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
            </div>
          </div>
  
          <!-- Names -->
          <div class="flex gap-3" id>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
              <input id="pcFirstName" type="text" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input id="pcLastName" type="text" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
            </div>
          </div>
  
          <!-- Email / SMS -->
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Email*</label>
              <input id="pcEmail" type="email" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">SMS Number</label>
              <input id="pcSms" type="tel" class="mt-1 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 focus:ring-2 focus:ring-slate-200 browser-default"/>
            </div>
          </div>
  
          <!-- Primary -->
          <div class="inline-flex text-gray-700 font-medium items-center gap-2 text-sm">
            <input id="pcPrimary" name="pcPrimary" type="checkbox" class="h-4 w-4 accent-[#003882] rounded border-gray-300 text-blue-600 focus:ring-blue-500"/>
            <label for="pcPrimary" class="text-sm text-gray-700">Is Primary Contact</label>
          </div>
        </div>
  
        <!-- Footer -->
        <div class="flex justify-end gap-3 px-5 py-4 border-t rounded-b-lg">
          <button id="pcCancelBtn" class="!text-sm !text-slate-600 !font-medium hover:!text-slate-600 active:!text-slate-600 focus:!text-slate-600 focus-visible:!text-slate-600">Cancel</button>
          <button id="pcSaveBtn" class="!px-4 !py-2 !text-white !text-sm !bg-[#003882] !font-medium !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white"></button>
        </div>
      </div>
    `;
    document.body.appendChild(wrapper);

    // Refs
    const $ = (id) => document.getElementById(id);
    const modal = $("propertyContactModalWrapper");
    const modalBox = $("propertyContactModalBox");
    const closeBtn = $("pcCloseBtn");
    const cancelBtn = $("pcCancelBtn");
    const saveBtn = $("pcSaveBtn");
    const searchInput = $("pcSearch");
    const searchList = $("pcSearchList");
    const searchScroll = $("pcSearchScroll");
    const searchFooter = $("pcSearchFooter");
    const firstNameInput = $("pcFirstName");
    const lastNameInput = $("pcLastName");
    const emailInput = $("pcEmail");
    const smsInput = $("pcSms");
    const role = $("pcRole");
    const isPrimaryContact = $("pcPrimary");

    const hide = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    };

    // Close interactions
    modal.addEventListener("click", (e) => {
      // Prevent bubbling to other overlays (e.g., property contact modal beneath)
      e.stopPropagation();
      if (e.currentTarget === modal && !modalBox.contains(e.target)) hide();
    });
    closeBtn.onclick = hide;
    cancelBtn.onclick = hide;
    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("hidden") && e.key === "Escape") hide();
    });

    saveBtn.addEventListener("click", async () => {
      showLoader(
        this.loaderElement,
        this.loaderMessageEl,
        this.loaderCounter,
        "Saving contact..."
      );
      try {
        const contact = {
          first_name: firstNameInput.value,
          last_name: lastNameInput.value,
          email: emailInput.value,
          sms_number: smsInput.value,
        };

        if (this.contactId == null) {
          let contactResult = await this.model.createNewContact(contact);
          let contactId = contactResult?.createdContact?.id;

          if (contactId) {
            this.contactId = contactId;
            contact.contact_id = contactId;
            contact.role = role.value;
            contact.property_id = this.propertyId;
            contact.isPrimary = isPrimaryContact.checked;
            let result = await this.model.createNewAffiliation(contact);
            if (!result.isCancelling) {
              this.customModalHeader.innerText = "Successful";
              this.customModalBody.innerText =
                "Affiliation created successfully.";
              this.toggleModal("statusModal");
            }
          }
        } else {
          let isAffiliationExisting =
            await this.model.fetchAffiliationByContactId(
              this.contactId.toString(),
              this.propertyId.toString()
            );
          if (isAffiliationExisting && isAffiliationExisting.length != 0) {
            let affiliation = {};
            affiliation.role = role.value;
            affiliation.property_id = this.propertyId;
            affiliation.primary_owner_contact = isPrimaryContact.checked;
            let affiliationResult = await this.model.updateExistingAffiliation(
              affiliation,
              this.affiliationId
            );

            let contactResult = await this.model.updateContact(
              this.contactId,
              contact
            );

            if (!affiliationResult.isCancelling) {
              this.customModalHeader.innerText = "Successful";
              this.customModalBody.innerText =
                "Affiliation updated successfully.";
              this.toggleModal("statusModal");
            }
          } else {
            contact.contact_id = this.contactId;
            contact.role = role.value;
            contact.property_id = this.propertyId;
            contact.isPrimary = isPrimaryContact.checked;
            let affiliationResult = await this.model.createNewAffiliation(
              contact
            );

            if (!affiliationResult.isCancelling) {
              this.customModalHeader.innerText = "Successful";
              this.customModalBody.innerText =
                "Affiliation created successfully.";
              this.toggleModal("statusModal");
            }
          }
        }
      } catch (error) {
        console.error("[NewInquiry] Failed to save affiliation", error);
        this.showFeedback("Unable to save contact right now.");
      } finally {
        hideLoader(this.loaderElement, this.loaderCounter);
      }
    });

    // Affiliation contact search wiring
    this.affiliationContacts = [];

    // Helper to reset modal fields; keep search unless specified
    this.resetAffiliationModal = ({ preserveSearch = true } = {}) => {
      try {
        const role = document.getElementById("pcRole");
        const first = document.getElementById("pcFirstName");
        const last = document.getElementById("pcLastName");
        const email = document.getElementById("pcEmail");
        const sms = document.getElementById("pcSms");
        const primary = document.getElementById("pcPrimary");
        const search = document.getElementById("pcSearch");

        if (role) role.value = "";
        if (first) first.value = "";
        if (last) last.value = "";
        if (email) email.value = "";
        if (sms) sms.value = "";
        if (primary) primary.checked = false;
        if (!preserveSearch && search) search.value = "";
        this.affiliationId = undefined;
      } catch (_) {}
    };

    this.setAffiliationContacts = (contacts = []) => {
      this.affiliationContacts = Array.isArray(contacts) ? contacts : [];
      renderList("");
    };

    const formatParts = (c) => {
      const name = [c?.fields?.first_name, c?.fields?.last_name]
        .filter(Boolean)
        .join(" ")
        .trim();
      const email = c?.fields?.email || "";
      const sms = c?.fields?.sms_number || "";
      return {
        name: name || email || sms || "Unknown Contact",
        sub: email || sms,
      };
    };

    const renderList = (term = "") => {
      if (!searchList) return;
      const q = String(term || "").toLowerCase();
      const items = this.affiliationContacts.filter((c) => {
        const f = c?.fields || {};
        const name = `${(f.first_name || "").toLowerCase()} ${(
          f.last_name || ""
        ).toLowerCase()}`;
        return (
          name.includes(q) ||
          (f.email || "").toLowerCase().includes(q) ||
          (f.sms_number || "").toLowerCase().includes(q)
        );
      });

      const frag = document.createDocumentFragment();

      if (items.length) {
        items.forEach((c) => {
          const { name, sub } = formatParts(c);
          const li = document.createElement("div");
          li.className =
            "flex flex-col gap-1 text-sm px-4 pt-4 pb-2 cursor-pointer border-b last:border-b-0 hover:bg-slate-50";
          li.innerHTML = `
            <div class="text-[15px] font-medium text-slate-800">${this.#escapeHtml(
              name
            )}</div>
            <div class="text-xs text-slate-500">${this.#escapeHtml(sub)}</div>
          `;
          li.addEventListener("click", () => {
            this.contactId = c.id;
            populateInputs(c);
            searchList.classList.add("hidden");
          });
          frag.appendChild(li);
        });
      } else {
        const empty = document.createElement("div");
        empty.className = "px-4 py-2 text-sm text-slate-500";
        empty.textContent = "No contacts";
        frag.appendChild(empty);
      }

      // Add New Contact CTA (fixed footer, non-scrollable)
      const addBtn = document.createElement("button");
      addBtn.type = "button";
      addBtn.className =
        "!w-full !flex !items-center !gap-2 !px-4 !py-3 !text-[15px] !font-medium !text-sky-800 !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent hover:!text-sky-800 active:!text-sky-800 focus:!text-sky-800 focus-visible:!text-sky-800";
      addBtn.innerHTML = `
        <span class="inline-flex items-center justify-center h-5 w-5 rounded-full border border-sky-800 text-sky-800">+</span>
        <span>Add New Contact</span>
      `;
      addBtn.addEventListener("click", () => {
        // Clear inputs to allow adding new
        populateInputs({ fields: {} });
        if (searchInput) searchInput.value = "";
        searchList.classList.add("hidden");
        // focus first name to start entry
        firstNameInput?.focus();
      });
      // Populate scrollable area and fixed footer
      if (searchScroll) {
        searchScroll.innerHTML = "";
        searchScroll.appendChild(frag);
      }
      if (searchFooter) {
        searchFooter.innerHTML = "";
        searchFooter.appendChild(addBtn);
      }
      // Ensure container is visible
      searchList.classList.remove("hidden");
    };

    const populateInputs = (contact) => {
      const f = contact?.fields || {};
      if (firstNameInput) firstNameInput.value = f.first_name || "";
      if (lastNameInput) lastNameInput.value = f.last_name || "";
      if (emailInput) emailInput.value = f.email || "";
      if (smsInput) smsInput.value = f.sms_number || "";
    };

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        renderList(e.target.value || "");
      });
      searchInput.addEventListener("focus", () => {
        renderList(searchInput.value || "");
      });
    }

    document.addEventListener("click", (e) => {
      if (
        searchList &&
        !searchList.contains(e.target) &&
        e.target !== searchInput
      ) {
        searchList.classList.add("hidden");
      }
    });

    modal.addEventListener("click", (e) => {
      if (
        searchList &&
        !searchList.contains(e.target) &&
        e.target !== searchInput
      ) {
        searchList.classList.add("hidden");
      }
    });
  }

  onAddNewContactButtonClick() {
    const button = document.getElementById("pcSearchFooter");
    if (!button) return;
    button.addEventListener("click", async () => {
      showLoader(
        this.loaderElement,
        this.loaderMessageEl,
        this.loaderCounter,
        "Creating contact..."
      );
      try {
        const firstname = document.getElementById("pcFirstName").value;
        const lastName = document.getElementById("pcLastName").value;
        const email = document.getElementById("pcEmail").value;
        const smsNumber = document.getElementById("pcSms").value;

        const contactObj = {
          first_name: firstname,
          last_name: lastName,
          email: email,
          sms_number: smsNumber,
        };
        await this.model.createNewContact(contactObj);
      } catch (error) {
        console.error("[NewInquiry] Failed to create quick contact", error);
        this.showFeedback("Unable to create contact right now.");
      } finally {
        hideLoader(this.loaderElement, this.loaderCounter);
      }
    });
  }

  async getValuesFromContactDetailModal(elements) {
    const formElements = Array.from(elements);
    const contactData = this.buildContactData(formElements);
    const contactId = this.getContactId();

    showLoader(
      this.loaderElement,
      this.loaderMessageEl,
      this.loaderCounter,
      contactId ? "Updating contact..." : "Creating contact..."
    );

    try {
      const result = await this.saveContact(contactId, contactData);

      if (result?.isCancelling) return;

      if (result) {
        this.handleSuccess(!!contactId);
        this.clearForm(formElements);
      } else {
        this.handleFailure(!!contactId);
      }
    } catch (error) {
      console.error("[NewInquiry] Contact modal save failed", error);
      this.showFeedback("Unable to save contact right now.");
    } finally {
      hideLoader(this.loaderElement, this.loaderCounter);
    }
  }

  buildContactData(elements) {
    const data = {};

    elements.forEach((item) => {
      const key = item.getAttribute("data-contact-id");
      if (key) data[key] = item.value;
    });
    return data;
  }

  getContactId() {
    return (
      document.querySelector("[data-contact-field='contact_id']")?.value || ""
    );
  }

  async saveContact(contactId, contactData) {
    if (contactId) {
      return await this.model.updateContact(contactId, contactData);
    }
    return await this.model.createNewContact(contactData);
  }

  clearForm(elements) {
    elements.forEach((item) => (item.value = ""));
  }

  handleSuccess(isUpdate) {
    this.customModalHeader.innerText = "Successful";
    this.customModalBody.innerText = isUpdate
      ? "Contact updated successfully."
      : "New contact created successfully.";

    if (!isUpdate) {
      document
        .getElementById("addressDetailsModalWrapper")
        .classList.add("hidden");
    }

    this.toggleModal("statusModal");
  }

  handleFailure(isUpdate) {
    this.customModalHeader.innerText = "Failed";
    this.customModalBody.innerText = isUpdate
      ? "Contact update failed."
      : "Contact create failed.";

    this.toggleModal("statusModal");
  }

  async getEntityValuesFromContactDetailModal(elements) {
    const element = Array.from(elements);
    const entityDetailObj = {};
    element.forEach((item) => {
      const key = item.item.dataset.contactId;
      const value = item.value;
      if (key) entityDetailObj[key] = value;
      0;
    });

    let primaryContactPersonId = document.querySelector(
      "[data-contact-field='contact_id']"
    ).value;

    showLoader(
      this.loaderElement,
      this.loaderMessageEl,
      this.loaderCounter,
      primaryContactPersonId ? "Updating contact..." : "Creating contact..."
    );
    try {
      if (primaryContactPersonId) {
        entityDetailObj["Companies"] = {
          account_type: document.getElementById("account-type").value,
        };
        const contactResult = await this.model.updateContact(
          primaryContactPersonId,
          entityDetailObj
        );

        let companyId = document.querySelector(
          '[data-contact-field="entity-id"]'
        ).value;
        let companyObj = {
          account_type: entityDetailObj["account-type"],
          name: entityDetailObj.company_name,
        };

        const updateCompanyData = await this.model.updateExistingCompany(
          companyId,
          companyObj
        );
        if (contactResult && updateCompanyData) {
          if (!contactResult.isCancelling && !updateCompanyData.isCancelling) {
            this.customModalHeader.innerText = "Successful";
            this.customModalBody.innerText = "Company updated successfully.";
            this.toggleModal("statusModal");
          }
          element.forEach((item) => {
            item.value = "";
          });
        } else if (!contactResult?.isCancelling) {
          this.customModalHeader.innerText = "Failed";
          this.customModalBody.innerText = "Company update Failed.";
          this.toggleModal("statusModal");
        }
      } else {
        let result = "";
        const isContactCreated = await this.model.createNewContact(
          entityDetailObj
        );
        if (isContactCreated) {
          let contactId = Object.keys(
            isContactCreated.mutations.PeterpmContact.managedData
          )[0];
          if (contactId) {
            const companyData = {
              account_type: document.getElementById("account-type").value,
              name: entityDetailObj.company_name,
              phone: entityDetailObj.office_phone,
              address: entityDetailObj.address,
              city: entityDetailObj.city,
              state: entityDetailObj.state,
              postal_code: entityDetailObj.postal_code,
              Primary_Person: {
                id: contactId,
              },
            };
            result = await this.model.createNewCompany(companyData);
          }
          if (!result.isCancelling) {
            element.forEach((item) => {
              item.value = "";
            });
            this.customModalHeader.innerText = "Successful";
            this.customModalBody.innerText =
              "New contact created successfully.";

            document
              .getElementById("addressDetailsModalWrapper")
              .classList.add("hidden");
            this.toggleModal("statusModal");
          } else {
            this.customModalHeader.innerText = "Failed";
            this.customModalBody.innerText = "Contact create Failed.";
            this.toggleModal("statusModal");
          }
        }
      }
    } catch (error) {
      console.error("[NewInquiry] Contact modal save failed", error);
      this.showFeedback("Unable to save contact right now.");
    } finally {
      hideLoader(this.loaderElement, this.loaderCounter);
    }
  }

  // async createPropertyList(properties) {
  //   // Root elements (reuse contact search structure conventions)
  //   const root = document.querySelector('[data-search-root="property"]');
  //   const input = root?.querySelector("[data-search-input]");
  //   const panel = root?.querySelector("[data-search-panel]");
  //   const results = root?.querySelector("[data-search-results]");
  //   const footer = root?.querySelector("[data-search-footer]");

  //   if (!root || !input || !panel || !results) return;

  //   const filter = (q = "") => {
  //     const term = q.trim().toLowerCase();
  //     if (!term) return properties;
  //     return properties.filter((p) => {
  //       const hay = [p.property_name].filter(Boolean).join(" ").toLowerCase();
  //       return hay.includes(term);
  //     });
  //   };

  //   const render = async (q = "") => {
  //     const list = filter(q);
  //     results.innerHTML = "";

  //     // if (!list.length) {
  //     //   const empty = document.createElement("div");
  //     //   empty.className =
  //     //     "px-4 py-6 text-sm text-slate-500 text-center select-none";
  //     //   empty.textContent = "No matching properties. Add a new property.";
  //     //   results.appendChild(empty);
  //     // } else {
  //     //   list.forEach((p, idx) => {
  //     //     const li = document.createElement("li");
  //     //     const btn = document.createElement("button");
  //     //     btn.type = "button";
  //     //     btn.dataset.optionIndex = String(idx);

  //     //     btn.className =
  //     //       "w-full px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none";
  //     //     btn.innerHTML = `
  //     //       <div data-property-id= ${
  //     //         p.id
  //     //       } class="flex items-start justify-between gap-3">
  //     //         <div>
  //     //           <p class="text-sm font-medium text-slate-700">${this.#escapeHtml(
  //     //             p.property_name || p.id
  //     //           )}</p>
  //     //         </div>
  //     //     </div>`;
  //     //     btn.addEventListener("mousedown", async (e) => {
  //     //       e.preventDefault();
  //     //       // Store the chosen property id similar to contacts
  //     //       this.#setSelectedProperty(p.id);
  //     //       const propertyFields = document.querySelectorAll(
  //     //         "[data-section-id='property'] input:not([data-search-input]), [data-section-id='property'] select"
  //     //       );
  //     //       let result = await this.model.fetchPropertiesById(this.propertyId);
  //     //       this.populatePropertyFields(propertyFields, result.resp);

  //     //       input.value = `${p.property_name || p.id} — ${
  //     //         p.address_1 || ""
  //     //       }`.trim();
  //     //       input.dispatchEvent(new Event("input", { bubbles: true }));
  //     //       input.dispatchEvent(new Event("change", { bubbles: true }));
  //     //       panel.classList.add("hidden");
  //     //     });
  //     //     li.appendChild(btn);
  //     //     results.appendChild(li);
  //     //   });
  //     // }

  //     // Fixed footer with Add New Property
  //     let x = await this.model.fetchProperties(q);
  //     if (footer) footer.innerHTML = "";
  //     const addBtn = document.createElement("button");
  //     addBtn.type = "button";
  //     addBtn.innerHTML = `
  //                   <span class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-900 text-sky-900">
  //                       +
  //                     </span>

  //                   <span class="text-sky-900 hover:bg-slate-50">Add New Property</span>
  //                  `;
  //     addBtn.className =
  //       "flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm font-medium text-sky-900 hover:bg-slate-50";
  //     addBtn.addEventListener("click", (e) => {
  //       e.preventDefault();
  //       this.clearPropertyFieldValues(
  //         "#property-information input, #property-information select"
  //       );
  //       const addPropertyBtn = document.getElementById("add-property-btn");
  //       if (!addPropertyBtn) return;
  //       addPropertyBtn.classList.remove("hidden");
  //       addPropertyBtn.addEventListener("click", async () => {
  //         this.showLoader("Saving property...");
  //         try {
  //           const details = this.getValuesFromFields(
  //             "[data-property-id]",
  //             "data-property-id"
  //           );
  //           const contactField = document.querySelector(
  //             "[data-contact-field='contact_id']"
  //           );
  //           const entityField = document.querySelector(
  //             "[data-contact-field='entity-id']"
  //           );
  //           const contactId = contactField?.value || "";
  //           const entityId = entityField?.value || "";

  //           const activeTab = this.getActiveTabs();
  //           let result = "";
  //           if (activeTab == "individual") {
  //             result = await this.model.createNewProperties(
  //               details,
  //               contactId,
  //               ""
  //             );
  //           } else {
  //             result = await this.model.createNewProperties(
  //               details,
  //               "",
  //               entityId
  //             );
  //           }
  //           if (!result.isCancelling) {
  //             let propertyId = Object.keys(
  //               result.mutations.PeterpmProperty.managedData
  //             )[0];
  //             document.getElementById("selected-property-id").value =
  //               propertyId;
  //             this.customModalHeader.innerText = "Successful";
  //             this.customModalBody.innerText =
  //               "New Property created successfully.";

  //             // this.clearPropertyFieldValues(
  //             //   "#property-information input, #property-information select"
  //             // );
  //             this.toggleModal("statusModal");
  //           } else {
  //             this.customModalHeader.innerText = "Failed";
  //             this.customModalBody.innerText = "Properties create failed.";
  //             this.toggleModal("statusModal");
  //           }
  //         } catch (error) {
  //           console.error("[NewInquiry] Failed to create property", error);
  //           this.showFeedback("Unable to create property right now.");
  //         } finally {
  //           this.hideLoader();
  //         }
  //       });
  //     });
  //     if (footer) footer.appendChild(addBtn);

  //     panel.classList.remove("hidden");
  //   };

  //   input.addEventListener("input", (e) => render(e.target.value || ""));
  //   input.addEventListener("focus", () => render(input.value || ""));
  //   document.addEventListener("click", (e) => {
  //     if (!root.contains(e.target)) panel.classList.add("hidden");
  //   });
  // }

  clearPropertyFieldValues(section) {
    let fields = document.querySelectorAll(section);
    fields.forEach((item) => {
      // Reset selection state without wiping configured values (e.g., checkbox value attributes).
      if (item.type === "checkbox" || item.type === "radio") {
        item.checked = false;
      } else {
        item.value = "";
      }
    });
  }

  getActiveTabs() {
    let individual = document
      .getElementById("individual")
      .hasAttribute("data-active-tab");
    let entity = document
      .getElementById("entity")
      .hasAttribute("data-active-tab");
    if (individual) {
      return "individual";
    } else if (entity) {
      return "entity";
    } else {
      console.error("No active tab found");
    }
  }

  getValuesFromFields(section, attribute) {
    let fields = document.querySelectorAll(section);
    const obj = {};

    fields = Array.from(fields);
    fields.forEach((el) => {
      let key = el.getAttribute(attribute);
      if (!key) return;

      const parts = key.split("-").filter(Boolean);
      if (parts.length >= 2) {
        key = key.toLowerCase().replaceAll("-", "_");
      } else {
        key = key.toLowerCase();
      }

      let value = "";

      const tag = el.tagName.toLowerCase();
      const type = el.type ? el.type.toLowerCase() : null;

      if (tag === "ul") {
        let checkedItems = Array.from(
          el.querySelectorAll("li input:checked")
        ).map((liInput) => liInput.value || true);

        if (checkedItems.length > 0) {
          checkedItems = checkedItems
            .map((v) => {
              if (v != "on") {
                return `*/*${v}*/*`;
              }
            })
            .join("");
          obj[key] = checkedItems.length === 1 ? checkedItems[0] : checkedItems;
        }
      } else if (type === "checkbox") {
        if (!obj[key]) obj[key] = [];
        if (el.checked) {
          obj[key].push(el.value || true);
        }
      } else if (type === "radio") {
        if (el.checked) {
          obj[key] = el.value;
        }
      } else {
        if (key === "date_job_required_by") {
          const [d, m, y] = el.value.split("/");
          value = Math.floor(new Date(y, m - 1, d).getTime() / 1000) ?? "";
        } else {
          value = el.value?.trim() || "";
        }
        obj[key] = value;
      }
    });

    // Flatten single-item arrays
    for (const key in obj) {
      if (Array.isArray(obj[key]) && obj[key].length === 1) {
        obj[key] = obj[key][0];
      }
    }

    return obj;
  }

  async onViewDetailLinkClicked(id, tab) {
    let modalOpened = false;
    try {
      let records;
      if (tab == "individual") {
        records = await this.model.fetchcontactDetailsById(id);
      } else {
        records = await this.model.fetchCompanyById(id);
      }

      if (!records?.resp?.length) return;
      if (this.getActiveTabs() == "individual") {
        this.populateAddressDetails(records.resp[0]);
      } else {
        let result = this.extractPrimaryPerson(records.resp[0]);
        this.populateAddressDetails(result);
      }

      if (!modalOpened) {
        modalOpened = true;
        this.toggleModal("addressDetailsModalWrapper");
      }
    } catch (error) {
      console.error("[NewInquiry] Unable to load contact details", error);
      this.showFeedback("Unable to load contact details right now.");
    }
  }

  extractPrimaryPerson(apiData) {
    const result = {};

    Object.keys(apiData).forEach((key) => {
      if (key.startsWith("Primary_Person_")) {
        const cleanKey = key.replace("Primary_Person_", "");
        result[cleanKey] = apiData[key];
      } else {
        result[key] = apiData[key];
      }
    });

    return result;
  }

  populateAddressDetails(data) {
    this.clearPropertyFieldValues(
      "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
    );
    for (const [key, value] of Object.entries(data)) {
      if (value === null || value === undefined) continue;
      const normalizedKey = key.toLowerCase();

      // find ALL elements that match either field or id
      const elements = document.querySelectorAll(
        `[data-contact-field*="${normalizedKey}"], [data-contact-id*="${normalizedKey}"]`
      );

      // set value for each match
      elements.forEach((el) => {
        if (
          el.tagName === "INPUT" ||
          el.tagName === "SELECT" ||
          el.tagName === "TEXTAREA"
        ) {
          el.value = value;
        }
      });
    }
  }

  populatePropertyFields(fields, data) {
    if (!fields || !data) return;

    fields.forEach((field) => {
      const key = field.getAttribute("data-property-id");

      if (!key) return;
      const normalizedKey = key.replace(/-/g, "_");
      let value = data[0][normalizedKey];
      if (value === undefined || value === null) return;
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else if (field.tagName === "SELECT") {
        const optionExists = Array.from(field.options).some(
          (opt) => opt.value == value
        );
        if (optionExists) field.value = value;
      } else {
        field.value = value;
      }
    });
  }

  onSameAsContactCheckboxClicked(address = {}) {
    // Build a full address object from provided data or fall back to the modal fields.
    const modalAddress = {
      address_1: document.getElementById("adTopLine1")?.value || "",
      address_2: document.getElementById("adTopLine2")?.value || "",
      suburb_town: document.getElementById("adTopCity")?.value || "",
      state: document.getElementById("adTopState")?.value || "",
      postal_code: document.getElementById("adTopPostal")?.value || "",
    };

    const mergedAddress = { ...modalAddress, ...address };

    Object.entries(mergedAddress).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      const field = document.querySelector(`[data-property-id=${key}]`);
      if (field) {
        field.value = value;
        field.dispatchEvent(new Event("input", { bubbles: true }));
        field.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  }

  createSwithcAccountTypeModal() {
    let modalWrapper = document.createElement("div");
    modalWrapper.id = "switchAccountTypeModalWrapper";
    modalWrapper.classList =
      "flex fixed inset-0 z-[999] hidden items-center justify-center bg-black/50";

    modalWrapper.innerHTML = `
      <div class="bg-white w-full max-w-md rounded-lg shadow-lg">
        <div class=" flex w-full justify-between px-6 py-4 border-b border-gray-300 items-center">
          <div class="flex-1 justify-start text-neutral-700 text-lg font-semibold  leading-5">Switch Account Type</div>
          <div id="switchAccountTypeCloseBtn" class="w-6 h-6 relative overflow-hidden">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
              </svg>

          </div>
         </div>
  
        <div class="px-5 py-6 text-gray-700">
          Switching to the Company will reset all filled data.
          Do you want to continue?
        </div>
  
        <div class="flex justify-end gap-3 px-5 py-4 border-t">
          <button
            id="switchAccountTypeCancelBtn"
            class="!text-gray-600 hover:!text-gray-600 active:!text-gray-600 focus:!text-gray-600 focus-visible:!text-gray-600"
          >
            Cancel
          </button>
  
          <button
            id="switchAccountTypeContinueBtn"
            class="!bg-[#003882] !text-white !px-4 !py-2 !rounded-md hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white"
          >
            Continue
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    const show = () => {
      modalWrapper.classList.remove("hidden");
    };

    const hide = () => {
      modalWrapper.classList.add("hidden");
    };

    modalWrapper
      .querySelector("#switchAccountTypeCloseBtn")
      .addEventListener("click", hide);

    modalWrapper
      .querySelector("#switchAccountTypeCancelBtn")
      .addEventListener("click", hide);

    modalWrapper
      .querySelector("#switchAccountTypeContinueBtn")
      .addEventListener("click", async () => {
        this.#switchSection("entity");
        this.toggleModal("switchAccountTypeModalWrapper");
        let propertiesList = await this.model.fetchCompanyById();
        this.createEntityList(propertiesList.resp);
      });

    modalWrapper.addEventListener("click", (e) => {
      if (e.target === modalWrapper) hide();
    });

    return { show, hide };
  }

  async createEntityList(entities) {
    // Root elements (reuse contact search structure conventions)
    const root = document.querySelector('[data-search-root="contact-entity"]');
    const input = root?.querySelector("[data-search-input]");
    const panel = root?.querySelector("[data-search-panel]");
    const results = root?.querySelector("[data-search-results]");
    const footer = root?.querySelector("[data-search-footer]");

    if (!root || !input || !panel || !results) return;

    const filter = (q = "") => {
      const term = (q || "").trim().toLowerCase();
      if (!term) return entities;
      return entities.filter((p) => {
        const name = String(p.Name || p.name || "").toLowerCase();
        const companyId = String(p.ID || p.id || "");
        const accountType = String(p.Account_Type || "").toLowerCase();
        return (
          name.includes(term) ||
          companyId.includes(term) ||
          accountType.includes(term)
        );
      });
    };

    const render = (q = "") => {
      const list = filter(q);
      results.innerHTML = "";

      if (list == null || !list?.length) {
        const empty = document.createElement("div");
        empty.className =
          "px-4 py-6 text-sm text-slate-500 text-center select-none";
        empty.textContent = "No matching properties. Add a new property.";
        results.appendChild(empty);
      } else {
        list.forEach((p, idx) => {
          const li = document.createElement("li");
          const btn = document.createElement("button");
          btn.type = "button";
          btn.dataset.optionIndex = String(idx);

          btn.className =
            "!w-full !px-4 !py-3 !text-left !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent !focus:outline-none hover:!text-current active:!text-current focus:!text-current focus-visible:!text-current";
          btn.innerHTML = `
            <div data-company-id= ${p.ID} data-contact-id= ${
            p.Primary_Person_Contact_ID
          } class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium text-slate-700">${this.#escapeHtml(
                  p.Name
                )}</p>
              </div>
            </div>`;
          btn.addEventListener("mousedown", async (e) => {
            e.preventDefault();
            // Store the chosen property id similar to contacts
            let element = e.target.closest("button");
            this.companyId = element
              .querySelector("[data-company-id]")
              .getAttribute("data-company-id");
            this.entityContactId = element
              .querySelector("[data-contact-id]")
              .getAttribute("data-contact-id");
            let selectedCompany = entities.filter(
              (item) => item.ID == this.companyId
            );
            document.querySelector('[placeholder="Search entity"]').value =
              selectedCompany[0].Name;
            document.querySelector('[data-contact-id="entity-id"]').value =
              this.companyId;
            const mappedFieldsName = selectedCompany.map((item) => {
              return {
                contact_id: item.Primary_Person_Contact_ID,
                email: item.Primary_Person_Email,
                first_name: item.Primary_Person_First_Name,
                last_name: item.Primary_Person_Last_Name,
                sms_number: item.Primary_Person_SMS_Number,
                office_phone: item.Primary_Person_Contact_ID,
                entity_type: item.Account_Type,
                company_name: item.Name,
              };
            });
            document
              .getElementById("view-contact-detail")
              .classList.remove("hidden");
            this.clearPropertyFieldValues(
              "#property-information input, #property-information select"
            );
            this.populateEntityData(mappedFieldsName);
            await this.#loadEntityRelated(this.companyId);
          });
          li.appendChild(btn);
          results.appendChild(li);
        });
      }

      // // Fixed footer with Add New Property
      // if (footer) footer.innerHTML = "";
      // const addBtn = document.createElement("button");
      // addBtn.type = "button";
      // addBtn.innerHTML = `
      //               <span class="inline-flex h-5 w-5 items-center justify-center rounded-full border border-sky-900 text-sky-900">
      //                   +
      //                 </span>

      //               <span class="text-sky-900 hover:bg-slate-50">Add New Property</span>
      //              `;
      // addBtn.className =
      //   "flex w-full items-center gap-2 border-t border-slate-200 px-4 py-3 text-sm font-medium text-sky-900 hover:bg-slate-50";
      // addBtn.addEventListener("click", (e) => {
      //   e.preventDefault();
      //   this.clearPropertyFieldValues(
      //     "#property-information input, #property-information select"
      //   );
      //   const addPropertyBtn = document.getElementById("add-property-btn");
      //   // if (!addPropertyBtn) return;
      //   // addPropertyBtn.classList.remove("hidden");
      //   addPropertyBtn.addEventListener("click", async () => {
      //     this.showLoader("Saving property...");
      //     try {
      //       const details = this.getValuesFromFields(
      //         "[data-property-id]",
      //         "data-property-id"
      //       );
      //       const contactField = document.querySelector(
      //         "[data-contact-field='contact_id']"
      //       );
      //       const contactId = contactField?.value || "";
      //       const result = await this.model.createNewProperties(
      //         details,
      //         contactId
      //       );
      //       if (!result.isCancelling) {
      //         this.customModalHeader.innerText = "Successful";
      //         this.customModalBody.innerText =
      //           "New Property created successfully.";

      //         this.clearPropertyFieldValues(
      //           "#property-information input, #property-information select"
      //         );
      //         this.toggleModal("statusModal");
      //       } else {
      //         this.customModalHeader.innerText = "Failed";
      //         this.customModalBody.innerText = "Properties create failed.";
      //         this.toggleModal("statusModal");
      //       }
      //     } catch (error) {
      //       console.error("[NewInquiry] Failed to create property", error);
      //       this.showFeedback("Unable to create property right now.");
      //     } finally {
      //       this.hideLoader();
      //     }
      //   });
      // });
      // if (footer) footer.appendChild(addBtn);

      panel.classList.remove("hidden");
    };

    input.addEventListener("input", (e) => render(e.target.value || ""));
    input.addEventListener("focus", () => render(input.value || ""));
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) panel.classList.add("hidden");
    });
  }

  populateEntityData(data) {
    data.forEach((item) => {
      const firstNameField = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='first_name']"
      );
      const lastNameField = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='last_name']"
      );
      const emailField = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='email']"
      );
      const smsField = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='sms_number']"
      );
      const phoneNumber = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='office_phone']"
      );
      const entityTypeField = document.querySelector(
        "[data-contact-section='entity'] [data-contact-field='account-type']"
      );

      const primaryContactID = document.querySelector(
        '[data-contact-field="contact_id"]'
      );

      if (primaryContactID) primaryContactID.value = item.contact_id || "";
      if (firstNameField) firstNameField.value = item.first_name || "";
      if (lastNameField) lastNameField.value = item.last_name || "";
      if (emailField) emailField.value = item.email || "";
      if (smsField) smsField.value = item.sms_number || "";
      if (phoneNumber) phoneNumber.value = item.office_phone || "";
      if (entityTypeField) entityTypeField.value = item.entity_type || "";
    });
  }

  setGoogleSearchAddress(data) {
    Object.keys(data).forEach((key) => {
      let field = document.querySelector(`[data-property-id=${key}]`);
      if (field) {
        field.value = data[key];
      }
    });
  }

  async checkInquiryId() {
    try {
      const url = new URL(window.location.href);

      const inquiryId = url.searchParams.get("inquiry");
      const accountType = url.searchParams.get("accountType");

      let result = await this.model.filterEnquiries(inquiryId, accountType);
      if (!Array.isArray(result.resp)) {
        showAlertModal({
          title: "Failed to Load",
          message: "No such records exists",
          buttonLabel: "OK",
        });
        return;
      }

      const inquiryData = await this.getInquiryData(inquiryId);
      const propertyData = await this.safeCall(() =>
        this.model.fetchPropertiesById(inquiryData.Property_ID)
      );

      if (accountType === "company") {
        await this.handleCompanyAccount(inquiryData, propertyData);
      } else {
        await this.handleContactAccount(inquiryData, propertyData);
      }

      this.setCommonUiState();
    } catch (err) {
      console.error("checkInquiryId Error:", err);
    } finally {
      hideLoader(this.loaderElement, this.loaderCounter, true);
    }
  }

  async getInquiryData(inquiryID) {
    try {
      const inquiry = await this.model.fetchRelatedInquiries("", inquiryID);
      return inquiry?.resp?.[0] ?? null;
    } catch (err) {
      console.error("getInquiryData Error:", err);
      return null;
    }
  }

  async handleCompanyAccount(inquiryData, propertyData) {
    try {
      this.#switchSection("entity");

      const entityField = document.querySelector(
        "[data-contact-field='entity-id']"
      );
      if (entityField) entityField.value = inquiryData?.Company_ID ?? "";

      const company = await this.safeCall(() =>
        this.model.fetchCompanyById(inquiryData.Company_ID)
      );

      this.setSearchContactNameOrCompanyName("company", company.resp[0].Name);

      const primaryPerson = this.extractPrimaryPerson(company?.resp?.[0] ?? {});

      if (primaryPerson) this.populateAddressDetails(primaryPerson);

      await this.safeCall(() =>
        this.#loadEntityRelated(inquiryData.Company_ID)
      );

      this.highlightSelectedProperty(inquiryData?.Property_ID);
      await this.loadPropertyInfo(propertyData);

      this.setValuesToInquiryDetail(inquiryData);
      this.setValuesToResidentFeedbak(inquiryData);
    } catch (err) {
      console.error("handleCompanyAccount Error:", err);
    }
  }

  async handleContactAccount(inquiryData, propertyData) {
    try {
      this.#switchSection("individual");
      document.querySelector("[data-contact-field='contact_id']").value =
        inquiryData.Primary_Contact_ID;
      const contactData = await this.safeCall(() =>
        this.model.fetchcontactDetailsById(inquiryData.Primary_Contact_ID)
      );

      const contact = contactData?.resp?.[0] ?? null;
      if (!contact) return;
      if (contact) this.populateAddressDetails(contact);

      let fullName = contact?.First_Name + " " + contact?.Last_Name;
      this.setSearchContactNameOrCompanyName("individual", fullName);

      const email = contact?.Email?.trim?.() ?? "";
      if (email) {
        const related = await this.safeCall(() =>
          this.model.fetchRelated(email)
        );
        if (related) this.renderRelated(related);
      }

      this.highlightSelectedProperty(inquiryData?.Property_ID);
      await this.loadPropertyInfo(propertyData);

      this.setValuesToInquiryDetail(inquiryData);
      this.setValuesToResidentFeedbak(inquiryData);
    } catch (err) {
      console.error("handleContactAccount Error:", err);
    }
  }

  async loadPropertyInfo(propertyData) {
    try {
      if (!propertyData?.resp?.[0]) return;

      const fields = document.querySelectorAll(
        "#property-information input, #property-information select"
      );

      const fieldIds = Array.from(fields)
        .map((field) => field?.getAttribute("data-property-id"))
        .filter(Boolean);

      const values = this.generatePropertyInformationKeys(
        fieldIds,
        propertyData.resp[0]
      );

      await this.safeCall(() =>
        this.model.fetchAffiliationByPropertyId(
          this.propertyId,
          (affiliationData) => {
            this.setPropertyInformationToFields(fieldIds, values);
            this.createPropertyContactTable(affiliationData);
          }
        )
      );
    } catch (err) {
      console.error("loadPropertyInfo Error:", err);
    }
  }

  highlightSelectedProperty(propertyId) {
    try {
      const article = document.querySelector(
        `[data-related-panel="properties"] [id="${propertyId}"]`
      );
      this.#setSelectedProperty(propertyId, article);
    } catch (err) {
      console.error("highlightSelectedProperty Error:", err);
    }
  }

  setCommonUiState() {
    try {
      const addBtn = document.querySelector(
        "#property-contacts #add-contact-btn"
      );
      if (addBtn) addBtn.classList.remove("hidden");

      const viewBtn = document.getElementById("view-contact-detail");
      if (viewBtn) viewBtn.classList.remove("hidden");
    } catch (err) {
      console.error("setCommonUiState Error:", err);
    }
  }

  async safeCall(fn) {
    try {
      return await fn();
    } catch (err) {
      console.error("safeCall Error:", err);
      return null;
    }
  }

  normalizeKey(key) {
    if (!key) return "";
    return key
      .replace(/[-\s]+/g, "_")
      .replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())
      .replace(/__+/g, "_")
      .replace(/^_/, "")
      .toLowerCase();
  }

  normalizeObjectKeys(obj = {}) {
    const out = {};
    Object.keys(obj).forEach((k) => {
      out[this.normalizeKey(k)] = obj[k];
    });
    return out;
  }

  setSearchContactNameOrCompanyName(activeTab, name) {
    if (activeTab == "individual") {
      document.querySelector(
        '[data-search-root="contact-individual"] [data-search-input]'
      ).value = name;
    } else if (activeTab == "company") {
      document.querySelector(
        '[data-search-root="contact-entity"] [data-search-input]'
      ).value = name;
    }
  }

  convertUnixToAU(unix) {
    try {
      if (!unix) return "";

      const date = new Date(unix * 1000);

      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");

      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      console.error("Date conversion error:", e);
      return "";
    }
  }

  populateFields(fields, normalizedValues) {
    fields.forEach((item) => {
      const htmlKey =
        item.getAttribute("data-feedback-id") ||
        item.getAttribute("data-inquiry-id");
      if (!htmlKey) return;
      const nk = this.normalizeKey(htmlKey);
      let val;
      if (nk == "service_name") {
        val = normalizedValues["service_inquiry_service_name"];
      } else {
        val = normalizedValues[nk];
      }
      if (val !== undefined && val !== null) {
        item.value = val;
      }
    });
  }

  populateCheckboxGroups(groups, normalizedValues, delimiter = "*/*") {
    groups.forEach((ul) => {
      const htmlKey = ul.getAttribute("data-feedback-id");
      if (!htmlKey) return;
      const nk = this.normalizeKey(htmlKey);
      const raw = normalizedValues[nk];
      if (!raw) return;
      const selectedValues = raw.split(delimiter).filter((v) => v);
      const checkboxes = ul.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((cb) => {
        cb.checked = selectedValues.includes(cb.value);
      });
    });
  }

  setValuesToInquiryDetail(values) {
    try {
      if (!values) return;
      const normalizedValues = this.normalizeObjectKeys(values);
      const fields = document.querySelectorAll(
        '[data-inquiry-id="inquiry-detail"] input, ' +
          '[data-inquiry-id="inquiry-detail"] select, ' +
          '[data-inquiry-id="inquiry-detail"] textarea'
      );
      this.populateFields(fields, normalizedValues);
    } catch (err) {
      console.error("Error in setValuesToInquiryDetail:", err);
    }
  }

  setValuesToResidentFeedbak(values) {
    try {
      if (!values) return;
      const normalizedValues = this.normalizeObjectKeys(values);
      const fields = document.querySelectorAll(
        '[data-feedback-id="resident-feedback"] input:not([type="checkbox"]), ' +
          '[data-feedback-id="resident-feedback"] select, ' +
          '[data-feedback-id="resident-feedback"] textarea'
      );

      fields.forEach((item) => {
        const htmlKey = item.getAttribute("data-feedback-id");
        if (!htmlKey) return;
        const nk = this.normalizeKey(htmlKey);
        const val = normalizedValues[nk];
        if (nk === "date_job_required_by" && val) {
          item.value = this.convertUnixToAU(val);
        } else if (val !== undefined && val !== null) {
          item.value = val;
        }
      });

      const checkboxGroups = document.querySelectorAll(
        '[data-feedback-id="resident-feedback"] ul[data-feedback-id]'
      );

      this.populateCheckboxGroups(checkboxGroups, normalizedValues, "*/*");
    } catch (err) {
      console.error("Error in setValuesToResidentFeedbak:", err);
    }
  }

  initResidentFeedbackUploads() {
    const inputs = document.querySelectorAll("[data-feedback-upload]");
    inputs.forEach((input) => {
      const key = input.dataset.feedbackUpload;
      const list = document.querySelector(
        `[data-feedback-upload-list="${key}"]`
      );
      if (!list) return;

      const previewModal = ensureFilePreviewModal();
      initFileUploadArea({
        triggerEl: input.closest("label") || input.parentElement,
        inputEl: input,
        listEl: list,
        nameEl: null,
        previewBtn: null,
        removeBtn: null,
        uploadPath: "inquiries/resident-feedback",
        loaderElement: this.loaderElement,
        loaderMessageEl: this.loaderMessageEl,
        loaderCounter: this.loaderCounter,
        acceptRegex: /^(image\/|application\/pdf)/,
        multiple: true,
        replaceExisting: false,
        renderItem: (meta) => {
          const card = buildUploadCard(meta, {
            onView: () => {
              const type = meta.type || "";
              const src = meta.url?.startsWith("http")
                ? meta.url
                : `data:${type || "application/octet-stream"};base64,${
                    meta.url
                  }`;
              previewModal.show({
                src,
                name: meta.name || "Preview",
                type,
              });
            },
            onDelete: () => card.remove(),
          });
          card.setAttribute("data-upload-url", meta.url);
          card.setAttribute("data-file-name", meta.name || "Upload");
          card.setAttribute("file-type", meta.type || "");
          return card;
        },
      });
    });
  }

  bindResidentUploadItemActions() {}

  getResidentFeedbackImages() {
    const nodes = document.querySelectorAll(
      '[data-feedback-upload-list] [data-upload-url][file-type^="image/"]'
    );
    return Array.from(nodes)
      .map((node) => node.getAttribute("data-upload-url"))
      .filter(Boolean);
  }

  createPreviewImageHTML(file) {
    const wrapper = document.createElement("div");
    wrapper.className = "bg-[#F5F6F8] p-3 rounded-lg";
    wrapper.innerHTML = `
      <div class="flex flex-row justify-between items-center">
        <div class="flex flex-row items-center gap-3">
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            data-upload-action="view"
            class="cursor-pointer"
          >
            <path
              d="M18.2848 9.49731C18.2605 9.44245 17.6723 8.13758 16.3646 6.82994C14.6223 5.08758 12.4216 4.16675 9.99935 4.16675C7.57712 4.16675 5.37643 5.08758 3.63407 6.82994C2.32643 8.13758 1.73545 9.44453 1.71393 9.49731C1.68234 9.56836 1.66602 9.64525 1.66602 9.723C1.66602 9.80076 1.68234 9.87765 1.71393 9.9487C1.73823 10.0036 2.32643 11.3077 3.63407 12.6154C5.37643 14.357 7.57712 15.2779 9.99935 15.2779C12.4216 15.2779 14.6223 14.357 16.3646 12.6154C17.6723 11.3077 18.2605 10.0036 18.2848 9.9487C18.3164 9.87765 18.3327 9.80076 18.3327 9.723C18.3327 9.64525 18.3164 9.56836 18.2848 9.49731ZM9.99935 12.5001C9.44996 12.5001 8.9129 12.3372 8.4561 12.0319C7.99929 11.7267 7.64326 11.2929 7.43301 10.7853C7.22277 10.2777 7.16776 9.71923 7.27494 9.18039C7.38212 8.64155 7.64668 8.1466 8.03516 7.75812C8.42364 7.36964 8.91859 7.10508 9.45743 6.9979C9.99627 6.89072 10.5548 6.94573 11.0624 7.15597C11.5699 7.36622 12.0038 7.72225 12.309 8.17906C12.6142 8.63586 12.7771 9.17291 12.7771 9.72231C12.7771 10.459 12.4845 11.1656 11.9635 11.6865C11.4426 12.2074 10.7361 12.5001 9.99935 12.5001Z"
              fill="#0052CC"
            ></path>
          </svg>
          <p class="text-gray-800 text-sm">${file.name}</p>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          data-upload-action="delete"
          class="cursor-pointer"
        >
          <path
            d="M13.7949 3.38453H11.2308V2.87171C11.2308 2.46369 11.0687 2.07237 10.7802 1.78386C10.4916 1.49534 10.1003 1.33325 9.69231 1.33325H6.61539C6.20736 1.33325 5.81605 1.49534 5.52753 1.78386C5.23901 2.07237 5.07692 2.46369 5.07692 2.87171V3.38453H2.51282C2.37681 3.38453 2.24637 3.43856 2.1502 3.53474C2.05403 3.63091 2 3.76135 2 3.89735C2 4.03336 2.05403 4.1638 2.1502 4.25997C2.24637 4.35615 2.37681 4.41018 2.51282 4.41018H3.02564V13.6409C3.02564 13.913 3.1337 14.1738 3.32604 14.3662C3.51839 14.5585 3.77927 14.6666 4.05128 14.6666H12.2564C12.5284 14.6666 12.7893 14.5585 12.9816 14.3662C13.174 14.1738 13.2821 13.913 13.2821 13.6409V4.41018H13.7949C13.9309 4.41018 14.0613 4.35615 14.1575 4.25997C14.2537 4.1638 14.3077 4.03336 14.3077 3.89735C14.3077 3.76135 14.2537 3.63091 14.1575 3.53474C14.0613 3.43856 13.9309 3.38453 13.7949 3.38453Z"
            fill="#DB3559"
          ></path>
          <path
            d="M6.82031 6.56445C6.96155 6.56445 7.10278 6.62207 7.21236 6.73164L9.00036 8.51965L10.7884 6.73164C11.0195 6.50052 11.3943 6.50052 11.6254 6.73164C11.8566 6.96277 11.8566 7.33755 11.6254 7.56868L9.38977 9.80429C9.15864 10.0354 8.78386 10.0354 8.55274 9.80429L6.31712 7.56868C6.08599 7.33755 6.08599 6.96277 6.31712 6.73164C6.4267 6.62207 6.56793 6.56445 6.82031 6.56445Z"
            fill="#DB3559"
          ></path>
        </svg>
      </div>
    `;
    return wrapper;
  }
}
