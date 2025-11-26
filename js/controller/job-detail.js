export class JobDetailController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  async init() {
    // Ensure UI wiring runs even if async loads fail
    this.initFlatpickr();
    try {
      await this.setupSearches();
    } catch (err) {
      console.error("JobDetailController init(): search setup failed", err);
    }
    this.onDealInfoButtonClicked();
    this.onEditBtnClicked();
    this.initAutocomplete();
    this.setupSearches();
    this.handlePropertySearch();
  }

  async setupSearches() {
    try {
      const contacts = await this.model.fetchContacts();
      this.view.setupClientSearch(contacts);
    } catch (err) {
      console.error("Failed to load contacts", err);
    }

    try {
      const serviceProviders = await this.model.fetchServiceProviders();
      this.view.setupServiceProviderSearch(serviceProviders);
    } catch (err) {
      console.error("Failed to load service providers", err);
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
    });
  }

  handlePropertySearch() {
    let element = document.querySelector('[data-field="properties"]');
    element.addEventListener("input", () => {
      let value = element.value;
      this.model.fetchProperties(value);
    });
  }
}
