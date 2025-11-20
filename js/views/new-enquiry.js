export class NewEnquiryView {
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
    this.createStatusModal();
    this.customModalHeader = document.getElementById("statusTitle");
    this.customModalBody = document.getElementById("statusMessage");
    this.statusModel = document.getElementById("statusModal");

    this.loaderCount = 0;
    this.loaderElement = this.#initOperationLoader();
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

    // this.createPropertyList([]);
  }

  isActive() {
    return document.body?.dataset?.page === "new-enquiry";
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

  setSaving(isSaving) {
    if (!this.saveButton) return;
    const active = Boolean(isSaving);
    this.saveButton.disabled = active;
    this.saveButton.classList.toggle("opacity-70", active);
    this.saveButton.classList.toggle("pointer-events-none", active);
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
      console.error("[NewEnquiry] Failed to load entity related data", error);
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

    this.sameAsCheckbox.addEventListener("change", () =>
      this.#syncWorkRequested()
    );
    [this.firstNameInput, this.lastNameInput]
      .filter(Boolean)
      .forEach((input) =>
        input.addEventListener("input", () => this.#syncWorkRequested())
      );
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
        "flex w-full flex-col gap-1 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50";

      const label = document.createElement("span");
      label.className = "font-medium text-slate-700";
      label.textContent = item.label || "Unnamed Contact";
      button.appendChild(label);

      if (item.meta) {
        const meta = document.createElement("span");
        meta.className = "text-xs text-slate-500";
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
      const active = key === targetKey;
      button.classList.toggle("bg-blue-700", active);
      button.classList.toggle("text-white", active);
      button.classList.toggle("shadow-sm", active);
      button.classList.toggle("text-slate-500", !active);
      if (active) {
        button.setAttribute("data-active-tab", "true");
      } else {
        button.removeAttribute("data-active-tab");
      }
    });

    if (document?.body) {
      document.body.dataset.activeContactTab = targetKey;
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

    if (isIndividual && this.sections.individual) {
      this.section = this.sections.individual;
    }
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
        button.classList.toggle("border-sky-600", isActive);
        button.classList.toggle("bg-slate-50", isActive);
        button.classList.toggle("text-sky-900", isActive);
        button.classList.toggle("border-transparent", !isActive);
        button.classList.toggle("text-slate-500", !isActive);
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
            const message = this.#emptyMessageFor(key);
            panel.innerHTML = `<p class="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 text-center">${this.#escapeHtml(
              message
            )}</p>`;
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
      } else if (!activeItems.length) {
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
      <article id=${
        item.id
      } class="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div class="flex items-center gap-3">
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
        <div class="flex flex-col items-end">
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

  generatePropertyInformationKeys(fieldIds, data) {
    const mappedValues = {};

    fieldIds.forEach((key) => {
      switch (key) {
        case "lot-number":
          mappedValues[key] = data.lotNumber || "";
          break;
        case "unit-number":
          mappedValues[key] = data.unitNumber || "";
          break;
        case "address-1":
          mappedValues[key] = data.address_1 || "";
          break;
        case "address-2":
          mappedValues[key] = data.address_2 || "";
          break;
        case "suburb-town":
          mappedValues[key] = data.suburb_town || "";
          break;
        case "postal-code":
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
          mappedValues[key] = ""; // If you don't have data, leave empty or map accordingly
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
        <button type="button" class="edit-btn hover:text-sky-700" title="Edit">
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 20h9"/>
            <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>
          </svg>
        </button>
        <button type="button" class="delete-btn text-rose-600 hover:text-rose-700" title="Delete">
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
        this.showLoader("Deleting affiliation...");
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
          console.error("[NewEnquiry] Failed to delete affiliation", error);
          this.showFeedback("Unable to delete affiliation right now.");
        } finally {
          this.hideLoader();
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
          <button id="closeAddressDetailsBtn" class="p-1 rounded hover:bg-white/10" aria-label="Close">
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
                  class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
              </div>
          <div class="space-y-3">
           <div class="flex gap-4">
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">First Name <span class="text-rose-500">*</span></label>
                  <input type="text" data-contact-field="first_name" data-contact-id="first_name" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
                </div>
                <div class="flex-1 min-w-[150px]">
                  <label class="text-sm font-medium text-slate-600">Last Name</label>
                  <input type="text" data-contact-field="last_name" data-contact-id="last_name" class="mt-1 w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:border-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-100">
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
              <input id="contact-address" type="text"/>
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
  
            <div class="space-y-3">
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
          <button id="cancelAddressDetailsBtn" class="text-sm text-slate-600 font-medium hover:text-gray-800">Cancel</button>
          <button id="updateAddressDetailsBtn" class="px-4 py-2 bg-[#003882] text-white text-sm font-medium rounded hover:bg-blue-700">Save</button>
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
          <button id="pcCloseBtn" class="p-1 rounded hover:bg-white/10" aria-label="Close">
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
                     class="w-full border border-gray-300 rounded-md px-3 py-2 pr-9 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
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
              <input id="pcRole" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>
  
          <!-- Names -->
          <div class="flex gap-3" id>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">First Name*</label>
              <input id="pcFirstName" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input id="pcLastName" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
          </div>
  
          <!-- Email / SMS -->
          <div class="flex gap-3">
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">Email*</label>
              <input id="pcEmail" type="email" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>
            <div class="flex-1">
              <label class="block text-sm font-medium text-gray-700 mb-1">SMS Number</label>
              <input id="pcSms" type="tel" class="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
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
          <button id="pcCancelBtn" class="text-sm text-slate-600 font-medium hover:text-gray-800">Cancel</button>
          <button id="pcSaveBtn" class="px-4 py-2 text-white text-sm bg-[#003882] font-medium rounded"></button>
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
      this.showLoader("Saving contact...");
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
                "Affiliation deleted successfully.";
              this.toggleModal("statusModal");
            }
          }
        } else {
          let isAffiliationExisting =
            await this.model.fetchAffiliationByContactId(
              this.contactId.toString()
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
                "Affiliation creation successfully.";
              this.toggleModal("statusModal");
            }
          }
        }
      } catch (error) {
        console.error("[NewEnquiry] Failed to save affiliation", error);
        this.showFeedback("Unable to save contact right now.");
      } finally {
        this.hideLoader();
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
        "w-full flex items-center gap-2 px-4 py-3 text-[15px] font-medium text-sky-800 hover:bg-sky-50";
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
  }

  onAddNewContactButtonClick() {
    const button = document.getElementById("pcSearchFooter");
    if (!button) return;
    button.addEventListener("click", async () => {
      this.showLoader("Creating contact...");
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
        console.error("[NewEnquiry] Failed to create quick contact", error);
        this.showFeedback("Unable to create contact right now.");
      } finally {
        this.hideLoader();
      }
    });
  }

  async getValuesFromContactDetailModal(elements) {
    const formElements = Array.from(elements);
    const contactData = this.buildContactData(formElements);
    const contactId = this.getContactId();

    this.showLoader(contactId ? "Updating contact..." : "Creating contact...");

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
      console.error("[NewEnquiry] Contact modal save failed", error);
      this.showFeedback("Unable to save contact right now.");
    } finally {
      this.hideLoader();
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
      const key = item.getAttribute("Data-contact-id");
      const value = item.value;
      if (key) entityDetailObj[key] = value;
      0;
    });

    let primaryContactPersonId = document.querySelector(
      "[data-contact-field='contact_id']"
    ).value;

    this.showLoader(
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
      console.error("[NewEnquiry] Contact modal save failed", error);
      this.showFeedback("Unable to save contact right now.");
    } finally {
      this.hideLoader();
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
  //           console.error("[NewEnquiry] Failed to create property", error);
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
      item.value = "";
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
    } else {
      return "entity";
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
      console.error("[NewEnquiry] Unable to load contact details", error);
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

  createStatusModal() {
    let modal = document.getElementById("statusModal");
    if (modal) return modal;
    modal = document.createElement("div");
    modal.id = "statusModal";
    modal.className =
      "fixed inset-0 z-[9999] hidden items-center justify-center bg-black/40 transition-opacity duration-200";

    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-[350px] text-center p-6 flex flex-col items-center space-y-4">
        <div id="statusIcon" class="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl"></div>
        <h3 id="statusTitle" class="text-lg font-semibold text-gray-800">Success</h3>
        <p id="statusMessage" class="text-sm text-gray-600">Your action was successful.</p>
        <button id="statusCloseBtn" class="mt-3 px-4 py-2 bg-[#003882] text-white rounded hover:bg-blue-700">
          OK
        </button>
      </div>
    `;

    document.body.appendChild(modal);

    const closeBtn = document.getElementById("statusCloseBtn");
    const hide = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    };
    closeBtn.onclick = hide;
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });

    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("hidden") && e.key === "Escape") hide();
    });

    document.body.appendChild(modal);
  }

  showLoader(message = "Working...") {
    if (!this.loaderElement) return;
    this.loaderCount += 1;
    if (this.loaderMessageEl) this.loaderMessageEl.textContent = message;
    this.loaderElement.classList.remove("hidden");
  }

  hideLoader(force = false) {
    if (!this.loaderElement) return;
    if (force) {
      this.loaderCount = 0;
    } else if (this.loaderCount > 0) {
      this.loaderCount -= 1;
    }
    if (this.loaderCount <= 0) {
      this.loaderElement.classList.add("hidden");
      this.loaderCount = 0;
    }
  }

  #initOperationLoader() {
    const existing = document.getElementById("ptpm-operation-loader");
    if (existing) return existing;
    const loader = document.createElement("div");
    loader.id = "ptpm-operation-loader";
    loader.className =
      "fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/40 backdrop-blur-sm";
    loader.innerHTML = `
      <div class="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-lg ring-1 ring-slate-200">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#003882]"></div>
        <p class="text-sm font-semibold text-slate-800" data-loader-message>Working...</p>
      </div>
    `;
    document.body.appendChild(loader);
    return loader;
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
    for (const key in address) {
      let field = document.querySelector(`[data-property-id=${key}]`);
      field.value = address[key];
    }
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
            class="text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
  
          <button
            id="switchAccountTypeContinueBtn"
            class="bg-[#003882] text-white px-4 py-2 rounded-md hover:bg-[#003882]"
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
      const term = q.trim().toLowerCase();
      if (!term) return entities;
      return entities.filter((p) => {
        const hay = [p.property_name].filter(Boolean).join(" ").toLowerCase();
        return hay.includes(term);
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
            "w-full px-4 py-3 text-left hover:bg-slate-50 focus:bg-slate-50 focus:outline-none";
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
      //       console.error("[NewEnquiry] Failed to create property", error);
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
    let url = new URL(window.location.href);
    let enquiryId = url.searchParams.get("enquiry");
    let accountType = url.searchParams.get("account-type");

    let enquiryDetail = await this.model.fetchRelatedInquiries(enquiryId);
    let propertyData = await this.model.fetchPropertiesById();

    if (accountType == "company") {
      let companyData = await this.model.fetchCompanyById();
    } else if (accountType == "contact") {
      let contactData = await this.model.fetchcontactDetailsById();
    }
  }

  setEnquiryValuesToFields() {}
}
