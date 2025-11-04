export class NewEnquiryController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.relatedRequestId = 0;
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
  }

  async #loadContacts() {
    try {
      const contacts = await this.model.loadContacts();
      if (!contacts.length) {
        this.view.showFeedback("No contacts found. Try adding a new one.", "info");
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
      this.view.populateContact(existing);
      this.view.showRelatedLoading();
      this.#loadRelated(existing.fields.email).catch(() => {});
      this.view.showFeedback("Contact already exists. Selected existing contact.", "info");
      return;
    }

    try {
      this.view.setSaving(true);
      const contact = await this.model.createContact(normalized);
      if (!contact) {
        this.view.showFeedback("Unable to save contact right now. Please try again.");
        return;
      }

      this.view.setContacts(this.model.getContacts());
      this.view.populateContact(contact);
      await this.#loadRelated(contact.fields.email);
      this.view.showFeedback("Contact saved and selected.", "success");
    } catch (error) {
      console.error("[NewEnquiry] Failed to create contact", error);
      this.view.showFeedback("Unable to save contact right now. Please try again.");
    } finally {
      this.view.setSaving(false);
    }
  }

  #handleSelection(contact) {
    if (!contact) return;
    this.view.populateContact(contact);
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
      if (this.relatedRequestId !== requestId) return;
      this.view.renderRelated(related);
    } catch (error) {
      console.error('[NewEnquiry] Failed to load related data', error);
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
    ["first_name", "last_name", "email", "sms_number", "office_phone"].forEach((key) => {
      if (result[key]) result[key] = result[key].trim();
    });
    return result;
  }

  #validate(payload) {
    if (!payload.first_name) return "First name is required.";
    if (!payload.email) return "Email is required.";
    return null;
  }
}
