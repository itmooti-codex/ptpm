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

    this.#bindDropdown();
    this.#bindSameAsContact();
    this.#bindTabs();
    this.#bindRelatedTabs();
    this.#updateRelatedUI();
    this.#handleRelatedPropertiesClick();
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

  populateContact(contact) {
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
    this.#setActiveRelatedTab("properties");
  }

  showRelatedLoading() {
    this.relatedHasContact = true;
    this.relatedLoading = true;
    this.relatedData = this.#emptyRelated();
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

  #bindDropdown() {
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
      this.#switchSection("entity");
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
      section.classList.toggle("hidden", key !== targetKey);
    });

    Object.entries(this.tabs).forEach(([key, button]) => {
      if (!button) return;
      const active = key === targetKey;
      button.classList.toggle("bg-blue-700", active);
      button.classList.toggle("text-white", active);
      button.classList.toggle("shadow-sm", active);
      button.classList.toggle("text-slate-500", !active);
    });

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
        <div class="flex flex-col items-end gap-2">
          ${
            hasStatus
              ? `<span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">${status}</span>`
              : ""
          }
          ${
            mapUrl
              ? `<a class="inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900" href="${this.#escapeHtml(
                  mapUrl
                )}" target="_blank" rel="noopener noreferrer">
                   <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                     <path d="M12.5 3H17v4.5" />
                     <path d="M7 17 17 7" />
                     <path d="M7 3H3v14h14v-4" />
                   </svg>
                   View on Map
                 </a>`
              : ""
          }
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
          let propertyId = article.id;
          let propertyData = this.relatedData.properties.filter(
            (item) => item.id == propertyId
          )[0];
          const fields = document.querySelectorAll(
            "#property-information input, #property-information select"
          );

          const fieldIds = Array.from(fields).map((field) =>
            field.getAttribute("data-property-id")
          );
          if (propertyData && propertyData.length != 0) {
            let values = this.generatePropertyInformationKeys(
              fieldIds,
              propertyData
            );
            let affiliationData = await this.model.fetchAffiliationByPropertyId(
              "167"
            );
            this.setPropertyInformationToFields(fieldIds, values);
            this.createPropertyContactTable(affiliationData);
          }
        }
      });
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
        case "storeys":
          mappedValues[key] = data.stories || "";
          break;
        case "bedrooms":
          mappedValues[key] = data.bedrooms || "";
          break;
        case "building-age":
          mappedValues[key] = data.buildingAge || "";
          break;
        case "has-manhole":
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
    tbody
      .querySelectorAll(".star-btn")
      .forEach((btn, i) =>
        btn.addEventListener("click", () => console.log("⭐ Star clicked:", i))
      );
    tbody
      .querySelectorAll(".edit-btn")
      .forEach((btn, i) =>
        btn.addEventListener("click", () => console.log("✏️ Edit clicked:", i))
      );
    tbody
      .querySelectorAll(".delete-btn")
      .forEach((btn, i) =>
        btn.addEventListener("click", () =>
          console.log("🗑️ Delete clicked:", i)
        )
      );
  }

  createInquiryOptions(configs) {
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
}
