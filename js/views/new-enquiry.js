export class NewEnquiryView {
  constructor() {
    this.sections = {
      individual: document.querySelector('[data-contact-section="individual"]'),
      entity: document.querySelector('[data-contact-section="entity"]'),
    };
    this.section = this.sections.individual;
    this.feedbackEl = document.querySelector('[data-contact-feedback]');
    this.searchRoot = document.querySelector('[data-search-root="contact-individual"]');
    this.searchInput = this.searchRoot?.querySelector('[data-search-input]');
    this.resultsContainer = this.searchRoot?.querySelector('[data-search-results]');
    this.emptyState = this.searchRoot?.querySelector('[data-search-empty]');
    this.addButton = this.searchRoot?.querySelector('[data-search-add]');
    this.panel = this.searchRoot?.querySelector('[data-search-panel]');
    this.contactIdInput = this.section?.querySelector('[data-contact-field="contact_id"]');
    this.manualInputs = Array.from(
      this.section?.querySelectorAll('[data-contact-field]') || []
    ).filter((input) => input.dataset.contactField && input.dataset.contactField !== 'contact_id');
    this.saveFooter = document.getElementById('contact-add-new-footer');
    this.saveButton = this.saveFooter?.querySelector('[data-contact-save]');
    this.saveLabel = this.saveFooter?.querySelector('[data-contact-save-label]');
    this.saveIcon = this.saveFooter?.querySelector('[data-contact-save-icon]');
    this.baseSaveLabel = this.saveButton?.dataset.baseLabel || 'Add New Contact';
    this.loadingSaveLabel = this.saveButton?.dataset.loadingLabel || 'Adding...';
    this.sameAsCheckbox = this.section?.querySelector('[data-same-as-contact]');
    this.firstNameInput = this.section?.querySelector('[data-contact-field="first_name"]');
    this.lastNameInput = this.section?.querySelector('[data-contact-field="last_name"]');
    this.workRequestedInput = this.section?.querySelector('[data-contact-field="work_requested_by"]');
    this.tabs = {
      individual: document.getElementById('individual'),
      entity: document.getElementById('entity'),
    };

    this.contacts = [];
    this.filteredContacts = [];
    this.selectHandler = null;
    this.manualHandler = null;

    this.#bindDropdown();
    this.#bindSameAsContact();
    this.#bindTabs();
  }

  isActive() {
    return document.body?.dataset?.page === 'new-enquiry';
  }

  setContacts(contacts = []) {
    this.contacts = Array.isArray(contacts) ? [...contacts] : [];
    this.#renderFiltered(this.searchInput?.value || '');
  }

  onContactSelected(handler) {
    this.selectHandler = typeof handler === 'function' ? handler : null;
  }

  onManualAdd(handler) {
    this.manualHandler = typeof handler === 'function' ? handler : null;
  }

  onSave(handler) {
    if (!this.saveButton || this._saveListenerBound) return;
    this.saveButton.addEventListener('click', (event) => {
      event.preventDefault();
      if (typeof handler === 'function') handler(this.getFormValues());
    });
    this._saveListenerBound = true;
  }

  populateContact(contact) {
    if (!contact?.fields || !this.section) return;

    Object.entries(contact.fields).forEach(([field, value]) => {
      const input = this.section.querySelector(`[data-contact-field="${field}"]`);
      if (!input) return;
      input.value = value || '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });

    if (this.contactIdInput && contact.fields.contact_id) {
      this.contactIdInput.value = contact.fields.contact_id;
    }

    if (this.searchInput && contact.label) {
      this.searchInput.value = contact.label;
      this.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    this.exitManualMode();
    this.clearFeedback();
    this.#syncWorkRequested();
  }

  showFeedback(message, tone = 'error') {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = message;
    this.feedbackEl.classList.remove('hidden', 'text-rose-600', 'text-emerald-600', 'text-slate-600');
    const toneClass =
      tone === 'success'
        ? 'text-emerald-600'
        : tone === 'info'
        ? 'text-slate-600'
        : 'text-rose-600';
    this.feedbackEl.classList.add(toneClass);
  }

  clearFeedback() {
    if (!this.feedbackEl) return;
    this.feedbackEl.textContent = '';
    this.feedbackEl.classList.add('hidden');
    this.feedbackEl.classList.remove('text-rose-600', 'text-emerald-600', 'text-slate-600');
  }

  enterManualMode() {
    this.clearFeedback();
    this.#closePanel();
    this.showFooter();
    if (this.contactIdInput) this.contactIdInput.value = '';
    if (this.sameAsCheckbox) this.sameAsCheckbox.checked = false;
    this.manualInputs.forEach((input) => {
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    if (this.searchInput) {
      this.searchInput.value = '';
      this.searchInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.searchInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    this.showFeedback('Enter contact details and click Add New Contact.', 'info');
    this.manualInputs?.[0]?.focus?.();
    if (this.workRequestedInput) {
      this.workRequestedInput.value = '';
      this.workRequestedInput.dispatchEvent(new Event('input', { bubbles: true }));
      this.workRequestedInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  exitManualMode() {
    this.hideFooter();
  }

  showFooter() {
    this.saveFooter?.classList.remove('hidden');
  }

  hideFooter() {
    this.saveFooter?.classList.add('hidden');
  }

  setSaving(isSaving) {
    if (!this.saveButton) return;
    const active = Boolean(isSaving);
    this.saveButton.disabled = active;
    this.saveButton.classList.toggle('opacity-70', active);
    this.saveButton.classList.toggle('pointer-events-none', active);
    if (this.saveLabel) {
      this.saveLabel.textContent = active ? this.loadingSaveLabel : this.baseSaveLabel;
    }
    this.saveIcon?.classList.toggle('animate-pulse', active);
  }

  getFormValues() {
    const payload = {};
    const allow = new Set(['first_name', 'last_name', 'email', 'sms_number', 'office_phone']);
    this.manualInputs.forEach((input) => {
      const field = input.dataset.contactField;
      if (!field || field === 'contact_id' || !allow.has(field)) return;
      const value = input.value?.trim();
      if (value) payload[field] = value;
    });
    return payload;
  }

  #bindDropdown() {
    if (!this.searchInput) return;

    this.searchInput.addEventListener('focus', () => {
      this.#openPanel();
      this.#renderFiltered(this.searchInput.value || '');
    });

    this.searchInput.addEventListener('input', (event) => {
      this.#renderFiltered(event.target.value || '');
      this.#openPanel();
    });

    const emailInput = this.manualInputs.find((input) => input.dataset.contactField === 'email');
    if (emailInput) {
      emailInput.addEventListener('blur', () => {
        const value = emailInput.value?.trim();
        if (!value) return;
        const contact = this.contacts.find(
          (entry) => (entry.fields.email || '').toLowerCase() === value.toLowerCase()
        );
        if (contact && this.selectHandler) {
          this.#closePanel();
          this.selectHandler(contact);
        } else if (!contact) {
          this.showFeedback('No matching contact found. Use Add New Contact to create one.', 'info');
        }
      });
    }

    this.resultsContainer?.addEventListener('mousedown', (event) => {
      const button = event.target.closest('button[data-option-index]');
      if (!button) return;
      event.preventDefault();
      const index = Number(button.dataset.optionIndex);
      const contact = this.filteredContacts?.[index];
      if (contact) {
        this.#closePanel();
        if (this.selectHandler) this.selectHandler(contact);
      }
    });

    this.addButton?.addEventListener('click', (event) => {
      event.preventDefault();
      this.enterManualMode();
      if (this.manualHandler) this.manualHandler();
    });

    document.addEventListener('click', (event) => {
      if (!this.searchRoot) return;
      if (!this.searchRoot.contains(event.target)) {
        this.#closePanel();
      }
    });
  }

  #bindSameAsContact() {
    if (!this.sameAsCheckbox) return;

    this.sameAsCheckbox.addEventListener('change', () => this.#syncWorkRequested());
    [this.firstNameInput, this.lastNameInput]
      .filter(Boolean)
      .forEach((input) =>
        input.addEventListener('input', () => this.#syncWorkRequested())
      );
  }

  #bindTabs() {
    const { individual, entity } = this.tabs;
    if (!individual || !entity || !this.sections.individual || !this.sections.entity) return;

    individual.addEventListener('click', (event) => {
      event.preventDefault();
      this.#switchSection('individual');
    });

    entity.addEventListener('click', (event) => {
      event.preventDefault();
      this.#switchSection('entity');
    });

    this.#switchSection('individual');
  }

  #renderFiltered(query = '') {
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
    this.resultsContainer.innerHTML = '';

    if (!items.length) {
      this.resultsContainer.classList.add('hidden');
      this.emptyState?.classList.remove('hidden');
      return;
    }

    this.resultsContainer.classList.remove('hidden');
    this.emptyState?.classList.add('hidden');

    items.forEach((item, index) => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.optionIndex = String(index);
      button.className =
        'flex w-full flex-col gap-1 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50';

      const label = document.createElement('span');
      label.className = 'font-medium text-slate-700';
      label.textContent = item.label || 'Unnamed Contact';
      button.appendChild(label);

      if (item.meta) {
        const meta = document.createElement('span');
        meta.className = 'text-xs text-slate-500';
        meta.textContent = item.meta;
        button.appendChild(meta);
      }

      li.appendChild(button);
      this.resultsContainer.appendChild(li);
    });
  }

  #openPanel() {
    this.panel?.classList.remove('hidden');
  }

  #closePanel() {
    this.panel?.classList.add('hidden');
  }

  #syncWorkRequested() {
    if (!this.workRequestedInput) return;
    if (!this.sameAsCheckbox?.checked) return;

    const first = this.firstNameInput?.value?.trim() || '';
    const last = this.lastNameInput?.value?.trim() || '';
    const full = [first, last].filter(Boolean).join(' ').trim();
    this.workRequestedInput.value = full;
    this.workRequestedInput.dispatchEvent(new Event('input', { bubbles: true }));
    this.workRequestedInput.dispatchEvent(new Event('change', { bubbles: true }));
  }

  #switchSection(type) {
    const targetKey = type === 'entity' ? 'entity' : 'individual';
    const isIndividual = targetKey === 'individual';

    Object.entries(this.sections).forEach(([key, section]) => {
      if (!section) return;
      section.classList.toggle('hidden', key !== targetKey);
    });

    Object.entries(this.tabs).forEach(([key, button]) => {
      if (!button) return;
      const active = key === targetKey;
      button.classList.toggle('bg-blue-700', active);
      button.classList.toggle('text-white', active);
      button.classList.toggle('shadow-sm', active);
      button.classList.toggle('text-slate-500', !active);
    });

    if (isIndividual && this.sections.individual) {
      this.section = this.sections.individual;
    }
    if (!isIndividual) {
      this.#closePanel();
    }
  }
}
