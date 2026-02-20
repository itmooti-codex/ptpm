import {
  initOperationLoader,
  initCustomModal,
  showLoader,
  hideLoader,
  showUnsavedChangesModal,
  showResetConfirmModal,
  resetFormFields,
  initFileUploadArea,
  ensureFilePreviewModal,
  buildUploadCard,
} from "../helper.js";
import { API_KEY, HTTP_ENDPOINT } from "../../sdk/config.js";

export class JobDetailView {
  constructor(model) {
    this.model = model;
    this._addressAutocompleteReady = false;
    this.feedbackEl = document.querySelector("[data-contact-feedback]");
    this.activeContactType = "individual";
    this.companyList = [];

    // Loader setup for contact modal save flows
    this.loaderCounter = { count: 0 };
    this.loaderElement = initOperationLoader();
    this.loaderMessageEl =
      this.loaderElement?.querySelector("[data-loader-message]") || null;

    // Shared status modal
    const customModal = initCustomModal();
    this.statusModal = customModal.modal;
    this.customModalHeader = customModal.headerEl;
    this.customModalBody = customModal.bodyEl;
    this.customModalIcon = customModal.iconEl;

    this.sidebarCollapsed = true;
    this.jobId = this.#resolveJobId();
    this.editingActivityId = null;
    this.activityRecordsById = new Map();
    this.editingMaterialId = null;
    this.materialRecordsById = new Map();
    this.setupHeaderActionDelegates();
    this.init();
  }

  #resolveJobId() {
    const body = document?.body;
    const fromDataset = body?.dataset?.jobId ?? body?.dataset?.JobId ?? "";
    return (fromDataset || "").toString().trim();
  }

  getJobId() {
    if (!this.jobId) {
      this.jobId = this.#resolveJobId();
    }
    return this.jobId;
  }

  initFlatpickrFor(root) {
    if (!root || typeof window.flatpickr !== "function") return;
    root.querySelectorAll(".date-picker").forEach((input) => {
      if (input._flatpickr) return;
      const isAppointmentDateTimeField =
        input.closest('[data-job-section="job-section-appointment"]') &&
        ["start_time", "end_time"].includes(
          (input.getAttribute("data-field") || "").trim()
        );

      if (isAppointmentDateTimeField) {
        window.flatpickr(input, {
          dateFormat: "d/m/Y H:i",
          enableTime: true,
          time_24hr: true,
          allowInput: true,
        });
        return;
      }

      window.flatpickr(input, { dateFormat: "d/m/Y", allowInput: true });
    });
  }

  async init() {
    this.setupCancelButton();
    this.setupResetButton();
    this.setupSaveDraftButton();

    try {
      this.createDealInformationModal();
      this.CreateQuoteOnBehalfOfServicemanModal();
      this.EditNotes();
      this.createViewJobDocumentsModal();
      this.createActivityListModal();
      this.createWildlifeReportModal();
      await this.createTasksModal();
      await this.createAddActivitiesSection();
      await this.createAddMaterialsSection();
      this.createUploadsSection();
      await this.createInvoiceSection();
      this.setupSectionNavigation();
      this.setupSidebarToggle();
      this.setupContactTypeToggle();
      this.model.fetchContacts((list) => this.setupClientSearch(list || []));
      this.model
        .fetchCompanyById()
        .then((resp) => this.setupCompanySearch(resp?.resp || resp || []));
      this.setupAddButtons();
      this.#createContactDetailsModalUI();
      this.normalizeFormFieldLayout();
      this.setupColorMappedDropdowns();
    } catch (error) {
      console.error("JobDetailView init failed", error);
    }
  }

  getColorMappings() {
    if (this._colorMappings) return this._colorMappings;
    this._colorMappings = {
      priority: [
        { value: "125", label: "Low", color: "#0097a7", backgroundColor: "#cceaed" },
        { value: "124", label: "Medium", color: "#f57c00", backgroundColor: "#fde5cc" },
        { value: "123", label: "High", color: "#d84315", backgroundColor: "#f7d9d0" },
      ],
      activityStatus: [
        { value: "584", label: "Quoted", color: "#8e24aa", backgroundColor: "#e8d3ee" },
        { value: "585", label: "To Be Scheduled", color: "#fb8c00", backgroundColor: "#fee8cc" },
        { value: "606", label: "Reschedule", color: "#ff5722", backgroundColor: "#ffddd3" },
        { value: "166", label: "Scheduled", color: "#00acc1", backgroundColor: "#cceef3" },
        { value: "165", label: "Completed", color: "#43a047", backgroundColor: "#d9ecda" },
        { value: "583", label: "Cancelled", color: "#000000", backgroundColor: "#cccccc" },
      ],
      appointmentStatus: [
        { value: "640", label: "New", color: "#8e24aa", backgroundColor: "#e8d3ee" },
        { value: "639", label: "To Be Scheduled", color: "#fb8c00", backgroundColor: "#fee8cc" },
        { value: "638", label: "Scheduled", color: "#0288d1", backgroundColor: "#cce7f6" },
        { value: "637", label: "Completed", color: "#43a047", backgroundColor: "#d9ecda" },
        { value: "636", label: "Cancelled", color: "#9e9e9e", backgroundColor: "#ececec" },
      ],
      eventColor: [
        { value: "631", label: "1", color: "#a4bdfc", backgroundColor: "#edf2fe" },
        { value: "630", label: "2", color: "#7ae7bf", backgroundColor: "#e4faf2" },
        { value: "629", label: "3", color: "#dbadff", backgroundColor: "#f8efff" },
        { value: "628", label: "4", color: "#ff887c", backgroundColor: "#ffe7e5" },
        { value: "627", label: "5", color: "#fbd75b", backgroundColor: "#fef7de" },
        { value: "626", label: "6", color: "#ffb878", backgroundColor: "#fff1e4" },
        { value: "625", label: "7", color: "#46d6db", backgroundColor: "#daf7f8" },
        { value: "624", label: "8", color: "#e1e1e1", backgroundColor: "#f9f9f9" },
        { value: "623", label: "9", color: "#5484ed", backgroundColor: "#dde6fb" },
        { value: "622", label: "10", color: "#51b749", backgroundColor: "#dcf1db" },
        { value: "621", label: "11", color: "#dc2127", backgroundColor: "#f8d3d4" },
      ],
      xeroInvoiceStatus: [
        { value: "196", label: "Update Invoice", color: "#8e24aa", backgroundColor: "#e8d3ee" },
        { value: "194", label: "Create Invoice", color: "#8e24aa", backgroundColor: "#e8d3ee" },
        { value: "193", label: "Awaiting payment", color: "#fb8c00", backgroundColor: "#fee8cc" },
        { value: "195", label: "Paid", color: "#43a047", backgroundColor: "#d9ecda" },
        { value: "192", label: "Failed", color: "#000000", backgroundColor: "#cccccc" },
      ],
    };
    return this._colorMappings;
  }

  _normalizePaletteKey(value) {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }

  _resolvePaletteEntry(palette = [], value = "", text = "") {
    const valKey = this._normalizePaletteKey(value);
    const textKey = this._normalizePaletteKey(text);
    return (
      palette.find((entry) => this._normalizePaletteKey(entry.value) === valKey) ||
      palette.find((entry) => this._normalizePaletteKey(entry.label) === valKey) ||
      palette.find((entry) => this._normalizePaletteKey(entry.value) === textKey) ||
      palette.find((entry) => this._normalizePaletteKey(entry.label) === textKey) ||
      null
    );
  }

  _setMappedSelectVisualState(select, entry) {
    if (!select) return;
    const wrapper = select.closest(".customDropdDownWrapper");
    if (!entry) {
      select.style.removeProperty("color");
      select.style.removeProperty("background-color");
      if (wrapper) {
        wrapper.style.removeProperty("background-color");
        wrapper.style.removeProperty("border-color");
      }
      return;
    }

    select.style.setProperty("color", entry.color, "important");
    select.style.setProperty("background-color", entry.backgroundColor, "important");
    if (wrapper) {
      wrapper.style.setProperty("background-color", entry.backgroundColor, "important");
      wrapper.style.setProperty("border-color", entry.color, "important");
    }
  }

  _styleMappedSelectOptions(select, palette = []) {
    if (!select) return;
    Array.from(select.options || []).forEach((option) => {
      const entry = this._resolvePaletteEntry(
        palette,
        option.dataset?.rawValue || option.value,
        option.textContent
      );
      if (!entry) return;
      option.style.color = entry.color;
      option.style.backgroundColor = entry.backgroundColor;
    });
  }

  _ensureEventColorOptions() {
    const eventColorSelect = document.querySelector('[data-field="event_color"]');
    if (!eventColorSelect) return;

    const mapping = this.getColorMappings().eventColor;
    const hasValues = Array.from(eventColorSelect.options || []).some(
      (option) => String(option.value || "").trim() !== ""
    );
    const previous = eventColorSelect.value || "";

    if (!hasValues) {
      eventColorSelect.innerHTML = "";
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.disabled = true;
      placeholder.selected = true;
      placeholder.textContent = "Select";
      eventColorSelect.appendChild(placeholder);

      mapping.forEach((item) => {
        const option = document.createElement("option");
        option.value = item.label;
        option.dataset.rawValue = item.value;
        option.textContent = item.label;
        eventColorSelect.appendChild(option);
      });
    }

    if (previous) {
      const match = Array.from(eventColorSelect.options || []).find((opt) => {
        const optionValue = this._normalizePaletteKey(opt.value);
        const optionText = this._normalizePaletteKey(opt.textContent);
        const previousValue = this._normalizePaletteKey(previous);
        return optionValue === previousValue || optionText === previousValue;
      });
      if (match) eventColorSelect.value = match.value;
    }
  }

  setupColorMappedDropdowns() {
    this._ensureEventColorOptions();

    const mappings = [
      {
        selector: '[data-field="priority"]',
        palette: this.getColorMappings().priority,
      },
      {
        selector: '[data-field="status"]',
        scope: '[data-job-section="job-section-appointment"]',
        palette: this.getColorMappings().appointmentStatus,
      },
      {
        selector: '[data-field="activity_status"]',
        scope: '[data-section="add-activities"]',
        palette: this.getColorMappings().activityStatus,
      },
      {
        selector: '[data-field="event_color"]',
        palette: this.getColorMappings().eventColor,
      },
    ];

    mappings.forEach(({ selector, scope, palette }) => {
      const query = scope ? `${scope} ${selector}` : selector;
      const select = document.querySelector(query);
      if (!select) return;

      this._styleMappedSelectOptions(select, palette);

      if (!select.dataset.boundColorMapChange) {
        select.dataset.boundColorMapChange = "true";
        select.addEventListener("change", () => {
          const current = this._resolvePaletteEntry(
            palette,
            select.value,
            select.options?.[select.selectedIndex]?.textContent || ""
          );
          this._setMappedSelectVisualState(select, current);
        });
      }

      const current = this._resolvePaletteEntry(
        palette,
        select.value,
        select.options?.[select.selectedIndex]?.textContent || ""
      );
      this._setMappedSelectVisualState(select, current);
    });
  }

  setupHeaderActionDelegates() {
    if (this._headerActionDelegatesBound) return;
    this._headerActionDelegatesBound = true;

    document.addEventListener("click", async (e) => {
      const actionEl = e.target?.closest?.("[data-nav-action]");
      if (!actionEl) return;

      const action = actionEl.getAttribute("data-nav-action");
      if (action !== "save-draft") return;
      if (e.__saveDraftHandled) return;

      e.preventDefault();
      if (actionEl.dataset.saving === "true") return;
      await this.saveDraft({ triggerEl: actionEl });
    });
  }

  normalizeFormFieldLayout(root = document) {
    if (!root) return;

    const isTextLikeInput = (field) => {
      const type = (field.getAttribute("type") || "text").toLowerCase();
      return ![
        "hidden",
        "checkbox",
        "radio",
        "file",
        "button",
        "submit",
        "reset",
        "image",
        "range",
        "color",
      ].includes(type);
    };

    const getSpacingClass = (el) => {
      if (!el?.classList) return "";
      if (el.classList.contains("mt-3")) return "mt-3";
      if (el.classList.contains("mt-2")) return "mt-2";
      if (el.classList.contains("mt-1")) return "mt-1";
      return "";
    };

    const FIELD_WRAPPER_CLASSES = new Set([
      "customTextInputWrapper",
      "customDateInputWrapper",
      "customDropdDownWrapper",
      "customTextAreaWrapper",
      "customInputTextWrapper",
      "customInputTextWrapperDisabled",
    ]);

    const keepFieldClasses = (el) => {
      const kept = new Set(["w-full"]);
      if (!el?.classList) return kept;
      ["hidden", "date-picker", "flatpickr-input", "pac-target-input"].forEach(
        (cls) => {
          if (el.classList.contains(cls)) kept.add(cls);
        }
      );
      return kept;
    };

    const ensureFieldWrapper = (field, wrapperClass, spacingClass = "") => {
      const parent = field?.parentElement;
      if (!parent) return;

      const parentHasKnownWrapper = [...FIELD_WRAPPER_CLASSES].some((cls) =>
        parent.classList.contains(cls)
      );

      if (parentHasKnownWrapper) {
        [...FIELD_WRAPPER_CLASSES].forEach((cls) => parent.classList.remove(cls));
        parent.classList.remove("mt-1", "mt-2", "mt-3");
        parent.classList.add(wrapperClass);
        if (spacingClass) parent.classList.add(spacingClass);
        return;
      }

      const wrapper = document.createElement("div");
      wrapper.className = spacingClass
        ? `${wrapperClass} ${spacingClass}`
        : wrapperClass;
      parent.insertBefore(wrapper, field);
      wrapper.appendChild(field);
    };

    root.querySelectorAll("input").forEach((input) => {
      if (!isTextLikeInput(input)) return;
      const spacingClass = getSpacingClass(input);
      const classes = [...keepFieldClasses(input)];
      input.className = classes.join(" ");
      if (input.classList.contains("hidden")) return;
      const wrapperClass =
        (input.getAttribute("type") || "").toLowerCase() === "date" ||
        input.classList.contains("date-picker")
          ? "customDateInputWrapper"
          : "customTextInputWrapper";
      ensureFieldWrapper(
        input,
        wrapperClass,
        spacingClass
      );
    });

    root.querySelectorAll("textarea").forEach((textarea) => {
      const spacingClass = getSpacingClass(textarea);
      const classes = [...keepFieldClasses(textarea)];
      textarea.className = classes.join(" ");
      if (textarea.classList.contains("hidden")) return;
      ensureFieldWrapper(
        textarea,
        "customTextAreaWrapper",
        spacingClass
      );
    });

    root.querySelectorAll("select").forEach((select) => {
      const spacingClass = getSpacingClass(select);
      const classes = ["w-full"];
      if (select.classList.contains("hidden")) classes.push("hidden");
      select.className = classes.join(" ");
      if (select.classList.contains("hidden")) return;
      ensureFieldWrapper(select, "customDropdDownWrapper", spacingClass);
    });

    root.querySelectorAll("label").forEach((label) => {
      const forId = label.getAttribute("for");
      const forTarget = forId ? document.getElementById(forId) : null;
      const directField = label.querySelector("input, select, textarea");
      const nextField = label.nextElementSibling?.querySelector?.(
        "input, select, textarea"
      );
      const pointsToField =
        !!directField ||
        !!nextField ||
        !!forTarget ||
        !!label.closest("[data-section='address'], [data-section='postal-address']");

      if (!pointsToField) return;

      const checkboxOrRadioInLabel = label.querySelector(
        'input[type="checkbox"], input[type="radio"]'
      );
      const checkboxOrRadioForTarget =
        forTarget &&
        ["checkbox", "radio"].includes(
          (forTarget.getAttribute("type") || "").toLowerCase()
        );

      if (checkboxOrRadioInLabel || checkboxOrRadioForTarget) return;

      label.classList.add(
        "block",
        "text-xs",
        "font-semibold",
        "uppercase",
        "text-slate-500"
      );
      label.classList.remove(
        "text-sm",
        "font-medium",
        "text-slate-600",
        "text-gray-700"
      );
    });
  }

  async createAddActivitiesSection() {
    // This section stays hidden until the Add Activities tab is shown; rows will be rendered dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "add-activities");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";
    const clientInputClass =
      "mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default";

    wrapper.innerHTML = `
      <div data-section="add-activities" class="w-[440px] bg-white rounded-lg border border-slate-200 p-5 flex flex-col gap-4 shadow-sm hover:!bg-white active:!bg-white hover:!border-slate-200 active:!border-slate-200 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:shadow-sm active:shadow-sm focus:shadow-sm focus-visible:shadow-sm">
        <div class="flex flex-col items-start gap-2">
          <div class="text-neutral-800 text-base font-semibold hover:!text-neutral-800 active:!text-neutral-800 hover:text-neutral-800 active:text-neutral-800 focus:text-neutral-800 focus-visible:text-neutral-800 hover:text-base active:text-base focus:text-base focus-visible:text-base">Add New Activity</div>
        </div>

        <div class="grid grid-cols-2 gap-5">
          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Task</label>
            <div class="relative">
              <select data-field="task" data-activity-select="task" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></select>
              <span class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Options</label>
            <div class="relative">
              <select data-field="option" data-activity-select="option" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></select>
              <span class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Primary Service</label>
            <div class="relative">
              <select data-field="service_name" data-service-role="primary" data-activity-select="service" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></select>
              <span class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>

          <div data-element= "service_name_secondary" class="hidden flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Option Service</label>
            <div class="relative mt-2 customDropdDownWrapper customDropdownWrapper">
              <select data-service-role="option" data-activity-select="service" class="hidden w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></select>
              <span class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Quantity</label>
            <input type="number" data-field="quantity" value="1" class="${clientInputClass}" />
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Activity Price</label>
            <div class="relative">
              <input type="text" data-field="activity_price" placeholder="$ 0.00" class="${clientInputClass} pr-10" />
            </div>
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Activity Status</label>
            <div class="relative">
              <select data-field="activity_status" data-activity-select="status" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                <option value="" disabled selected>Select One</option>
              </select>
              <span class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M6 9l6 6 6-6"></path>
                </svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Date Required</label>
            <div class="relative">
              <input type="text" data-field="date_required" placeholder="dd/mm/yyyy" class="flatpickr-input date-picker ${clientInputClass} pr-10" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:!text-slate-400 active:!text-slate-400 hover:text-slate-400 active:text-slate-400 focus:text-slate-400 focus-visible:text-slate-400">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col col-span-2">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Activity Text</label>
            <textarea data-field="activity_text" data-activity-select="text" rows="2" class="w-full px-3 py-2 bg-white rounded border border-slate-300 text-slate-700 hover:!bg-white active:!bg-white hover:!border-slate-300 active:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></textarea>
          </div>

          <div class="hidden flex flex-col">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Quoted Price</label>
            <div class="relative">
              <input type="text" data-field="quoted_price" placeholder="$ 0.00" class="hidden w-full px-3 py-2 bg-white rounded border border-slate-300 text-slate-700 pr-10 hover:!bg-white active:!bg-white hover:!border-slate-300 active:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:!text-slate-400 active:!text-slate-400 hover:text-slate-400 active:text-slate-400 focus:text-slate-400 focus-visible:text-slate-400">$</span>
            </div>
          </div>

          <div class="hidden flex flex-col col-span-2">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Quoted Text</label>
            <textarea data-field="quoted_text" rows="2" class="hidden w-full px-3 py-2 bg-white rounded border border-slate-300 text-slate-700 hover:!bg-white active:!bg-white hover:!border-slate-300 active:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></textarea>
          </div>

          <div class="flex flex-col col-span-2">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Warranty</label>
            <textarea data-field="warranty" rows="2" class="w-full px-3 py-2 bg-white rounded border border-slate-300 text-slate-700 hover:!bg-white active:!bg-white hover:!border-slate-300 active:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></textarea>
          </div>

          <div class="flex flex-col col-span-2">
            <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Note</label>
            <textarea data-field="note" rows="2" class="w-full px-3 py-2 bg-white rounded border border-slate-300 text-slate-700 hover:!bg-white active:!bg-white hover:!border-slate-300 active:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></textarea>
          </div>

          <div class="col-span-2 flex flex-col gap-2 text-slate-600 text-sm">
            <label class="customCheckboxWrapper flex items-center gap-2 text-slate-600 text-sm hover:!text-slate-600 active:!text-slate-600 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">
              <input type="checkbox" data-field="invoice_to_client" class="customCheckboxInput w-4 h-4 accent-[#0A3E8C] rounded border border-slate-300" checked />
              <span>Invoice to client</span>
            </label>
            <label class="customCheckboxWrapper flex items-center gap-2 text-slate-600 text-sm hover:!text-slate-600 active:!text-slate-600 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">
              <input type="checkbox" data-field="include_in_quote_subtotal" class="customCheckboxInput w-4 h-4 accent-[#0A3E8C] rounded border border-slate-300" checked />
              <span>Include in quote subtotal</span>
            </label>
            <label class="customCheckboxWrapper flex items-center gap-2 text-slate-600 text-sm hover:!text-slate-600 active:!text-slate-600 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">
              <input type="checkbox" data-field="include_in_quote" class="customCheckboxInput w-4 h-4 accent-[#0A3E8C] rounded border border-slate-300" />
              <span>Include in quote</span>
            </label>
          </div>
        </div>

        <div class="flex justify-end items-center gap-3 border-t border-slate-200 pt-3 hover:!border-slate-200 active:!border-slate-200 hover:border-t active:border-t focus:border-t focus-visible:border-t hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200">
          <button id="cancel-activities" class="!text-slate-600 !text-sm !font-medium !px-3 !py-2 !rounded hover:!text-slate-600 active:!text-slate-600 focus:!text-slate-600 focus-visible:!text-slate-600 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Cancel</button>
          <button id="add-activities" class="!text-white !bg-[#003882] !text-sm !font-medium !px-4 !py-2 !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Add</button>
        </div>
      </div>

      <div class="flex-1 bg-white rounded-lg outline outline-1 outline-gray-300 p-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300">
        <div id="addActivitiesTable" class="w-full"></div>
      </div>
    `;

    const replaceable = document.getElementById("replaceable-section");
    if (!replaceable) return;
    replaceable.appendChild(wrapper);
    this.initFlatpickrFor(wrapper);
    const addbutton = document.getElementById("add-activities");
    if (addbutton) {
      addbutton.addEventListener("click", async () => {
        await this.handleAddOrUpdateActivity();
      });
    }
    const cancelBtn = document.getElementById("cancel-activities");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetActivityForm();
      });
    }
    this.editingActivityId = null;
    this.activityRecordsById = new Map();
    this.editingMaterialId = null;
    this.materialRecordsById = new Map();
    const activityStatuses = [
      "Quoted",
      "To Be Scheduled",
      "Reschedule",
      "Scheduled",
      "Completed",
      "Cancelled",
    ];
    const jobs = ["Job 1", "Job 2", "Job 3", "Job 4", "Job 5"];
    const options = ["Option 1", "Option 2", "Option 3", "Option 4", "Option 5"];

    const addOptions = (selectEl, values = [], placeholder = "Select") => {
      if (!selectEl) return;
      selectEl.innerHTML = "";
      const placeholderOption = document.createElement("option");
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      placeholderOption.value = "";
      placeholderOption.textContent = placeholder;
      selectEl.appendChild(placeholderOption);
      values?.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        selectEl.appendChild(opt);
      });
    };

    const selectMap = {
      task: wrapper.querySelector('[data-activity-select="task"]'),
      option: wrapper.querySelector('[data-activity-select="option"]'),
      service: wrapper.querySelector('[data-activity-select="service"]'),
      text: wrapper.querySelector('[data-activity-select="text"]'),
      status: wrapper.querySelector('[data-activity-select="status"]'),
    };

    addOptions(selectMap.task, jobs, "Select");
    addOptions(selectMap.option, options, "Select");
    addOptions(selectMap.status, activityStatuses, "Select");
    if (Array.isArray(this._pendingActivityServices)) {
      const pendingServices = this._pendingActivityServices;
      this._pendingActivityServices = null;
      this.renderAddActivitiesServices(pendingServices);
    }
    await this.renderActivitiesTable();
  }

  normalizeActivityServiceRecord(record = {}) {
    if (!record || typeof record !== "object") return null;
    const id =
      record.ID ??
      record.id ??
      record.serviceid ??
      record.service_id ??
      record.Service_ID;
    const name =
      record.Service_Name ??
      record.service_name ??
      record.name ??
      record.Service_Service_Name ??
      "";
    if (!id || !name) return null;

    const rawType =
      record.Service_Type ??
      record.service_type ??
      record.type ??
      record.ServiceType ??
      "";
    const parentId =
      record.Primary_Service_ID ??
      record.primary_service_id ??
      record.parentId ??
      record.parent_service_id ??
      "";
    const hasParent =
      parentId !== "" && String(parentId) !== String(id);
    const type =
      /option/i.test(String(rawType || "")) || hasParent
        ? "option"
        : "primary";

    return {
      id: String(id),
      name: String(name),
      type,
      parentId: parentId === null || parentId === undefined ? "" : String(parentId),
      price:
        record.Service_Price ??
        record.service_price ??
        record.ServicePrice ??
        record.servicePrice ??
        record.Price ??
        record.price ??
        record.Activity_Price ??
        record.activity_price ??
        "",
      warranty:
        record.Standard_Warranty ??
        record.StandardWarranty ??
        record.standardWarranty ??
        record.standard_warranty ??
        record.Service_Warranty ??
        record.service_warranty ??
        record.Warranty ??
        record.warranty ??
        "",
      description:
        record.Service_Description ??
        record.service_description ??
        record.Description ??
        record.description ??
        record.activity_text ??
        "",
    };
  }

  getSelectedActivityServiceId(selectEl) {
    if (!selectEl) return "";
    const selected = selectEl.selectedOptions?.[0];
    return selected?.dataset?.serviceId || "";
  }

  selectActivityServiceOptionById(selectEl, serviceId) {
    if (!selectEl || !serviceId) return false;
    let found = false;
    const normalizedId = String(serviceId);
    Array.from(selectEl.options || []).forEach((option) => {
      const isMatch = String(option.dataset.serviceId || "") === normalizedId;
      option.selected = isMatch;
      if (isMatch) found = true;
    });
    return found;
  }

  renderAddActivitiesServices(data) {
    const normalizedServices = (Array.isArray(data) ? data : [])
      .map((item) => this.normalizeActivityServiceRecord(item))
      .filter(Boolean);
    this.activitiesServices = normalizedServices;

    const primarySelect = document.querySelector(
      '[data-section="add-activities"] [data-service-role="primary"]'
    );
    const optionWrapper = document.querySelector(
      '[data-element="service_name_secondary"]'
    );
    const optionSelect = document.querySelector(
      '[data-element="service_name_secondary"] [data-service-role="option"]'
    );
    const activityPrice = document.querySelector(
      '[data-section="add-activities"] [data-field="activity_price"]'
    );
    const warranty = document.querySelector(
      '[data-section="add-activities"] [data-field="warranty"]'
    );
    const activityText = document.querySelector(
      '[data-section="add-activities"] [data-field="activity_text"]'
    );
    if (
      !primarySelect ||
      !optionWrapper ||
      !optionSelect ||
      !activityPrice ||
      !warranty ||
      !activityText
    ) {
      this._pendingActivityServices = normalizedServices;
      return;
    }

    let serviceIdInput = document.querySelector(
      '[data-section="add-activities"] [data-field="service_id"]'
    );
    if (!serviceIdInput) {
      serviceIdInput = document.createElement("input");
      serviceIdInput.type = "hidden";
      serviceIdInput.setAttribute("data-field", "service_id");
      primarySelect.parentElement?.appendChild(serviceIdInput);
    }

    const primaryServices = normalizedServices.filter(
      (item) => item.type === "primary"
    );
    const optionServices = normalizedServices.filter(
      (item) => item.type === "option" && item.parentId
    );
    const optionMap = new Map();
    optionServices.forEach((item) => {
      if (!optionMap.has(item.parentId)) optionMap.set(item.parentId, []);
      optionMap.get(item.parentId).push(item);
    });

    const renderServiceOptions = (selectEl, services = []) => {
      selectEl.innerHTML =
        '<option value="" disabled selected hidden>Select</option>';
      services.forEach((service) => {
        const option = document.createElement("option");
        option.value = service.name;
        option.dataset.serviceId = service.id;
        option.textContent = service.name;
        selectEl.appendChild(option);
      });
    };

    const clearPrefillFields = () => {
      activityPrice.value = "";
      warranty.value = "";
      activityText.value = "";
      serviceIdInput.value = "";
    };

    const applyServicePrefill = (service) => {
      if (!service) {
        clearPrefillFields();
        return;
      }
      serviceIdInput.value = service.id || "";
      activityPrice.value = service.price ?? "";
      warranty.value = service.warranty ?? "";
      activityText.value = service.description ?? "";
    };

    renderServiceOptions(primarySelect, primaryServices);
    optionWrapper.classList.add("hidden");
    optionSelect.classList.add("hidden");
    renderServiceOptions(optionSelect, []);

    optionSelect.onchange = () => {
      const selectedId = this.getSelectedActivityServiceId(optionSelect);
      const selected = optionServices.find((item) => item.id === selectedId);
      applyServicePrefill(selected);
    };

    primarySelect.onchange = () => {
      clearPrefillFields();
      optionWrapper.classList.add("hidden");
      optionSelect.classList.add("hidden");
      renderServiceOptions(optionSelect, []);

      const primaryId = this.getSelectedActivityServiceId(primarySelect);
      const selectedPrimary = primaryServices.find((item) => item.id === primaryId);
      if (!selectedPrimary) return;

      const secondaryOptions = optionMap.get(selectedPrimary.id) || [];
      if (secondaryOptions.length) {
        optionWrapper.classList.remove("hidden");
        optionSelect.classList.remove("hidden");
        renderServiceOptions(optionSelect, secondaryOptions);
        // Match inquiry-details behavior: when options exist, preselect the first option.
        this.selectActivityServiceOptionById(optionSelect, secondaryOptions[0].id);
        applyServicePrefill(secondaryOptions[0]);
        return;
      }

      applyServicePrefill(selectedPrimary);
    };
  }

  async createAddMaterialsSection() {
    // Hidden container for Materials tab content; table rows to be injected dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "add-materials");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";
    const clientInputClass =
      "mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default";

    wrapper.innerHTML = `<div
        data-section="add-materials"
        class="w-full h-full flex flex-row gap-4 p-4 bg-gray-50 hover:!bg-gray-50 active:!bg-gray-50 hover:bg-gray-50 active:bg-gray-50 focus:bg-gray-50 focus-visible:bg-gray-50"
      >
        <div class="flex flex-col gap-5">
          <div
            class="w-[440px] bg-white rounded-lg outline outline-1 outline-gray-300 p-4 flex flex-col gap-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300"
          >
            <div class="text-neutral-700 text-base font-semibold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-base active:text-base focus:text-base focus-visible:text-base">Add Materials</div>

            <div class="flex flex-col gap-5">
              <div class="flex flex-col">
                <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 "
                  >Material Name</label
                >
                <input
                  type="text"
                  data-field="material_name"
                  placeholder="Enter material name"
                  class="${clientInputClass}"
                />
              </div>

              <div class="flex flex-col">
                <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Total</label>
                <div class="relative">
                  <input
                    placeholder="$"
                    type="text"
                    data-field="total"
                    class="${clientInputClass} pr-10"
                  />
                </div>
              </div>

              <div class="flex flex-col">
                <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 "
                  >Description</label
                >
                <textarea
                  data-field="description"
                  rows="2"
                  class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"
                ></textarea>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div class="flex flex-col">
                  <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 "
                    >Transaction Type</label
                  >
                  <div class="relative">
                    <select
                      data-field="transaction_type"
                      class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"
                    >
                      <option disabled="" value="">Select one</option>
                      <option value="Reimburse">Reimburse</option>
                      <option value="Deduct">Deduct</option>
                    </select>
                    <span
                      class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </span>
                  </div>
                </div>
                <div class="flex flex-col">
                  <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Tax</label>
                  <div class="relative">
                    <select
                      data-field="tax"
                      class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"
                    >
                      <option disabled="" value="">Select one</option>
                      <option value="exemptexpenses">Exemptexpenses</option>
                      <option value="input">Input</option>
                    </select>
                    <span
                      class="pointer-events-none absolute inset-y-0 right-4 inline-flex items-center text-slate-400 mt-2"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M6 9l6 6 6-6"></path>
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
              <div class="flex flex-col">
                <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Receipt</label>
                <div class="flex flex-col gap-2">
                  <div
                    data-material-receipt-trigger
                    class="cursor-pointer w-full h-20 border border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-sky-700 text-sm text-center px-4 hover:!border-gray-300 active:!border-gray-300 hover:!bg-gray-50 active:!bg-gray-50 hover:!text-sky-700 active:!text-sky-700 hover:border active:border focus:border focus-visible:border hover:border-dashed active:border-dashed focus:border-dashed focus-visible:border-dashed hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:bg-gray-50 active:bg-gray-50 focus:bg-gray-50 focus-visible:bg-gray-50 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700  hover:text-center active:text-center focus:text-center focus-visible:text-center"
                  >
                    <span class="font-medium text-sky-900 hover:!text-sky-900 active:!text-sky-900 hover:text-sky-900 active:text-sky-900 focus:text-sky-900 focus-visible:text-sky-900"
                      >Click to upload receipt</span
                    >
                  </div>
                  <input
                    type="file"
                    multiple
                    class="hidden"
                    data-material-receipt-input
                  />
                  <div class="hidden" data-material-receipts></div>
                </div>
              </div>
              <div class="flex flex-col">
                <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 "
                  >Service Provider</label
                >
                <div class="relative" data-material-sp-search="root">
                  <input
                    type="text"
                    placeholder="Search by name, phone"
                    class="${clientInputClass}"
                    data-material-sp-search="input"
                  />
                  <input
                    type="hidden"
                    data-field="service_provider_id"
                    data-material-sp-field="id"
                  />
                  <button
                    type="button"
                    class="mt-2 absolute inset-y-0 right-3 inline-flex items-center rounded-md px-2 text-slate-400 focus:text-slate-400 focus-visible:text-slate-400"
                    aria-label="Search service provider"
                  >
                    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16.3311 15.5156L12.7242 11.9095C13.7696 10.6544 14.2909 9.04453 14.1797 7.41486C14.0684 5.7852 13.3331 4.26116 12.1268 3.15979C10.9205 2.05843 9.33603 1.46453 7.70299 1.50164C6.06995 1.53875 4.51409 2.20402 3.35906 3.35906C2.20402 4.51409 1.53875 6.06995 1.50164 7.70299C1.46453 9.33603 2.05843 10.9205 3.15979 12.1268C4.26116 13.3331 5.7852 14.0684 7.41486 14.1797C9.04453 14.2909 10.6544 13.7696 11.9095 12.7242L15.5156 16.3311C15.5692 16.3847 15.6328 16.4271 15.7027 16.4561C15.7727 16.4851 15.8477 16.5 15.9234 16.5C15.9991 16.5 16.0741 16.4851 16.144 16.4561C16.214 16.4271 16.2776 16.3847 16.3311 16.3311C16.3847 16.2776 16.4271 16.214 16.4561 16.144C16.4851 16.0741 16.5 15.9991 16.5 15.9234C16.5 15.8477 16.4851 15.7727 16.4561 15.7027C16.4271 15.6328 16.3847 15.5692 16.3311 15.5156ZM2.66852 7.8552C2.66852 6.82937 2.97271 5.82658 3.54263 4.97364C4.11255 4.12069 4.9226 3.4559 5.87035 3.06333C6.81809 2.67076 7.86096 2.56805 8.86708 2.76818C9.87319 2.96831 10.7974 3.46229 11.5227 4.18766C12.2481 4.91303 12.7421 5.83721 12.9422 6.84333C13.1424 7.84945 13.0396 8.89232 12.6471 9.84006C12.2545 10.7878 11.5897 11.5979 10.7368 12.1678C9.88383 12.7377 8.88103 13.0419 7.8552 13.0419C6.48008 13.0404 5.16171 12.4934 4.18935 11.5211C3.21699 10.5487 2.67004 9.23033 2.66852 7.8552Z" fill="#78829D"></path>
                    </svg>
                  </button>
                  <div
                    data-material-sp-search="results"
                    class="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow hidden max-h-64 overflow-y-auto z-20 hover:!bg-white active:!bg-white hover:!border-gray-200 active:!border-gray-200 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:border active:border focus:border focus-visible:border hover:border-gray-200 active:border-gray-200 focus:border-gray-200 focus-visible:border-gray-200 hover:shadow active:shadow focus:shadow focus-visible:shadow"
                  ></div>
                </div>
              </div>

              <div class="flex flex-col gap-3 pt-2">
                <div
                  class="flex justify-end items-center gap-3 border-t border-gray-300 mt-6 mb-4 py-2 hover:!border-gray-300 active:!border-gray-300 hover:border-t active:border-t focus:border-t focus-visible:border-t hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300"
                >
                  <button
                    id="cancel-material-btn"
                    class="!text-sky-700 !text-sm !font-medium !px-3 !py-2 !rounded hover:!text-sky-700 active:!text-sky-700 focus:!text-sky-700 focus-visible:!text-sky-700 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    id="add-material-btn"
                    class="!text-white !bg-[#003882] !text-sm !font-medium !px-4 !py-2 !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="flex-1 bg-white rounded-lg outline outline-1 outline-gray-300 p-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300"
        >
          <div id="addMaterialsTable" class="w-full"></div>
        </div>
      </div>

  `;

    document.getElementById("replaceable-section").appendChild(wrapper);
    this.initFlatpickrFor(wrapper);

    this.materialUploadHandler = initFileUploadArea({
      triggerEl: wrapper.querySelector("[data-material-receipt-trigger]"),
      inputEl: wrapper.querySelector("[data-material-receipt-input]"),
      listEl: wrapper.querySelector("[data-material-receipts]"),
      nameEl: wrapper.querySelector("[data-material-receipt-filename]"),
      previewBtn: wrapper.querySelector("[data-material-receipt-preview]"),
      removeBtn: wrapper.querySelector("[data-material-receipt-remove]"),
      uploadPath: "materials/receipts",
      loaderElement: this.loaderElement,
      loaderMessageEl: this.loaderMessageEl,
      loaderCounter: this.loaderCounter,
      acceptRegex: /^(image\/|application\/pdf)/,
      multiple: true,
      replaceExisting: true,
      renderItem: (meta) => {
        const previewModal = ensureFilePreviewModal();
        const card = buildUploadCard(meta, {
          onView: () => {
            const type = meta.type || "";
            const src = meta.url?.startsWith("http")
              ? meta.url
              : `data:${type || "application/octet-stream"};base64,${meta.url}`;
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
        card.classList.remove("hidden");
        wrapper
          .querySelector("[data-material-receipts]")
          ?.classList.remove("hidden");
        return card;
      },
    });

    const taxTypes = ["Exemptexpenses", "input"];
    const transactionTypes = ["Reimburse", "Deduct"];
    const materialStatuses = [
      "New",
      "In Progress",
      "Pending Payment",
      "Assigned to Job",
      "Paid",
    ];

    const addOptions = (selectEl, values = [], placeholder = "Select one") => {
      if (!selectEl) return;
      selectEl.innerHTML = "";
      const placeholderOption = document.createElement("option");
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      placeholderOption.value = "";
      placeholderOption.textContent = placeholder;
      selectEl.appendChild(placeholderOption);
      values?.forEach((val) => {
        const opt = document.createElement("option");
        opt.value = val;
        opt.textContent = val;
        selectEl.appendChild(opt);
      });
    };

    addOptions(
      wrapper.querySelector('[data-field="transaction_type"]'),
      transactionTypes
    );
    addOptions(wrapper.querySelector('[data-field="tax"]'), taxTypes);
    addOptions(
      wrapper.querySelector('[data-field="status"]'),
      materialStatuses
    );
    this.initMaterialServiceProviderSearch(wrapper);

    const addMaterialsBtn = document.getElementById("add-material-btn");
    if (addMaterialsBtn) {
      addMaterialsBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        await this.handleAddMaterials();
      });
    }
    const cancelMaterialBtn = document.getElementById("cancel-material-btn");
    if (cancelMaterialBtn) {
      cancelMaterialBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetMaterialForm();
      });
    }
    await this.renderMaterialsTable();
  }

  createUploadsSection() {
    // Hidden container for Uploads tab; content to be populated dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "uploads");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="w-[440px] h-fit bg-white rounded-lg outline outline-1 outline-gray-300 p-4 flex flex-col gap-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300">
        <div class="text-neutral-700 text-base font-semibold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-base active:text-base focus:text-base focus-visible:text-base">Uploads</div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <div
              data-upload-trigger
              class="relative cursor-pointer w-full flex flex-col h-24 border border-dashed border-gray-300 rounded bg-gray-50 items-center justify-center text-sky-700 text-sm hover:!border-gray-300 active:!border-gray-300 hover:!bg-gray-50 active:!bg-gray-50 hover:!text-sky-700 active:!text-sky-700 hover:border active:border focus:border focus-visible:border hover:border-dashed active:border-dashed focus:border-dashed focus-visible:border-dashed hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:bg-gray-50 active:bg-gray-50 focus:bg-gray-50 focus-visible:bg-gray-50 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 "
            >
              <span class="text-sky-900 text-sm font-medium leading-4 hover:!text-sky-900 active:!text-sky-900 hover:text-sky-900 active:text-sky-900 focus:text-sky-900 focus-visible:text-sky-900 "
                >Click to upload</span
              >
              <span class="text-neutral-700 text-sm font-normal leading-5 hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 "
                >or drag and drop</span
              >
            </div>
            <input type="file" data-field="upload-file" class="hidden" multiple />
            <p
              class="text-center justify-start text-slate-500 text-xs font-normal leading-3 hover:!text-slate-500 active:!text-slate-500 hover:text-center active:text-center focus:text-center focus-visible:text-center hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs"
            >
              Upload photos or files from your device
            </p>
            <div class="flex flex-col gap-2 p-2" data-section="images-uploads"></div>
          </div>
        </div>
        <div class="flex justify-end items-center gap-3">
          <button data-upload-cancel class="hidden !text-sky-700 !text-sm !font-medium !px-3 !py-2 !rounded hover:!text-sky-700 active:!text-sky-700 focus:!text-sky-700 focus-visible:!text-sky-700 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Cancel</button>
          <button id="add-images-btn" class="!text-white !bg-[#003882] !text-sm !font-medium !px-4 !py-2 !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Add</button>
        </div>
      </div>
      <div class="flex-1 h-fit p-4 rounded-lg overflow-auto">
        <div class="text-slate-800 text-base font-semibold mb-3 hover:!text-slate-800 active:!text-slate-800 hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800 hover:text-base active:text-base focus:text-base focus-visible:text-base">Existing uploads</div>
        <div class="flex flex-col gap-2" data-section="existing-uploads"></div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
    this.uploadPreviewModal = ensureFilePreviewModal();

    const uploadResult = wrapper.querySelector(
      '[data-section="images-uploads"]'
    );
    this.uploadListEl = uploadResult;
    this.existingUploadsEl = wrapper.querySelector(
      '[data-section="existing-uploads"]'
    );
    const uploadSection = wrapper.querySelector('[data-field="upload-file"]');
    const uploadTrigger =
      wrapper.querySelector("[data-upload-trigger]") ||
      uploadSection?.parentElement;

    this.uploadsHandler = initFileUploadArea({
      triggerEl: uploadTrigger,
      inputEl: uploadSection,
      listEl: uploadResult,
      nameEl: null,
      previewBtn: null,
      removeBtn: null,
      uploadPath: "uploads",
      loaderElement: this.loaderElement,
      loaderMessageEl: this.loaderMessageEl,
      loaderCounter: this.loaderCounter,
      acceptRegex: /.*/,
      multiple: true,
      replaceExisting: false,
      uploadResolver: async (file, uploadPath) =>
        this.uploadFileForDirectJob(file, uploadPath),
      renderItem: (meta) => {
        const card = buildUploadCard(meta, {
          onView: () => {
            const type = meta.type || "";
            const src = meta.url?.startsWith("http")
              ? meta.url
              : `data:${type || "application/octet-stream"};base64,${meta.url}`;
            this.uploadPreviewModal.show({
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
        card.setAttribute("data-file-size", String(meta.file?.size || ""));
        return card;
      },
    });

    const cancelBtn = wrapper.querySelector("[data-upload-cancel]");
    const refreshUploadCancelVisibility = () => {
      if (!cancelBtn) return;
      const hasLoadedFiles =
        uploadResult.querySelectorAll("[data-upload-url]").length > 0;
      cancelBtn.classList.toggle("hidden", !hasLoadedFiles);
    };
    const uploadListObserver = new MutationObserver(() => {
      refreshUploadCancelVisibility();
    });
    uploadListObserver.observe(uploadResult, { childList: true, subtree: false });
    refreshUploadCancelVisibility();

    cancelBtn?.addEventListener("click", () => {
      uploadResult.innerHTML = "";
      if (uploadSection) uploadSection.value = "";
      refreshUploadCancelVisibility();
    });

    const addBtn = document.getElementById("add-images-btn");
    addBtn?.addEventListener("click", async () => {
      const uploadNodes = Array.from(
        uploadResult.querySelectorAll("[data-upload-url]")
      );
      const jobId = this.getJobId() || "";
      const context = this.getUploadContextData();

      if (!uploadNodes.length) {
        this.handleFailure("Please upload at least one file.");
        return;
      }
      if (!jobId) {
        this.handleFailure("Missing job id. Reload and try again.");
        return;
      }

      const payloads = uploadNodes
        .map((item) => this.buildUploadPayloadFromNode(item, jobId, context))
        .filter(Boolean);
      if (!payloads.length) {
        this.handleFailure("No valid uploads found. Please re-upload and try again.");
        return;
      }

      this.startLoading("Saving uploads...");
      try {
        await this.model.createUploads(payloads);
        uploadResult.innerHTML = "";
        if (uploadSection) uploadSection.value = "";
        refreshUploadCancelVisibility();
        await this.reloadExistingUploads();
        this.handleSuccess("Uploads saved successfully.");
      } catch (error) {
        console.error("Failed to save uploads", error);
        this.handleFailure("Failed to save uploads. Please try again.");
      } finally {
        this.stopLoading();
      }
    });
  }

  async requestUploadUrlForDirectJob(file, uploadPath = "uploads") {
    const safePath = String(uploadPath || "uploads").replace(
      /^[\\/]+|[\\/]+$/g,
      ""
    );
    const fileName = file?.name || "upload";
    const scopedName = safePath ? `${safePath}/${fileName}` : fileName;

    const response = await fetch(`${HTTP_ENDPOINT}/api/v1/rest/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: JSON.stringify([
        {
          type: file?.type || "application/octet-stream",
          name: scopedName,
          generateName: true,
        },
      ]),
    });

    if (!response.ok) {
      throw new Error("Unable to request upload URL.");
    }

    const payload = await response.json().catch(() => null);
    const result = Array.isArray(payload) ? payload[0] : payload;
    if (result?.statusCode && result.statusCode !== 200) {
      throw new Error("Upload endpoint rejected the request.");
    }

    const data = result?.data || result || {};
    if (!data?.uploadUrl || !data?.url) {
      throw new Error("Invalid upload response.");
    }
    return data;
  }

  async uploadFileForDirectJob(file, uploadPath = "uploads") {
    const signed = await this.requestUploadUrlForDirectJob(file, uploadPath);
    const uploadResponse = await fetch(signed.uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file?.type || "application/octet-stream",
      },
    });
    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file.");
    }
    return signed.url;
  }

  getUploadContextData() {
    const contactType = String(
      document.querySelector('[data-field="contact_type"]')?.value ||
        this.activeContactType ||
        "individual"
    ).toLowerCase();

    const individualId =
      document.querySelector('[data-field="client_id"]')?.value?.trim() ||
      document
        .querySelector('[data-contact-field="contact_id"]')
        ?.value?.trim() ||
      "";
    const companyId =
      document.querySelector('[data-field="company_id"]')?.value?.trim() ||
      document.querySelector('[data-entity-id="entity-id"]')?.value?.trim() ||
      "";
    const propertyNameId =
      document.querySelector('[data-field="property_id"]')?.value?.trim() || "";
    const inquiryId =
      document.querySelector('[data-field="inquiry_id"]')?.value?.trim() ||
      document.body?.dataset?.inquiryId ||
      "";

    return {
      contactType,
      customerId: contactType === "entity" ? "" : individualId,
      companyId: contactType === "entity" ? companyId : "",
      propertyNameId,
      inquiryId,
    };
  }

  inferUploadType(fileType = "", fileName = "") {
    if (this.isImageFileType(fileType, fileName)) return "Photo";
    if (this.isFormFileType(fileType, fileName)) return "Form";
    return "File";
  }

  isImageFileType(fileType = "", fileName = "") {
    const normalizedType = String(fileType || "").toLowerCase();
    if (normalizedType.startsWith("image/")) return true;
    const lowerName = String(fileName || "").toLowerCase();
    return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/.test(lowerName);
  }

  isFormFileType(fileType = "", fileName = "") {
    const normalizedType = String(fileType || "").toLowerCase();
    const lowerName = String(fileName || "").toLowerCase();
    if (
      /(pdf|msword|officedocument|excel|spreadsheet|rtf|text\/plain|csv|json)/.test(
        normalizedType
      )
    ) {
      return true;
    }
    return /\.(pdf|doc|docx|xls|xlsx|csv|txt|rtf|odt|ods|json)$/.test(
      lowerName
    );
  }

  buildUploadPayloadFromNode(node, jobId, context = {}) {
    const uploadUrl = node.getAttribute("data-upload-url") || "";
    if (!uploadUrl) return null;

    const fileType = node.getAttribute("file-type") || "";
    const fileName = node.getAttribute("data-file-name") || "Upload";
    const sizeRaw = node.getAttribute("data-file-size") || "";
    const sizeValue = Number(sizeRaw);
    const fileSize = Number.isFinite(sizeValue) && sizeValue > 0 ? sizeValue : "";

    const type = this.inferUploadType(fileType, fileName);
    const isPhoto = type === "Photo";

    return {
      photo_upload: isPhoto ? uploadUrl : "",
      file_upload: isPhoto
        ? ""
        : {
            link: uploadUrl,
            name: fileName || "",
            size: fileSize,
            type: fileType || "",
          },
      job_id: jobId || "",
      type,
      customer_id: context.customerId || "",
      company_id: context.companyId || "",
      property_name_id: context.propertyNameId || "",
      file_name: isPhoto ? "" : fileName || "",
      photo_name: isPhoto ? fileName || "" : "",
      inquiry_id: context.inquiryId || "",
    };
  }

  parseJsonSafe(value) {
    if (typeof value !== "string") return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  extractNameFromUrl(url = "") {
    if (!url) return "";
    try {
      const clean = String(url).split("?")[0];
      const parts = clean.split("/");
      return decodeURIComponent(parts[parts.length - 1] || "");
    } catch {
      return "";
    }
  }

  getFileUploadObject(raw = null) {
    if (!raw) return null;
    if (Array.isArray(raw)) {
      for (const item of raw) {
        const next = this.getFileUploadObject(item);
        if (next) return next;
      }
      return null;
    }
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return this.getFileUploadObject(this.parseJsonSafe(trimmed));
      }
      if (/^https?:\/\//i.test(trimmed)) {
        return { link: trimmed, name: this.extractNameFromUrl(trimmed) };
      }
      return null;
    }
    if (typeof raw === "object") {
      if (raw.File) {
        const nested = this.getFileUploadObject(raw.File);
        if (nested) return nested;
      }
      const link = raw.link || raw.url || raw.path || raw.src || "";
      if (!link) return null;
      return {
        link,
        name: raw.name || raw.filename || this.extractNameFromUrl(link),
        type: raw.type || raw.mime || "",
      };
    }
    return null;
  }

  resolveExistingUploadMeta(item = {}) {
    const id = item.id || item.ID || "";
    const photoUpload = item.photo_upload || item.Photo_Upload || "";
    const fileUploadRaw = item.file_upload || item.File_Upload || "";
    const fileUploadObj = this.getFileUploadObject(fileUploadRaw);
    const fileUploadUrl = fileUploadObj?.link || "";

    const url = photoUpload || fileUploadUrl || "";
    const typeValue = item.type || item.Type || "";
    const photoName = item.photo_name || item.Photo_Name || "";
    const fileName = item.file_name || item.File_Name || fileUploadObj?.name || "";

    const isPhoto =
      !!photoUpload ||
      /photo/i.test(String(typeValue || "")) ||
      this.isImageFileType(fileUploadObj?.type || "", fileName || url);

    return {
      id,
      url,
      isPhoto,
      name:
        (isPhoto ? photoName : fileName) ||
        this.extractNameFromUrl(url) ||
        "Upload",
      fileType: fileUploadObj?.type || "",
      typeValue,
    };
  }

  async reloadExistingUploads() {
    const jobId = this.getJobId();
    if (!jobId) return;
    await this.model.fetchUploads(jobId, (items) => this.renderExistingUploads(items));
  }

  renderExistingUploads(items = []) {
    if (!this.existingUploadsEl) {
      this.existingUploadsEl = document.querySelector(
        '[data-section="existing-uploads"]'
      );
    }
    if (!this.existingUploadsEl) return;

    this.existingUploadsEl.innerHTML = "";
    if (!Array.isArray(items) || !items.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-slate-600";
      empty.textContent = "No uploads yet.";
      this.existingUploadsEl.appendChild(empty);
      return;
    }

    const frag = document.createDocumentFragment();
    items.forEach((item) => {
      const meta = this.resolveExistingUploadMeta(item);
      if (!meta.url) return;

      const card = document.createElement("div");
      card.className =
        "flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2 shadow-sm border border-slate-100";
      card.setAttribute("data-upload-url", meta.url);
      card.setAttribute("data-file-name", meta.name || "Upload");
      card.setAttribute("file-type", meta.fileType || meta.typeValue || "");

      const thumb = document.createElement("div");
      thumb.className =
        "h-10 w-10 rounded bg-white border border-slate-200 flex items-center justify-center overflow-hidden";
      const resolvedSrc =
        meta.url &&
        (meta.url.startsWith("http") || meta.url.startsWith("data:"))
          ? meta.url
          : meta.url
          ? `data:application/octet-stream;base64,${meta.url}`
          : "";

      if (resolvedSrc) {
        if (meta.isPhoto) {
          // IMAGE
          const img = document.createElement("img");
          img.src = resolvedSrc;
          img.alt = meta.name || "Photo";
          img.className = "h-full w-full object-cover";
          thumb.appendChild(img);
        } else {
          // FILE (PDF / other)
          const file = document.createElement("div");
          file.className =
            "flex h-full w-full items-center justify-center bg-slate-50 text-xs font-medium text-slate-600";
          file.textContent = "FILE";
          thumb.appendChild(file);
        }
      } else {
        thumb.textContent = "—";
        thumb.classList.add("text-slate-400", "text-xs");
      }

      const name = document.createElement("div");
      name.className = "flex-1 text-sm text-slate-700";
      name.textContent = meta.name || "Upload";

      const actions = document.createElement("div");
      actions.className = "flex items-center gap-3 text-sky-700";

      const viewBtn = document.createElement("button");
      viewBtn.type = "button";
      viewBtn.className =
        "!text-sky-700 hover:!text-sky-700 active:!text-sky-700 focus:!text-sky-700 focus-visible:!text-sky-700";
      viewBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7Zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10Zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/>
        </svg>
      `;
      viewBtn.addEventListener("click", () => {
        if (!resolvedSrc) return;
        if (!meta.isPhoto && !/pdf/i.test(meta.fileType || meta.name || "")) {
          window.open(resolvedSrc, "_blank", "noopener,noreferrer");
          return;
        }
        const src = resolvedSrc;
        this.uploadPreviewModal?.show?.({
          src,
          name: meta.name || "Preview",
          type: meta.fileType || "",
        });
      });

      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className =
        "!text-blue-700 hover:!text-blue-700 active:!text-blue-700 focus:!text-blue-700 focus-visible:!text-blue-700";
      deleteBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 3h6a1 1 0 0 1 1 1v1h4v2h-1v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7H4V5h4V4a1 1 0 0 1 1-1Zm6 3V5H9v1h6Zm-7 2v10h2V8H8Zm4 0v10h2V8h-2Z"/>
        </svg>
      `;
      deleteBtn.addEventListener("click", async () => {
        if (!meta.id) return;
        await this.confirmAndDelete(async () => {
          showLoader(
            this.loaderElement,
            this.loaderMessageEl,
            this.loaderCounter,
            "Deleting upload..."
          );
          try {
            await this.model.deleteUpload(meta.id);
            await this.reloadExistingUploads();
          } finally {
            hideLoader(this.loaderElement, this.loaderCounter);
          }
        });
      });

      actions.appendChild(viewBtn);
      actions.appendChild(deleteBtn);

      card.appendChild(thumb);
      card.appendChild(name);
      card.appendChild(actions);
      frag.appendChild(card);
    });

    this.existingUploadsEl.appendChild(frag);
  }

  async createInvoiceSection() {
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "invoice");
    wrapper.className =
      "hidden w-[95vw] h-screen flex flex-col gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="bg-white rounded-lg outline outline-1 outline-gray-300 w-full hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300">
        <div class="h-2 bg-[#003882] rounded-t-lg hover:!bg-[#003882] active:!bg-[#003882] hover:bg-[#003882] active:bg-[#003882] focus:bg-[#003882] focus-visible:bg-[#003882]"></div>

        <div class="p-4 flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <div class="flex flex-col gap-1">
              <div class="text-neutral-700 text-base font-semibold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-base active:text-base focus:text-base focus-visible:text-base">Invoice Detail</div>
              <div class="flex gap-2 text-sm text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">
                Invoice Number:
                <p data-field="invoice_number" class="text-sky-700 font-medium underline-offset-2 hover:!underline hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 hover:underline-offset-2 active:underline-offset-2 focus:underline-offset-2 focus-visible:underline-offset-2">--</p>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-neutral-700 text-sm hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Xero Invoice Status:</div>
              <div class="px-3 py-1 rounded-full bg-slate-100 text-neutral-700 text-xs font-semibold hover:!bg-slate-100 active:!bg-slate-100 hover:!text-neutral-700 active:!text-neutral-700 hover:bg-slate-100 active:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs" data-field="xero_invoice_status">Create Invoice</div>
            </div>
          </div>

          <div class="hidden grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div class="flex flex-col gap-2">
              <div class="text-neutral-700 text-sm font-semibold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Xero Entity Info</div>
              <div class="flex items-center gap-2 text-sky-700 text-sm hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 "><span>◆</span><span>Contact Xero ID</span></div>
              <div class="flex items-center gap-2 text-sky-700 text-sm hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 "><span>◆</span><span>Company Xero ID</span></div>
              <div class="flex items-center gap-2 text-sky-700 text-sm hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 "><span>◆</span><span>Accounts Contact</span></div>
            </div>
            <div class="text-sm text-neutral-700 flex items-center gap-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">
              <span>Invoice ID:</span>
              <a href="#" class="text-sky-700 underline-offset-2 hover:!underline hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700 hover:underline-offset-2 active:underline-offset-2 focus:underline-offset-2 focus-visible:underline-offset-2" data-field="invoice_id">--</a>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-6 pb-4 flex flex-col items-center gap-4 hover:!border-gray-200 active:!border-gray-200 hover:border-t active:border-t focus:border-t focus-visible:border-t hover:border-gray-200 active:border-gray-200 focus:border-gray-200 focus-visible:border-gray-200">
            <div data-invoice-placeholder class="flex flex-col w-fit gap-7 py-5 bg-slate-100 rounded-md items-center justify-center text-neutral-500 text-sm hover:!bg-slate-100 active:!bg-slate-100 hover:!text-neutral-500 active:!text-neutral-500 hover:bg-slate-100 active:bg-slate-100 focus:bg-slate-100 focus-visible:bg-slate-100 hover:text-neutral-500 active:text-neutral-500 focus:text-neutral-500 focus-visible:text-neutral-500 ">
              <svg width="251" height="106" viewBox="0 0 251 106" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M78.3667 0.122178C80.3453 -0.0320611 82.3803 0.0548375 84.366 0.0652463L94.118 0.0994683L129.088 0.0750237L141.494 0.083066C143.384 0.0808581 145.584 -0.156493 147.427 0.181319C148.232 0.328618 149.053 0.763894 149.621 1.35357C149.903 1.64738 150.203 2.06546 150.203 2.48733C150.203 2.57549 150.192 2.65829 150.168 2.74282C150.561 3.16658 151.039 8.98256 150.985 9.89049C150.973 10.1065 150.935 10.2846 150.853 10.4839C151.312 11.0583 151.55 15.9896 151.454 16.8957C151.433 17.0861 151.381 17.2265 151.293 17.3947L166.411 17.3842C168.601 17.3824 171.177 17.1049 173.318 17.4767C173.951 17.5867 174.517 17.8915 174.966 18.3519C175.526 18.9251 175.689 19.6295 175.782 20.4059C176.122 23.2195 175.843 26.8618 175.834 29.7539C175.817 34.6107 175.951 39.482 175.824 44.3367C175.813 44.7482 175.828 45.1074 175.616 45.473C176.848 45.6127 180.228 45.15 181.472 44.8311C181.522 44.7469 181.567 44.6618 181.604 44.5703C181.948 43.7098 182.014 39.3995 181.675 38.6469C185.016 38.9319 188.236 39.482 191.611 39.5408C191.674 40.9573 191.928 43.6848 191.592 44.9698C199.159 45.852 207.727 47.906 212.705 54.187C214.343 56.2544 215.318 58.675 216.135 61.1608C217.54 65.4293 218.451 69.9686 219.483 74.3408L223.56 91.1852L225.884 101C226.16 102.209 226.684 103.747 226.704 104.976L226.731 105.235C232.175 105.395 237.654 105.272 243.101 105.266C245.361 105.263 248.525 104.902 250.654 105.47L250.752 105.641C250.624 105.712 250.499 105.762 250.357 105.797C248.886 106.163 246.847 105.883 245.322 105.881L235.161 105.893L193.772 105.951L4.10973 105.934C3.28128 105.938 0.584468 106.143 0.0499938 105.808L0 105.55C0.274886 105.329 0.533055 105.292 0.874021 105.267C3.19281 105.103 5.66584 105.286 8.00245 105.284L23.8195 105.29C24.8796 105.277 25.9398 105.272 27 105.276L34.7344 105.298C34.4997 103.248 32.8518 90.516 33.2841 89.5612C34.6576 89.173 40.1876 89.4863 42.0388 89.5079C41.9807 88.9636 41.9108 88.4208 41.8292 87.8796C41.7475 87.3383 41.6542 86.7991 41.5493 86.2618C41.4442 85.7246 41.3276 85.1899 41.1995 84.6578C41.0713 84.1255 40.9317 83.5964 40.7808 83.0703C40.6297 82.544 40.4673 82.0214 40.2936 81.5023C40.12 80.9833 39.9352 80.4682 39.7393 79.9571C39.5433 79.446 39.3363 78.9394 39.1184 78.4373C38.9004 77.9351 38.6717 77.4379 38.4323 76.9456C37.6387 77.2286 36.8174 77.4128 35.9749 77.4579C31.3805 77.703 26.5411 74.8073 23.274 71.8152C20.0448 68.858 17.3689 65.064 17.1942 60.5425C17.1175 58.5622 17.7094 56.5514 19.0946 55.0921C20.3126 53.8089 21.9451 53.2909 23.6833 53.2659C27.4515 53.2115 30.7221 55.2139 33.3246 57.7787C36.6076 61.0142 40.7405 67.0498 40.7379 71.8373C40.7369 73.7156 40.1477 75.2484 38.8272 76.5796C40.9571 80.4477 42.1047 85.1593 42.548 89.5291C43.6342 89.5488 45.4914 89.8039 46.4997 89.4144L46.6343 89.0195C47.0812 83.7527 47.7808 78.5997 48.6665 73.3887C47.7411 72.8889 46.9051 72.3601 46.1987 71.5616C44.6287 69.7873 44.2764 67.1116 44.4107 64.8169C44.7216 59.5054 47.9396 50.0505 52.0752 46.4366C53.4468 45.238 54.8375 44.626 56.6615 44.761C56.6002 39.1983 56.6715 33.637 56.6473 28.0743C56.6371 25.7206 56.3486 21.7273 56.6731 19.5511C56.7617 18.9559 57.053 18.4301 57.4764 18.0046C57.8975 17.5815 58.3836 17.3011 58.9717 17.1891C60.5368 16.8909 62.3972 17.093 63.9992 17.1083L73.3747 17.2055C73.349 14.0068 73.3516 10.8082 73.3827 7.60971C73.3528 6.53697 73.2916 5.44973 73.3263 4.37716C73.3654 3.1617 73.7046 1.9363 74.6285 1.09272C75.6993 0.114924 76.9987 0.0559403 78.3667 0.122178ZM111.789 70.6354L111.787 70.3451L113.042 70.3274C113.633 68.5519 114.595 67.0845 115.684 65.5813L115.92 65.1995C114.45 65.1377 112.961 65.1809 111.489 65.1744L111.571 64.9447C109.393 64.3334 106.786 63.2097 105.056 61.708C104.921 61.4047 104.881 61.3505 104.928 61.009C105.178 60.8272 105.432 60.6592 105.693 60.4954C105.773 60.1016 105.637 59.9723 105.459 59.6363C105.47 59.2542 105.547 59.1766 105.762 58.8522C107.3 58.8686 108.85 58.9257 110.387 58.8904C111.296 58.8194 112.203 58.8353 113.114 58.8428C112.486 58.4102 111.616 57.7897 111.406 57.0006C111.319 56.6749 111.43 56.5517 111.594 56.2942C112.21 55.9181 112.808 55.8799 113.496 56.0475C115.326 56.4924 117.935 58.8079 119.496 58.8874L139.312 58.8883C143.01 58.8857 146.793 58.7052 150.476 58.9804C149.87 59.4408 140.736 59.2116 139.241 59.2162C139.259 61.2523 139.287 63.2883 139.325 65.3241L150.107 65.318C150.85 64.8579 153.87 61.3863 154.078 60.6033L154.039 60.4107C154.225 59.7624 150.528 11.2059 150.342 10.6197L150.853 10.4839C150.935 10.2846 150.973 10.1065 150.985 9.89049C151.039 8.98256 150.561 3.16658 150.168 2.74282C150.192 2.65829 150.203 2.57549 150.203 2.48733C150.203 2.06546 149.903 1.64738 149.621 1.35357C149.053 0.763894 148.232 0.328618 147.427 0.181319C145.584 -0.156493 143.384 0.0808581 141.494 0.083066L129.088 0.0750237L94.118 0.0994683L84.366 0.0652463C82.3803 0.0548375 80.3453 -0.0320611 78.3667 0.122178C76.9987 0.0559403 75.6993 0.114924 74.6285 1.09272C73.7046 1.9363 73.3654 3.1617 73.3263 4.37716C73.2916 5.44973 73.3528 6.53697 73.3827 7.60971C73.3516 10.8082 73.349 14.0068 73.3747 17.2055L63.9992 17.1083C62.3972 17.093 60.5368 16.8909 58.9717 17.1891C58.3836 17.3011 57.8975 17.5815 57.4764 18.0046C57.053 18.4301 56.7617 18.9559 56.6731 19.5511C56.3486 21.7273 56.6371 25.7206 56.6473 28.0743C56.6715 33.637 56.6002 39.1983 56.6615 44.761C54.8375 44.626 53.4468 45.238 52.0752 46.4366C47.9396 50.0505 44.7216 59.5054 44.4107 64.8169C44.2764 67.1116 44.6287 69.7873 46.1987 71.5616C46.9051 72.3601 47.7411 72.8889 48.6665 73.3887C47.7808 78.5997 47.0812 83.7527 46.6343 89.0195L46.4997 89.4144C45.4914 89.8039 43.6342 89.5488 42.548 89.5291C42.1047 85.1593 40.9571 80.4477 38.8272 76.5796C40.1477 75.2484 40.7369 73.7156 40.7379 71.8373C40.7405 67.0498 36.6076 61.0142 33.3246 57.7787C30.7221 55.2139 27.4515 53.2115 23.6833 53.2659C21.9451 53.2909 20.3126 53.8089 19.0946 55.0921C17.7094 56.5514 17.1175 58.5622 17.1942 60.5425C17.3689 65.064 20.0448 68.858 23.274 71.8152C26.5411 74.8073 31.3805 77.703 35.9749 77.4579C36.8174 77.4128 37.6387 77.2286 38.4323 76.9456C38.6717 77.4379 38.9004 77.9351 39.1184 78.4373C39.3363 78.9394 39.5433 79.446 39.7393 79.9571C39.9352 80.4682 40.12 80.9833 40.2936 81.5023C40.4673 82.0214 40.6297 82.544 40.7808 83.0703C40.9317 83.5964 41.0713 84.1255 41.1995 84.6578C41.3276 85.1899 41.4442 85.7246 41.5493 86.2618C41.6542 86.7991 41.7475 87.3383 41.8292 87.8796C41.9108 88.4208 41.9807 88.9636 42.0388 89.5079C40.1876 89.4863 34.6576 89.173 33.2841 89.5612L33.3959 89.9096C33.9651 90.1097 54.3076 90.1791 55.4003 89.9697C55.359 93.7971 54.5886 97.9135 54.1833 101.745C54.0593 102.917 53.8195 104.202 53.8545 105.378C58.0475 105.252 89.5379 105.58 90.3183 105.253C90.0128 104.999 89.6671 104.604 89.6053 104.195C89.5629 103.916 89.6168 103.705 89.7982 103.483C90.1025 103.109 90.8857 102.956 91.3431 102.899C92.3415 102.776 93.4171 102.855 94.4264 102.863C97.1068 102.884 99.8688 103.042 102.539 102.899C102.906 102.88 103.069 102.903 103.319 102.616L103.413 102.95C104.297 103.17 108.886 102.948 110.147 102.95C118.868 102.907 127.588 102.964 136.308 103.122C138.771 103.177 141.354 102.924 143.794 103.136C144.144 103.167 144.403 103.262 144.644 103.524C144.843 103.957 144.828 104.239 144.743 104.7L144.655 105.178C144.992 105.411 145.391 105.31 145.795 105.299L157.32 105.286C159.278 105.29 161.361 105.43 163.309 105.251C163.447 105.101 163.526 104.904 163.559 104.702C163.794 103.228 163.731 101.586 163.829 100.085C163.985 97.7152 164.331 95.2045 164.283 92.837C164.279 92.5978 164.206 92.4268 164.07 92.2306C161.064 92.1117 158.036 92.1994 155.027 92.1918C154.818 92.1842 154.65 92.2156 154.464 92.3166C153.778 92.6872 153.129 93.3587 152.521 93.8523C152.031 94.2458 151.522 94.6112 150.992 94.9486C150.462 95.2858 149.915 95.5931 149.351 95.8702C149.155 95.9645 148.956 96.0535 148.754 96.1372C148.552 96.2209 148.348 96.2992 148.143 96.3722C147.937 96.4451 147.73 96.5125 147.52 96.5744C147.311 96.6363 147.1 96.6926 146.888 96.7433C146.676 96.794 146.462 96.839 146.248 96.8784C146.032 96.9179 145.816 96.9516 145.6 96.9795C145.384 97.0075 145.167 97.0297 144.95 97.0462C144.732 97.0626 144.514 97.0733 144.295 97.0783C139.827 97.189 136.833 95.0787 133.74 92.1202L121.791 80.2514L111.248 80.2793C108.729 80.2905 106.183 80.3823 103.668 80.2698L62.1544 80.3058C62.1386 79.1359 62.1033 77.9614 62.1705 76.7928L84.0254 76.8092C84.0833 77.583 84.1528 78.3579 84.1907 79.1329L99.7038 79.1443C102.388 79.1459 105.101 79.2271 107.782 79.1375C112.107 79.148 116.437 79.2055 120.762 79.1681L120.308 78.601C118.65 77.0214 115.378 74.2277 114.077 72.6044C113.651 72.0732 113.33 71.3748 113.015 70.7693C112.699 70.5368 112.169 70.6282 111.789 70.6354ZM119.848 59.2755C120.458 59.7594 121.058 60.2662 121.696 60.7119C122.529 60.3041 123.394 59.9633 124.25 59.6078C126.953 61.6874 130.003 63.4742 132.863 65.3418L138.982 65.334L138.978 59.2192C132.602 59.2648 126.225 59.1628 119.848 59.2755ZM133.35 65.6376C134.89 67.1597 137.17 68.3791 138.988 69.5699L138.981 65.6272L133.35 65.6376ZM140.348 70.4794C142.132 70.481 143.918 70.5063 145.7 70.4746C146.218 70.1766 147.478 68.9609 147.601 68.3821C147.606 68.3575 147.604 68.3319 147.606 68.3069C148.118 67.9787 149.665 66.3155 149.773 65.7424C149.779 65.7105 149.776 65.6777 149.777 65.6454C146.29 65.6008 142.803 65.5919 139.316 65.6187L139.312 69.7787C139.65 70.0139 139.988 70.2806 140.348 70.4794ZM165.23 27.7958C163.255 27.6247 161.148 27.7598 159.161 27.751C156.972 27.7414 154.376 27.4685 152.23 27.8519C152.531 28.7147 153.089 34.206 152.748 34.9092C152.731 34.9456 152.709 34.9803 152.69 35.016C154.004 35.0136 161.135 34.7991 161.774 35.1284L161.817 35.3743C161.154 35.8047 154.169 35.5864 152.747 35.5943C153.058 36.1198 153.193 36.9277 153.047 37.5275C153.018 37.6412 152.969 37.7287 152.913 37.8295C154.395 37.8251 162.873 37.5808 163.6 38.0235C163.318 38.2932 162.924 38.36 162.536 38.3992C161.41 38.5127 160.205 38.4023 159.069 38.3955L152.968 38.4056C153.364 39.0117 153.099 39.7375 153.472 40.303C153.944 40.3189 154.513 40.2402 154.9 40.506L154.889 40.8089C154.39 41.0236 153.906 40.7944 153.439 41.0569C153.125 44.2031 155.108 57.949 154.521 59.5808L154.814 59.7713C155.762 59.401 157.713 56.5514 158.478 55.6791C160.027 53.9122 161.918 52.19 163.861 50.8652C164.674 50.3115 166.753 49.273 167.206 48.6215C167.25 48.537 167.294 48.4476 167.321 48.3556C167.572 47.498 167.499 33.1024 167.384 31.3215C167.368 31.0901 167.299 30.8858 167.201 30.6765L165.204 30.6711C165.26 30.5837 165.293 30.5424 165.329 30.4511C165.603 29.7738 165.532 28.4496 165.23 27.7958Z" fill="#274E82"></path>
              <path d="M85.9609 29.0964L146.73 29.1161C146.742 29.1373 146.753 29.1584 146.766 29.1792C146.821 29.2724 146.87 29.3639 146.911 29.4644C147.225 30.2296 147.434 33.0322 147.165 33.7195C147.007 33.7955 146.892 33.8443 146.714 33.8479C140.7 33.9698 134.646 33.7723 128.627 33.7725L86.3505 33.7995C86.2513 32.2298 86.1734 30.6559 85.9609 29.0964Z" fill="#C0C9D5"></path>
              <path d="M85.0703 13.7256L145.719 13.7313C145.799 13.8502 145.866 13.9415 145.902 14.083C146.153 15.0529 146.411 17.331 145.97 18.1889C144.667 18.457 142.877 18.2392 141.518 18.2372L130.617 18.2299L85.2932 18.3312C85.2358 16.7952 85.1615 15.26 85.0703 13.7256Z" fill="#C0C9D5"></path>
              <path d="M85.5605 21.8505L105.108 21.8446C107.48 21.842 111.499 21.5706 113.67 21.9021C113.891 22.2757 113.804 22.7894 113.792 23.2119L93.9735 23.1662C91.9522 23.1685 87.5057 23.4406 85.8159 23.1054C85.577 22.761 85.5979 22.2593 85.5605 21.8505Z" fill="#C0C9D5"></path>
              <path d="M124.631 50.168C125.213 50.1588 126.347 49.9371 126.819 50.2844C126.999 50.4171 126.996 50.6575 127.044 50.8687C126.43 50.8769 125.455 51.0806 124.905 50.7819C124.679 50.6594 124.69 50.4053 124.631 50.168Z" fill="#FEFEFE"></path>
              <path d="M85.7246 25.2046L96.3174 25.195C98.1481 25.194 100.095 25.0612 101.911 25.2678C102.125 25.6806 102.047 26.017 102.032 26.4768C100.155 26.4787 86.3821 26.7369 85.8077 26.3395L85.7246 25.2046Z" fill="#C0C9D5"></path>
              <path d="M78.3666 0.122178C80.3452 -0.0320611 82.3802 0.0548376 84.3659 0.0652463L94.1179 0.0994683L129.088 0.0750237L141.494 0.083066C143.384 0.0808581 145.584 -0.156493 147.427 0.181319C148.232 0.328618 149.053 0.763894 149.621 1.35357C149.903 1.64738 150.203 2.06546 150.203 2.48733C150.203 2.57549 150.192 2.65829 150.168 2.74282C150.561 3.16659 151.039 8.98256 150.985 9.89049C150.973 10.1066 150.935 10.2846 150.853 10.4839L150.342 10.6197L150.264 10.416C149.198 9.99663 123.912 10.2802 121.176 10.2838L79.8012 10.2182C80.8678 27.1913 82.0328 44.1578 83.2962 61.1177C83.4597 63.3919 84.3092 77.2907 84.8265 78.6123L89.0674 78.5909C92.0061 78.7229 94.9731 78.6448 97.9152 78.6439C100.555 78.6431 103.232 78.7309 105.867 78.5898L120.308 78.601L120.762 79.1681C116.437 79.2055 112.107 79.1481 107.782 79.1375C105.101 79.2271 102.388 79.1459 99.7037 79.1443L84.1906 79.1329C84.1527 78.3579 84.0832 77.583 84.0253 76.8092L62.1703 76.7928C62.1032 77.9615 62.1385 79.1359 62.1543 80.3058L103.668 80.2698C106.183 80.3823 108.729 80.2905 111.248 80.2793L121.791 80.2514L133.74 92.1202L131.271 92.1787C131.946 95.7358 132.534 99.3683 133.397 102.883C135.124 102.877 143.91 102.452 144.896 103.39C145.093 103.578 145.122 103.676 145.189 103.938C145.085 104.28 145.036 104.482 144.743 104.7C144.828 104.239 144.842 103.957 144.644 103.524C144.402 103.262 144.144 103.167 143.794 103.136C141.354 102.924 138.771 103.177 136.308 103.122C127.588 102.964 118.868 102.907 110.147 102.95C108.886 102.948 104.297 103.17 103.413 102.95L103.319 102.616C102.694 99.1053 102.185 95.5687 101.462 92.077L71.8551 92.0658L64.0285 92.0745C62.5728 92.0775 61.0082 92.1883 59.5664 92.0011C58.8296 91.9054 58.1135 91.5861 57.5869 91.0525C57.041 90.4995 56.8647 89.8603 56.7546 89.1069C56.44 86.951 56.6474 84.512 56.6548 82.3328L56.6711 70.2126C55.3584 71.9649 53.8055 73.2513 51.5652 73.5595C50.7933 73.6656 49.9747 73.6136 49.2018 73.5265C48.7622 76.1111 48.3662 78.7023 48.0136 81.3002C47.8359 82.6855 47.5 88.0264 47.1074 88.9232L47.224 89.3693C48.7547 90.1782 53.8839 88.8773 55.3406 89.6549L55.4002 89.9697C54.3075 90.1791 33.965 90.1098 33.3958 89.9096L33.284 89.5612C34.6575 89.173 40.1875 89.4863 42.0387 89.5079C41.9805 88.9636 41.9107 88.4209 41.8291 87.8796C41.7474 87.3383 41.6541 86.7991 41.5492 86.2618C41.4441 85.7246 41.3275 85.1899 41.1994 84.6578C41.0712 84.1255 40.9316 83.5964 40.7806 83.0703C40.6296 82.5441 40.4672 82.0214 40.2935 81.5023C40.1199 80.9833 39.9351 80.4682 39.7391 79.9571C39.5432 79.446 39.3362 78.9394 39.1182 78.4373C38.9003 77.9351 38.6716 77.4379 38.4322 76.9457C37.6386 77.2286 36.8173 77.4128 35.9748 77.4579C31.3804 77.703 26.541 74.8073 23.2739 71.8152C20.0446 68.858 17.3688 65.0641 17.1941 60.5425C17.1174 58.5622 17.7093 56.5514 19.0945 55.0921C20.3124 53.8089 21.945 53.2909 23.6831 53.2659C27.4514 53.2115 30.722 55.2139 33.3245 57.7787C36.6075 61.0143 40.7404 67.0498 40.7378 71.8373C40.7368 73.7156 40.1476 75.2484 38.8271 76.5796C40.957 80.4477 42.1046 85.1593 42.5479 89.5291C43.6341 89.5488 45.4912 89.804 46.4996 89.4144L46.6342 89.0195C47.0811 83.7527 47.7807 78.5997 48.6664 73.3887C47.741 72.8889 46.9049 72.3601 46.1986 71.5616C44.6286 69.7873 44.2763 67.1116 44.4106 64.8169C44.7215 59.5055 47.9395 50.0505 52.0751 46.4366C53.4467 45.238 54.8374 44.626 56.6614 44.761C56.6001 39.1983 56.6714 33.637 56.6472 28.0743C56.637 25.7206 56.3485 21.7273 56.6729 19.5511C56.7616 18.9559 57.0529 18.4301 57.4763 18.0046C57.8974 17.5815 58.3834 17.3011 58.9715 17.1891C60.5366 16.8909 62.3971 17.093 63.9991 17.1083L73.3746 17.2055C73.3488 14.0068 73.3515 10.8082 73.3826 7.60971C73.3527 6.53697 73.2915 5.44973 73.3262 4.37716C73.3653 3.1617 73.7045 1.9363 74.6284 1.09272C75.6992 0.114924 76.9986 0.0559403 78.3666 0.122178ZM79.6654 10.1193C79.3926 7.98853 79.7139 5.69718 79.3106 3.614C79.0447 2.23973 78.4563 1.54408 77.3123 0.781873C76.3677 0.767364 75.6404 0.785658 74.9176 1.4668C74.0357 2.29793 73.8818 3.46907 73.8682 4.62302C73.8463 6.46553 73.9272 8.30962 73.9201 10.1524C75.8259 10.0368 77.7564 10.1084 79.6654 10.1193ZM73.4904 35.2891L66.3897 35.2652C66.4729 46.9979 66.2094 58.7552 66.4376 70.4817L83.4779 70.4719C83.4246 67.4503 83.0089 64.3408 82.7802 61.318L81.3381 41.7803L79.8157 18.5712C79.7148 16.996 79.6588 11.868 79.2666 10.7732C78.8649 10.53 78.4161 10.6082 77.9513 10.6018C76.7024 10.615 75.0468 10.4034 73.8589 10.7254C74.0556 13.0601 74.0674 34.6384 73.8279 35.1668L73.4904 35.2891Z" fill="#263238"></path>
              <path d="M77.3121 0.781925C81.3704 1.04908 85.5446 0.675314 89.6219 0.725466C103.891 0.900837 118.161 0.674684 132.429 0.781295C135.552 0.803479 138.674 0.799537 141.797 0.769467C143.677 0.75417 145.653 0.583371 147.517 0.84154C148.348 0.956825 149.157 1.47553 149.7 2.10368C149.87 2.30129 150.04 2.51451 150.168 2.74287C150.561 3.16664 151.039 8.98261 150.985 9.89054C150.972 10.1066 150.935 10.2847 150.853 10.484L150.342 10.6198L150.264 10.416C149.198 9.99668 123.912 10.2802 121.176 10.2839L79.801 10.2183C78.3555 10.1949 76.91 10.2003 75.4647 10.2345L73.9199 10.1525C75.8257 10.0369 77.7562 10.1085 79.6652 10.1194C79.3924 7.98858 79.7137 5.69723 79.3104 3.61406C79.0445 2.23978 78.4561 1.54413 77.3121 0.781925Z" fill="#274E82"></path>
              <path d="M88.5093 3.90193C88.667 3.89878 88.8249 3.89814 88.9819 3.91439C89.4524 3.96296 89.9258 4.2 90.2118 4.58197C90.4633 4.9182 90.5258 5.34055 90.4419 5.74633C90.2966 6.44955 89.876 6.75172 89.321 7.13007C89.2748 7.12912 89.2288 7.12928 89.1826 7.12707C88.6476 7.10278 88.1472 6.87868 87.8023 6.46469C87.5049 6.10764 87.4107 5.65391 87.4937 5.20098C87.6126 4.55043 88.0114 4.26639 88.5093 3.90193Z" fill="#FEFEFE"></path>
              <path d="M93.8399 3.88722C93.8636 3.88707 93.8873 3.88659 93.9107 3.88675C94.4653 3.89022 95.0164 4.02033 95.402 4.44772C95.6582 4.73191 95.7638 5.07382 95.7291 5.45311C95.6601 6.20775 95.2177 6.57332 94.6651 7.0056C94.4785 7.01253 94.2899 7.01868 94.1038 7.00197C93.6814 6.9638 93.2705 6.72141 93.0153 6.38438C92.7757 6.06802 92.694 5.68684 92.7565 5.29761C92.8718 4.57972 93.2744 4.26494 93.8399 3.88722Z" fill="#FEFEFE"></path>
              <path d="M83.3196 3.9043C83.8706 3.90824 84.4448 4.0016 84.8479 4.40975C85.1217 4.687 85.26 5.04327 85.2455 5.43297C85.219 6.14896 84.8094 6.55822 84.3095 6.99822C84.0706 7.00926 83.8252 7.01999 83.5886 6.97678C83.5337 6.96689 83.4794 6.95433 83.4257 6.93908C83.3721 6.92373 83.3193 6.90575 83.2675 6.88514C83.2157 6.86454 83.1651 6.84136 83.1156 6.8156C83.0661 6.78984 83.018 6.76166 82.9713 6.73107C82.9247 6.70047 82.8797 6.66761 82.8363 6.6325C82.793 6.59738 82.7515 6.56016 82.7119 6.52084C82.6724 6.48152 82.6349 6.4403 82.5995 6.3972C82.564 6.35409 82.5309 6.3093 82.4999 6.26283C82.2741 5.92139 82.221 5.541 82.3056 5.14389C82.4419 4.50501 82.8122 4.24258 83.3196 3.9043Z" fill="#FEFEFE"></path>
              <path d="M38.4322 76.9458C37.6386 77.2287 36.8173 77.4129 35.9748 77.458C31.3804 77.7031 26.541 74.8074 23.2739 71.8153C20.0446 68.8581 17.3688 65.0642 17.1941 60.5427C17.1174 58.5623 17.7093 56.5515 19.0945 55.0922C20.3124 53.809 21.945 53.2911 23.6831 53.266C27.4514 53.2116 30.722 55.214 33.3245 57.7788C36.6075 61.0144 40.7404 67.0499 40.7378 71.8374C40.7368 73.7157 40.1476 75.2485 38.8271 76.5797C35.8712 72.0764 34.4411 69.3505 29.6472 66.3736L29.4102 66.4592L29.3696 66.2829L29.5032 66.3042L29.3786 66.4342C30.0968 67.5643 31.2248 68.0251 32.2123 68.8484C34.6552 70.8845 37.1685 74.0073 38.4322 76.9458Z" fill="#374349"></path>
              <path d="M48.6667 73.3886C47.7412 72.8888 46.9052 72.36 46.1989 71.5615C44.6289 69.7872 44.2765 67.1115 44.4109 64.8168C44.7218 59.5053 47.9398 50.0504 52.0754 46.4365C53.447 45.2379 54.8377 44.6258 56.6617 44.7608C56.6679 46.4865 56.9899 51.5992 56.5442 53.0051C56.439 53.3367 56.1094 53.6496 55.8732 53.8991C52.2475 57.7888 50.4687 63.5881 49.4652 68.7042C49.1652 70.2338 49.0688 71.8938 48.6667 73.3886Z" fill="#374349"></path>
              <path d="M56.5706 53.9583C56.919 55.5675 56.6832 57.6226 56.6818 59.282L56.6704 70.2128C55.3578 71.9651 53.8048 73.2515 51.5646 73.5597C50.7926 73.6658 49.9741 73.6138 49.2012 73.5267C50.1873 66.4459 52.0287 59.6129 56.5706 53.9583Z" fill="#374349"></path>
              <path d="M62.1535 22.1328L73.3396 22.135C73.3363 24.0811 73.0638 34.2713 73.4908 35.289L66.3902 35.265C66.4734 46.9978 66.2099 58.7551 66.4381 70.4815L83.4784 70.4717C83.6339 72.3808 83.8384 74.3012 83.9293 76.2138C76.6832 76.2153 69.3611 75.9878 62.123 76.2396C62.3916 70.511 62.1346 64.5391 62.1431 58.7862L62.1535 22.1328Z" fill="#C0C9D5"></path>
              <path d="M211.344 105.275C211.359 105.251 211.375 105.227 211.389 105.202C212.252 103.69 211.328 71.469 211.202 66.7351C211.131 64.0909 210.672 60.2061 210.934 57.7135C211.014 56.9374 211.299 55.6701 212.041 55.2588C212.208 55.5316 212.112 55.8257 212.037 56.1338C211.905 56.6927 211.725 57.2144 211.678 57.7925C211.553 59.2975 211.728 60.9027 211.774 62.4161L212.011 71.0544C212.112 74.8213 212.796 103.97 211.968 105.272L222.039 105.289C223.522 105.292 225.285 105.474 226.731 105.235C232.175 105.395 237.654 105.271 243.101 105.266C245.361 105.263 248.525 104.901 250.654 105.47L250.752 105.641C250.624 105.712 250.499 105.761 250.357 105.797C248.886 106.162 246.847 105.883 245.322 105.881L235.161 105.893L193.772 105.951L4.10973 105.934C3.28128 105.938 0.584468 106.143 0.0499938 105.808L0 105.55C0.274886 105.329 0.533055 105.291 0.874021 105.267C3.19281 105.103 5.66584 105.286 8.00245 105.283L23.8195 105.289C24.8796 105.277 25.9398 105.272 27 105.276L34.7344 105.298C34.4997 103.248 32.8518 90.5158 33.2841 89.561L33.3959 89.9094C33.9651 90.1096 54.3076 90.1789 55.4003 89.9695C55.359 93.7969 54.5886 97.9133 54.1833 101.745C54.0593 102.917 53.8195 104.201 53.8545 105.377C58.0475 105.251 89.5379 105.58 90.3183 105.252C90.0128 104.999 89.6671 104.604 89.6053 104.195C89.5629 103.915 89.6168 103.705 89.7982 103.483C90.1025 103.109 90.8857 102.956 91.3431 102.899C92.3415 102.776 93.4171 102.855 94.4264 102.863C97.1068 102.884 99.8688 103.042 102.539 102.899C102.906 102.879 103.069 102.903 103.319 102.615L103.413 102.95C104.297 103.17 108.886 102.948 110.147 102.95C118.868 102.907 127.588 102.964 136.308 103.122C138.771 103.177 141.354 102.923 143.794 103.136C144.144 103.166 144.403 103.261 144.644 103.523C144.843 103.957 144.828 104.239 144.743 104.7L144.655 105.178C144.992 105.41 145.391 105.31 145.795 105.298L157.32 105.286C159.278 105.289 161.361 105.43 163.309 105.251C169.196 105.489 175.135 105.284 181.03 105.269L211.344 105.275Z" fill="#263238"></path>
              <path d="M34.7352 105.298C34.5005 103.248 32.8526 90.516 33.2849 89.5613L33.3967 89.9097C33.9659 90.1098 54.3084 90.1792 55.4011 89.9697C55.3598 93.7972 54.5894 97.9135 54.1841 101.745C54.0601 102.917 53.8203 104.202 53.8553 105.378C48.1836 105.34 42.5003 105.251 36.8292 105.312C32.6652 105.357 27.9199 105.691 23.8203 105.29C24.8804 105.277 25.9406 105.272 27.0008 105.276L34.7352 105.298Z" fill="#274E82"></path>
              <path d="M103.319 102.615L103.414 102.95C104.297 103.17 108.887 102.948 110.147 102.95C118.868 102.907 127.588 102.964 136.308 103.122C138.771 103.177 141.354 102.923 143.794 103.136C144.144 103.167 144.403 103.262 144.644 103.524C144.843 103.957 144.829 104.239 144.743 104.7L144.655 105.178C144.993 105.411 145.392 105.31 145.795 105.298C145.264 105.473 137.719 105.286 136.28 105.288L90.3185 105.253C90.013 104.999 89.6673 104.604 89.6055 104.195C89.5631 103.915 89.617 103.705 89.7984 103.483C90.1027 103.109 90.8859 102.956 91.3433 102.899C92.3417 102.776 93.4173 102.855 94.4266 102.863C97.1071 102.884 99.869 103.042 102.54 102.899C102.906 102.879 103.069 102.903 103.319 102.615Z" fill="#274E82"></path>
              <path d="M150.853 10.4839C151.312 11.0583 151.55 15.9895 151.454 16.8957C151.433 17.086 151.381 17.2264 151.293 17.3947L166.411 17.3841C168.601 17.3824 171.177 17.1048 173.318 17.4767C173.951 17.5866 174.517 17.8915 174.966 18.3518C175.526 18.9251 175.689 19.6294 175.782 20.4058C176.122 23.2195 175.843 26.8618 175.834 29.7538C175.816 34.6106 175.951 39.4819 175.824 44.3367C175.813 44.7481 175.828 45.1074 175.616 45.473C174.717 45.9794 171.65 46.7124 170.445 47.1291C170.467 47.0819 170.489 47.0354 170.508 46.9876C170.759 46.3673 170.767 44.744 170.487 44.1422C170.644 44.8727 170.702 46.5553 170.32 47.1988C169.587 47.717 168.086 48.4191 167.206 48.6215C167.25 48.5369 167.294 48.4475 167.321 48.3556C167.571 47.4979 167.499 33.1023 167.384 31.3215C167.368 31.0901 167.299 30.8857 167.201 30.6764L165.204 30.6711C165.259 30.5837 165.293 30.5424 165.329 30.4511C165.603 29.7737 165.532 28.4496 165.229 27.7957C163.255 27.6246 161.148 27.7598 159.161 27.7509C156.972 27.7413 154.376 27.4685 152.23 27.8519C152.531 28.7147 153.089 34.2059 152.748 34.9092C152.731 34.9456 152.709 34.9803 152.69 35.0159C154.004 35.0136 161.135 34.7991 161.774 35.1284L161.817 35.3742C161.154 35.8046 154.169 35.5864 152.747 35.5942C153.058 36.1197 153.193 36.9277 153.047 37.5274C153.018 37.6411 152.969 37.7287 152.912 37.8295C154.395 37.825 162.873 37.5807 163.6 38.0234C163.318 38.2931 162.924 38.36 162.536 38.3991C161.41 38.5126 160.205 38.4022 159.069 38.3955L152.968 38.4056C153.363 39.0116 153.099 39.7374 153.472 40.303C153.944 40.3189 154.513 40.2402 154.9 40.5059L154.889 40.8089C154.39 41.0235 153.906 40.7944 153.439 41.0568C153.125 44.2031 155.108 57.949 154.521 59.5808L154.652 60.0629C154.474 60.314 154.326 60.3144 154.038 60.4106C154.225 59.7623 150.528 11.2059 150.342 10.6197L150.853 10.4839Z" fill="#263238"></path>
              <path d="M151.783 21.8978L170.287 21.8774C170.42 22.1347 170.476 22.3512 170.491 22.6392C170.73 27.1266 170.551 31.711 170.565 36.2106C170.571 38.2148 170.838 42.3081 170.487 44.1423C170.644 44.8728 170.702 46.5554 170.32 47.1988C169.587 47.717 168.086 48.4192 167.206 48.6215C167.25 48.537 167.294 48.4475 167.321 48.3556C167.571 47.498 167.499 33.1023 167.384 31.3215C167.368 31.0901 167.299 30.8858 167.201 30.6765L165.204 30.6711C165.259 30.5837 165.293 30.5424 165.329 30.4511C165.603 29.7737 165.532 28.4496 165.229 27.7958C163.255 27.6247 161.148 27.7598 159.161 27.751C156.972 27.7414 154.376 27.4685 152.23 27.8519C152.493 26.9902 152.17 22.6367 151.783 21.8978Z" fill="#C0C9D5"></path>
              <path d="M113.115 58.8427C112.487 58.4102 111.616 57.7897 111.406 57.0006C111.32 56.6749 111.431 56.5517 111.595 56.2942C112.211 55.918 112.809 55.8799 113.497 56.0475C115.327 56.4924 117.935 58.8079 119.497 58.8874C119.609 59.1197 119.629 59.1408 119.849 59.2755C120.458 59.7594 121.059 60.2662 121.697 60.7119C120.083 61.5445 118.754 62.4377 117.437 63.6939C116.935 64.1728 116.453 64.7682 115.921 65.1995C114.451 65.1377 112.962 65.1809 111.49 65.1744L111.572 64.9446C109.393 64.3334 106.786 63.2097 105.057 61.708C104.922 61.4047 104.882 61.3505 104.929 61.009C105.178 60.8272 105.433 60.6592 105.694 60.4954C105.773 60.1016 105.637 59.9723 105.46 59.6363C105.471 59.2542 105.548 59.1766 105.762 58.8522C107.301 58.8686 108.85 58.9257 110.388 58.8904C111.297 58.8194 112.204 58.8353 113.115 58.8427Z" fill="#F4958D"></path>
              <path d="M105.762 58.8523C107.301 58.8687 108.85 58.9258 110.388 58.8905C110.367 58.9061 110.347 58.9228 110.325 58.9371C109.225 59.6662 106.865 58.3566 105.888 59.6106C105.952 59.8372 105.973 60.0105 106.209 60.113C107.796 60.8006 113.137 61.3674 114.027 62.3336C113.756 62.5471 113.424 62.546 113.095 62.5115C111.073 62.299 106.979 60.7065 105.475 60.8798L105.369 61.0285C106.008 62.4053 109.796 63.5957 111.126 64.1415C111.318 64.2202 111.897 64.4148 111.82 64.6318C111.763 64.7927 111.699 64.8414 111.572 64.9447C109.393 64.3335 106.786 63.2098 105.057 61.7081C104.922 61.4048 104.882 61.3506 104.929 61.0091C105.178 60.8273 105.433 60.6593 105.694 60.4955C105.773 60.1017 105.637 59.9723 105.46 59.6364C105.471 59.2543 105.548 59.1767 105.762 58.8523Z" fill="#263238"></path>
              <path d="M164.395 83.2309C164.408 83.2011 164.419 83.1716 164.43 83.1415C164.9 81.8166 164.917 77.4632 165.045 75.8338C165.341 72.0923 165.706 68.3576 165.961 64.6128C166.078 62.899 166.273 61.1309 166.209 59.4146C166.166 58.2933 165.931 57.151 165.415 56.1481C164.884 55.1132 163.692 54.2526 162.958 53.3254L163.124 53.1553C163.873 53.2221 164.736 54.102 165.188 54.6538C166.007 55.6515 166.634 57.0075 166.794 58.2922C167.194 61.5315 166.493 65.4611 166.253 68.7467C165.901 73.5536 165.704 78.4082 165.161 83.1962C165.117 83.582 165.083 83.8887 164.859 84.2171C165.002 84.84 164.624 91.3778 164.311 91.9601C164.251 92.0718 164.165 92.1493 164.07 92.2306C161.064 92.1117 158.036 92.1993 155.027 92.1918C154.888 92.0992 154.92 92.0806 154.887 91.9246C156.987 89.9269 159.497 88.1811 161.783 86.3958C162.665 85.7085 163.658 85.041 164.434 84.237C164.509 83.8723 164.468 83.5932 164.395 83.2309Z" fill="#263238"></path>
              <path d="M181.676 38.647C185.016 38.932 188.237 39.482 191.612 39.5409C191.675 40.9574 191.929 43.6848 191.593 44.9698L181.473 44.8312C181.523 44.747 181.567 44.6618 181.605 44.5703C181.949 43.7099 182.015 39.3996 181.676 38.647Z" fill="#F4958D"></path>
              <path d="M140.824 70.7803C142.341 70.6762 143.918 70.7604 145.442 70.7569C145.429 70.8809 145.421 70.9965 145.366 71.1107C145.213 71.4228 144.964 71.6786 144.641 71.8062C144.489 72.3719 144.161 72.665 143.698 72.9786C143.196 72.1599 141.641 71.3395 140.824 70.7803Z" fill="#FEFEFE"></path>
              <path d="M143.705 72.9495L143.983 73.0187C144.454 73.4492 144.55 74.2152 144.67 74.8164C144.858 75.7475 145.645 79.1171 145.15 79.8596L145.005 79.9591L144.795 79.8035C144.252 77.6831 143.874 75.1321 143.705 72.9495Z" fill="#263238"></path>
              <path d="M142.564 72.6545C142.592 72.675 142.624 72.6929 142.652 72.7162C143.138 73.1333 143.448 76.9717 143.459 77.7037C143.466 78.1803 143.426 78.2955 143.105 78.6203C142.993 78.4131 142.934 78.2294 142.892 77.9998C142.721 77.0887 142.02 73.8566 142.274 73.0799C142.313 72.9577 142.486 72.7679 142.564 72.6545Z" fill="#263238"></path>
              <path d="M177.911 25.0884C177.919 25.0633 177.926 25.0384 177.933 25.013C178.157 24.1743 177.925 22.9155 177.889 22.0325C177.737 18.4821 179.373 15.6461 182.377 13.8162C183.741 12.9858 186.242 12.0062 187.857 12.3941C188.551 12.561 189.001 12.9994 189.359 13.5933C189.376 13.623 189.393 13.6533 189.411 13.6831C192.667 13.5328 195.992 14.0387 198.495 16.3255C200.912 18.5342 200.278 21.8476 202.039 24.4058C203.297 26.2357 206.694 26.7182 206.778 28.6553C206.82 29.6112 206.344 30.5177 205.866 31.3151C206.429 31.9252 206.67 32.8357 206.625 33.6553C206.565 34.7752 205.888 35.8222 205.059 36.5374C201.72 39.4123 195.746 39.485 191.611 39.5407C188.236 39.4818 185.015 38.9317 181.675 38.6468C180.904 38.0834 178.874 37.8538 177.844 37.4042C177.266 37.1515 176.636 36.7631 176.433 36.1274C175.741 33.9682 178.751 34.5758 179.28 33.3104C179.295 33.2728 179.306 33.2334 179.319 33.1949C179.382 32.4293 178.261 31.1949 178.038 30.345C177.603 28.686 178.619 26.78 177.911 25.0884Z" fill="#263238"></path>
              <path d="M177.91 25.0884C178.391 25.5647 178.481 26.7386 178.476 27.4012C178.476 27.4641 178.472 27.5269 178.467 27.5896L178.554 27.5412C179.394 27.0643 179.869 26.4672 180.957 26.7442C181.578 26.9025 182.093 27.3223 182.41 27.8764C182.705 28.3932 182.799 29.0387 182.637 29.6143C182.514 30.0518 182.225 30.5263 181.813 30.7403C181.135 31.0931 180.541 30.9764 180.255 31.8003C180.064 32.3545 179.941 32.8618 179.382 33.1672C179.361 33.178 179.339 33.1858 179.319 33.1949C179.382 32.4292 178.26 31.1949 178.038 30.345C177.603 28.686 178.618 26.78 177.91 25.0884Z" fill="#F4958D"></path>
              </svg>
              <h5>No invoice has been generated yet.</h5>
            </div>
            
            <div field-section="invoice-input" class="flex gap-2"><div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Invoice Date</label>
              <div class="relative">
                <input data-field="invoice_date" type="text" placeholder="dd/mm/yyyy" class="date-picker flatpickr-input w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 placeholder:text-slate-500 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:!text-slate-400 active:!text-slate-400 hover:text-slate-400 active:text-slate-400 focus:text-slate-400 focus-visible:text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </span>
              </div>
            </div><div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Due Date</label>
              <div class="relative">
                <input data-field="due_date" type="text" placeholder="dd/mm/yyyy" class="date-picker flatpickr-input w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 placeholder:text-slate-500 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:!text-slate-400 active:!text-slate-400 hover:text-slate-400 active:text-slate-400 focus:text-slate-400 focus-visible:text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"></path></svg>
                </span>
              </div>
            </div></div>
            <div data-invoice-activity-table class="hidden w-full"></div>
              <div id="invoice-total" class="flex justify-end gap-8 w-full items-center hidden">
                  <div class="text-neutral-700 text-sm font-semibold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Invoice Total</div>
                  <div class="text-neutral-700 text-base font-bold hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-base active:text-base focus:text-base focus-visible:text-base" data-field="invoice_total">$ 0.00</div>
              </div>
          <button id="generate-invoice-btn" class="!px-4 !py-2 !bg-[#003882] !text-white !text-sm !font-medium !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Generate Invoice</button></div>

          <div class="hidden grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Payment ID</label>
              <input data-field="payment_id" type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 ">Payment Method</label>
              <div class="relative">
                <select data-field="payment_method" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"></select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg outline outline-1 outline-gray-300 w-full flex flex-col gap-4 p-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300">
        <div class="flex flex-wrap justify-end gap-3">
          <a target="_blank" data-field= "Xero_Invoice_PDF" class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm hover:!text-slate-500 active:!text-slate-500 hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500 " disabled>Download Invoice (PDF)</a>
          <a target="_blank" data-field= "View_Xero_Invoice_(Admin)" class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm hover:!text-slate-500 active:!text-slate-500 hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500 " disabled>View Xero Invoice (Admin)</a>
          <a target="_blank" rel="noopener noreferrer" data-field= "Invoice_URL_Client" class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm hover:!text-slate-500 active:!text-slate-500 hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500 " disabled>View Xero Invoice (Client)</a>
          <button type="button" data-action="send-to-customer" class="px-4 py-2 rounded !bg-[#003882] !text-white !text-sm !font-medium hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Send To Customer</button>
          <button data-field= "" class="!hidden !px-4 !py-2 !bg-[#003882] !text-white !text-sm !font-medium !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Generate Invoice</button>
        </div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
    this.initFlatpickrFor(wrapper);
    const jobIdForInvoice = this.getJobId();
    if (jobIdForInvoice) {
      this.model.fetchJobById(jobIdForInvoice, (jobRecord) =>
        this.renderInvoiceDetails(jobRecord)
      );
    }

    const generateInvoiceBtn = document.getElementById("generate-invoice-btn");
    if (generateInvoiceBtn) {
      generateInvoiceBtn.addEventListener("click", async () => {
        const jobId = this.getJobId();
        if (!jobId) {
          this.handleFailure("Missing job id. Reload and try again.");
          return;
        }

        const invoiceDateInput = document.querySelector(
          '[field-section="invoice-input"] [data-field="invoice_date"]'
        );
        const dueDateInput = document.querySelector(
          '[field-section="invoice-input"] [data-field="due_date"]'
        );
        const entityId =
          document.querySelector('[data-field="company_id"]')?.value || "";
        const contactId = this.getContactId();

        const missing = [];
        if (!invoiceDateInput?.value) missing.push("Invoice Date");
        if (!dueDateInput?.value) missing.push("Due Date");
        if (!contactId && !entityId) missing.push("Contact/Entity");

        if (missing.length) {
          this.handleFailure(
            `Please fill the following before generating an invoice: ${missing.join(
              ", "
            )}.`
          );
          return;
        }

        generateInvoiceBtn.classList.add("hidden");

        const invoiceDataObj = this.getFieldValues(
          '[field-section="invoice-input"] input'
        );
        invoiceDataObj.accounts_contact_id = this.getContactId();
        invoiceDataObj.jobId = jobId;
        invoiceDataObj.xero_invoice_status = "Create Invoice";

        this.startLoading("Generating invoice...");
        try {
          await this.model.createInvoiceForJob(invoiceDataObj);
          await this.model.fetchJobById(jobId, (jobRecord) => {
            this.renderInvoiceDetails(jobRecord);
            this.renderInvoiceActivitiesTable(this.getInvoiceActivities());
            const status = (jobRecord?.xero_invoice_status || "")
              .toString()
              .toLowerCase();
            const isFailed = status.includes("fail");
            if (isFailed) {
              generateInvoiceBtn.classList.remove("hidden");
              this.handleFailure("Invoice generation failed. Please retry.");
            } else {
              if (status != "Create invoice") {
                this.handleSuccess("Invoice generated successfully.");
              }
            }
          });
        } catch (error) {
          console.error("Failed to generate invoice", error);
          generateInvoiceBtn.classList.remove("hidden");
          this.handleFailure("Failed to generate invoice. Please try again.");
        } finally {
          this.stopLoading();
        }
      });
    }

    const sendToCustomerBtn = wrapper.querySelector(
      '[data-action="send-to-customer"]'
    );
    if (sendToCustomerBtn) {
      sendToCustomerBtn.addEventListener("click", async () => {
        if (sendToCustomerBtn.dataset.saving === "true") return;

        const jobId = this.getJobId();
        if (!jobId) {
          this.handleFailure("Missing job id. Reload and try again.");
          return;
        }

        const invoiceUrl = (sendToCustomerBtn.dataset.invoiceUrl || "").trim();
        if (!invoiceUrl) {
          this.handleFailure(
            "No client invoice URL found. Generate invoice first and try again."
          );
          return;
        }

        this.setActionBusyState(sendToCustomerBtn, true, "Sending...");
        try {
          await this.model.updateJob(jobId, { send_to_contact: true });
          sendToCustomerBtn.dataset.defaultLabel = "Send To Customer Again";
          this.setActionBusyState(sendToCustomerBtn, false);
          this.handleSuccess("Invoice sent to customer.");
        } catch (error) {
          console.error("Failed to send invoice to customer", error);
          this.setActionBusyState(sendToCustomerBtn, false);
          this.handleFailure("Failed to send invoice to customer. Please try again.");
        }
      });
    }
  }

  renderInvoiceDetails(records) {
    const invoiceNumber =
      records.invoice_number ||
      records.Invoice_Number ||
      records.invoiceNumber ||
      records.InvoiceNumber;

    let elements = document.querySelectorAll(
      '[data-section="invoice"] [data-field]'
    );
    elements.forEach((el) => {
      let field = el.getAttribute("data-field").toLowerCase();
      let value = records[field] || records[this.toPascalCase(field)] || "";
      if (field.includes("date")) {
        value = this.formatDateForInput(value);
      } else if (
        field.includes("total") ||
        field.includes("amount") ||
        field.includes("price")
      ) {
        value = this.formatCurrency(value);
      } else if (field == "invoice_url_client") {
        const clientUrl =
          records.Invoice_URL_Client ||
          records.invoice_url_client ||
          records.invoiceUrlClient ||
          "";
        if (clientUrl) {
          el.href = clientUrl;
          el.classList.remove("pointer-events-none", "opacity-60");
        } else {
          el.removeAttribute("href");
          el.classList.add("pointer-events-none", "opacity-60");
        }
        return;
      } else if (field == "xero_invoice_pdf") {
        const pdfUrl =
          records.Xero_Invoice_PDF ||
          records.xero_invoice_pdf ||
          records.xeroInvoicePdf ||
          "";
        if (pdfUrl) {
          el.href = pdfUrl;
          el.classList.remove("pointer-events-none", "opacity-60");
        } else {
          el.removeAttribute("href");
          el.classList.add("pointer-events-none", "opacity-60");
        }
        return;
      } else if (field == "view_xero_invoice_(admin)") {
        return;
      }

      if (el.tagName.toLowerCase() === "input") {
        el.value = value || "";
      } else {
        el.textContent = value || "--";
      }
    });

    const invoiceStatusEl = document.querySelector(
      '[data-section="invoice"] [data-field="xero_invoice_status"]'
    );
    if (invoiceStatusEl) {
      const statusText = (invoiceStatusEl.textContent || "").trim();
      const statusValue =
        records.xero_invoice_status ||
        records.Xero_Invoice_Status ||
        records.xeroInvoiceStatus ||
        statusText;
      const statusPalette = this._resolvePaletteEntry(
        this.getColorMappings().xeroInvoiceStatus,
        statusValue,
        statusText
      );
      invoiceStatusEl.style.cssText = statusPalette
        ? `color:${statusPalette.color};background-color:${statusPalette.backgroundColor};`
        : "color:#475569;background-color:#f1f5f9;";
    }

    const sendToCustomerBtn = document.querySelector(
      '[data-section="invoice"] [data-action="send-to-customer"]'
    );
    if (sendToCustomerBtn) {
      const invoiceUrl =
        records.Invoice_URL_Client ||
        records.invoice_url_client ||
        records.invoiceUrlClient ||
        "";
      const hasInvoiceUrl = Boolean(String(invoiceUrl).trim());
      const wasSent = Boolean(
        records.send_to_contact ??
          records.Send_To_Contact ??
          records.sendToContact
      );
      const nextLabel = wasSent
        ? "Send To Customer Again"
        : "Send To Customer";

      sendToCustomerBtn.dataset.invoiceUrl = hasInvoiceUrl ? invoiceUrl : "";
      sendToCustomerBtn.dataset.defaultLabel = nextLabel;
      if (sendToCustomerBtn.dataset.saving !== "true") {
        const labelEl = this.getActionLabelElement(sendToCustomerBtn);
        if (labelEl) labelEl.textContent = nextLabel;
      }
      if (sendToCustomerBtn.dataset.saving !== "true") {
        sendToCustomerBtn.disabled = !hasInvoiceUrl;
        sendToCustomerBtn.classList.toggle("opacity-60", !hasInvoiceUrl);
        sendToCustomerBtn.classList.toggle("pointer-events-none", !hasInvoiceUrl);
      }
    }

    const generateInvoiceBtn = document.getElementById("generate-invoice-btn");
    if (invoiceNumber) {
      generateInvoiceBtn?.classList.add("hidden");
      this.renderInvoiceActivitiesTable(this.getInvoiceActivities());
    } else {
      generateInvoiceBtn?.classList.remove("hidden");
    }

    document.getElementById("invoice-total").classList.remove("hidden");
  }

  toPascalCase(str) {
    return str
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("_");
  }

  renderInvoiceActivitiesTable(records = []) {
    const placeholder = document.querySelector("[data-invoice-placeholder]");
    const tableWrapper = document.querySelector(
      "[data-invoice-activity-table]"
    );
    if (!tableWrapper) return;

    const activities = Array.isArray(records) ? records.filter(Boolean) : [];
    tableWrapper.innerHTML = "";

    if (!activities.length) {
      tableWrapper.classList.add("hidden");
      placeholder?.classList.remove("hidden");
      return;
    }

    placeholder?.classList.add("hidden");
    tableWrapper.classList.remove("hidden");
    const mappedActivities = this.mapActivitiesForSharedTable(activities);
    const tableHTML = this.createActivitiesTable(mappedActivities);
    tableWrapper.id = "invoiceActivitiesTable";
    tableWrapper.appendChild(tableHTML);
    this.bindActivityRowActions("invoiceActivitiesTable");
  }

  createDealInformationModal() {
    // wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "dealInformationWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="dealInformationBox" class="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3 hover:border-b active:border-b focus:border-b focus-visible:border-b">
          <div class="text-neutral-700 text-lg font-semibold leading-tight hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg">Deal Information</div>
          <button id="dealInformationCloseBtn" class="!text-gray-600 hover:!text-gray-600 active:!text-gray-600 focus:!text-gray-600 focus-visible:!text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content (template only) -->
        <div class="py-6 space-y-4">
          <label class="block">
            <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Deal Name</span>
            <input class="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-100 outline-none hover:!border-neutral-300 active:!border-neutral-300 hover:!bg-neutral-100 active:!bg-neutral-100 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 hover:bg-neutral-100 active:bg-neutral-100 focus:bg-neutral-100 focus-visible:bg-neutral-100 hover:outline-none active:outline-none focus:outline-none focus-visible:outline-none mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder="Deal name"/>
          </label>
  
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Deal Value</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2 hover:!border-neutral-300 active:!border-neutral-300 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder="0.00"/>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Sales Stage</span>
              <select class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                <option>Select</option>
              </select>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Expected Win Percentage</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2 hover:!border-neutral-300 active:!border-neutral-300 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder=""/>
            </label>
  
            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Expected Close Date</span>
                <input class="w-full rounded border border-neutral-300 px-3 py-2 hover:!border-neutral-300 active:!border-neutral-300 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder="dd/mm/yyyy"/>
              </label>
              <label class="block">
                <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Actual Close Date</span>
                <input class="w-full rounded border border-neutral-300 px-3 py-2 hover:!border-neutral-300 active:!border-neutral-300 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder="dd/mm/yyyy"/>
              </label>
            </div>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Weighted Value</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2 hover:!border-neutral-300 active:!border-neutral-300 hover:border active:border focus:border focus-visible:border hover:border-neutral-300 active:border-neutral-300 focus:border-neutral-300 focus-visible:border-neutral-300 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder="0.00"/>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Recent Activity</span>
              <select class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                <option>Select</option>
              </select>
            </label>
          </div>
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end items-center gap-3 border-t hover:border-t active:border-t focus:border-t focus-visible:border-t">
          <button id="dealInformationCancelBtn"
            class="!px-4 !py-3 !rounded !text-neutral-700 !text-sm !font-medium hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Cancel</button>
  
          <button id="dealInformationSaveBtn"
            class="!px-4 !py-3 !bg-[#003882] !rounded !text-white !text-sm !font-medium hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper);

    // refs
    const modal = modalWrapper;
    const box = document.getElementById("dealInformationBox");
    const close = document.getElementById("dealInformationCloseBtn");
    const cancel = document.getElementById("dealInformationCancelBtn");
    const save = document.getElementById("dealInformationSaveBtn");

    // toggle
    this.toggleDealInformation = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // outside click
    modal.addEventListener("click", (e) => {
      if (!box.contains(e.target)) this.toggleDealInformation(false);
    });

    // buttons
    close.onclick = () => this.toggleDealInformation(false);
    cancel.onclick = () => this.toggleDealInformation(false);
    save.onclick = () => {
      console.log("Deal Information: Save clicked");
      this.toggleDealInformation(false);
    };
  }

  CreateQuoteOnBehalfOfServicemanModal() {
    // wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "createQuoteWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="createQuoteBox" class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3 hover:border-b active:border-b focus:border-b focus-visible:border-b">
          <div class="text-neutral-700 text-lg font-semibold leading-tight hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg">
            Create Quote on Behalf of Serviceman?
          </div>
          <button id="createQuoteCloseBtn" class="!text-gray-600 hover:!text-gray-600 active:!text-gray-600 focus:!text-gray-600 focus-visible:!text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content (template only, no data wiring) -->
        <div class="py-6 space-y-4">
          <p class="text-neutral-700 text-base hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-base active:text-base focus:text-base focus-visible:text-base">
            You're creating this quote as the admin, but it will be attributed to:
          </p>
          <p class="text-neutral-900 hover:!text-neutral-900 active:!text-neutral-900 hover:text-neutral-900 active:text-neutral-900 focus:text-neutral-900 focus-visible:text-neutral-900">
            <span class="font-semibold">Jack Lawson</span>
            <span class="text-neutral-600 hover:!text-neutral-600 active:!text-neutral-600 hover:text-neutral-600 active:text-neutral-600 focus:text-neutral-600 focus-visible:text-neutral-600">(Serviceman ID:
              <a href="#" class="text-sky-700 hover:!underline hover:!text-sky-700 active:!text-sky-700 hover:text-sky-700 active:text-sky-700 focus:text-sky-700 focus-visible:text-sky-700">#JL-042</a>)</span>
          </p>
          <p class="text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">Do you want to proceed?</p>
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end gap-3 border-t hover:border-t active:border-t focus:border-t focus-visible:border-t">
          <button id="createQuoteCancelBtn"
            class="!px-4 !py-3 !rounded !text-neutral-700 !text-sm !font-medium hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Cancel</button>
  
          <button id="createQuoteConfirmBtn"
            class="!px-4 !py-3 !bg-[#003882] !rounded !text-white !text-sm !font-medium hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Create & Notify</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper);

    // refs
    const modal = modalWrapper;
    const box = document.getElementById("createQuoteBox");
    const close = document.getElementById("createQuoteCloseBtn");
    const cancel = document.getElementById("createQuoteCancelBtn");
    const confirm = document.getElementById("createQuoteConfirmBtn");

    // toggle
    this.toggleCreateQuoteOnBehalfOfServiceman = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // outside click
    modal.addEventListener("click", (e) => {
      if (!box.contains(e.target))
        this.toggleCreateQuoteOnBehalfOfServiceman(false);
    });

    // buttons
    close.onclick = () => this.toggleCreateQuoteOnBehalfOfServiceman(false);
    cancel.onclick = () => this.toggleCreateQuoteOnBehalfOfServiceman(false);
    confirm.onclick = () => {
      console.log("Create & Notify confirmed");
      this.toggleCreateQuoteOnBehalfOfServiceman(false);
    };
  }

  EditNotes() {
    // Build wrapper
    const wrapper = document.createElement("div");
    wrapper.id = "editNotesWrapper";
    wrapper.className =
      "fixed inset-0 z-50 hidden items-center justify-center bg-black/50";

    // Modal HTML
    wrapper.innerHTML = `
      <div id="editNotesBox" class="w-full max-w-2xl rounded-lg bg-white shadow-lg hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-6 py-4 hover:border-b active:border-b focus:border-b focus-visible:border-b">
          <h2 class="text-lg font-semibold text-neutral-800 hover:!text-neutral-800 active:!text-neutral-800 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg hover:text-neutral-800 active:text-neutral-800 focus:text-neutral-800 focus-visible:text-neutral-800">Edit Notes</h2>
          <button id="editNotesCloseBtn" type="button" aria-label="Close"
                  class="!text-neutral-500 hover:!text-neutral-500 active:!text-neutral-500 focus:!text-neutral-500 focus-visible:!text-neutral-500">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z"
                    fill="#4B5563"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-6 py-5">
          <label for="notesRecommendations" class="mb-2 block text-sm font-medium text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700  hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">
            Recommendations
          </label>
          <textarea id="notesRecommendations" rows="3"
            class="w-full resize-y rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600 hover:!border-slate-300 active:!border-slate-300 hover:!bg-white active:!bg-white hover:border active:border focus:border focus-visible:border hover:border-slate-300 active:border-slate-300 focus:border-slate-300 focus-visible:border-slate-300 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline-none active:outline-none focus:outline-none focus-visible:outline-none mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default"
            placeholder=""></textarea>
        </div>
  
        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 border-t px-6 py-4 hover:border-t active:border-t focus:border-t focus-visible:border-t">
          <button id="editNotesCancelBtn" type="button"
            class="!rounded !px-4 !py-2 !text-sm !font-medium !text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">
            Cancel
          </button>
          <button id="editNotesSaveBtn" type="button"
            class="!rounded !bg-[#003882] !px-4 !py-2 !text-sm !font-medium !text-white hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const box = wrapper.querySelector("#editNotesBox");
    const btnX = wrapper.querySelector("#editNotesCloseBtn");
    const btnCancel = wrapper.querySelector("#editNotesCancelBtn");
    const btnSave = wrapper.querySelector("#editNotesSaveBtn");
    const textarea = wrapper.querySelector("#notesRecommendations");

    this.toggleEditNotes = (show = true) => {
      if (show) {
        wrapper.classList.remove("hidden");
        wrapper.classList.add("flex");
        document.body.style.overflow = "hidden";
        setTimeout(() => textarea?.focus(), 0);
      } else {
        wrapper.classList.add("hidden");
        wrapper.classList.remove("flex");
        document.body.style.overflow = "";
      }
    };

    wrapper.addEventListener("click", (e) => {
      if (!box.contains(e.target)) this.toggleEditNotes(false);
    });

    btnX.addEventListener("click", () => this.toggleEditNotes(false));
    btnCancel.addEventListener("click", () => this.toggleEditNotes(false));
    btnSave.addEventListener("click", () => {
      const value = textarea.value.trim();
      console.log("Save notes:", value); // replace with your save handler
      this.toggleEditNotes(false);
    });
  }

  createViewJobDocumentsModal() {
    // Create wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "quoteDocsModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="quoteDocsModalBox" class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3 hover:border-b active:border-b focus:border-b focus-visible:border-b">
          <div class="text-neutral-700 text-lg font-semibold leading-tight hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg">
            Quote Documents
          </div>
          <button id="closeQuoteDocsBtn" class="!text-gray-600 hover:!text-gray-600 active:!text-gray-600 focus:!text-gray-600 focus-visible:!text-gray-600">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>

        <div class="my-3 p-3 flex flex-col gap-2 border border-slate-200 rounded hover:!border-slate-200 active:!border-slate-200 hover:border active:border focus:border focus-visible:border hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200">
        <!-- Upload Dropzone -->
        <div class="py-6">
          <div class="border-2 border-dashed border-gray-300 rounded-lg bg-slate-50 hover:!border-gray-300 active:!border-gray-300 hover:!bg-slate-50 active:!bg-slate-50 hover:border-2 active:border-2 focus:border-2 focus-visible:border-2 hover:border-dashed active:border-dashed focus:border-dashed focus-visible:border-dashed hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:bg-slate-50 active:bg-slate-50 focus:bg-slate-50 focus-visible:bg-slate-50">
            <div class="flex flex-col items-center justify-center text-center px-6 py-10 hover:text-center active:text-center focus:text-center focus-visible:text-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l-4 4h3v6h2V7h3l-4-4Z" fill="#64748B"/>
                <path d="M5 14a5 5 0 0 0 5 5h4a5 5 0 0 0 0-10" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p class="text-sm ">
                <button id="quoteDocsUploadBtn" class="!text-blue-600 !font-medium hover:!text-blue-600 active:!text-blue-600 focus:!text-blue-600 focus-visible:!text-blue-600">Click to upload</button>
                <span class="text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500"> or drag and drop</span>
              </p>
              <p class="text-gray-500 text-xs mt-2 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs">SVG, PNG, JPG or GIF (max 800×400px)</p>
              <input id="quoteDocsFileInput" type="file" class="hidden" multiple accept=".svg,.png,.jpg,.jpeg,.gif" />
            </div>
          </div>
        </div>
  
        <!-- Files List -->
        <div id="quoteDocsList" class="space-y-3">
          ${["image1.jpg", "image1.jpg", "image1.jpg"]
            .map(
              (name) => `
            <div class="flex items-center justify-between bg-gray-100 rounded-md px-4 py-3 hover:!bg-gray-100 active:!bg-gray-100 hover:bg-gray-100 active:bg-gray-100 focus:bg-gray-100 focus-visible:bg-gray-100">
              <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600 hover:!text-blue-600 active:!text-blue-600 hover:text-blue-600 active:text-blue-600 focus:text-blue-600 focus-visible:text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
                </svg>
                <span class="text-sm text-gray-700 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">${name}</span>
              </div>
              <button class="quoteDocsDeleteBtn !text-gray-500 hover:!text-gray-500 active:!text-gray-500 focus:!text-gray-500 focus-visible:!text-gray-500" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M9 3h6m-8 4h10m-8 0v12m6-12v12M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          `
            )
            .join("")}
        </div></div>
  
        
  
        <!-- Actions -->
        <div class="pt-6 mt-6 flex justify-end space-x-3 border-t hover:border-t active:border-t focus:border-t focus-visible:border-t">
          <button id="cancelQuoteDocsBtn" class="!text-slate-500 !text-sm !font-medium hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">
            Cancel
          </button>
          <button id="saveQuoteDocsBtn" class="!px-4 !py-3 !bg-blue-600 !text-white !text-sm !font-medium !rounded hover:!bg-blue-600 active:!bg-blue-600 focus:!bg-blue-600 focus-visible:!bg-blue-600 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // References
    const modal = document.getElementById("quoteDocsModalWrapper");
    const modalBox = document.getElementById("quoteDocsModalBox");
    const closeBtn = document.getElementById("closeQuoteDocsBtn");
    const cancelBtn = document.getElementById("cancelQuoteDocsBtn");
    const saveBtn = document.getElementById("saveQuoteDocsBtn");
    const uploadBtn = document.getElementById("quoteDocsUploadBtn");
    const fileInput = document.getElementById("quoteDocsFileInput");
    const list = document.getElementById("quoteDocsList");

    // Toggle visibility
    this.toggleQuoteDocsModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleQuoteDocsModal(false);
    });

    // Close on buttons
    closeBtn.onclick = () => this.toggleQuoteDocsModal(false);
    cancelBtn.onclick = () => this.toggleQuoteDocsModal(false);

    // Save action
    saveBtn.onclick = () => {
      console.log("Quote Documents saved");
      this.toggleQuoteDocsModal(false);
    };

    // Upload triggers
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      files?.forEach((f) => {
        const row = document.createElement("div");
        row.className =
          "flex items-center justify-between bg-gray-100 rounded-md px-4 py-3";
        row.innerHTML = `
          <div class="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600 hover:!text-blue-600 active:!text-blue-600 hover:text-blue-600 active:text-blue-600 focus:text-blue-600 focus-visible:text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
            </svg>
            <span class="text-sm text-gray-700 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">${f.name}</span>
          </div>
          <button class="quoteDocsDeleteBtn !text-gray-500 hover:!text-gray-500 active:!text-gray-500 focus:!text-gray-500 focus-visible:!text-gray-500" aria-label="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M9 3h6m-8 4h10m-8 0v12m6-12v12M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        `;
        list.appendChild(row);
      });
      fileInput.value = "";
    };

    // Delegate delete clicks
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".quoteDocsDeleteBtn");
      if (btn) btn.parentElement.remove();
    });
  }

  createActivityListModal(records) {
    // -------- Dummy data (used if no records passed in) --------
    const demoRows = [
      {
        task: "Task 1",
        option: 1,
        service: "Possum",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 129.99,
        status: "Quoted",
      },
      {
        task: "Task 1",
        option: 2,
        service: "Possum",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 119.99,
        status: "To Be Scheduled",
      },
      {
        task: "Task 2",
        option: 1,
        service: "Rat removal",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 89.99,
        status: "Scheduled",
      },
      {
        task: "Task 2",
        option: 2,
        service: "Rat removal",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 109.99,
        status: "Completed",
      },
    ];

    const rows = Array.isArray(records) && records.length ? records : demoRows;

    // Status → Tailwind pill styles
    // -------- Create wrapper --------
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "activityListModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="activityListModalBox" class="bg-white rounded-lg shadow-lg w-[90vw] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-6 py-3 hover:!bg-blue-800 active:!bg-blue-800 hover:!text-white active:!text-white hover:bg-blue-800 active:bg-blue-800 focus:bg-blue-800 focus-visible:bg-blue-800 hover:text-white active:text-white focus:text-white focus-visible:text-white">
          <h3 class="text-lg font-semibold leading-tight hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg">Activity List</h3>
          <button id="closeActivityListBtn" class="!p-1 !rounded !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-4">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left hover:text-left active:text-left focus:text-left focus-visible:text-left">
              <thead>
                <tr class="text-gray-600 text-sm hover:!text-gray-600 active:!text-gray-600 hover:text-gray-600 active:text-gray-600 focus:text-gray-600 focus-visible:text-gray-600 ">
                  <th class="font-medium py-3 px-4">Task</th>
                  <th class="font-medium py-3 px-4">Option</th>
                  <th class="font-medium py-3 px-4">Service</th>
                  <th class="font-medium py-3 px-4">Quoted Text</th>
                  <th class="font-medium py-3 px-4">Quoted Price</th>
                  <th class="font-medium py-3 px-4">Activity Status</th>
                </tr>
              </thead>
              <tbody id="activityListTbody" class="text-gray-800 hover:!text-gray-800 active:!text-gray-800 hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // -------- Render function --------
    this.renderRows = (data) => {
      const tbody = document.getElementById("activityListTbody");
      tbody.innerHTML = data
        .map((r, i) => {
          const statusPalette = this._resolvePaletteEntry(
            this.getColorMappings().activityStatus,
            r.status,
            r.status
          );
          const price =
            typeof r.price === "number" ? `$${r.price.toFixed(2)}` : r.price;

          return `
          <tr class="${i % 2 ? "bg-gray-50" : "bg-white"}">
            <td class="py-4 px-4 whitespace-nowrap">${r.task ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">${r.option ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">${r.service ?? "-"}</td>
            <td class="py-4 px-4 max-w-[520px]">
              <div class="truncate" title="${(r.text ?? "").replace(
                /"/g,
                "&quot;"
              )}">
                ${r.text ?? ""}
              </div>
            </td>
            <td class="py-4 px-4 whitespace-nowrap">${price ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs" style="${
                statusPalette
                  ? `color:${statusPalette.color};background-color:${statusPalette.backgroundColor};`
                  : "color:#475569;background-color:#f1f5f9;"
              }">
                ${r.status ?? "Pending"}
              </span>
            </td>
          </tr>`;
        })
        .join("");
    };

    // Initial render
    this.renderRows(rows);

    // -------- Wiring / controls --------
    const modal = document.getElementById("activityListModalWrapper");
    const modalBox = document.getElementById("activityListModalBox");
    const closeBtn = document.getElementById("closeActivityListBtn");

    // Toggle visibility
    this.toggleActivityListModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleActivityListModal(false);
    });

    // Close on button
    closeBtn.onclick = () => this.toggleActivityListModal(false);

    // Optional: expose a way to re-render with new data later
    this.updateActivityListModal = (nextRecords = []) => {
      this.renderRows(nextRecords);
    };
  }

  createWildlifeReportModal(initial = {}) {
    const defaults = {
      possums: String(initial.possums ?? "1"),
      possumComment: initial.possumComment ?? "",
      turkeys: String(initial.turkeys ?? "1"),
      turkeyComment: initial.turkeyComment ?? "",
      address: initial.address ?? "NSW 2482 Mullumbimby, 13 Parakeet Place",
    };

    // Wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "wildlifeReportModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black/50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="wildlifeReportModalBox" class="bg-white rounded-lg shadow-lg w-[95vw] max-w-md hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-4 py-3 hover:!bg-blue-800 active:!bg-blue-800 hover:!text-white active:!text-white hover:bg-blue-800 active:bg-blue-800 focus:bg-blue-800 focus-visible:bg-blue-800 hover:text-white active:text-white focus:text-white focus-visible:text-white">
          <div class="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.4566 7.97344C21.29 7.90795 21.1125 7.87455 20.9335 7.875H20.9147C19.9693 7.88906 18.9089 8.77453 18.3525 10.1138C17.6855 11.7159 17.9925 13.3552 19.0435 13.7766C19.2099 13.8421 19.3873 13.8755 19.5661 13.875C20.5163 13.875 21.5911 12.9844 22.1522 11.6363C22.8146 10.0341 22.5028 8.39484 21.4566 7.97344ZM15.3563 14.2256C14.0532 12.0633 13.4907 11.25 12 11.25C10.5094 11.25 9.94222 12.0684 8.6391 14.2256C7.52347 16.0706 5.26879 16.2244 4.70629 17.7914C4.59216 18.0784 4.53485 18.3849 4.53754 18.6937C4.53754 19.9683 5.51254 21 6.71254 21C8.20316 21 10.2328 19.8098 12.0047 19.8098C13.7766 19.8098 15.7969 21 17.2875 21C18.4875 21 19.4579 19.9687 19.4579 18.6937C19.4589 18.3846 19.4 18.0781 19.2844 17.7914C18.7219 16.2187 16.4719 16.0706 15.3563 14.2256ZM9.02394 9.1875C9.08671 9.18756 9.14939 9.18286 9.21144 9.17344C10.2994 9.01547 10.9786 7.50797 10.7321 5.80547C10.5 4.20047 9.52597 3 8.50738 3C8.44462 2.99994 8.38194 3.00465 8.31988 3.01406C7.23191 3.17203 6.55269 4.67953 6.79926 6.38203C7.03129 7.98234 8.00535 9.1875 9.02394 9.1875ZM17.1994 6.38203C17.446 4.67953 16.7668 3.17203 15.6788 3.01406C15.6167 3.00465 15.5541 2.99994 15.4913 3C14.4727 3 13.5005 4.20047 13.268 5.80547C13.0214 7.50797 13.7007 9.01547 14.7886 9.17344C14.8507 9.18286 14.9134 9.18756 14.9761 9.1875C15.9947 9.1875 16.9688 7.98234 17.1994 6.38203ZM4.95801 13.7766C6.00754 13.3547 6.3141 11.7141 5.64801 10.1138C5.08738 8.76563 4.01347 7.875 3.06472 7.875C2.88585 7.8745 2.7085 7.9079 2.54207 7.97344C1.49254 8.39531 1.18597 10.0359 1.85207 11.6363C2.41269 12.9844 3.4866 13.875 4.43535 13.875C4.61422 13.8755 4.79157 13.8421 4.95801 13.7766Z" stroke="white" stroke-miterlimit="10"/>
            </svg>
            <h3 class="text-base font-semibold hover:text-base active:text-base focus:text-base focus-visible:text-base">Wildlife Report</h3>
          </div>
          <button id="closeWildlifeReportBtn" class="!p-1 !rounded !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-4 py-4 space-y-4">
          <!-- Possums -->
          <div>
            <label class="block text-sm text-gray-700 mb-1 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">Possums</label>
            <div class="relative">
              <select id="wrPossums" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                ${Array.from(
                  { length: 10 },
                  (_, i) =>
                    `<option value="${i + 1}" ${
                      defaults.possums == String(i + 1) ? "selected" : ""
                    }>${i + 1}</option>`
                ).join("")}
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z"/>
              </svg>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">Comment</label>
            <textarea id="wrPossumComment" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:!border-gray-300 active:!border-gray-300 hover:!text-gray-800 active:!text-gray-800 hover:border active:border focus:border focus-visible:border hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder=""></textarea>
          </div>
  
          <!-- Turkeys -->
          <div>
            <label class="block text-sm text-gray-700 mb-1 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">Turkeys</label>
            <div class="relative">
              <select id="wrTurkeys" class="mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 !block appearance-none hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default">
                ${Array.from(
                  { length: 10 },
                  (_, i) =>
                    `<option value="${i + 1}" ${
                      defaults.turkeys == String(i + 1) ? "selected" : ""
                    }>${i + 1}</option>`
                ).join("")}
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z"/>
              </svg>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">Comment</label>
            <textarea id="wrTurkeyComment" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:!border-gray-300 active:!border-gray-300 hover:!text-gray-800 active:!text-gray-800 hover:border active:border focus:border focus-visible:border hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" placeholder=""></textarea>
          </div>
  
          <!-- Address -->
          <div>
            <label class="block text-sm text-gray-700 mb-1 hover:!text-gray-700 active:!text-gray-700  hover:text-gray-700 active:text-gray-700 focus:text-gray-700 focus-visible:text-gray-700">Release Address</label>
            <input id="wrAddress" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:!border-gray-300 active:!border-gray-300 hover:!text-gray-800 active:!text-gray-800 hover:border active:border focus:border focus-visible:border hover:border-gray-300 active:border-gray-300 focus:border-gray-300 focus-visible:border-gray-300 hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800 mt-2 w-full px-2.5 py-2 bg-white rounded outline outline-1 outline-offset-[-1px] outline-gray-300 inline-flex justify-start items-center gap-2 overflow-hidden text-slate-700 text-sm font-normal font-['Inter'] leading-5 placeholder:text-slate-500 placeholder:text-sm placeholder:font-normal placeholder:font-['Inter'] placeholder:leading-5 focus:outline-gray-400 hover:!bg-white active:!bg-white hover:!text-slate-700 active:!text-slate-700 hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:outline active:outline focus:outline focus-visible:outline hover:outline-1 active:outline-1 focus:outline-1 focus-visible:outline-1 hover:outline-offset-[-1px] active:outline-offset-[-1px] focus:outline-offset-[-1px] focus-visible:outline-offset-[-1px] hover:outline-gray-300 active:outline-gray-300 focus:outline-gray-300 focus-visible:outline-gray-300 hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700  hover:placeholder:text-sm active:placeholder:text-sm focus:placeholder:text-sm focus-visible:placeholder:text-sm browser-default" />
          </div>
        </div>
  
        <!-- Footer -->
        <div class="flex justify-end gap-3 px-4 py-3 border-t rounded-b-lg hover:border-t active:border-t focus:border-t focus-visible:border-t">
          <button id="cancelWildlifeReportBtn" class="!text-sm !text-slate-500 !font-medium hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Cancel</button>
          <button id="saveWildlifeReportBtn" class="!px-4 !py-2 !bg-blue-600 !text-white !text-sm !font-medium !rounded hover:!bg-blue-600 active:!bg-blue-600 focus:!bg-blue-600 focus-visible:!bg-blue-600 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // Pre-fill values
    document.getElementById("wrPossums").value = defaults.possums;
    document.getElementById("wrPossumComment").value = defaults.possumComment;
    document.getElementById("wrTurkeys").value = defaults.turkeys;
    document.getElementById("wrTurkeyComment").value = defaults.turkeyComment;
    document.getElementById("wrAddress").value = defaults.address;

    // Refs
    const modal = document.getElementById("wildlifeReportModalWrapper");
    const modalBox = document.getElementById("wildlifeReportModalBox");
    const closeBtn = document.getElementById("closeWildlifeReportBtn");
    const cancelBtn = document.getElementById("cancelWildlifeReportBtn");
    const saveBtn = document.getElementById("saveWildlifeReportBtn");

    // Toggle
    this.toggleWildlifeReportModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close interactions
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleWildlifeReportModal(false);
    });
    closeBtn.onclick = () => this.toggleWildlifeReportModal(false);
    cancelBtn.onclick = () => this.toggleWildlifeReportModal(false);

    // Save: collect values (hook up to your API as needed)
    saveBtn.onclick = () => {
      const payload = {
        possums: Number(document.getElementById("wrPossums").value),
        possumComment: document.getElementById("wrPossumComment").value.trim(),
        turkeys: Number(document.getElementById("wrTurkeys").value),
        turkeyComment: document.getElementById("wrTurkeyComment").value.trim(),
        address: document.getElementById("wrAddress").value.trim(),
      };
      console.log("Wildlife Report saved:", payload);
      this.toggleWildlifeReportModal(false);
    };
  }

  async createTasksModal(tasks) {
    const demo = [
      {
        title: "Field Inspection and building inspection",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "In Progress",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
    ];

    const rows = Array.isArray(tasks) && tasks.length ? tasks : demo;

    const statusPills = {
      "In Progress": "bg-yellow-100 text-yellow-800",
      "To-Do": "bg-blue-100 text-blue-700",
      Completed: "bg-emerald-100 text-emerald-700",
      Blocked: "bg-red-100 text-red-700",
    };

    const modalWrapper = document.createElement("div");
    modalWrapper.id = "tasksModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black/50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="tasksModalBox" class="bg-white rounded-lg shadow-lg hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-5 py-3 hover:!bg-blue-800 active:!bg-blue-800 hover:!text-white active:!text-white hover:bg-blue-800 active:bg-blue-800 focus:bg-blue-800 focus-visible:bg-blue-800 hover:text-white active:text-white focus:text-white focus-visible:text-white">
          <h3 class="text-base font-semibold hover:text-base active:text-base focus:text-base focus-visible:text-base">Tasks</h3>
          <button id="closeTasksBtn" class="!p-1 !rounded !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-2 py-2">
          <ul id="tasksList" class="divide-y divide-gray-200">
            <!-- rows injected -->
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // ---- Render ----
    function render(list) {
      const ul = document.getElementById("tasksList");
      ul.innerHTML = list
        .map((t) => {
          const pill = statusPills[t.status] || "bg-gray-100 text-gray-700";
          return `
            <li class="px-4 py-3">
              <div class="flex items-center gap-3">
                <!-- left icon -->
                <div class="flex-shrink-0">
                  <span class="inline-flex items-center justify-center w-6 h-6">
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 text-gray-500 hover:!text-gray-500 active:!text-gray-500 hover:text-gray-500 active:text-gray-500 focus:text-gray-500 focus-visible:text-gray-500" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 12l2.5 2.5L16 9" />
                    </svg>
                  </span>
                </div>
  
                <!-- text block -->
                <div class="flex-1 w-full flex items-center gap-3">
                  <div class="flex flex-nowrap min-w-0 gap-9">
                    <div class="w-fit text-neutral-700 hover:!text-neutral-700 active:!text-neutral-700 hover:text-neutral-700 active:text-neutral-700 focus:text-neutral-700 focus-visible:text-neutral-700">
                      ${t.title ?? "-"}
                    </div>
                    <div class="text-sm text-gray-600 truncate min-w-0 hover:!text-gray-600 active:!text-gray-600  hover:text-gray-600 active:text-gray-600 focus:text-gray-600 focus-visible:text-gray-600">
                      ${t.description ?? ""}
                    </div>
                  </div>
  
                  <!-- status pill -->
                  <span class="ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs ${pill} hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs">
                    ${t.status ?? "To-Do"}
                  </span>
  
                </div>
              </div>
            </li>
          `;
        })
        .join("");
    }

    render(rows);

    // ---- Wiring ----
    const modal = document.getElementById("tasksModalWrapper");
    const modalBox = document.getElementById("tasksModalBox");
    const closeBtn = document.getElementById("closeTasksBtn");

    this.toggleTasksModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleTasksModal(false);
    });
    closeBtn.onclick = () => this.toggleTasksModal(false);

    // Expose a way to update later
    this.updateTasksModal = (next = []) => render(next);
  }

  setupSectionNavigation() {
    this.sectionOrder = [
      "job-information",
      "add-activities",
      "add-materials",
      "uploads",
      "invoice",
    ].filter((id) => document.querySelector(`[data-section="${id}"]`));

    this.currentSection = this.sectionOrder[0] || null;
    this.showSection(this.currentSection);
    this.setupJobInformationTabs();

    const sidebarItems = document.querySelectorAll("[data-section-target]");
    sidebarItems?.forEach((item) => {
      item.style.pointerEvents = "none";
      item.setAttribute("aria-disabled", "true");
      item.classList.add("cursor-default", "select-none");
    });

    const nextBtn =
      document.querySelector('[data-nav-action="next"]') ||
      document.querySelector('[data-nav="next"]') ||
      Array.from(document.querySelectorAll("button, div")).find((el) =>
        el.textContent.trim().toLowerCase().startsWith("next")
      );
    const backBtn =
      document.querySelector('[data-nav-action="back"]') ||
      document.querySelector('[data-nav="back"]') ||
      Array.from(document.querySelectorAll("button, div")).find(
        (el) => el.textContent.trim().toLowerCase() === "back"
      );

    if (nextBtn)
      nextBtn.addEventListener("click", (e) => this.goNextSection(e));
    if (backBtn)
      backBtn.addEventListener("click", (e) => this.goPrevSection(e));
  }

  setupCancelButton() {
    const cancelBtns = document.querySelectorAll(
      '[data-nav-action="cancel"], #cancel-btn'
    );
    cancelBtns?.forEach((btn) => {
      if (btn.dataset.boundCancelModal) return;
      btn.dataset.boundCancelModal = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showUnsavedChangesModal({
          onDiscard: () => {
            this.redirectToDashboard();
          },
          onSave: async () => {
            const saved = await this.saveDraft({ redirectAfterSave: true });
            return saved;
          },
        });
      });
    });
  }

  setupResetButton() {
    const resetBtns = document.querySelectorAll(
      '[data-nav-action="reset"], #reset-btn'
    );
    resetBtns?.forEach((btn) => {
      if (btn.dataset.boundResetModal) return;
      btn.dataset.boundResetModal = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        showResetConfirmModal({
          onConfirm: () => {
            this.resetAllForms();
          },
        });
      });
    });
  }

  getDashboardRedirectUrl() {
    return "https://my.awesomate.pro/admin/dashboard";
  }

  redirectToDashboard() {
    window.location.href = this.getDashboardRedirectUrl();
  }

  getActionLabelElement(actionEl) {
    if (!actionEl) return null;
    const textLike = Array.from(actionEl.querySelectorAll("div, span")).find(
      (el) => el.children.length === 0 && (el.textContent || "").trim()
    );
    return textLike || actionEl;
  }

  setActionBusyState(actionEl, busy, loadingText = "Saving...") {
    if (!actionEl) return;

    const labelEl = this.getActionLabelElement(actionEl);
    if (!labelEl) return;

    if (!actionEl.dataset.defaultLabel) {
      actionEl.dataset.defaultLabel = (labelEl.textContent || "").trim();
    }

    if (busy) {
      actionEl.dataset.saving = "true";
      actionEl.classList.add("pointer-events-none", "opacity-60");
      actionEl.setAttribute("aria-busy", "true");
      if (actionEl.tagName?.toLowerCase() === "button") {
        actionEl.disabled = true;
      }
      labelEl.textContent = loadingText;
      return;
    }

    actionEl.dataset.saving = "false";
    actionEl.classList.remove("pointer-events-none", "opacity-60");
    actionEl.removeAttribute("aria-busy");
    if (actionEl.tagName?.toLowerCase() === "button") {
      actionEl.disabled = false;
    }
    labelEl.textContent = actionEl.dataset.defaultLabel || "Save";
  }

  setupSaveDraftButton() {
    const saveDraftBtns = document.querySelectorAll(
      '[data-nav-action="save-draft"], #save-draft-btn'
    );
    saveDraftBtns?.forEach((btn) => {
      if (btn.dataset.boundSaveDraft) return;
      btn.dataset.boundSaveDraft = "true";
      btn.addEventListener("click", async (e) => {
        e.__saveDraftHandled = true;
        e.preventDefault();
        e.stopPropagation();
        if (btn.dataset.saving === "true") return;
        await this.saveDraft({ triggerEl: btn });
      });
    });
  }

  buildDraftPayload() {
    const rawFields = this.getFieldValues(
      '[data-job-section="job-section-individual"] [data-field]'
    );

    const payload = {};
    const contactType = (
      rawFields.contact_type ||
      this.activeContactType ||
      "individual"
    ).toLowerCase();
    payload.contact_type = contactType;
    payload.account_type = contactType === "entity" ? "Entity" : "Contact";

    const priority = rawFields.priority || "";
    if (priority) payload.priority = priority;

    const jobType = rawFields.job_type || "";
    if (jobType) payload.job_type = jobType;

    const jobStatus = rawFields.job_status || "";
    if (jobStatus) payload.job_status = jobStatus;

    const paymentStatus = rawFields.payment_status || "";
    if (paymentStatus) payload.payment_status = paymentStatus;

    if (typeof rawFields.mark_complete === "boolean") {
      payload.mark_complete = rawFields.mark_complete;
    }
    if (typeof rawFields.pca_done === "boolean") {
      payload.pca_done = rawFields.pca_done;
    }
    if (typeof rawFields.prestart_done === "boolean") {
      payload.prestart_done = rawFields.prestart_done;
    }

    const jobRequiredBy = rawFields.job_required_by || "";
    if (jobRequiredBy) {
      payload.date_job_required_by = jobRequiredBy;
    }

    const propertyId = rawFields.property_id || "";
    if (propertyId) {
      payload.property_id = propertyId;
    }

    const serviceProviderId =
      document.querySelector('[data-serviceman-field="serviceman_id"]')?.value ||
      "";
    if (serviceProviderId) {
      payload.primary_service_provider_id = serviceProviderId;
    }

    if (contactType === "entity") {
      const companyId =
        rawFields.company_id ||
        document.querySelector('[data-field="company_id"]')?.value ||
        document.querySelector('[data-entity-id="entity-id"]')?.value ||
        "";
      const entityContactId =
        rawFields.contact_id ||
        document.querySelector('[data-entity-id="entity-contact-id"]')?.value ||
        "";
      if (companyId) payload.client_entity_id = companyId;
      if (entityContactId) payload.contact_id = entityContactId;
      delete payload.client_individual_id;
    } else {
      const clientId =
        rawFields.client_id ||
        document.querySelector('[data-field="client_id"]')?.value ||
        document.querySelector('[data-contact-field="contact_id"]')?.value ||
        "";
      if (clientId) payload.client_individual_id = clientId;
      payload.contact_id = "";
      delete payload.client_entity_id;
    }

    return payload;
  }

  extractCreatedJobId(result) {
    if (!result) return "";
    if (result?.resp?.id) return result.resp.id;
    if (Array.isArray(result?.resp) && result.resp[0]?.id)
      return result.resp[0].id;
    if (result?.id) return result.id;
    if (Array.isArray(result) && result[0]?.id) return result[0].id;
    return "";
  }

  async saveDraft({ redirectAfterSave = false, triggerEl = null } = {}) {
    if (triggerEl) {
      this.setActionBusyState(triggerEl, true, "Saving...");
    }

    const payload = this.buildDraftPayload();
    const hasPayload = Object.keys(payload).length > 0;

    if (!hasPayload) {
      if (redirectAfterSave) this.redirectToDashboard();
      if (triggerEl) this.setActionBusyState(triggerEl, false);
      return true;
    }

    const currentJobId = this.getJobId();
    this.startLoading(currentJobId ? "Saving draft..." : "Creating draft...");
    try {
      let effectiveJobId = currentJobId;
      if (currentJobId) {
        await this.model.updateJob(currentJobId, payload);
      } else {
        const created = await this.model.createNewJob(payload);
        effectiveJobId = this.extractCreatedJobId(created) || "";
      }

      if (effectiveJobId) {
        this.jobId = `${effectiveJobId}`;
        if (document?.body) document.body.dataset.jobId = `${effectiveJobId}`;
      }

      if (redirectAfterSave) {
        this.redirectToDashboard();
      } else {
        this.handleSuccess("Draft saved successfully.");
      }
      return true;
    } catch (error) {
      console.error("Failed to save draft", error);
      this.handleFailure("Failed to save draft. Please try again.");
      return false;
    } finally {
      this.stopLoading();
      if (triggerEl) {
        this.setActionBusyState(triggerEl, false);
      }
    }
  }

  resetAllForms() {
    resetFormFields(document);
    this.clearIndividualSelection({ clearInput: true });
    this.clearEntitySelection({ clearInput: true });
    document.querySelector('[data-contact-toggle="individual"]')?.click();

    document
      .querySelectorAll(
        "[data-search-panel], [data-property-search='panel'], [data-serviceman-search='results'], [data-material-sp-search='results']"
      )
      ?.forEach((panel) => panel.classList.add("hidden"));
  }

  setupJobInformationTabs() {
    const jobInfo = document.querySelector('[data-section="job-information"]');
    if (!jobInfo) return;

    const individualSection = jobInfo.querySelector(
      '[data-job-section="job-section-individual"]'
    );
    const appointmentSection =
      jobInfo.querySelector('[data-job-section="job-section-appointment"]') ||
      document.querySelector('[data-job-section="job-section-appointment"]');

    const overviewTab = document.querySelector('[data-tab="overview"]');
    const appointmentTab = document.querySelector('[data-tab="appointments"]');

    const setTabState = (active) => {
      if (overviewTab) {
        overviewTab.classList.toggle("border-b-2", active === "overview");
        overviewTab.classList.toggle("border-sky-900", active === "overview");
        overviewTab.classList.toggle("text-sky-900", active === "overview");
      }
      if (appointmentTab) {
        appointmentTab.classList.toggle(
          "border-b-2",
          active === "appointments"
        );
        appointmentTab.classList.toggle(
          "border-sky-900",
          active === "appointments"
        );
        appointmentTab.classList.toggle(
          "text-sky-900",
          active === "appointments"
        );
      }
    };

    const showIndividual = () => {
      if (individualSection) individualSection.classList.remove("hidden");
      if (appointmentSection) appointmentSection.classList.add("hidden");
      setTabState("overview");
    };

    const showAppointment = () => {
      if (individualSection) individualSection.classList.add("hidden");
      if (appointmentSection) appointmentSection.classList.remove("hidden");
      setTabState("appointments");
    };

    showIndividual();

    if (overviewTab) overviewTab.addEventListener("click", showIndividual);
    if (appointmentTab)
      appointmentTab.addEventListener("click", showAppointment);
  }

  setupContactTypeToggle() {
    const individualBtn = document.querySelector(
      '[data-contact-toggle="individual"]'
    );
    const entityBtn = document.querySelector('[data-contact-toggle="entity"]');
    const individualSection = document.querySelector(
      '[data-client-section="individual"]'
    );
    const entitySection = document.querySelector(
      '[data-client-section="entity"]'
    );
    const contactTypeField = document.querySelector(
      '[data-field="contact_type"]'
    );

    const stripOldOutlines = (btn) => {
      btn?.classList.remove(
        "outline",
        "outline-1",
        "outline-offset-[-1px]",
        "outline-slate-500"
      );
    };

    const applyTabStyles = (btn, isActive) => {
      if (!btn) return;
      btn.classList.toggle("!bg-[#003882]", isActive);
      btn.classList.toggle("!text-white", isActive);
      btn.classList.toggle("!shadow-sm", isActive);
      btn.classList.toggle("!bg-white", !isActive);
      btn.classList.toggle("!text-slate-600", !isActive);
      btn.classList.add("!border");
      btn.classList.toggle("!border-sky-900", isActive);
      btn.classList.toggle("!border-slate-300", !isActive);
    };

    const setState = async (type) => {
      this.activeContactType = type;
      if (contactTypeField) contactTypeField.value = type;

      const isIndividual = type === "individual";
      stripOldOutlines(individualBtn);
      stripOldOutlines(entityBtn);
      applyTabStyles(individualBtn, isIndividual);
      applyTabStyles(entityBtn, !isIndividual);
      individualSection?.classList.toggle("hidden", !isIndividual);

      entitySection?.classList.toggle("hidden", isIndividual);

      const disableSection = (section, disabled) => {
        section
          ?.querySelectorAll("input, select, textarea")
          ?.forEach((el) => (el.disabled = disabled));
      };
      disableSection(individualSection, !isIndividual);
      disableSection(entitySection, isIndividual);

      this.toggleEntityModalFields(!isIndividual);

      if (!isIndividual) {
        await this.ensureCompaniesLoaded();
      }
    };

    individualBtn?.addEventListener("click", async () =>
      setState("individual")
    );
    entityBtn?.addEventListener("click", async () => setState("entity"));

    setState("individual");
  }

  toggleEntityModalFields(show = false) {
    const sections = [
      document.getElementById("account-type-section"),
      document.getElementById("company-name-section"),
    ];

    sections?.forEach((section) => {
      if (!section) return;
      section.classList.toggle("hidden", !show);
    });
  }

  async ensureCompaniesLoaded() {
    if (this.companyList?.length) return;
    const companies = await this.model.fetchCompanyById();
    this.companyList = companies?.resp || companies || [];
    this.setupCompanySearch(this.companyList);
  }

  setupCompanySearch(companies = []) {
    this.companyList = companies || [];
    const root = document.querySelector('[data-search-root="contact-entity"]');
    const input = root?.querySelector("[data-search-input]");
    const panel = root?.querySelector("[data-search-panel]");
    const results = root?.querySelector("[data-search-results]");
    const empty = root?.querySelector("[data-search-empty]");
    const addBtn = root?.querySelector("[data-entity-id='add-new-entity']");
    const firstNameField = root?.closest("[data-client-section]")
      ? root
          .closest("[data-client-section]")
          .querySelector('[data-contact-field="first_name"]')
      : null;
    const lastNameField = root?.closest("[data-client-section]")
      ? root
          .closest("[data-client-section]")
          .querySelector('[data-contact-field="last_name"]')
      : null;
    const emailField = root?.closest("[data-client-section]")
      ? root
          .closest("[data-client-section]")
          .querySelector('[data-contact-field="email"]')
      : null;
    const phoneField = root?.closest("[data-client-section]")
      ? root
          .closest("[data-client-section]")
          .querySelector('[data-contact-field="office_phone"]')
      : null;

    if (!root || !input || !panel || !results) return;

    // If already initialized, just refresh the data and rerender once.
    if (root.dataset.companySearchInit === "true") {
      const cached = root._companySearchState;
      if (cached) {
        cached.state.items = cached.normalize(companies);
        cached.render(input.value || "");
      }
      return;
    }

    const normalized = (items = []) =>
      items.map((c) => ({
        id: c.id || c.ID,
        name: c.name || c.Name || "Unnamed entity",
        account_type: c.account_type || c.Account_Type,
        primary: c.Primary_Person || {},
      }));

    const state = { items: normalized(companies), filtered: [] };

    const render = (q = "") => {
      const term = q.trim().toLowerCase();
      const filtered = state.items.filter((item) =>
        [item.name, item.id].join(" ").toLowerCase().includes(term)
      );
      state.filtered = filtered;
      results.innerHTML = "";

      if (!filtered.length) {
        results.classList.add("hidden");
        empty?.classList.remove("hidden");
        return;
      }

      results.classList.remove("hidden");
      empty?.classList.add("hidden");

      filtered?.forEach((item, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.optionIndex = String(idx);
        btn.className =
          "!flex !w-full !flex-col !gap-1 !px-4 !py-2 !text-left !text-sm !text-slate-700 !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent hover:!text-slate-700 active:!text-slate-700 focus:!text-slate-700 focus-visible:!text-slate-700";
        btn.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-normal text-xs font-['Inter'] justify-start text-neutral-700">${
                item.name
              }</p>
              <p class="text-xs text-neutral-700">${item.account_type || ""}</p>
            </div>
          </div>
        `;

        btn.addEventListener("mousedown", (e) => {
          e.preventDefault();
          const current = state.filtered[idx];
          input.value = current.name;
          panel.classList.add("hidden");
          this.setEntitySelection({
            companyId: current.id || "",
            primaryContactId: current.primary?.id || "",
            name: current.name,
          });
          if (firstNameField)
            firstNameField.value = current.primary?.first_name || "";
          if (lastNameField)
            lastNameField.value = current.primary?.last_name || "";
          if (emailField) emailField.value = current.primary?.email || "";
          if (phoneField)
            phoneField.value =
              current.primary?.office_phone ||
              current.primary?.sms_number ||
              "";
        });

        li.appendChild(btn);
        results.appendChild(li);
      });

      panel.classList.remove("hidden");
    };

    // Cache references so subsequent calls can reuse without rebinding listeners.
    root._companySearchState = { state, render, normalize: normalized };
    root.dataset.companySearchInit = "true";

    input.addEventListener("input", (e) => render(e.target.value || ""));
    input.addEventListener("focus", () => render(input.value || ""));
    document.addEventListener("click", (e) => {
      if (!root.contains(e.target)) panel.classList.add("hidden");
    });
    if (addBtn) {
      addBtn.addEventListener(
        "click",
        (e) => {
          e.preventDefault();
          this.onEntityAddButtonClick();
        },
        { once: false }
      );
    }
  }

  onEntityAddButtonClick() {
    this.clearPropertyFieldValues(
      "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
    );
    document.querySelector('[data-entity-id="entity-id"]').value = "";
    const primaryContactID = document.querySelector(
      '[data-entity-id="entity-contact-id"]'
    );
    if (primaryContactID) primaryContactID.value = "";
    this.toggleEntityModalFields(true);
    this.toggleModal("addressDetailsModalWrapper");
  }

  showSection(sectionId) {
    if (!sectionId) return;
    this.currentSection = sectionId;

    let activeSectionEl = null;
    this.sectionOrder?.forEach((id) => {
      const el = document.querySelector(`[data-section="${id}"]`);
      if (!el) return;
      if (id === sectionId) {
        el.classList.remove("hidden");
        activeSectionEl = el;
      } else {
        el.classList.add("hidden");
      }
    });

    if (activeSectionEl) this.initFlatpickrFor(activeSectionEl);
    this.updateSidebarState(sectionId);
    this.updateNavButtons();
  }

  updateSidebarState(sectionId) {
    const items = document.querySelectorAll("[data-section-target]");
    const currentIndex = this.sectionOrder.indexOf(sectionId);
    items?.forEach((item) => {
      const target = item.getAttribute("data-section-target");
      const idx = this.sectionOrder.indexOf(target);
      const icon = item.querySelector("[data-section-icon]");
      const connector = document.querySelector(
        `[data-section-connector-after="${target}"] .h-8`
      );
      const label = item.querySelector("[data-section-label]");
      const isVisited = idx !== -1 && idx < currentIndex;
      const isCurrent = target === sectionId;
      const baseColor = "text-slate-400";
      const currentColor = "text-sky-700";
      const visitedColor = "text-green-600";

      item.classList.remove(
        "text-sky-900",
        "text-green-600",
        "text-sky-700",
        "text-slate-400"
      );
      if (isCurrent) {
        item.classList.add(currentColor);
      } else if (isVisited) {
        item.classList.add(visitedColor);
      } else {
        item.classList.add(baseColor);
      }

      if (icon) {
        icon.classList.remove(
          "bg-sky-100",
          "bg-neutral-100",
          "bg-green-100",
          "text-sky-700",
          "text-green-600",
          "text-slate-400"
        );
        const svg = icon.querySelector("svg");
        svg?.classList.remove(
          "text-blue-700",
          "text-green-700",
          "text-neutral-700",
          "text-sky-700",
          "text-green-600",
          "text-slate-400"
        );

        if (isCurrent) {
          icon.classList.add("bg-sky-100");
          icon.classList.add(currentColor);
          svg?.classList.add(currentColor);
        } else if (isVisited) {
          icon.classList.add("bg-green-100");
          icon.classList.add(visitedColor);
          svg?.classList.add(visitedColor);
        } else {
          icon.classList.add("bg-neutral-100");
          icon.classList.add(baseColor);
          svg?.classList.add(baseColor);
        }
      }

      if (connector) {
        connector.classList.remove(
          "border-sky-100",
          "border-neutral-100",
          "border-green-400",
          "border-green-300",
          "border-slate-200"
        );
        if (isVisited) {
          connector.classList.add("border-green-400");
        } else {
          connector.classList.add("border-slate-200");
        }
      }

      if (label) {
        label.classList.toggle("hidden", this.sidebarCollapsed);
      }
    });
  }

  getSectionDisplayName(sectionId) {
    if (!sectionId) return "";
    return sectionId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  updateNavButtons() {
    const nextBtn = document.querySelector('[data-nav-action="next"]');
    const backBtn = document.querySelector('[data-nav-action="back"]');
    const nextLabelEl = document.querySelector("[data-nav-next-label]");
    const backLabelEl = document.querySelector("[data-nav-back-label]");
    const idx = this.sectionOrder.indexOf(this.currentSection);
    if (idx === -1) return;
    const nextId = this.sectionOrder[idx + 1];
    const prevId = this.sectionOrder[idx - 1];

    if (nextLabelEl) {
      nextLabelEl.textContent = nextId
        ? `Next: ${this.getSectionDisplayName(nextId)}`
        : "Next";
    }
    if (backLabelEl) {
      backLabelEl.textContent = "Back";
    }

    if (nextBtn) {
      const disabled = !nextId;
      nextBtn.classList.toggle("opacity-50", disabled);
      nextBtn.classList.toggle("pointer-events-none", disabled);
    }
    if (backBtn) {
      const disabled = !prevId;
      backBtn.setAttribute("aria-disabled", String(disabled));
      backBtn.classList.toggle("opacity-50", disabled);
      backBtn.classList.toggle("pointer-events-none", disabled);
      backBtn.classList.toggle("bg-gray-300", disabled);
      backBtn.classList.toggle("outline-gray-300", disabled);
      backBtn.classList.toggle("bg-white", !disabled);
      backBtn.classList.toggle("outline-sky-900", !disabled);
      backBtn.classList.toggle("cursor-pointer", !disabled);
      if (backLabelEl) {
        backLabelEl.classList.toggle("text-slate-500", disabled);
        backLabelEl.classList.toggle("text-sky-900", !disabled);
      }
    }
  }

  updateSidebarLabels(collapsed = this.sidebarCollapsed) {
    const labels = document.querySelectorAll("[data-section-label]");
    labels?.forEach((label) => label.classList.toggle("hidden", collapsed));
  }

  applySidebarCollapsedState(collapsed) {
    this.sidebarCollapsed = collapsed;
    const container = document.querySelector("[data-sidebar-container]");
    if (container) {
      container.style.width = collapsed ? "84px" : "256px";
      container.style.paddingRight = collapsed ? "16px" : "64px";
      container.classList.toggle("items-center", collapsed);
    }
    this.updateSidebarLabels(collapsed);
    this.updateSidebarState(this.currentSection);
  }

  setupSidebarToggle() {
    const toggle = document.querySelector("[data-sidebar-toggle]");
    const container = document.querySelector("[data-sidebar-container]");
    if (!toggle || !container) return;
    const toggleHandler = () =>
      this.applySidebarCollapsedState(!this.sidebarCollapsed);
    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      toggleHandler();
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleHandler();
      }
    });
    this.applySidebarCollapsedState(this.sidebarCollapsed);
  }

  async handleJobInformation() {
    let data = this.getFieldValues(
      '[data-job-section="job-section-individual"] input:not(.hidden), [data-job-section="job-section-individual"] select'
    );

    const servicemanId =
      document.querySelector('[data-serviceman-field="serviceman_id"]')
        ?.value || "";
    const contactType = data.contact_type || this.activeContactType;
    const individualContactId =
      document.querySelector('[data-contact-field="contact_id"]')?.value || "";
    const entityId =
      document.querySelector('[data-entity-id="entity-id"]')?.value || "";
    const entityPrimaryContactId =
      document.querySelector('[data-entity-id="entity-contact-id"]')?.value ||
      "";

    data.primary_service_provider_id = servicemanId;

    if (contactType === "entity") {
      data.client_entity_id = entityId;
      data.client_id = "";
      data.contact_id = entityPrimaryContactId;
    } else {
      data.client_individual_id = individualContactId;
      data.contact_id = "";
    }

    const jobId = this.getJobId();
    this.startLoading(jobId ? "Saving job..." : "Creating job...");
    try {
      if (jobId) {
        await this.model.updateJob(jobId, data);
        return true;
      }
      let result = await this.model.createNewJob(data);
      if (!result.isCancelling) return true;

      alert("failed to create new job");
      return false;
    } catch (err) {
      console.error(
        jobId ? "Failed to update job" : "Failed to create new job",
        err
      );
      alert(jobId ? "Failed to update job" : "failed to create new job");
      return false;
    } finally {
      this.stopLoading();
    }
  }

  async goNextSection(e) {
    let value = true;
    if (this.currentSection == "job-information") {
    } else if (this.currentSection == "add-activities") {
    } else if (this.currentSection == "add-materials") {
    } else if (this.currentSection == "uploads") {
      await this.model.updateJob(this.getJobId(), {
        calculate_job_price: true,
      });
    } else if (this.currentSection == "invoice") {
    }

    if (value) {
      if (e) e.preventDefault();
      const idx = this.sectionOrder.indexOf(this.currentSection);
      const nextId = this.sectionOrder[idx + 1];
      if (nextId) this.showSection(nextId);
    }
  }

  goPrevSection(e) {
    if (e) e.preventDefault();
    const idx = this.sectionOrder.indexOf(this.currentSection);
    const prevId = this.sectionOrder[idx - 1];
    if (prevId) this.showSection(prevId);
  }

  setupClientSearch(contacts = []) {
    const root = document.querySelector(
      '[data-search-root="contact-individual"]'
    );
    const input = root?.querySelector("[data-search-input]");
    const panel = root?.querySelector("[data-search-panel]");
    const results = root?.querySelector("[data-search-results]");
    const empty = root?.querySelector("[data-search-empty]");
    const addBtn = root?.querySelector("[data-search-add]");
    const searchTrigger = root?.querySelector("[data-search-trigger]");
    if (!root || !input || !results || !panel) return;

    const normalize = (items = []) =>
      items.map((c) => {
        const info = c.Contact_Information || {};
        const first =
          c.First_Name ||
          c.first_name ||
          info.first_name ||
          c.Contact_Information_First_Name ||
          "";
        const last =
          c.Last_Name ||
          c.last_name ||
          info.last_name ||
          c.Contact_Information_Last_Name ||
          "";
        const email = c.Email || c.email || info.email || info.Email || "";
        const phone =
          c.SMS_Number ||
          c.sms_number ||
          info.sms_number ||
          info.SMS_Number ||
          "";
        return {
          id: c.Contact_ID || c.contact_id || c.id || c.ID || info.id || "",
          label:
            [first, last].filter(Boolean).join(" ").trim() ||
            email ||
            phone ||
            "Unknown contact",
          meta: [email].filter(Boolean).join(" "),
          raw: c,
        };
      });

    const state = { contacts: normalize(contacts), filtered: [] };

    const openPanel = () => panel.classList.remove("hidden");
    const closePanel = () => panel.classList.add("hidden");

    const render = (query = "") => {
      const term = query.trim().toLowerCase();
      const filtered = state.contacts.filter((item) => {
        if (!term) return true;
        return [item.label, item.meta]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      });

      state.filtered = filtered;
      results.innerHTML = "";

      if (!filtered.length) {
        results.classList.add("hidden");
        empty?.classList.remove("hidden");
        return;
      }

      results.classList.remove("hidden");
      empty?.classList.add("hidden");

      filtered?.forEach((item, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.optionIndex = String(idx);
        btn.className =
          "!flex !w-full !flex-col !gap-1 !px-4 !py-2 !text-left !text-sm !text-slate-700 !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent hover:!text-slate-700 active:!text-slate-700 focus:!text-slate-700 focus-visible:!text-slate-700";

        const label = document.createElement("span");
        label.className =
          "font-normal text-xs font-['Inter'] justify-start text-neutral-700";
        label.textContent = item.label;
        btn.appendChild(label);

        if (item.meta) {
          const meta = document.createElement("span");
          meta.className = "text-xs text-neutral-700";
          meta.textContent = item.meta;
          btn.appendChild(meta);
        }

        li.id = item.id;
        btn.id = item.id;
        li.appendChild(btn);
        results.appendChild(li);
      });
    };

    input.addEventListener("focus", () => {
      openPanel();
      render(input.value || "");
    });

    input.addEventListener("input", (e) => {
      openPanel();
      render(e.target.value || "");
    });

    searchTrigger?.addEventListener("click", (e) => {
      e.preventDefault();
      openPanel();
      input.focus();
      render(input.value || "");
    });

    results.addEventListener("mousedown", (e) => {
      const btn = e.target.closest("button[data-option-index]");
      if (!btn) return;
      e.preventDefault();
      const idx = Number(btn.dataset.optionIndex);
      const contact = state.filtered?.[idx];
      if (!contact) return;
      input.value = contact.label;
      this.setIndividualSelection(contact.id || "", contact.label);
      closePanel();
    });

    addBtn?.addEventListener("click", () => {
      closePanel();
    });

    document.addEventListener("click", (e) => {
      if (root.contains(e.target)) return;
      closePanel();
    });

    this.updateClientSearchContacts = (nextContacts = []) => {
      state.contacts = normalize(nextContacts);
      render(input.value || "");
    };
  }

  setupAddButtons() {
    const toggleModal = (id, show) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.classList.toggle("hidden", !show);
      modal.classList.toggle("flex", !!show);
    };

    document.addEventListener("click", (e) => {
      const openClient = e.target.closest('[data-action="open-add-client"]');
      const openProperty = e.target.closest(
        '[data-action="open-add-property"]'
      );
      const closeBtn = e.target.closest("[data-modal-close]");
      if (openClient) {
        toggleModal("jobAddClientModal", true);
      } else if (openProperty) {
        toggleModal("jobAddPropertyModal", true);
      } else if (closeBtn) {
        toggleModal(closeBtn.getAttribute("data-modal-close"), false);
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        toggleModal("jobAddClientModal", false);
        toggleModal("jobAddPropertyModal", false);
      }
    });

    ["jobAddClientModal", "jobAddPropertyModal"]?.forEach((id) => {
      const modal = document.getElementById(id);
      if (!modal) return;
      modal.addEventListener("click", (e) => {
        if (e.target === modal) toggleModal(id, false);
      });
    });
  }

  setupServiceProviderSearch(data = []) {
    const contactIdEl = document.querySelector(
      '[data-serviceman-field="serviceman_id"]'
    );
    const input = document.querySelector('[data-serviceman-search="input"]');
    const results = document.querySelector('[data-serviceman-search="results"]');
    if (!contactIdEl || !input || !results) return;

    const cleanText = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value).trim();
      return /^null$/i.test(text) ? "" : text;
    };

    const normalizeId = (value) => {
      const text = cleanText(value);
      return text ? String(text) : "";
    };

    const normalizeProviders = (providers = []) =>
      providers.map((item) => {
        const info = item?.Contact_Information || {};
        const id = normalizeId(item?.ID ?? item?.id ?? info?.id);
        const firstName = cleanText(
          item?.Contact_Information_First_Name ?? info?.first_name
        );
        const lastName = cleanText(
          item?.Contact_Information_Last_Name ?? info?.last_name
        );
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
        return {
          id,
          firstName,
          lastName,
          fullName: fullName || "Unknown service provider",
          phone: cleanText(
            item?.Contact_Information_SMS_Number ?? info?.sms_number
          ),
          email: cleanText(item?.Contact_Information_Email ?? info?.email),
          status: cleanText(item?.Status ?? item?.status) || "Unknown",
          image:
            cleanText(
              item?.Contact_Information_Profile_Image ?? info?.profile_image
            ) || "https://via.placeholder.com/40",
        };
      });

    if (
      this._serviceProviderSearch?.input === input &&
      this._serviceProviderSearch?.results === results
    ) {
      this._serviceProviderSearch.state.providers = normalizeProviders(data);
      if (!this._serviceProviderSearch.state.selectedProviderId) {
        this._serviceProviderSearch.state.selectedProviderId = normalizeId(
          contactIdEl.value
        );
      }
      this._serviceProviderSearch.render(input.value || "");
      return;
    }

    const state = {
      providers: normalizeProviders(data),
      filtered: [],
      selectedProviderId: normalizeId(contactIdEl.value),
      pendingProviderId: "",
      pendingProvider: null,
      saving: false,
    };

    const statusMap = {
      Active: { text: "text-green-600", dot: "bg-green-600" },
      Offline: { text: "text-slate-500", dot: "bg-slate-500" },
      "On-Site": { text: "text-orange-600", dot: "bg-orange-600" },
      Archived: { text: "text-purple-600", dot: "bg-purple-600" },
      Looking: { text: "text-teal-700", dot: "bg-teal-700" },
      Unknown: { text: "text-slate-500", dot: "bg-slate-400" },
    };

    const getCurrentSelectedId = () =>
      normalizeId(
        state.pendingProviderId || state.selectedProviderId || contactIdEl.value
      );

    const render = (search = "") => {
      const query = cleanText(search).toLowerCase();
      const selectedId = getCurrentSelectedId();

      state.filtered = state.providers.filter((provider) => {
        if (!query) return true;
        return [provider.fullName, provider.phone, provider.email, provider.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(query));
      });

      const rows = state.filtered.length
        ? state.filtered
            .map((provider, idx) => {
              const isSelected = selectedId && provider.id === selectedId;
              const statusStyle = statusMap[provider.status] || statusMap.Unknown;
              const rowClass = isSelected
                ? "bg-[#003882] text-white ring-1 ring-[#003882]"
                : "bg-white text-slate-700 hover:bg-slate-50";
              const nameClass = isSelected ? "text-white" : "text-neutral-700";
              const phoneClass = isSelected ? "text-slate-100" : "text-slate-500";
              const statusTextClass = isSelected
                ? "text-white"
                : statusStyle.text;
              const statusDotClass = isSelected ? "bg-white" : statusStyle.dot;
              const phoneDisplay = provider.phone || "-";

              return `
                <button
                  type="button"
                  data-option-index="${idx}"
                  data-id="${provider.id}"
                  class="w-full px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-3 cursor-pointer transition ${rowClass}"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-2">
                    <img
                      class="w-10 h-10 rounded-[32px] object-cover shrink-0"
                      src="${provider.image}"
                      alt=""
                    />
                    <div class="min-w-0 flex flex-col justify-center items-start gap-1.5">
                      <div data-provider-name class="truncate text-sm font-medium font-['Inter'] leading-4 ${nameClass}">
                        ${provider.fullName}
                      </div>
                      <div data-provider-phone class="truncate text-xs font-normal font-['Inter'] leading-3 ${phoneClass}">
                        ${phoneDisplay}
                      </div>
                    </div>
                  </div>
                  <div class="flex shrink-0 items-center justify-end gap-1">
                    <div class="w-3 h-3 rounded-full ${statusDotClass}"></div>
                    <div data-provider-status class="text-xs font-medium font-['Inter'] leading-4 ${statusTextClass}">
                      ${provider.status}
                    </div>
                  </div>
                </button>
              `;
            })
            .join("")
        : `<div class="px-4 py-3 text-sm text-slate-500">No service providers found.</div>`;

      const confirmDisabled =
        state.saving || !normalizeId(state.pendingProviderId || state.selectedProviderId);
      const confirmButtonClass = confirmDisabled
        ? "opacity-60 pointer-events-none"
        : "";

      const footer = `
        <div data-field="confirm-allocation" class="p-2 bg-[#003882] flex justify-center sticky bottom-0">
          <button
            type="button"
            class="!text-white !text-sm !font-medium !flex !items-center !gap-2 ${confirmButtonClass}"
            ${confirmDisabled ? "disabled" : ""}
          >
            ${state.saving ? "Saving..." : "Confirm Allocation ✓"}
          </button>
        </div>
      `;

      results.innerHTML = rows + footer;
      results.classList.remove("hidden");
    };

    const applySelection = (provider) => {
      if (!provider) return;
      state.pendingProviderId = normalizeId(provider.id);
      state.pendingProvider = provider;
      render(input.value || "");
    };

    const confirmSelection = async () => {
      const selectedId = normalizeId(state.pendingProviderId || state.selectedProviderId);
      if (!selectedId || state.saving) return;

      const selectedProvider =
        state.pendingProvider ||
        state.filtered.find((provider) => normalizeId(provider.id) === selectedId) ||
        state.providers.find((provider) => normalizeId(provider.id) === selectedId);
      if (!selectedProvider) return;

      state.saving = true;
      render(input.value || "");
      let isSuccess = false;

      try {
        const jobId = this.getJobId();
        if (jobId) {
          await this.model.updateJob(jobId, {
            primary_service_provider_id: selectedId,
          });
        }

        contactIdEl.value = selectedId;
        input.value = selectedProvider.fullName;
        state.selectedProviderId = selectedId;
        state.pendingProviderId = "";
        state.pendingProvider = null;
        results.classList.add("hidden");
        isSuccess = true;
      } catch (error) {
        console.error("Failed to allocate service provider", error);
        this.handleFailure("Failed to allocate service provider. Please try again.");
      } finally {
        state.saving = false;
        if (!isSuccess) {
          render(input.value || "");
        }
      }
    };

    input.addEventListener("focus", () => {
      render(input.value || "");
    });

    input.addEventListener("input", () => {
      state.pendingProviderId = "";
      state.pendingProvider = null;
      render(input.value || "");
    });

    results.addEventListener("click", async (e) => {
      const option = e.target.closest("[data-option-index]");
      if (option) {
        const idx = Number(option.getAttribute("data-option-index"));
        const provider = state.filtered[idx];
        applySelection(provider);
        return;
      }

      const confirmBtn = e.target.closest('[data-field="confirm-allocation"]');
      if (confirmBtn) {
        await confirmSelection();
      }
    });

    this.updateServiceProviderSearch = (nextProviders = []) => {
      state.providers = normalizeProviders(nextProviders);
      if (!state.selectedProviderId) {
        state.selectedProviderId = normalizeId(contactIdEl.value);
      }
      render(input.value || "");
    };

    this._serviceProviderSearch = {
      input,
      results,
      state,
      render,
    };

    document.addEventListener("click", (e) => {
      if (e.target === input || results.contains(e.target)) return;
      results.classList.add("hidden");
    });
  }

  async initMaterialServiceProviderSearch(wrapper) {
    const root = wrapper.querySelector('[data-material-sp-search="root"]');
    const input = wrapper.querySelector('[data-material-sp-search="input"]');
    const results = wrapper.querySelector(
      '[data-material-sp-search="results"]'
    );
    const hidden = wrapper.querySelector('[data-material-sp-field="id"]');
    const addBtn = wrapper.querySelector("[data-material-sp-add]");
    if (!root || !input || !results || !hidden) return;

    const wire = (providers = []) =>
      this.setupMaterialServiceProviderSearch(
        { root, input, results, hidden },
        providers
      );

    try {
      await this.model.fetchServiceProviders((list) => wire(list || []));
    } catch (_) {
      wire([]);
    }

    if (addBtn) {
      addBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        this.toggleModal?.("addressDetailsModalWrapper");
        // refresh list after potential creation
        setTimeout(
          () => this.model.fetchServiceProviders((list) => wire(list || [])),
          500
        );
      });
    }
  }

  setupMaterialServiceProviderSearch(ctx, data = []) {
    const { input, results, hidden, root } = ctx;
    const state = { providers: data || [] };
    const getProviderParts = (provider = {}) => {
      const contact = provider.Contact_Information || {};
      const first =
        provider.Contact_Information_First_Name ||
        provider.contact_information_first_name ||
        provider.Service_Provider_Contact_Information_First_Name ||
        provider.service_provider_contact_information_first_name ||
        contact.first_name ||
        contact.First_Name ||
        "";
      const last =
        provider.Contact_Information_Last_Name ||
        provider.contact_information_last_name ||
        provider.Service_Provider_Contact_Information_Last_Name ||
        provider.service_provider_contact_information_last_name ||
        contact.last_name ||
        contact.Last_Name ||
        "";
      const phone =
        provider.Contact_Information_SMS_Number ||
        provider.contact_information_sms_number ||
        provider.Service_Provider_Contact_Information_SMS_Number ||
        provider.service_provider_contact_information_sms_number ||
        contact.sms_number ||
        contact.SMS_Number ||
        "";
      const image =
        provider.Contact_Information_Profile_Image ||
        provider.contact_information_profile_image ||
        provider.Service_Provider_Contact_Information_Profile_Image ||
        provider.service_provider_contact_information_profile_image ||
        contact.profile_image ||
        contact.Profile_Image ||
        "";
      const id =
        provider.ID ||
        provider.id ||
        provider.Service_Provider_ID ||
        provider.service_provider_id ||
        "";
      return { id: String(id || ""), first, last, phone, image };
    };

    const render = (providers, query = "") => {
      const term = query.trim().toLowerCase();
      const filtered = providers.filter((p) => {
        const { first, last, phone, image } = getProviderParts(p);
        return [first, last, phone, image].some((field) =>
          String(field).toLowerCase().includes(term)
        );
      });

      results.innerHTML = "";
      if (!filtered.length) {
        results.classList.add("hidden");
        return;
      }

      filtered?.forEach((item) => {
        const parts = getProviderParts(item);
        const option = document.createElement("div");
        option.className =
          "flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer";
        option.dataset.id = parts.id || "";

        const avatar = document.createElement("img");
        avatar.className = "h-9 w-9 rounded-full object-cover bg-slate-100";
        avatar.src = parts.image || "https://via.placeholder.com/40";
        avatar.alt = `${parts.first || ""} ${parts.last || ""}`.trim();

        const infoWrap = document.createElement("div");
        infoWrap.className = "flex flex-col";
        const nameEl = document.createElement("div");
        nameEl.className = "text-sm font-medium text-slate-800";
        nameEl.textContent = `${parts.first || ""} ${parts.last || ""}`.trim();
        const phoneEl = document.createElement("div");
        phoneEl.className = "text-xs text-slate-500";
        phoneEl.textContent = parts.phone || "";

        infoWrap.appendChild(nameEl);
        infoWrap.appendChild(phoneEl);

        option.appendChild(avatar);
        option.appendChild(infoWrap);

        option.addEventListener("click", () => {
          input.value = nameEl.textContent || "Selected provider";
          hidden.value = option.dataset.id || "";
          results.classList.add("hidden");
        });

        results.appendChild(option);
      });
      results.classList.remove("hidden");
    };

    input.addEventListener("focus", () => render(state.providers, input.value));
    input.addEventListener("input", () => render(state.providers, input.value));

    document.addEventListener("click", (e) => {
      if (root.contains(e.target)) return;
      results.classList.add("hidden");
    });

    this.updateMaterialServiceProviderSearch = (next = []) => {
      state.providers = next;
      render(state.providers, input.value);
    };
  }

  getFieldValues(selector) {
    let jobObj = {};
    let elements = document.querySelectorAll(selector);
    elements?.forEach((item) => {
      const itemType = (item.type || "").toLowerCase();
      const isHiddenInput = itemType === "hidden";
      const isVisible = isHiddenInput || item.offsetParent !== null;
      if (!isVisible || item.disabled || item.classList.contains("hidden"))
        return;
      let key = item?.getAttribute("data-field")?.toLowerCase();
      if (!key) return;
      let value;
      if (
        item.classList.contains("date-picker") ||
        item.classList.contains("flatpickr-input")
      ) {
        value = this.dateToUnix(item.value);
      } else {
        if (item.type == "checkbox") {
          value = item.checked;
        } else {
          value = item?.value;
        }
      }
      jobObj[key] = value;
    });

    return jobObj;
  }

  setupPropertySearch(properties = []) {
    const input = document.querySelector('[data-field="properties"]');
    const locationSelect = document.querySelector('[data-field="location_id"]');
    const propertyHidden = document.querySelector('[data-field="property_id"]');
    if (!input) return;

    const root = input.closest(".relative") || input.parentElement;
    let panel = root.querySelector('[data-property-search="panel"]');
    let results = root.querySelector('[data-property-search="results"]');
    let empty = root.querySelector('[data-property-search="empty"]');
    let addBtn = root.querySelector('[data-property-search="add"]');

    const normalize = (items = []) =>
      items?.map((p) => {
        const name =
          p.property_name ||
          p.Property_Name ||
          p.name ||
          p.Property_Property_Name ||
          "";
        return {
          id: p.id || p.ID || p.property_id || p.Property_ID || "",
          label: name || "Unnamed property",
        };
      });

    const state = { items: normalize(properties), filtered: [] };

    const open = () => panel.classList.remove("hidden");
    const close = () => panel.classList.add("hidden");

    const render = (query = "") => {
      if (!results) return;
      const term = query.trim().toLowerCase();
      const filtered = state.items.filter((item) =>
        item.label.toLowerCase().includes(term)
      );
      state.filtered = filtered ? filtered : [];
      results.innerHTML = "";

      if (!filtered.length) {
        results.classList.add("hidden");
        empty?.classList.remove("hidden");
        return;
      }

      results.classList.remove("hidden");
      empty?.classList.add("hidden");

      filtered?.forEach((item, idx) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.dataset.optionIndex = String(idx);

        btn.className =
          "!flex !w-full !flex-col !gap-1 !px-4 !py-2 text-neutral-700 text-xs font-normal font-['Inter'] leading-3";
        btn.textContent = item.label;

        li.id = item.id;
        li.appendChild(btn);
        results.appendChild(li);
      });
    };

    input.addEventListener("focus", () => {
      open();
      render(input.value || "");
    });

    input.addEventListener("input", (e) => {
      open();
      render(e.target.value || "");
    });

    results?.addEventListener("mousedown", (e) => {
      const btn = e.target.closest("button[data-option-index]");
      if (!btn) return;
      e.preventDefault();
      const idx = Number(btn.dataset.optionIndex);
      const item = state.filtered?.[idx];
      if (!item) return;
      input.value = item.label;
      if (propertyHidden) propertyHidden.value = item.id || "";
      if (locationSelect) {
        const exists = locationSelect.querySelector(
          `option[value="${item.id}"]`
        );
        if (!exists && item.id) {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.label;
          locationSelect.appendChild(option);
        }
        if (item.id) {
          locationSelect.value = item.id;
          locationSelect.dispatchEvent(new Event("change", { bubbles: true }));
        }
      }
      close();
    });

    addBtn?.addEventListener("click", () => {
      const event = new CustomEvent("property:add", {
        detail: { query: input.value || "" },
      });
      input.dispatchEvent(event);
      close();
    });

    document.addEventListener("click", (e) => {
      if (root.contains(e.target)) return;
      close();
    });

    this.updatePropertySearch = (next = []) => {
      state.items = normalize(next);
      render(input.value || "");
    };
  }

  dateToUnix(actualDate) {
    if (!actualDate) return null;

    const [dd, mm, yyyy] = actualDate.split("/").map(Number);
    const date = new Date(yyyy, mm - 1, dd);

    return Math.floor(date.getTime() / 1000);
  }

  formatDateForInput(value) {
    if (!value) return "";
    if (typeof value === "string" && value.includes("/")) return value;

    let numeric = Number(value);
    if (Number.isNaN(numeric)) return "";
    if (String(Math.trunc(numeric)).length === 10) {
      numeric *= 1000;
    }

    const date = new Date(numeric);
    if (Number.isNaN(date.getTime())) return "";

    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  setupLocationOptions() {
    // let locations =
  }

  createOptionsForSelectBox(selectEl, options) {
    options?.forEach((item) => {
      let element = document.createElement("option");
      element.innerText = item.name;
      element.value = item.id;
      selectEl.appendChild(element);
    });
  }

  getApointmentsFieldValues() {
    let section = document.querySelectorAll(
      '[data-job-section="job-section-appointment"] input, [data-job-section="job-section-appointment"] select, [data-job-section="job-section-appointment"] textarea'
    );
    let dataObj = {};
    section?.forEach((item) => {
      let key = item?.getAttribute("data-field");
      let value;
      if (key == "start_time" || key == "end_time") {
        value = this.dateToUnix(item.value);
      } else {
        if (item.type == "checkbox") {
          value = item.checked;
        } else {
          value = item.value;
        }
      }
      dataObj[key] = value;
    });
    delete dataObj[null];
    return dataObj;
  }

  clearAppointmentForm() {
    const fields = document.querySelectorAll(
      '[data-job-section="job-section-appointment"] input, [data-job-section="job-section-appointment"] select, [data-job-section="job-section-appointment"] textarea'
    );

    fields?.forEach((field) => {
      if (field.tagName === "SELECT") {
        const firstOption = field.querySelector("option");
        if (firstOption) {
          field.value = firstOption.value ?? "";
        } else {
          field.value = "";
        }
      } else if (field.type === "checkbox") {
        field.checked = false;
      } else {
        field.value = "";
      }
    });
    this.setupColorMappedDropdowns();
  }

  formatAppointmentDate(value) {
    if (!value) return "-";
    const maybeNumber = Number(value);
    if (Number.isFinite(maybeNumber)) {
      return this.formatDateForInput(maybeNumber);
    }
    if (typeof value === "string" && value.includes("/")) return value;
    return String(value);
  }

  updateAppointmentTabCount(appointments = []) {
    const countEl =
      document.querySelector("[data-appointments-count]") ||
      document
        .querySelector('[data-tab="appointments"]')
        ?.querySelector("div:last-child div");
    if (!countEl) return;

    const rows = Array.isArray(appointments) ? appointments : [];
    const withIds = rows
      .map((item) => item?.ID ?? item?.id ?? null)
      .filter((value) => value !== null && value !== undefined && value !== "");
    const uniqueCount = withIds.length
      ? new Set(withIds.map((value) => String(value))).size
      : rows.length;

    countEl.textContent = String(uniqueCount).padStart(2, "0");
  }

  renderAppointmentsTable(appointments = []) {
    const target = document.getElementById("appointments-table");
    if (!target) return;
    const colorMappings = this.getColorMappings();

    const clean = (value) => {
      if (value === null || value === undefined) return "";
      const text = String(value).trim();
      return /^null$/i.test(text) ? "" : text;
    };

    const fullName = (first, last) =>
      [clean(first), clean(last)].filter(Boolean).join(" ").trim();

    const rows = Array.isArray(appointments) ? appointments : [];
    this.updateAppointmentTabCount(rows);

    const table = document.createElement("table");
    table.className =
      "min-w-full border border-slate-200 rounded-lg overflow-hidden text-sm text-slate-700 leading-6";

    const thead = document.createElement("thead");
    thead.className = "bg-slate-100";
    const headerRow = document.createElement("tr");
    const headers = [
      "Status",
      "Start - End",
      "Location",
      "Host",
      "Guest",
      "Event Color",
    ];
    headers.forEach((text) => {
      const th = document.createElement("th");
      th.className = "px-7 py-3 text-left font-normal text-slate-700 leading-6";
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    const baseTdClass = "px-7 py-3 align-middle leading-6";

    rows.forEach((item, idx) => {
      const status = clean(item.Status ?? item.status) || "-";
      const statusPalette = this._resolvePaletteEntry(
        colorMappings.appointmentStatus,
        item.Status ?? item.status,
        status
      );
      const start = this.formatAppointmentDate(item.Start_Time ?? item.start_time);
      const end = this.formatAppointmentDate(item.End_Time ?? item.end_time);

      const locationName =
        clean(item.Location_Property_Name) ||
        clean(item.Location?.property_name) ||
        clean(item.Location?.Property_Name) ||
        clean(item.Location?.name) ||
        "-";
      const mapHref =
        locationName !== "-"
          ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
              locationName
            )}`
          : "";

      const hostName =
        fullName(
          item.Host_Contact_Information_First_Name,
          item.Host_Contact_Information_Last_Name
        ) ||
        fullName(
          item?.Host?.Contact_Information?.first_name,
          item?.Host?.Contact_Information?.last_name
        ) ||
        "-";

      const guestName =
        fullName(item.Primary_Guest_First_Name, item.Primary_Guest_Last_Name) ||
        fullName(
          item?.Primary_Guest?.first_name,
          item?.Primary_Guest?.last_name
        ) ||
        "-";

      const rawEventColor =
        clean(item.Event_Color) ||
        clean(item.event_color) ||
        clean(item.Event_Colour) ||
        clean(item.event_colour) ||
        clean(item.Google_Calendar_Event_Color) ||
        clean(item.google_calendar_event_color) ||
        clean(item.Google_Calendar_Color) ||
        clean(item.google_calendar_color);
      const eventColorPalette = this._resolvePaletteEntry(
        colorMappings.eventColor,
        rawEventColor,
        rawEventColor
      );
      const eventColorLabel = eventColorPalette?.label || rawEventColor || "-";

      const tr = document.createElement("tr");
      tr.className = idx % 2 === 0 ? "bg-white" : "bg-slate-50";

      const statusTd = document.createElement("td");
      statusTd.className = baseTdClass;
      const statusBadge = document.createElement("span");
      statusBadge.className = "inline-flex px-3 py-1 rounded-full text-xs font-normal";
      statusBadge.style.cssText = statusPalette
        ? `color:${statusPalette.color};background-color:${statusPalette.backgroundColor};`
        : "color:#334155;background-color:#f1f5f9;";
      statusBadge.textContent = status;
      statusTd.appendChild(statusBadge);
      tr.appendChild(statusTd);

      const startEndTd = document.createElement("td");
      startEndTd.className = `${baseTdClass} text-slate-800`;
      startEndTd.textContent = `${start} - ${end}`;
      tr.appendChild(startEndTd);

      const locationTd = document.createElement("td");
      locationTd.className = baseTdClass;
      if (mapHref) {
        const link = document.createElement("a");
        link.href = mapHref;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.className = "text-sky-700 underline";
        link.textContent = locationName;
        locationTd.appendChild(link);
      } else {
        const empty = document.createElement("span");
        empty.className = "text-slate-500";
        empty.textContent = "-";
        locationTd.appendChild(empty);
      }
      tr.appendChild(locationTd);

      const hostTd = document.createElement("td");
      hostTd.className = `${baseTdClass} text-slate-800`;
      hostTd.textContent = hostName;
      tr.appendChild(hostTd);

      const guestTd = document.createElement("td");
      guestTd.className = `${baseTdClass} text-slate-800`;
      guestTd.textContent = guestName;
      tr.appendChild(guestTd);

      const eventColorTd = document.createElement("td");
      eventColorTd.className = baseTdClass;
      const eventBadge = document.createElement("span");
      eventBadge.className = "inline-flex px-3 py-1 rounded-full text-xs font-normal";
      eventBadge.style.cssText = eventColorPalette
        ? `color:${eventColorPalette.color};background-color:${eventColorPalette.backgroundColor};`
        : "color:#334155;background-color:#f1f5f9;";
      eventBadge.textContent = eventColorLabel;
      eventColorTd.appendChild(eventBadge);
      tr.appendChild(eventColorTd);

      tbody.appendChild(tr);
    });

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = `${baseTdClass} text-center text-slate-500`;
      td.textContent = "No appointments found.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    target.innerHTML = "";
    target.appendChild(table);
  }

  toggleModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    const isHidden = modal.classList.contains("hidden");
    if (isHidden) {
      modal.classList.remove("hidden");
      modal.classList.add("flex");
      document.body.style.overflow = "hidden";
    } else {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    }
  }

  clearPropertyFieldValues(selector) {
    const fields = document.querySelectorAll(selector);
    fields?.forEach((field) => {
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = false;
        return;
      }

      if (field.tagName === "SELECT") {
        const placeholder =
          field.querySelector("option[disabled][selected]") ||
          field.querySelector("option[disabled]");
        if (placeholder) {
          field.value = placeholder.value || "";
        } else if (field.options?.length) {
          field.selectedIndex = 0;
        } else {
          field.value = "";
        }
        return;
      }

      field.value = "";
    });
  }

  prefillContactModal(contact = {}) {
    const modal = document.getElementById("addressDetailsModalWrapper");
    if (!modal) return;
    this.clearPropertyFieldValues(
      "[modal-name='contact-detail-modal'] input, [modal-name='contact-detail-modal'] select"
    );
    const info = contact.Contact_Information || {};
    const values = {
      first_name:
        contact.First_Name ||
        contact.first_name ||
        info.first_name ||
        contact.Contact_Information_First_Name ||
        "",
      last_name:
        contact.Last_Name ||
        contact.last_name ||
        info.last_name ||
        contact.Contact_Information_Last_Name ||
        "",
      email: contact.Email || contact.email || info.email || info.Email || "",
      sms_number:
        contact.SMS_Number ||
        contact.sms_number ||
        info.sms_number ||
        info.SMS_Number ||
        "",
      office_phone:
        contact.Office_Phone ||
        contact.office_phone ||
        info.office_phone ||
        info.Office_Phone ||
        "",
    };

    Object.entries(values)?.forEach(([key, value]) => {
      const field = modal.querySelector(`[data-contact-field="${key}"]`);
      if (field) field.value = value || "";
    });
  }

  #createContactDetailsModalUI() {
    // Wrapper
    const wrapper = document.createElement("div");
    wrapper.id = "addressDetailsModalWrapper";
    wrapper.className =
      "fixed inset-0 z-[9999] hidden flex items-center justify-center bg-black/50";
    let element = document.getElementById("addressDetailsModalBox");
    wrapper.appendChild(element);
    document.body.appendChild(wrapper);

    // Refs
    const $ = (id) => document.getElementById(id);
    const modal = $("addressDetailsModalWrapper");
    const modalBox = $("addressDetailsModalBox");
    const closeBtn = $("closeAddressDetailsBtn");
    const cancelBtn = $("cancelAddressDetailsBtn");
    const sameAsAboveBtn = $("adSameAsAbove");
    const saveBtn = $("updateAddressDetailsBtn");

    const topInputs = [
      $("adTopLine1"),
      $("adTopLine2"),
      $("adTopCity"),
      $("adTopState"),
      $("adTopPostal"),
      $("adTopCountry"),
    ];
    const botInputs = [
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
        botInputs?.forEach((input, idx) => {
          input.value = topInputs[idx].value;
          input.disabled = true;
        });
      } else {
        botInputs?.forEach((input) => {
          input.disabled = false;
          if (input.id === "adBotCountry") return;
          input.value = "";
        });
      }
    });

    saveBtn.addEventListener("click", async () => {
      const addressObj = {
        address_1: $("adTopLine1")?.value || "",
        address_2: $("adTopLine2")?.value || "",
        suburb_town: $("adTopCity")?.value || "",
        state: $("adTopState")?.value || "",
        postal_code: $("adTopPostal")?.value || "",
      };
      const contactAddressField = document.getElementById("contact-address");
      if (contactAddressField) {
        contactAddressField.value = JSON.stringify(addressObj);
      }
      let elements = document.querySelectorAll(
        "#addressDetailsModalWrapper [data-contact-id]"
      );
      if (this.activeContactType === "entity") {
        await this.getEntityValuesFromContactDetailModal(elements);
      } else {
        await this.getValuesFromContactDetailModal(elements);
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

  renderDropdownOptionsForStates(states) {
    let elements = document.querySelectorAll("#adTopState, #adBotState");
    if (!elements) return;
    elements?.forEach((el) => {
      const placeholderOption = document.createElement("option");
      placeholderOption.text = "Select";
      placeholderOption.value = "";
      placeholderOption.disabled = true;
      placeholderOption.selected = true;
      el.add(placeholderOption);
      states?.forEach((state) => {
        let option = document.createElement("option");
        option.value = state.value;
        option.text = state.displayValue;
        el.add(option);
      });
    });
  }

  initializeAutoCompleteToModal({ initAutocomplete } = {}) {
    // Delegate autocomplete wiring to the shared initializer to avoid duplicating Google bindings.
    if (typeof initAutocomplete === "function") {
      initAutocomplete();
    }
  }

  extractCreatedRecordId(resp = {}, key) {
    const managed = resp?.mutations?.[key]?.managedData;
    if (managed && typeof managed === "object") {
      const ids = Object.keys(managed);
      if (ids.length) return ids[0];
    }
    return resp?.resp?.id || resp?.id || "";
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
        const savedContactId =
          contactId || this.extractCreatedRecordId(result, "PeterpmContact");
        const savedContactLabel = [
          contactData.first_name,
          contactData.last_name,
        ]
          .filter(Boolean)
          .join(" ")
          .trim();
        if (savedContactId)
          this.setIndividualSelection(savedContactId, savedContactLabel);
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

  async getEntityValuesFromContactDetailModal(elements) {
    const formElements = Array.from(elements);
    const entityDetailObj = {};
    formElements?.forEach((item) => {
      const key = item.getAttribute("data-contact-id");
      const value = item.value;
      if (key) entityDetailObj[key] = value;
    });

    const primaryContactPersonId =
      document.querySelector('[data-entity-id="entity-contact-id"]')?.value ||
      "";

    showLoader(
      this.loaderElement,
      this.loaderMessageEl,
      this.loaderCounter,
      primaryContactPersonId ? "Updating contact..." : "Creating contact..."
    );

    try {
      if (primaryContactPersonId) {
        entityDetailObj["Companies"] = {
          account_type: document.getElementById("account-type")?.value,
        };
        const contactResult = await this.model.updateContact(
          primaryContactPersonId,
          entityDetailObj
        );

        const companyId =
          document.querySelector('[data-entity-id="entity-id"]')?.value || "";
        const companyObj = {
          account_type:
            entityDetailObj["account-type"] ||
            document.getElementById("account-type")?.value,
          name: entityDetailObj.company_name,
        };

        const updateCompanyData = companyId
          ? await this.model.updateExistingCompany(companyId, companyObj)
          : null;

        if (contactResult && (updateCompanyData || !companyId)) {
          const resolvedCompanyId =
            companyId ||
            this.extractCreatedRecordId(updateCompanyData, "PeterpmCompany");
          if (!contactResult.isCancelling && !updateCompanyData?.isCancelling) {
            this.customModalHeader.innerText = "Successful";
            this.customModalBody.innerText = "Company updated successfully.";
            this.toggleModal("statusModal");
          }
          this.setEntitySelection({
            companyId: resolvedCompanyId,
            primaryContactId: primaryContactPersonId,
            name: entityDetailObj.company_name,
          });
          formElements?.forEach((item) => {
            item.value = "";
          });
        } else if (!contactResult?.isCancelling) {
          this.customModalHeader.innerText = "Failed";
          this.customModalBody.innerText = "Company update Failed.";
          this.toggleModal("statusModal");
        }
      } else {
        let result = "";
        const contactResult = await this.model.createContact(entityDetailObj);
        if (contactResult) {
          const contactId = this.extractCreatedRecordId(
            contactResult,
            "PeterpmContact"
          );
          if (contactId) {
            const companyData = {
              account_type: document.getElementById("account-type")?.value,
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
          if (!result?.isCancelling) {
            const companyId = this.extractCreatedRecordId(
              result,
              "PeterpmCompany"
            );
            this.setEntitySelection({
              companyId,
              primaryContactId: contactId || "",
              name: entityDetailObj.company_name,
            });
            formElements?.forEach((item) => {
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
      console.error("[NewJob] Contact modal save failed", error);
      this.showFeedback("Unable to save contact right now.");
    } finally {
      hideLoader(this.loaderElement, this.loaderCounter);
    }
  }

  showFeedback(message, tone = "error") {
    if (!this.feedbackEl) {
      console.warn("Feedback:", message);
      return;
    }
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

  buildContactData(elements) {
    const data = {};

    elements?.forEach((item) => {
      const key = item.getAttribute("data-contact-id");
      if (key) data[key] = item.value;
    });
    return data;
  }

  async saveContact(contactId, contactData) {
    if (contactId) {
      return await this.model.updateContact(contactId, contactData);
    }
    return await this.model.createContact(contactData);
  }

  clearForm(elements) {
    elements?.forEach((item) => (item.value = ""));
  }

  startLoading(message = "Processing...") {
    showLoader(
      this.loaderElement,
      this.loaderMessageEl,
      this.loaderCounter,
      message
    );
  }

  stopLoading() {
    hideLoader(this.loaderElement, this.loaderCounter);
  }

  clearIndividualSelection({ clearInput = false } = {}) {
    const contactField = document.querySelector(
      '[data-contact-field="contact_id"]'
    );
    if (contactField) contactField.value = "";

    if (clearInput) {
      const individualInput = document.querySelector(
        '[data-search-root="contact-individual"] [data-search-input]'
      );
      if (individualInput) individualInput.value = "";
    }
  }

  clearEntitySelection({ clearInput = false } = {}) {
    const entityIdField = document.querySelector(
      '[data-entity-id="entity-id"]'
    );
    if (entityIdField) entityIdField.value = "";

    const entityPrimaryField = document.querySelector(
      '[data-entity-id="entity-contact-id"]'
    );
    if (entityPrimaryField) entityPrimaryField.value = "";

    if (clearInput) {
      const entityInput = document.querySelector(
        '[data-search-root="contact-entity"] [data-search-input]'
      );
      if (entityInput) entityInput.value = "";
    }
  }

  setIndividualSelection(contactId = "", label = "") {
    const contactField = document.querySelector(
      '[data-contact-field="contact_id"]'
    );
    if (contactField) contactField.value = contactId || "";

    if (label) {
      const input = document.querySelector(
        '[data-search-root="contact-individual"] [data-search-input]'
      );
      if (input) input.value = label;
    }

    this.clearEntitySelection();
  }

  setEntitySelection({
    companyId = "",
    primaryContactId = "",
    name = "",
  } = {}) {
    const entityIdField = document.querySelector(
      '[data-entity-id="entity-id"]'
    );
    if (entityIdField) entityIdField.value = companyId || "";

    const entityPrimaryField = document.querySelector(
      '[data-entity-id="entity-contact-id"]'
    );
    if (entityPrimaryField) entityPrimaryField.value = primaryContactId || "";

    if (name) {
      const entityInput = document.querySelector(
        '[data-search-root="contact-entity"] [data-search-input]'
      );
      if (entityInput) entityInput.value = name;
    }

    this.clearIndividualSelection();
  }

  renderBuildingFeaturesDropdown(options = []) {
    const btn = document.getElementById("property-building-btn");
    const card = document.getElementById("property-building-card");
    const list = document.getElementById("property-building-list");
    if (!btn || !card || !list) return;

    Array.from(list.querySelectorAll("[data-dynamic='true']"))?.forEach((el) =>
      el.remove()
    );

    const frag = document.createDocumentFragment();
    options?.forEach((opt) => {
      const text = opt.text || opt.value || "";
      const value = opt.value || opt.text || "";
      const slug = String(text)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const id = `property-building-${slug || value}`;

      const li = document.createElement("li");
      li.className = "px-2 py-1 flex items-center gap-2";
      li.dataset.dynamic = "true";
      li.innerHTML = `
        <input
          id="${id}"
          type="checkbox"
          value="${value}"
          class="h-4 w-4 accent-[#003882]"
        />
        <label for="${id}">${text}</label>
      `;
      frag.appendChild(li);
    });

    list.appendChild(frag);

    const icon = btn.querySelector("svg");
    const allToggle = document.getElementById("property-building-all");
    const itemBoxes = Array.from(
      list.querySelectorAll(
        'input[type="checkbox"]:not(#property-building-all)'
      )
    );

    const updateLabel = () => {
      const label = btn.querySelector("span");
      if (!label) return;
      const selected = itemBoxes.filter((c) => c.checked).length;
      label.textContent = selected ? `${selected} selected` : "Select";
    };

    const syncAllCheckbox = () => {
      if (allToggle) {
        allToggle.checked = itemBoxes.every((c) => c.checked);
      }
      updateLabel();
    };

    itemBoxes?.forEach((box) => {
      box.addEventListener("change", syncAllCheckbox);
    });

    if (allToggle && allToggle.dataset.bound !== "true") {
      allToggle.dataset.bound = "true";
      allToggle.addEventListener("change", () => {
        const next = !!allToggle.checked;
        itemBoxes?.forEach((c) => (c.checked = next));
        updateLabel();
      });
    }

    if (btn.dataset.dropdownBound !== "true") {
      btn.dataset.dropdownBound = "true";

      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        card.classList.toggle("hidden");
        if (icon) icon.classList.toggle("rotate-180");
      });

      document.addEventListener("click", (e) => {
        if (
          card.classList.contains("hidden") ||
          card.contains(e.target) ||
          btn.contains(e.target)
        ) {
          return;
        }
        card.classList.add("hidden");
        if (icon) icon.classList.remove("rotate-180");
      });
    }

    syncAllCheckbox();
  }

  getPropertyFormData() {
    const fields = document.querySelectorAll(
      "#property-information [data-property-id]"
    );
    const data = {};
    fields?.forEach((field) => {
      const key = field.dataset.propertyId;
      if (!key) return;
      const tag = field.tagName.toLowerCase();
      if (tag === "ul") {
        const propValKey = field.dataset.propertyValue;
        const checkedItems = Array.from(
          field.querySelectorAll("li input:checked")
        )
          .map((liInput) => liInput.value || "")
          .filter((val) => val && val !== "on");
        if (checkedItems.length) {
          const joined = checkedItems.map((v) => `*/*${v}*/*`).join("");
          data[key] = joined;
          if (propValKey) data[propValKey] = joined;
        }
      } else if (field.type === "checkbox") {
        data[key] = field.checked;
      } else {
        data[key] = field.value || "";
      }
    });
    return data;
  }

  handleSuccess(status = false) {
    const isBoolean = typeof status === "boolean";
    const isUpdate = isBoolean && status;
    const message = isBoolean
      ? isUpdate
        ? "Contact updated successfully."
        : "New contact created successfully."
      : status || "Operation completed successfully.";

    this.customModalHeader.innerText = "Successful";
    this.customModalBody.innerText = message;

    if (isBoolean && !isUpdate) {
      document
        .getElementById("addressDetailsModalWrapper")
        .classList.add("hidden");
    }

    this.toggleModal("statusModal");
  }

  handleFailure(status = false) {
    const isBoolean = typeof status === "boolean";
    const isUpdate = isBoolean && status;
    const message = isBoolean
      ? isUpdate
        ? "Contact update failed."
        : "Contact create failed."
      : status || "Operation failed.";

    this.customModalHeader.innerText = "Failed";
    this.customModalBody.innerText = message;

    this.toggleModal("statusModal");
  }

  setGoogleSearchAddress(data) {
    if (!data || typeof data !== "object") return;
    Object.keys(data)?.forEach((key) => {
      const field = document.querySelector(`[data-property-id="${key}"]`);
      if (field) {
        field.value = data[key];
      }
    });
  }

  getContactId() {
    return (
      document.querySelector("[data-contact-field='contact_id']")?.value || ""
    );
  }

  getInvoiceActivities() {
    return Array.from(this.activityRecordsById?.values?.() || []);
  }

  normalizeActivityTask(value) {
    if (value === null || value === undefined || value === "") return "";
    const raw = String(value).trim();
    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
      return `Job ${numeric}`;
    }
    return raw;
  }

  normalizeActivityOption(value) {
    if (value === null || value === undefined || value === "") return "";
    const raw = String(value).trim();
    const numeric = Number(raw);
    if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 5) {
      return `Option ${numeric}`;
    }
    return raw;
  }

  mapActivitiesForSharedTable(activities = []) {
    const safeActivities = Array.isArray(activities) ? activities : [];
    return safeActivities.map((item) => {
      const serviceName =
        item.Service_Service_Name ||
        item.service_service_name ||
        item.service_name ||
        item.Service?.service_name ||
        "";

      return {
        Id: item.ID || item.id || "",
        Services: serviceName,
        Status:
          item.Activity_Status ||
          item.activity_status ||
          item.Activity_status ||
          item.Status ||
          item.status ||
          "",
        Price: item.Activity_Price || item.activity_price || "",
        "Invoice to Client": item.Invoice_to_Client ?? item.invoice_to_client ?? "",
        Option: this.normalizeActivityOption(item.Option || item.option || ""),
        Task: this.normalizeActivityTask(item.Task || item.task || ""),
      };
    });
  }

  async renderActivitiesTable() {
    const jobId = this.getJobId();
    if (!jobId) {
      this.handleFailure("Missing job id. Reload and try again.");
      return;
    }
    await this.model.fetchActivities(jobId, (activities) => {
      this.activityRecordsById = new Map();
      const safeActivities = Array.isArray(activities) ? activities : [];
      safeActivities?.forEach((item) => {
        const id = String(item.ID || item.id || "");
        if (id) this.activityRecordsById.set(id, item);
      });

      const mappedActivities = this.mapActivitiesForSharedTable(safeActivities);
      const tableHTML = this.createActivitiesTable(mappedActivities);
      const target = document.getElementById("addActivitiesTable");
      if (target) {
        target.innerHTML = "";
        target.appendChild(tableHTML);
        this.bindActivityRowActions();
      }
    });
  }

  createActivitiesTable(data) {
    const rows = Array.isArray(data) ? data : [];
    const table = document.createElement("table");
    table.className =
      "min-w-full border border-slate-200 rounded-lg overflow-hidden text-sm text-slate-700 leading-6";

    const thead = document.createElement("thead");
    thead.className = "bg-slate-100";
    const headerRow = document.createElement("tr");
    const headers = [
      "Task",
      "Option",
      "Services",
      "Status",
      "Price",
      "Invoice to Client",
      "Actions",
    ];
    headers?.forEach((text, idx) => {
      const th = document.createElement("th");
      th.className = "px-7 py-3 text-left font-normal text-slate-700 leading-6";
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");
    const baseTdClass = "px-7 py-3 align-middle leading-6";
    rows?.forEach((item, idx) => {
      const tr = document.createElement("tr");
      tr.className = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
      tr.id = item.Id;

      const status = item.Status || "";
      const statusPalette = this._resolvePaletteEntry(
        this.getColorMappings().activityStatus,
        status,
        status
      );

      const cells = [
        { value: item.Task || "-", className: "text-slate-800" },
        { value: item.Option || "-", className: "text-slate-800" },
        { value: item.Services || "-", className: "text-slate-800" },
        {
          value: "",
          className: "",
          render: () => {
            const span = document.createElement("span");
            span.className = "inline-flex px-3 py-1 rounded-full text-xs font-normal";
            span.style.cssText = statusPalette
              ? `color:${statusPalette.color};background-color:${statusPalette.backgroundColor};`
              : "color:#475569;background-color:#f1f5f9;";
            span.textContent = item.Status || "";
            return span;
          },
        },
        {
          value: item.Price ? `$${item.Price}` : "",
          className: "text-slate-800",
        },
        {
          value: item["Invoice to Client"],
          render: () => this.renderCheckbox(item["Invoice to Client"]),
        },
        {
          render: () => {
            const divElement = document.createElement("div");
            divElement.className = "flex flex-wrap gap-2";
            divElement.innerHTML = `<div class="flex items-center justify-end gap-3 text-slate-500 hover:!text-slate-500 active:!text-slate-500 hover:text-slate-500 active:text-slate-500 focus:text-slate-500 focus-visible:text-slate-500">
              <button type="button" class="edit-btn !text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500" title="Edit">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                </svg>
              </button>
              <button type="button" class="delete-btn !text-rose-600 hover:!text-rose-600 active:!text-rose-600 focus:!text-rose-600 focus-visible:!text-rose-600" title="Delete">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"></path>
                </svg>
              </button>
            </div>`;

            return divElement;
          },
        },
      ];

      cells?.forEach((cell) => {
        const td = document.createElement("td");
        td.className = baseTdClass;
        if (typeof cell.render === "function") {
          td.appendChild(cell.render());
        } else {
          td.textContent = cell.value ?? "";
          if (cell.className) td.classList.add(...cell.className.split(" "));
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = baseTdClass + " text-center text-slate-500";
      td.textContent = "No activities found.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  bindRowActions(containerId, recordsMap, { onEdit, onDelete } = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll(".edit-btn")?.forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const row = btn.closest("tr");
        const id = row?.id;
        if (!id) return;
        const record = recordsMap?.get(id);
        if (!record) return;
        onEdit?.(id, record);
      });
    });

    container.querySelectorAll(".delete-btn")?.forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = "true";
      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const row = btn.closest("tr");
        const id = row?.id;
        if (!id) return;
        const record = recordsMap?.get(id);
        if (!record) return;
        await this.confirmAndDelete(() => onDelete?.(id, record));
      });
    });
  }

  bindActivityRowActions(containerId = "addActivitiesTable") {
    this.bindRowActions(containerId, this.activityRecordsById, {
      onEdit: (id, record) => {
        this.editingActivityId = id;
        this.populateActivityForm(record);
      },
      onDelete: async (id) => {
        this.startLoading("Deleting activity...");
        try {
          await this.model.deleteActivity(id);
          this.handleSuccess("Activity deleted successfully.");
          if (this.editingActivityId === id) this.resetActivityForm();
        } catch (err) {
          console.error("Failed to delete activity", err);
          this.handleFailure("Failed to delete activity. Please try again.");
        } finally {
          this.stopLoading();
        }
      },
    });
  }

  bindMaterialRowActions() {
    this.bindRowActions("addMaterialsTable", this.materialRecordsById, {
      onEdit: (id, record) => {
        this.editingMaterialId = id;
        this.populateMaterialForm(record);
      },
      onDelete: async (id) => {
        this.startLoading("Deleting material...");
        try {
          await this.model.deleteMaterial(id);
          this.handleSuccess("Material deleted successfully.");
          if (this.editingMaterialId === id) this.resetMaterialForm();
        } catch (err) {
          console.error("Failed to delete material", err);
          this.handleFailure("Failed to delete material. Please try again.");
        } finally {
          this.stopLoading();
        }
      },
    });
  }

  async confirmAndDelete(action) {
    const ok = await this.showConfirmModal(
      "Delete record?",
      "This will permanently remove the record. Continue?",
      "Delete",
      "Cancel"
    );
    if (!ok) return;
    await action?.();
  }

  async showConfirmModal(
    title = "Confirm",
    message = "Are you sure?",
    confirmLabel = "Confirm",
    cancelLabel = "Cancel"
  ) {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className =
        "fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm";
      modal.innerHTML = `
        <div class="bg-white rounded shadow-lg w-full max-w-sm p-5 space-y-4 hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
          <div class="space-y-1">
            <h3 class="text-base font-semibold text-slate-900 hover:!text-slate-900 active:!text-slate-900 hover:text-base active:text-base focus:text-base focus-visible:text-base hover:text-slate-900 active:text-slate-900 focus:text-slate-900 focus-visible:text-slate-900">${title}</h3>
            <p class="text-sm text-slate-600 hover:!text-slate-600 active:!text-slate-600  hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600">${message}</p>
          </div>
          <div class="flex justify-end gap-2">
            <button data-confirm-cancel class="!px-3 !py-2 !text-sm !font-medium !text-slate-600 !rounded-lg hover:!text-slate-600 active:!text-slate-600 focus:!text-slate-600 focus-visible:!text-slate-600 hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">${cancelLabel}</button>
            <button data-confirm-ok class="!px-3 !py-2 !text-sm !font-semibold !text-white !bg-rose-600 !rounded-lg hover:!bg-rose-600 active:!bg-rose-600 focus:!bg-rose-600 focus-visible:!bg-rose-600 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white hover:!text-sm active:!text-sm focus:!text-sm focus-visible:!text-sm">${confirmLabel}</button>
          </div>
        </div>
      `;
      const cleanup = () => modal.remove();
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          cleanup();
          resolve(false);
        }
      });
      modal
        .querySelector("[data-confirm-cancel]")
        ?.addEventListener("click", () => {
          cleanup();
          resolve(false);
        });
      modal
        .querySelector("[data-confirm-ok]")
        ?.addEventListener("click", () => {
          cleanup();
          resolve(true);
        });
      document.body.appendChild(modal);
    });
  }

  async renderMaterialsTable() {
    const jobId = this.getJobId();
    if (!jobId) {
      this.handleFailure("Missing job id. Reload and try again.");
      return;
    }
    await this.model.fetchMaterials(jobId, (materials = []) => {
      const target = document.getElementById("addMaterialsTable");
      if (!target) return;

      this.materialRecordsById = new Map();
      materials?.forEach((item) => {
        const id = String(item.ID || item.id || "");
        if (id) this.materialRecordsById.set(id, item);
      });

      const mapped = materials.map((item) => {
        const spContact = item.Service_Provider?.Contact_Information || {};
        const firstName =
          item.Contact_First_Name ||
          spContact.first_name ||
          item.Contact_Information_First_Name ||
          "";
        const lastName =
          item.Contact_Last_Name ||
          spContact.last_name ||
          item.Contact_Information_Last_Name ||
          "";
        const fullName = [firstName, lastName].filter(Boolean).join(" ") || "";

        return {
          Id: item.ID || item.id || "",
          DateAdded:
            item.Date_Added ||
            item.date_added ||
            item.created_at ||
            item.Created_At ||
            "",
          Status: item.Status || item.status || "",
          MaterialName: item.Material_Name || item.material_name || "",
          Total: item.Total || item.total || "",
          TransactionType: item.Transaction_Type || item.transaction_type || "",
          Tax: item.Tax || item.tax || "",
          ServiceProvider: fullName,
        };
      });

      const table = this.createMaterialTable(mapped);
      target.innerHTML = "";
      target.appendChild(table);
      this.bindMaterialRowActions();
    });
  }

  createMaterialTable(data) {
    const rows = Array.isArray(data) ? data : [];

    const table = document.createElement("table");
    table.className =
      "min-w-full border border-slate-200 rounded-lg overflow-hidden text-sm text-slate-700 leading-6";

    const thead = document.createElement("thead");
    thead.className = "bg-slate-100";
    const headerRow = document.createElement("tr");
    const headers = [
      "Date Added",
      "Material Name",
      "Total",
      "Transaction Type",
      "Tax",
      "Service Provider",
      "Actions",
    ];
    headers?.forEach((text) => {
      const th = document.createElement("th");
      th.className = "px-7 py-3 text-left font-normal text-slate-700 leading-6";
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");
    const baseTdClass = "px-7 py-3 align-middle leading-6";
    rows?.forEach((item, idx) => {
      const tr = document.createElement("tr");
      tr.className = idx % 2 === 0 ? "bg-white" : "bg-slate-50";
      tr.id = item.Id;

      const statusKey = (item.Status || "").toLowerCase();
      const statusStyles = {
        new: "bg-sky-100 text-sky-600",
        "in progress": "bg-cyan-100 text-cyan-700",
        "pending payment": "bg-amber-100 text-amber-700",
        "assigned to job": "bg-green-600 text-white",
        paid: "bg-slate-200 text-slate-700",
      };
      const badgeClass =
        statusStyles[statusKey] || "bg-slate-100 text-slate-600";

      const cells = [
        { value: this.formatDate(item.DateAdded), className: "text-slate-800" },
        // {
        //   render: () => {
        //     const span = document.createElement("span");
        //     span.className =
        //       "inline-flex px-3 py-1 rounded-full text-xs font-normal " +
        //       badgeClass;
        //     span.textContent = item.Status || "";
        //     return span;
        //   },
        // },
        { value: item.MaterialName || "-", className: "text-slate-800" },
        {
          value: this.formatCurrency(item.Total),
          className: "text-slate-800",
        },
        { value: item.TransactionType || "-", className: "text-slate-800" },
        { value: item.Tax || "-", className: "text-slate-800" },
        { value: item.ServiceProvider || "-", className: "text-slate-800" },
        {
          render: () => {
            const divElement = document.createElement("div");
            divElement.className =
              "flex items-center justify-end gap-3 text-slate-500";
            divElement.innerHTML = `<button type="button" class="edit-btn !text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500" title="Edit">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 20h9"></path>
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4 12.5-12.5z"></path>
                </svg>
              </button>
              <button type="button" class="delete-btn !text-rose-600 hover:!text-rose-600 active:!text-rose-600 focus:!text-rose-600 focus-visible:!text-rose-600" title="Delete">
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"></path>
                  <path d="M10 11v6M14 11v6"></path>
                  <path d="M9 6V4a2 2 0 012-2h2a2 2 0 012 2v2"></path>
                </svg>
              </button>`;
            return divElement;
          },
        },
      ];

      cells?.forEach((cell) => {
        const td = document.createElement("td");
        td.className = baseTdClass;
        if (typeof cell.render === "function") {
          td.appendChild(cell.render());
        } else {
          td.textContent = cell.value ?? "";
          if (cell.className) td.classList.add(...cell.className.split(" "));
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    if (!rows.length) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = headers.length;
      td.className = baseTdClass + " text-center text-slate-500";
      td.textContent = "No materials found.";
      tr.appendChild(td);
      tbody.appendChild(tr);
    }

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  formatDate(value) {
    if (!value) return "";
    if (String(value).length === 10) {
      value = value * 1000;
    }

    const date = new Date(value);
    if (isNaN(date)) return value;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  formatCurrency(value) {
    if (value === null || value === undefined || value === "") return "";
    const numeric = Number(String(value).replace(/[^0-9.-]+/g, ""));
    if (Number.isNaN(numeric)) return value || "";
    return numeric.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
    });
  }

  async handleAddMaterials() {
    const data = this.getFieldValues(
      '[data-section="add-materials"] input, [data-section="add-materials"] select, [data-section="add-materials"] textarea'
    );
    const jobId = this.getJobId();
    if (!jobId) {
      this.handleFailure("Missing job id. Reload and try again.");
      return;
    }
    data.job_id = jobId;
    if (!data.service_provider_id && this.editingMaterialId) {
      const current = this.materialRecordsById?.get?.(this.editingMaterialId) || {};
      data.service_provider_id =
        current.service_provider_id ||
        current.Service_Provider_ID ||
        current.Service_Provider?.id ||
        current.Service_Provider?.ID ||
        "";
    }
    const receiptUrl =
      document
        .querySelector("[data-material-receipts] [data-upload-url]")
        ?.getAttribute("data-upload-url") || "";
    if (receiptUrl) data.receipt = receiptUrl;
    const isEditing = !!this.editingMaterialId;
    this.startLoading(
      isEditing ? "Updating material..." : "Adding material..."
    );
    try {
      if (isEditing) {
        await this.model.updateMaterial(this.editingMaterialId, data);
        this.handleSuccess("Material updated successfully.");
      } else {
        await this.model.addNewMaterial(data);
        this.handleSuccess("Material added successfully.");
      }
      this.resetMaterialForm();
    } catch (err) {
      console.error(
        isEditing ? "Failed to update material" : "Failed to add material",
        err
      );
      this.handleFailure(
        isEditing
          ? "Failed to update material. Please try again."
          : "Failed to add material. Please try again."
      );
    } finally {
      this.stopLoading();
    }
  }

  renderCheckbox(value) {
    const wrapper = document.createElement("div");
    wrapper.className = "flex justify-center";
    const isChecked = value === true || value === "true" || value === 1;
    const box = document.createElement("div");
    box.className =
      "w-5 h-5 rounded border flex items-center justify-center " +
      (isChecked ? "bg-[#003882] border-sky-900" : "bg-white border-slate-400");

    const check = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    check.setAttribute("width", "14");
    check.setAttribute("height", "14");
    check.setAttribute("viewBox", "0 0 24 24");
    check.classList.add(isChecked ? "text-white" : "text-slate-500");
    check.innerHTML = isChecked
      ? '<path d="M20 6L9 17l-5-5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
      : "";
    if (!isChecked) check.classList.add("opacity-80");

    box.appendChild(check);
    wrapper.appendChild(box);
    return wrapper;
  }

  async handleAddOrUpdateActivity() {
    const data = this.getFieldValues(
      '[data-section="add-activities"] input, [data-section="add-activities"] select, [data-section="add-activities"] textarea'
    );
    const jobId = this.getJobId();
    if (!jobId) {
      this.handleFailure("Missing job id. Reload and try again.");
      return false;
    }
    data.job_id = jobId;
    const isEditing = !!this.editingActivityId;
    this.startLoading(
      isEditing ? "Updating activity..." : "Adding activity..."
    );
    try {
      if (isEditing) {
        await this.model.updateActivity(this.editingActivityId, data);
        this.handleSuccess("Activity updated successfully.");
      } else {
        await this.model.addNewActivity(data);
        this.handleSuccess("Activity added successfully.");
      }
      this.resetActivityForm();
      return true;
    } catch (err) {
      console.error(
        isEditing ? "Failed to update activity" : "Failed to add activity",
        err
      );
      this.handleFailure(
        isEditing
          ? "Failed to update activity. Please try again."
          : "Failed to add activity. Please try again."
      );
      return false;
    } finally {
      this.stopLoading();
    }
  }

  resetActivityForm() {
    const fields = document.querySelectorAll(
      '[data-section="add-activities"] input, [data-section="add-activities"] select, [data-section="add-activities"] textarea'
    );
    fields?.forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
    const quantity = document.querySelector(
      '[data-section="add-activities"] [data-field="quantity"]'
    );
    if (quantity) quantity.value = "1";
    const invoiceToClient = document.querySelector(
      '[data-section="add-activities"] [data-field="invoice_to_client"]'
    );
    if (invoiceToClient) invoiceToClient.checked = true;
    const includeInQuoteSubtotal = document.querySelector(
      '[data-section="add-activities"] [data-field="include_in_quote_subtotal"]'
    );
    if (includeInQuoteSubtotal) includeInQuoteSubtotal.checked = true;
    const includeInQuote = document.querySelector(
      '[data-section="add-activities"] [data-field="include_in_quote"]'
    );
    if (includeInQuote) includeInQuote.checked = false;

    const optionWrapper = document.querySelector(
      '[data-element="service_name_secondary"]'
    );
    const optionSelect = document.querySelector(
      '[data-element="service_name_secondary"] [data-service-role="option"]'
    );
    if (optionWrapper) optionWrapper.classList.add("hidden");
    if (optionSelect) {
      optionSelect.classList.add("hidden");
      optionSelect.innerHTML =
        '<option value="" disabled selected hidden>Select</option>';
    }

    const addBtn = document.getElementById("add-activities");
    if (addBtn) addBtn.textContent = "Add";
    this.editingActivityId = null;
  }

  populateActivityForm(activity = {}) {
    const mapField = (selector, value) => {
      const el = document.querySelector(
        `[data-section="add-activities"] [data-field="${selector}"]`
      );
      if (!el) return;
      if (el.type === "checkbox") {
        if (typeof value === "string") {
          const normalized = value.trim().toLowerCase();
          el.checked = ["1", "true", "yes", "y"].includes(normalized);
        } else {
          el.checked = !!value;
        }
      } else {
        el.value = value ?? "";
      }
    };

    const primaryServiceSelect = document.querySelector(
      '[data-section="add-activities"] [data-service-role="primary"]'
    );
    const secondaryServiceSelect = document.querySelector(
      '[data-element="service_name_secondary"] [data-service-role="option"]'
    );
    const serviceIdInput = document.querySelector(
      '[data-section="add-activities"] [data-field="service_id"]'
    );
    const serviceId = String(
      activity.Service_ID ||
        activity.service_id ||
        activity.Service?.id ||
        activity.Service?.ID ||
        ""
    );
    const serviceName =
      activity.Service_Service_Name || activity.service_name || "";
    const servicesData = this.activitiesServices || [];
    const matchedService =
      servicesData.find((s) => String(s.id) === serviceId) ||
      servicesData.find((s) => serviceName && s.name === serviceName) ||
      null;

    if (primaryServiceSelect) {
      if (matchedService && matchedService.type === "option") {
        const parentPrimary = servicesData.find(
          (s) => String(s.id) === String(matchedService.parentId)
        );
        if (parentPrimary) {
          this.selectActivityServiceOptionById(primaryServiceSelect, parentPrimary.id);
          primaryServiceSelect.dispatchEvent(new Event("change"));
          if (secondaryServiceSelect) {
            this.selectActivityServiceOptionById(
              secondaryServiceSelect,
              matchedService.id
            );
            secondaryServiceSelect.dispatchEvent(new Event("change"));
          }
        }
      } else if (matchedService) {
        this.selectActivityServiceOptionById(primaryServiceSelect, matchedService.id);
        primaryServiceSelect.dispatchEvent(new Event("change"));
      } else {
        primaryServiceSelect.value = serviceName;
        primaryServiceSelect.dispatchEvent(new Event("change"));
      }

      if (serviceIdInput && serviceId) {
        serviceIdInput.value = serviceId;
      }
    }
    mapField("task", activity.task ?? activity.Task ?? "");
    mapField("option", activity.option ?? activity.Option ?? "");
    mapField("quantity", activity.quantity ?? activity.Quantity ?? "");
    mapField(
      "activity_price",
      activity.activity_price ?? activity.Activity_Price ?? ""
    );
    mapField(
      "activity_text",
      activity.activity_text ?? activity.Activity_Text ?? ""
    );
    mapField(
      "activity_status",
      activity.activity_status ??
        activity.Activity_Status ??
        activity.Activity_status ??
        activity.status ??
        activity.Status ??
        ""
    );

    const dateRequired =
      activity.date_required ?? activity.Date_Required ?? activity.date;
    if (dateRequired) {
      const el = document.querySelector(
        '[data-section="add-activities"] [data-field="date_required"]'
      );
      if (el) {
        const d = new Date(Number(dateRequired) * 1000);
        const dd = String(d.getDate()).padStart(2, "0");
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const yyyy = d.getFullYear();
        el.value = `${dd}/${mm}/${yyyy}`;
      }
    }

    mapField(
      "quoted_price",
      activity.quoted_price ?? activity.Quoted_Price ?? ""
    );
    mapField("quoted_text", activity.quoted_text ?? activity.Quoted_Text ?? "");
    mapField("note", activity.note ?? activity.Note ?? "");
    mapField(
      "include_in_quote_subtotal",
      activity.include_in_quote_subtotal ?? activity.Include_in_Quote_Subtotal
    );
    mapField(
      "include_in_quote",
      activity.include_in_quote ?? activity.Include_in_Quote
    );
    mapField(
      "invoice_to_client",
      activity.invoice_to_client ?? activity.Invoice_to_Client
    );

    const addBtn = document.getElementById("add-activities");
    if (addBtn) addBtn.textContent = "Update";
  }

  resetMaterialForm() {
    const fields = document.querySelectorAll(
      '[data-section="add-materials"] input, [data-section="add-materials"] select, [data-section="add-materials"] textarea'
    );
    fields?.forEach((el) => {
      if (el.type === "checkbox") {
        el.checked = false;
      } else {
        el.value = "";
      }
    });
    const addBtn = document.getElementById("add-material-btn");
    if (addBtn) addBtn.textContent = "Add";
    const providerInput = document.querySelector(
      '[data-material-sp-search="input"]'
    );
    if (providerInput) providerInput.value = "";
    this.materialUploadHandler?.reset?.();
    this.editingMaterialId = null;
  }

  populateMaterialForm(material = {}) {
    const mapField = (selector, value) => {
      const el = document.querySelector(
        `[data-section="add-materials"] [data-field="${selector}"]`
      );
      if (!el) return;
      el.value = value ?? "";
    };

    mapField(
      "material_name",
      material.material_name || material.Material_Name || ""
    );
    mapField("status", material.status || material.Status || "");
    mapField("total", material.total || material.Total || "");
    mapField(
      "transaction_type",
      material.transaction_type || material.Transaction_Type || ""
    );
    mapField("tax", material.tax || material.Tax || "");
    mapField("description", material.description || material.Description || "");

    const providerId =
      material.service_provider_id ||
      material.Service_Provider_ID ||
      material.Service_Provider?.id ||
      material.Service_Provider?.ID ||
      "";
    mapField("service_provider_id", providerId);
    const spContact = material.Service_Provider?.Contact_Information || {};
    const providerName = [
      material.Contact_First_Name ||
        material.Service_Provider_Contact_Information_First_Name ||
        material.service_provider_contact_information_first_name ||
        spContact.first_name ||
        spContact.First_Name ||
        material.Contact_Information_First_Name ||
        "",
      material.Contact_Last_Name ||
        material.Service_Provider_Contact_Information_Last_Name ||
        material.service_provider_contact_information_last_name ||
        spContact.last_name ||
        spContact.Last_Name ||
        material.Contact_Information_Last_Name ||
        "",
    ]
      .filter(Boolean)
      .join(" ");

    const providerInput = document.querySelector(
      '[data-material-sp-search="input"]'
    );
    const providerHidden = document.querySelector(
      '[data-material-sp-field="id"]'
    );
    if (providerHidden) providerHidden.value = providerId || "";
    if (providerInput) providerInput.value = providerName || "";

    const addBtn = document.getElementById("add-material-btn");
    if (addBtn) addBtn.textContent = "Update";
  }

  attachInvoiceButtonsHandler(id) {
    let element = document.getElementById(id);
    element.addEventListener("click", (e) => {
      e.preventDefault();
      let url = e.currentTarget.dataset.url;
      if (url) window.open(url, "_blank");
    });
  }

  populateFieldsWithData(fields, data) {
    fields.forEach((item) => {
      const field = item.getAttribute(`data-field`);
      if (field && data[field] !== undefined) {
        item.value = data[field];
      }
    });
  }
}
