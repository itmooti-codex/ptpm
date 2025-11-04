export class InquiryDetailView {
  constructor() {
    this.uniqueEl = document.querySelector("[data-inquiry-unique]");
    this.sourceEl = document.querySelector("[data-inquiry-source]");
    this.createdEl = document.querySelector("[data-inquiry-created]");
    this.ownerEl = document.querySelector("[data-inquiry-owner]");
    this.enteredEl = document.querySelector("[data-inquiry-entered]");
    this.typeEl = document.querySelector("[data-inquiry-type]");
    this.serviceEl = document.querySelector("[data-inquiry-service]");
    this.requestedEl = document.querySelector("[data-inquiry-requested]");
    this.statusEl = document.querySelector("[data-inquiry-status]");
    this.loadingClass = "opacity-60";
    this.uniquePlaceholder = this.#initialText(this.uniqueEl);
    this.sourcePlaceholder = this.#initialText(this.sourceEl);
    this.createdPlaceholder = this.#initialText(this.createdEl);
    this.ownerPlaceholder = this.#initialText(this.ownerEl);
    this.enteredPlaceholder = this.#initialText(this.enteredEl);
    this.typePlaceholder = this.#initialText(this.typeEl);
    this.servicePlaceholder = this.#initialText(this.serviceEl);
    this.requestedPlaceholder = this.#initialText(this.requestedEl);
    this.statusPlaceholder = this.#initialText(this.statusEl);
  }

  setLoading(isLoading) {
    const active = Boolean(isLoading);
    this.uniqueEl?.classList.toggle(this.loadingClass, active);
    this.sourceEl?.classList.toggle(this.loadingClass, active);
    this.createdEl?.classList.toggle(this.loadingClass, active);
    this.ownerEl?.classList.toggle(this.loadingClass, active);
    this.enteredEl?.classList.toggle(this.loadingClass, active);
    this.typeEl?.classList.toggle(this.loadingClass, active);
    this.serviceEl?.classList.toggle(this.loadingClass, active);
    this.requestedEl?.classList.toggle(this.loadingClass, active);
    this.statusEl?.classList.toggle(this.loadingClass, active);
  }

  renderInquiry(inquiry) {
    const uniqueValue = this.#toText(inquiry?.unique_id);
    if (this.uniqueEl) {
      const formatted =
        uniqueValue && uniqueValue.length
          ? uniqueValue.startsWith("#")
            ? uniqueValue
            : `#${uniqueValue}`
          : this.uniquePlaceholder;
      this.uniqueEl.textContent = formatted;
    }

    const sourceValue = this.#toText(inquiry?.inquiry_source);
    if (this.sourceEl) {
      this.sourceEl.textContent =
        sourceValue && sourceValue.length
          ? sourceValue
          : this.sourcePlaceholder;
    }

    this.#setText(
      this.createdEl,
      this.#formatDateTime(inquiry?.created_at),
      this.createdPlaceholder
    );

    this.#setText(
      this.ownerEl,
      this.#toText(inquiry?.owner_id),
      this.ownerPlaceholder
    );

    this.#setText(
      this.enteredEl,
      this.#toText(inquiry?.primary_contact_id),
      this.enteredPlaceholder
    );

    this.#setText(
      this.typeEl,
      this.#toText(inquiry?.type),
      this.typePlaceholder
    );

    this.#setText(
      this.serviceEl,
      this.#toText(inquiry?.deal_name),
      this.servicePlaceholder
    );

    this.#setText(
      this.requestedEl,
      this.#toText(inquiry?.how_can_we_help),
      this.requestedPlaceholder
    );

    this.#setText(
      this.statusEl,
      this.#toText(inquiry?.inquiry_status),
      this.statusPlaceholder
    );
  }

  #toText(value) {
    if (value === undefined || value === null) return "";
    return String(value).trim();
  }

  #initialText(element) {
    const text = element?.textContent?.trim();
    return text && text.length ? text : "—";
  }

  #setText(element, value, placeholder = "—") {
    if (!element) return;
    const text = value && value.length ? value : placeholder;
    element.textContent = text;
  }

  #formatDateTime(value) {
    const raw = this.#toText(value);
    if (!raw) return "";

    const numeric = Number(raw);
    let date = null;
    if (!Number.isNaN(numeric) && numeric > 0) {
      const millis = numeric > 1e12 ? numeric : numeric * 1000;
      date = new Date(millis);
    } else {
      const normalised =
        /^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T00:00:00` : raw;
      date = new Date(normalised);
    }

    if (!date || Number.isNaN(date.getTime())) return raw;

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }
}
