document.addEventListener("alpine:init", () => {
  Alpine.store("quoteState", {
    status: "",
    accepted: false,
  });

  const createOptionMap = (options = []) => {
    const map = new Map();
    options
      .filter((entry) => entry && entry.value != null && entry.text)
      .forEach((entry) => {
        map.set(String(entry.value), entry.text);
      });
    return map;
  };

  const locationOptions = createOptionMap([
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
  ]);

  const noiseOptions = createOptionMap([
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
  ]);

  const timeOptions = createOptionMap([
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
  ]);

  Alpine.data("allocateProviderSearch", () => ({
    open: false,
    searchTerm: "",
    filteredCount: 0,
    hasLoaded: false,
    observer: null,
    selectedProviderId: null,
    selectedProvider: null,
    isSubmitting: false,
    feedbackMessage: "",
    feedbackVariant: "success",
    placeholderText: DEFAULT_PROVIDER_PLACEHOLDER,
    pendingPrefillId: null,
    inquiryId: document.body?.dataset?.inquiryId || "",
    toastVisible: false,
    toastMessage: "",
    toastVariant: "success",
    toastTimeout: null,
    filterScheduled: false,
    toastEventHandler: null,
    init() {
      this.$watch("searchTerm", () => this.scheduleFilter());
      this.$nextTick(() => {
        this.observeProviders();
        this.filterProviders();
        this.prefillFromServer();
      });
      this.toastEventHandler = (event) => {
        const detail = event?.detail || {};
        if (!detail.message) return;
        this.showToast(detail.message, detail.variant || "success");
      };
      window.addEventListener("toast:show", this.toastEventHandler);
    },
    destroy() {
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
        this.toastTimeout = null;
      }
      if (this.toastEventHandler) {
        window.removeEventListener("toast:show", this.toastEventHandler);
        this.toastEventHandler = null;
      }
    },
    handleFocus() {
      this.open = true;
      this.scheduleFilter();
    },
    closeDropdown() {
      this.open = false;
    },
    async prefillFromServer() {
      if (!this.inquiryId) return;
      try {
        const data = await graphqlRequest(CALC_DEALS_QUERY, {
          id: this.inquiryId,
        });
        const record = Array.isArray(data?.calcDeals)
          ? data.calcDeals[0]
          : data?.calcDeals;
        const providerId = record?.Service_Provider_ID ?? null;
        if (providerId) {
          this.pendingPrefillId = providerId;
          this.selectProviderById(providerId, { preserveMessage: true });
        }
        const popupComment =
          (record?.Popup_Comment ?? "").trim?.() ||
          (typeof record?.Popup_Comment === "string"
            ? record.Popup_Comment.trim()
            : "");
        if (popupComment) {
          window.dispatchEvent(
            new CustomEvent("popup-comment:show", {
              detail: { comment: popupComment },
            })
          );
        }
        window.dispatchEvent(
          new CustomEvent("dealInfo:prefill", {
            detail: {
              dealName: record.Deal_Name || "",
              dealValue: record.Deal_Value || "",
              salesStage: record.Sales_Stage || "",
              expectedWin: record.Expected_Win || "",
              expectedCloseDate: record.Expected_Close_Date || "",
              actualCloseDate: record.Actual_Close_Date || "",
              weightedValue: record.Weighted_Value || "",
              recentActivity: record.Recent_Activity || "",
            },
          })
        );
      } catch (error) {
        console.error("Failed to fetch allocation", error);
        this.feedbackVariant = "error";
        this.feedbackMessage = "Unable to load current allocation.";
      }
    },
    handleRowSelect(event) {
      event?.preventDefault?.();
      const row = event?.currentTarget;
      if (!row) return;
      const provider = this.extractProviderFromRow(row);
      if (provider?.id) {
        this.setSelectedProvider(provider);
      }
    },
    setSelectedProvider(provider, { preserveMessage = false } = {}) {
      if (!provider?.id) return;
      this.selectedProviderId = provider.id;
      this.selectedProvider = provider;
      this.providerDisplayName =
        provider?.name || this.providerDisplayName || "";
      this.updatePlaceholder(provider);
      this.searchTerm = "";
      this.scheduleFilter();
      this.pendingPrefillId = null;
      if (!preserveMessage) this.feedbackMessage = "";
      this.broadcastSelection(provider);
    },
    selectProviderById(providerId, { preserveMessage = true } = {}) {
      if (!providerId) return;
      const row = this.findRowById(providerId);
      if (row) {
        const provider = this.extractProviderFromRow(row);
        this.setSelectedProvider(provider, { preserveMessage });
      }
    },
    findRowById(providerId) {
      if (!this.$refs.providerList || !providerId) return null;
      const selectorValue = this.escapeForSelector(String(providerId));
      return this.$refs.providerList.querySelector(
        `[data-provider-row][data-provider-id="${selectorValue}"]`
      );
    },
    escapeForSelector(value) {
      if (window.CSS && typeof window.CSS.escape === "function") {
        return window.CSS.escape(value);
      }
      return value.replace(/([\s!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
    },
    observeProviders() {
      if (!this.$refs.providerList || this.observer) return;
      this.observer = new MutationObserver(() => {
        this.scheduleFilter();
      });
      this.observer.observe(this.$refs.providerList, {
        childList: true,
        subtree: true,
      });
    },
    scheduleFilter() {
      if (this.filterScheduled) return;
      this.filterScheduled = true;
      requestAnimationFrame(() => {
        this.filterScheduled = false;
        this.filterProviders();
      });
    },
    filterProviders() {
      const list = this.$refs.providerList;
      if (!list) return;
      const rows = Array.from(list.querySelectorAll("[data-provider-row]"));
      const query = this.searchTerm.trim().toLowerCase();
      let visible = 0;
      let resolvedData = false;
      rows.forEach((row) => {
        const text = (row.textContent || "").trim();
        const hasPlaceholders = /\[[^\]]+\]/.test(text);
        if (text && !hasPlaceholders) {
          resolvedData = true;
        }
        const values = [
          row.dataset.providerId?.toLowerCase(),
          row
            .querySelector("[data-search-name]")
            ?.textContent?.trim()
            ?.toLowerCase(),
          row
            .querySelector("[data-search-phone]")
            ?.textContent?.trim()
            ?.toLowerCase(),
          row
            .querySelector("[data-field='provider-email']")
            ?.textContent?.trim()
            ?.toLowerCase(),
        ].filter(Boolean);
        const haystack = `${values.join(" ")} ${text.toLowerCase()}`.trim();
        const matches = !query || haystack.includes(query);
        row.classList.toggle("hidden", !matches);
        if (matches) visible += 1;
      });
      this.filteredCount = visible;
      this.hasLoaded = resolvedData;
      this.applyStatusBadges();
      if (this.pendingPrefillId) {
        this.selectProviderById(this.pendingPrefillId, {
          preserveMessage: true,
        });
      }
    },
    applyStatusBadges() {
      const list = this.$refs.providerList;
      if (!list) return;
      const palette = {
        active: { dot: "bg-emerald-500", text: "text-emerald-600" },
        "on-site": { dot: "bg-sky-500", text: "text-sky-600" },
        offline: { dot: "bg-slate-400", text: "text-slate-600" },
        archived: { dot: "bg-rose-500", text: "text-rose-600" },
      };
      const dotClasses = [
        "bg-emerald-500",
        "bg-rose-500",
        "bg-sky-500",
        "bg-slate-400",
        "bg-slate-300",
      ];
      const textClasses = [
        "text-emerald-600",
        "text-rose-600",
        "text-sky-600",
        "text-slate-600",
        "text-slate-500",
      ];
      list.querySelectorAll("[data-status-badge]").forEach((badge) => {
        const rawValue = badge.textContent?.trim() || "";
        const normalized = rawValue.toLowerCase().replace(/\s+/g, "-");
        const colors = palette[normalized] || {
          dot: "bg-slate-300",
          text: "text-slate-500",
        };
        const dot = badge
          .closest("[data-provider-row]")
          ?.querySelector("[data-status-dot]");
        if (dot) {
          dotClasses.forEach((cls) => dot.classList.remove(cls));
          dot.classList.add(colors.dot);
        }
        textClasses.forEach((cls) => badge.classList.remove(cls));
        badge.classList.add(colors.text);
      });
    },
    extractProviderFromRow(row) {
      if (!row) return null;
      const grab = (selector) =>
        row.querySelector(selector)?.textContent?.trim() || "";
      const name = grab("[data-search-name]");
      const [firstName = "", ...rest] = name.split(" ");
      const lastName = rest.join(" ").trim();
      return {
        id: row.dataset?.providerId || grab("[data-field='provider-id']"),
        name,
        firstName,
        lastName,
        phone: grab("[data-search-phone]"),
        email: grab("[data-field='provider-email']"),
        status: grab("[data-status-badge]"),
      };
    },
    broadcastSelection(provider) {
      if (!provider) return;
      window.dispatchEvent(
        new CustomEvent("provider-selected", { detail: { provider } })
      );
    },
    updatePlaceholder(provider) {
      const label = this.getProviderLabel(provider);
      this.placeholderText = label
        ? `Allocated to ${label}`
        : DEFAULT_PROVIDER_PLACEHOLDER;
    },
    getProviderLabel(provider) {
      const raw = provider?.name?.trim();
      if (!raw) return "";
      return raw
        .split(/\s+/)
        .map(
          (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
        )
        .join(" ");
    },
    buildAllocationMessage(provider) {
      const label = this.getProviderLabel(provider);
      if (!label) return "Inquiry allocation updated.";
      return `Inquiry Allocated To ${label}.`;
    },
    async confirmAllocation() {
      if (!this.selectedProviderId || this.isSubmitting) {
        if (!this.selectedProviderId) {
          this.feedbackVariant = "error";
          this.feedbackMessage = "Select a service provider first.";
        }
        return;
      }
      if (!this.inquiryId) {
        this.feedbackVariant = "error";
        this.feedbackMessage = "Missing inquiry id.";
        return;
      }
      this.isSubmitting = true;
      this.feedbackMessage = "";
      try {
        const payload = { service_provider_id: this.selectedProviderId };
        const data = await graphqlRequest(UPDATE_DEAL_MUTATION, {
          id: this.inquiryId,
          payload,
        });
        const updatedId =
          data?.updateDeal?.service_provider_id || this.selectedProviderId;
        this.feedbackVariant = "success";
        const successMessage = this.buildAllocationMessage(
          this.selectedProvider
        );
        this.feedbackMessage = successMessage;
        this.pendingPrefillId = updatedId;
        this.selectProviderById(updatedId, { preserveMessage: true });
        this.showToast(successMessage);
      } catch (error) {
        console.error("Failed to update allocation", error);
        this.feedbackVariant = "error";
        this.feedbackMessage =
          error?.message || "Unable to update allocation right now.";
        this.showToast(
          error?.message || "Unable to update allocation right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    showToast(message, variant = "success") {
      if (!message) return;
      this.toastMessage = message;
      this.toastVariant = variant;
      this.toastVisible = true;
      if (this.toastTimeout) {
        clearTimeout(this.toastTimeout);
      }
      this.toastTimeout = setTimeout(() => {
        this.toastVisible = false;
        this.toastTimeout = null;
      }, 4000);
    },
  }));

  Alpine.data("residentFeedback", (props = {}) => ({
    rawLocations: props.rawLocations ?? "",
    rawNoises: props.rawNoises ?? "",
    rawTimes: props.rawTimes ?? "",
    get displayLocations() {
      return this.formatValue(this.rawLocations, locationOptions);
    },
    get displayNoises() {
      return this.formatValue(this.rawNoises, noiseOptions);
    },
    get displayTimes() {
      return this.formatValue(this.rawTimes, timeOptions);
    },
    formatValue(raw, map) {
      const normalized = this.normalizeRaw(raw);
      if (!normalized) return "—";
      const codes = this.parseCodes(normalized);
      if (!codes.length) return normalized;
      const labels = codes
        .map((code) => {
          const key = String(code);
          return map.get(key) || null;
        })
        .filter(Boolean);
      if (labels.length) return labels.join(", ");
      return codes.join(", ");
    },
    normalizeRaw(raw) {
      if (raw == null) return "";
      const value = String(raw).trim();
      if (!value || value === "-" || value === "—") return "";
      if (/^\[[^\]]*\]$/.test(value)) return "";
      return value;
    },
    parseCodes(value) {
      if (!value.includes("*/*")) return [];
      return value
        .split("*/*")
        .map((part) => part.trim())
        .filter(Boolean);
    },
  }));

  Alpine.data("quotePanel", () => ({
    hasQuote: false,
    quoteRecipients: DEFAULT_RECIPIENT_PLACEHOLDER,
    quoteNumber: "",
    quoteDate: "",
    quotePrice: "",
    quoteStatus: "",
    followUpDate: "",
    dateQuoteSent: "",
    dateQuoteAccepted: "",
    availableRecipients: [],
    selectedRecipientIds: [],
    recipientDropdownOpen: false,
    recipientSearchTerm: "",
    recipientsLoaded: false,
    recipientLoadPromise: null,
    sendQuoteError: "",
    boundQuoteListener: null,
    boundStatusListener: null,
    boundProviderListener: null,
    providerDisplayName: "",
    initCheckRan: false,
    init() {
      this.boundQuoteListener = (event) =>
        this.handleQuoteCreated(event?.detail || {});
      window.addEventListener("quote:created", this.boundQuoteListener);
      this.boundStatusListener = (event) =>
        this.handleStatusChange(event?.detail || {});
      window.addEventListener("quote:status-change", this.boundStatusListener);
      this.boundProviderListener = (event) => {
        const providerName = event?.detail?.provider?.name?.trim();
        if (providerName) this.providerDisplayName = providerName;
      };
      window.addEventListener("provider-selected", this.boundProviderListener);
      this.checkExistingQuote();
      this.$nextTick(() => this.ensureRecipientsLoaded());
    },

    destroy() {
      if (this.boundQuoteListener) {
        window.removeEventListener("quote:created", this.boundQuoteListener);
        this.boundQuoteListener = null;
      }
      if (this.boundStatusListener) {
        window.removeEventListener(
          "quote:status-change",
          this.boundStatusListener
        );
        this.boundStatusListener = null;
      }
      if (this.boundProviderListener) {
        window.removeEventListener(
          "provider-selected",
          this.boundProviderListener
        );
        this.boundProviderListener = null;
      }
    },
    handleQuoteCreated(detail = {}) {
      this.hasQuote = true;
      const uniqueId =
        detail.uniqueId ||
        detail.Unique_ID ||
        detail.unique_id ||
        detail.ID ||
        detail.id;
      if (detail.quoteNumber || uniqueId) {
        this.quoteNumber = detail.quoteNumber || uniqueId;
      }
      if (detail.quoteDate || detail.quote_date) {
        this.quoteDate = detail.quoteDate || detail.quote_date || "";
      }
      if (
        detail.quotePrice ||
        detail.quoteTotal ||
        detail.quote_total !== undefined
      ) {
        const raw =
          detail.quotePrice ?? detail.quoteTotal ?? detail.quote_total;
        this.quotePrice = raw === undefined || raw === null ? "" : String(raw);
      }
      if (detail.quoteStatus || detail.quote_status) {
        this.quoteStatus = detail.quoteStatus || detail.quote_status || "";
      }
      if (detail.dateQuoteSent || detail.date_quote_sent) {
        this.dateQuoteSent =
          detail.dateQuoteSent || detail.date_quote_sent || "";
      }
      if (detail.dateQuoteAccepted || detail.date_quoted_accepted) {
        this.dateQuoteAccepted =
          detail.dateQuoteAccepted || detail.date_quoted_accepted || "";
      }
      if (detail.followUpDate || detail.follow_up_date) {
        this.followUpDate = detail.followUpDate || detail.follow_up_date || "";
      }
      if (detail.recipients) this.quoteRecipients = detail.recipients;
      this.$nextTick(() => this.ensureRecipientsLoaded());
      this.syncQuoteState();
    },
    handleStatusChange(detail = {}) {
      if (detail.quoteStatus) {
        this.quoteStatus = detail.quoteStatus || this.quoteStatus;
      }
      if (detail.dateQuoteSent) {
        this.dateQuoteSent = detail.dateQuoteSent;
      }
      if (detail.dateQuoteAccepted) {
        this.dateQuoteAccepted = detail.dateQuoteAccepted;
      }
      this.hasQuote = true;
      this.syncQuoteState();
    },
    get filteredRecipients() {
      const term = this.recipientSearchTerm.trim().toLowerCase();
      if (!term) return this.availableRecipients;
      return this.availableRecipients.filter((recipient) => {
        const haystack = [
          recipient.displayName,
          recipient.role,
          recipient.email,
          recipient.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    },
    toggleRecipientDropdown() {
      this.recipientDropdownOpen = !this.recipientDropdownOpen;
      if (this.recipientDropdownOpen) {
        this.$nextTick(() => this.ensureRecipientsLoaded());
      }
    },
    closeRecipientDropdown() {
      this.recipientDropdownOpen = false;
      this.recipientSearchTerm = "";
    },
    toggleRecipient(id) {
      const key = this.sanitizeRecipientId(id);
      if (!key) return;
      if (this.isRecipientSelected(key)) {
        this.selectedRecipientIds = this.selectedRecipientIds.filter(
          (value) => value !== key
        );
      } else {
        this.selectedRecipientIds = [...this.selectedRecipientIds, key];
      }
      this.refreshRecipientSummary();
      if (this.selectedRecipientIds.length) {
        this.sendQuoteError = "";
      }
    },
    isRecipientSelected(id) {
      const key = this.sanitizeRecipientId(id);
      if (!key) return false;
      return this.selectedRecipientIds.includes(key);
    },
    refreshRecipientSummary() {
      const names = this.availableRecipients
        .filter((recipient) => this.selectedRecipientIds.includes(recipient.id))
        .map((recipient) => recipient.displayName)
        .filter(Boolean);
      this.quoteRecipients = names.length
        ? names.join(", ")
        : DEFAULT_RECIPIENT_PLACEHOLDER;
    },
    get recipientSummaryText() {
      const selected = this.getSelectedRecipients();
      if (selected.length === 0) {
        if (
          this.quoteRecipients &&
          this.quoteRecipients !== DEFAULT_RECIPIENT_PLACEHOLDER
        ) {
          return this.quoteRecipients;
        }
        return "Not specified";
      }
      if (selected.length === 1) return selected[0].displayName;
      return `${selected[0].displayName} +${selected.length - 1} others`;
    },
    get shouldShowRecipientSelector() {
      return !this.isQuoteSent && !this.isQuoteAccepted;
    },
    get sentDateDisplay() {
      return this.dateQuoteSent || "—";
    },
    get isQuoteSent() {
      return (this.quoteStatus || "").toLowerCase() === "sent";
    },
    get isQuoteAccepted() {
      return (this.quoteStatus || "").toLowerCase() === "accepted";
    },
    get acceptedDateDisplay() {
      return this.dateQuoteAccepted || "—";
    },
    getSelectedRecipients() {
      return this.availableRecipients.filter((recipient) =>
        this.selectedRecipientIds.includes(recipient.id)
      );
    },
    syncQuoteState() {
      const store = Alpine.store("quoteState");
      store.status = this.quoteStatus || "";
      store.accepted = this.isQuoteAccepted;
    },
    handleSendQuoteClick() {
      if (!this.selectedRecipientIds.length) {
        this.sendQuoteError = "Please select at least one contact.";
        return;
      }
      this.sendQuoteError = "";
      window.dispatchEvent(
        new CustomEvent("quote:send-preview", {
          detail: { recipients: this.getSelectedRecipients() },
        })
      );
    },
    handleAcceptQuote() {
      window.dispatchEvent(
        new CustomEvent("quote:accept-preview", {
          detail: {
            recipients: this.getSelectedRecipients(),
            clientName: this.getClientName(),
            providerName: this.getProviderDisplayName(),
          },
        })
      );
    },
    getClientName() {
      const selected = this.getSelectedRecipients();
      return selected[0]?.displayName || "Client";
    },
    getProviderDisplayName() {
      if (this.providerDisplayName) return this.providerDisplayName;
      return "Service Provider";
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    handleAddContact() {
      window.dispatchEvent(new CustomEvent("property-contacts:add-requested"));
      this.closeRecipientDropdown();
    },
    ensureRecipientsLoaded() {
      if (this.recipientsLoaded) return Promise.resolve();
      if (!this.recipientLoadPromise) {
        this.recipientLoadPromise = new Promise((resolve) => {
          const attemptLoad = (attempt = 0) => {
            if (this.loadRecipientsFromSource() || attempt >= 10) {
              resolve();
              this.recipientLoadPromise = null;
              return;
            }
            setTimeout(() => attemptLoad(attempt + 1), 200);
          };
          attemptLoad();
        });
      }
      return this.recipientLoadPromise;
    },
    loadRecipientsFromSource() {
      const source = this.$refs.recipientSource;
      if (!source) return false;
      const nodes = source.querySelectorAll("[data-recipient-option]");
      if (!nodes.length) return false;
      this.availableRecipients = Array.from(nodes)
        .map((node) => this.parseRecipientNode(node))
        .filter(Boolean);
      this.recipientsLoaded = this.availableRecipients.length > 0;
      if (this.recipientsLoaded && !this.selectedRecipientIds.length) {
        const important = this.availableRecipients.filter(
          (recipient) => recipient.isImportant
        );
        const defaults = (
          important.length ? important : this.availableRecipients.slice(0, 1)
        ).map((recipient) => recipient.id);
        this.selectedRecipientIds = defaults;
        this.refreshRecipientSummary();
      } else if (this.recipientsLoaded) {
        this.refreshRecipientSummary();
      }
      return this.recipientsLoaded;
    },
    parseRecipientNode(node) {
      if (!node) return null;
      const id =
        this.sanitizeRecipientId(node.dataset.recipientId) ||
        this.sanitizeRecipientId(node.dataset.recipientEmail) ||
        this.sanitizeRecipientId(node.dataset.recipientPhone) ||
        this.sanitizeRecipientId(node.dataset.recipientName);
      if (!id) return null;
      const displayName =
        this.normalizeRecipientValue(node.dataset.recipientName) ||
        "Unnamed Contact";
      const role = this.normalizeRecipientValue(node.dataset.recipientRole);
      const phone = this.normalizeRecipientValue(node.dataset.recipientPhone);
      const email = this.normalizeRecipientValue(node.dataset.recipientEmail);
      const importantHint = this.normalizeRecipientValue(
        node.dataset.recipientImportant
      );
      const isImportant =
        /owner|manager/i.test(role || "") ||
        /primary|preferred|yes|true|1/i.test(importantHint || "");
      return {
        id,
        displayName,
        role: role || "",
        roleLabel: role ? ` (${role})` : "",
        phone,
        email,
        isImportant,
      };
    },
    normalizeRecipientValue(value) {
      if (value == null) return "";
      const trimmed = String(value).trim();
      if (
        !trimmed ||
        trimmed === "-" ||
        trimmed === "—" ||
        (trimmed.startsWith("[") && trimmed.endsWith("]"))
      ) {
        return "";
      }
      return trimmed;
    },
    sanitizeRecipientId(value) {
      if (value == null) return "";
      const trimmed = String(value).trim();
      if (
        !trimmed ||
        trimmed === "-" ||
        trimmed === "—" ||
        trimmed.includes("[") ||
        trimmed.includes("]")
      ) {
        return "";
      }
      return trimmed.toLowerCase();
    },

    async checkExistingQuote() {
      if (this.initCheckRan) return;
      this.initCheckRan = true;
      try {
        const data = await graphqlRequest(CALC_JOBS_QUERY, {
          inquiry_record_id: INQUIRY_RECORD_ID,
        });
        const record = this.extractJobRecord(data);
        if (record) {
          this.handleQuoteCreated(this.mapQuoteRecord(record));
        } else {
          this.hasQuote = false;
        }
      } catch (error) {
        console.error("Failed to check existing quote", error);
        this.hasQuote = false;
      }
    },
    extractJobRecord(payload) {
      if (!payload) return null;
      const calcJobs = this.normalizeCalcJobs(payload.calcJobs);
      const candidate = calcJobs?.[0] ?? payload.calcJobs ?? payload?.createJob;
      if (!candidate) return null;
      return candidate;
    },
    mapQuoteRecord(record = {}) {
      const uniqueId =
        record.Unique_ID ||
        record.unique_id ||
        record.UniqueId ||
        record.UniqueID ||
        record.ID ||
        record.id ||
        "";
      return {
        uniqueId,
        quoteNumber: uniqueId || "",
        quoteDate: record.Quote_Date || record.quote_date || "",
        quotePrice: record.Quote_Total ?? record.quote_total ?? "",
        quoteStatus: record.Quote_Status || record.quote_status || "",
        followUpDate: record.Follow_Up_Date || record.follow_up_date || "",
        dateQuoteSent:
          record.Date_Quote_Sent ||
          record.date_quote_sent ||
          record.Quote_Sent_Date ||
          "",
        dateQuoteAccepted:
          record.Date_Quoted_Accepted || record.date_quoted_accepted || "",
      };
    },
    normalizeCalcJobs(value) {
      if (Array.isArray(value)) return value;
      if (Array.isArray(value?.data)) return value.data;
      if (Array.isArray(value?.nodes)) return value.nodes;
      return null;
    },
  }));

  Alpine.data("quoteModal", () => ({
    open: false,
    provider: null,
    isSubmitting: false,
    boundOpenListener: null,
    boundProviderListener: null,
    init() {
      this.boundOpenListener = () => this.handleOpen();
      this.boundProviderListener = (event) =>
        this.updateProvider(event?.detail?.provider);
      window.addEventListener("quote:create-click", this.boundOpenListener);
      window.addEventListener("provider-selected", this.boundProviderListener);
    },
    destroy() {
      if (this.boundOpenListener) {
        window.removeEventListener(
          "quote:create-click",
          this.boundOpenListener
        );
        this.boundOpenListener = null;
      }
      if (this.boundProviderListener) {
        window.removeEventListener(
          "provider-selected",
          this.boundProviderListener
        );
        this.boundProviderListener = null;
      }
    },
    handleOpen() {
      this.open = true;
    },
    handleClose() {
      this.open = false;
      this.cleanupTempOptions();
    },
    updateProvider(provider) {
      if (provider) this.provider = provider;
    },
    async confirmAction() {
      if (!this.hasProvider || this.isSubmitting) return;
      if (!INQUIRY_RECORD_ID) {
        this.dispatchToast("Missing inquiry record id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        const data = await graphqlRequest(CREATE_JOB_MUTATION, {
          payload: { inquiry_record_id: INQUIRY_RECORD_ID },
        });
        this.dispatchToast(
          `Quote created & notified for ${this.providerName}.`,
          "success"
        );
        const createdId =
          data?.createJob?.Inquiry_Record?.id ?? INQUIRY_RECORD_ID;
        const quoteNumber = createdId
          ? `#Q${String(createdId).padStart(4, "0")}`
          : "#Q0000";
        const quoteDate = new Date().toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        window.dispatchEvent(
          new CustomEvent("quote:created", {
            detail: {
              quoteNumber,
              quoteDate,
              quotePrice: "$0.00",
              recipients: this.providerName,
            },
          })
        );
        this.open = false;
      } catch (error) {
        console.error("Failed to create job", error);
        this.dispatchToast(
          error?.message || "Unable to create quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    get providerName() {
      return this.provider?.name || "No service provider allocated";
    },
    get providerIdDisplay() {
      if (!this.provider?.id) return "N/A";
      return `#${this.provider.id}`;
    },
    get hasProvider() {
      return Boolean(this.provider?.id);
    },
    dispatchToast(message, variant = "success") {
      window.dispatchEvent(
        new CustomEvent("toast:show", {
          detail: { message, variant },
        })
      );
    },
  }));

  Alpine.data("editQuoteModal", () => ({
    open: false,
    form: {
      quoteDate: "",
      followUpDate: "",
    },
    allowDateEditing: true,
    attachments: [],
    nextAttachmentId: 1,
    boundListener: null,
    isSubmitting: false,
    init() {
      this.boundListener = (event) => this.openModal(event?.detail || {});
      window.addEventListener("quote:edit", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:edit", this.boundListener);
        this.boundListener = null;
      }
    },
    openModal(detail = {}) {
      this.allowDateEditing = detail.allowDateEditing !== false;
      this.prefillForm(detail);
      this.nextAttachmentId = 1;
      this.attachments = this.collectExistingAttachments();
      if (!this.attachments.length) {
        this.$nextTick(() => {
          this.nextAttachmentId = 1;
          const refreshed = this.collectExistingAttachments();
          if (refreshed.length) {
            this.attachments = refreshed;
          }
        });
      }
      this.open = true;
    },
    prefillForm(detail = {}) {
      if (detail.quoteDate) {
        this.form.quoteDate = this.normalizeDateInput(detail.quoteDate);
      }
      if (detail.followUpDate) {
        this.form.followUpDate = this.normalizeDateInput(detail.followUpDate);
      }
    },
    closeModal() {
      this.open = false;
    },
    triggerFileInput() {
      this.$refs.fileInput?.click();
    },
    handleFiles(event) {
      const files = Array.from(event?.target?.files || []);
      if (!files.length) return;
      files.forEach((file) => {
        const isPhoto = file.type?.startsWith("image/");
        this.attachments.push(
          this.createAttachment({
            name: file.name,
            url: "",
            kind: isPhoto ? "Photo" : "File",
            existing: false,
            fileObject: file,
          })
        );
      });
      if (event?.target) {
        event.target.value = "";
      }
    },
    removeAttachment(id) {
      const target = this.attachments.find((file) => file.id === id);
      if (target?.existing) return;
      this.attachments = this.attachments.filter((file) => file.id !== id);
    },
    async handleSave() {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      try {
        await this.ensureUploadsProcessed();
        const uploadPayloads = this.collectUploadPayloads();
        for (const payload of uploadPayloads) {
          await graphqlRequest(CREATE_UPLOAD_MUTATION, { payload });
        }
        if (uploadPayloads.length) {
          this.markAttachmentsUploaded(uploadPayloads);
        }
        const payload = this.buildPayload();
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload,
        });
        this.emitToast("Quote updated.");
        this.closeModal();
      } catch (error) {
        console.error("Failed to update quote", error);
        this.emitToast(
          error?.message || "Unable to update quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    collectExistingAttachments() {
      const host = document.querySelector('[data-upload-source="edit-quote"]');
      if (!host) return [];
      const attachments = [];
      const sources = host.querySelectorAll("[data-upload-sources]");
      const roots = sources.length ? sources : [host];
      roots.forEach((root) => {
        root.querySelectorAll("[data-photo-uploads-slot]").forEach((slot) => {
          const url = slot.textContent?.trim();
          if (!url) return;
          attachments.push(
            this.createAttachment({
              name: this.extractName(url),
              url,
              kind: this.normalizeKind(slot.dataset.type) || "Photo",
              existing: true,
            })
          );
        });
        root.querySelectorAll("[data-file-uploads-slot]").forEach((slot) => {
          const raw = slot.textContent?.trim() || "";
          const entries = this.parseFileSlot(
            raw,
            this.normalizeKind(slot.dataset.type) || "File"
          );
          entries.forEach((entry) =>
            attachments.push(
              this.createAttachment({
                ...entry,
                existing: true,
                fileMeta: entry.fileMeta || null,
              })
            )
          );
        });
      });
      return attachments;
    },
    parseFileSlot(raw, kind = "File") {
      if (!raw) return [];
      const parsed = this.tryParseJson(raw);
      if (parsed !== null) {
        if (Array.isArray(parsed)) {
          return parsed
            .map((item) => this.normalizeFileObject(item, kind))
            .filter(Boolean);
        }
        const normalized = this.normalizeFileObject(parsed, kind);
        return normalized ? [normalized] : [];
      }
      const lines = raw
        .split(/\n+/)
        .map((line) => line.trim().replace(/,$/, ""))
        .filter(Boolean);
      const entries = [];
      if (!lines.length && this.looksLikeUrl(raw)) {
        lines.push(raw.trim());
      }
      lines.forEach((line) => {
        const lineJson = this.tryParseJson(line);
        if (lineJson) {
          const normalized = this.normalizeFileObject(lineJson, kind);
          if (normalized) entries.push(normalized);
        } else if (this.looksLikeUrl(line)) {
          entries.push({
            name: this.extractName(line),
            url: line,
            kind,
          });
        }
      });
      return entries;
    },
    normalizeFileObject(entry, kind = "File") {
      if (!entry) return null;
      if (typeof entry === "string") {
        const parsed = this.tryParseJson(entry);
        if (parsed) return this.normalizeFileObject(parsed, kind);
        if (this.looksLikeUrl(entry)) {
          return {
            name: this.extractName(entry),
            url: entry,
            kind,
            fileMeta: { link: entry, name: this.extractName(entry) },
          };
        }
        return null;
      }
      if (entry.File) {
        const nested = this.tryParseJson(entry.File);
        if (nested) return this.normalizeFileObject(nested, kind);
      }
      const url = entry.link || entry.url || entry.path || entry.src || "";
      if (!url) return null;
      return {
        name: entry.name || this.extractName(url),
        url,
        kind: entry.kind || kind,
        fileMeta: {
          link: url,
          name: entry.name || this.extractName(url),
          size: entry.size || entry.filesize || entry.length || null,
          type: entry.mime || entry.type || "",
        },
      };
    },
    createAttachment({
      name = "Attachment",
      url = "",
      kind = "File",
      existing = false,
      fileObject = null,
      fileMeta = null,
    } = {}) {
      return {
        id: this.nextAttachmentId++,
        name,
        url,
        kind: kind || "File",
        existing,
        fileObject,
        fileMeta,
      };
    },
    async ensureUploadsProcessed() {
      const pending = this.attachments.filter(
        (attachment) =>
          !attachment.existing && attachment.fileObject && !attachment.url
      );
      for (const attachment of pending) {
        await this.uploadAttachment(attachment);
      }
    },
    async uploadAttachment(attachment) {
      if (!attachment?.fileObject) return;
      const file = attachment.fileObject;
      const signed = await this.requestSignedUpload(file);
      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });
      if (!uploadResp.ok) {
        throw new Error("Failed to upload file.");
      }
      attachment.url = signed.url;
      if (this.isPhotoAttachment({ ...attachment, fileObject: file })) {
        attachment.fileMeta = null;
      } else {
        attachment.fileMeta = {
          link: signed.url,
          name: attachment.name || file.name,
          size: file.size,
          type: file.type,
        };
      }
      attachment.fileObject = null;
    },
    async requestSignedUpload(file) {
      const response = await fetch(UPLOAD_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-Key": GRAPHQL_API_KEY,
        },
        body: JSON.stringify([
          {
            type: file.type || "application/octet-stream",
            name: file.name || "upload",
            generateName: true,
          },
        ]),
      });
      if (!response.ok) {
        throw new Error("Unable to request upload URL.");
      }
      const payload = await response.json();
      const result = Array.isArray(payload) ? payload[0] : payload;
      if (result?.statusCode && result.statusCode !== 200) {
        throw new Error("Upload endpoint rejected the request.");
      }
      const data = result?.data || result || {};
      if (!data?.uploadUrl || !data?.url) {
        throw new Error("Invalid upload response.");
      }
      return data;
    },
    collectUploadPayloads() {
      const jobId = this.getJobId();
      if (!jobId) {
        this.emitToast("Missing job id for uploads.", "error");
        return [];
      }
      return this.attachments
        .filter((attachment) => !attachment.existing && attachment.url)
        .map((attachment) => {
          const payload = { job_id: jobId };
          if (this.isPhotoAttachment(attachment)) {
            payload.photo_upload = attachment.url;
          } else {
            payload.file_upload = attachment.fileMeta || {
              link: attachment.url,
              name: attachment.name,
            };
          }
          return payload.photo_upload || payload.file_upload ? payload : null;
        })
        .filter(Boolean);
    },
    markAttachmentsUploaded(payloads = []) {
      if (!payloads.length) return;
      const urls = payloads.flatMap((payload) => {
        const list = [];
        if (payload.photo_upload) list.push(payload.photo_upload);
        const fileLink = payload.file_upload?.link || payload.file_upload?.url;
        if (fileLink) list.push(fileLink);
        return list;
      });
      if (!urls.length) return;
      this.attachments = this.attachments.map((attachment) => {
        if (urls.includes(attachment.url)) {
          return { ...attachment, existing: true };
        }
        return attachment;
      });
    },
    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
      }
      const timestamp = this.convertDateToUnix(value);
      if (timestamp === null) return "";
      const date = new Date(timestamp * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },
    getJobId() {
      return (
        JOB_ID ||
        document.body?.dataset?.jobId ||
        this.attachments.find((att) => att.jobId)?.jobId ||
        ""
      );
    },
    buildPayload() {
      const payload = {};
      if (this.allowDateEditing) {
        const quoteTs = this.convertDateToUnix(this.form.quoteDate);
        if (quoteTs !== null) payload.quote_date = String(quoteTs);
        const followTs = this.convertDateToUnix(this.form.followUpDate);
        if (followTs !== null) payload.follow_up_date = String(followTs);
      }
      return payload;
    },
    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.floor(value);
      }
      const str = String(value).trim();
      if (!str) return null;
      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (Number.isFinite(num)) {
          return num > 4102444800 ? Math.floor(num / 1000) : num;
        }
      }
      let parsed = null;
      const slashMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (slashMatch) {
        const [, day, month, year] = slashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (dashMatch) {
        const [, day, month, year] = dashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }
      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },
    isPhotoAttachment(attachment = {}) {
      const label = (attachment.kind || "").toLowerCase();
      if (label.includes("photo") || label.includes("image")) return true;
      if (attachment.url) {
        const ext = attachment.url.split(".").pop()?.toLowerCase();
        if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext)) {
          return true;
        }
      }
      return attachment.fileObject?.type?.startsWith("image/") || false;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    extractName(url = "") {
      if (!url) return "Attachment";
      try {
        return decodeURIComponent(
          url.split("/").filter(Boolean).pop() || "Attachment"
        );
      } catch {
        return "Attachment";
      }
    },
    tryParseJson(raw = "") {
      if (raw && typeof raw === "object") return raw;
      const trimmed = raw.trim();
      if (!trimmed || trimmed === "{}") return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    },
    looksLikeUrl(value = "") {
      return /^https?:\/\//i.test(value.trim());
    },
    normalizeKind(raw = "") {
      if (!raw) return "";
      if (raw.includes("[") && raw.includes("]")) return "";
      return raw;
    },
  }));

  Alpine.data("sendQuoteModal", () => ({
    open: false,
    recipients: [],
    isSending: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const list = this.normalizeRecipients(event?.detail?.recipients || []);
        if (!list.length) {
          this.emitToast("Select at least one contact.", "error");
          return;
        }
        this.recipients = list;
        this.open = true;
      };
      window.addEventListener("quote:send-preview", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:send-preview", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSending) return;
      this.open = false;
      this.recipients = [];
    },
    normalizeRecipients(list = []) {
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          const id =
            item.id ||
            item.email ||
            item.phone ||
            Math.random().toString(36).slice(2);
          return {
            id,
            displayName:
              item.displayName || item.name || item.email || "Recipient",
            roleLabel: item.role ? ` (${item.role})` : "",
            email: item.email || "",
            phone: item.phone || "",
            isImportant: Boolean(item.isImportant),
          };
        })
        .filter(Boolean);
    },
    async handleSend() {
      if (!this.recipients.length) {
        this.emitToast("No recipients selected.", "error");
        return;
      }
      if (!JOB_ID) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      if (this.isSending) return;
      this.isSending = true;
      try {
        const nowTs = Math.floor(Date.now() / 1000);
        const formatted = this.formatDateDDMMYYYY(new Date());
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload: {
            quote_status: "Sent",
            date_quote_sent: String(nowTs),
          },
        });
        window.dispatchEvent(
          new CustomEvent("quote:status-change", {
            detail: {
              quoteStatus: "Sent",
              dateQuoteSent: formatted,
            },
          })
        );
        this.emitToast("Quote marked as sent.");
        this.close();
      } catch (error) {
        console.error("Failed to send quote", error);
        this.emitToast(
          error?.message || "Unable to send quote right now.",
          "error"
        );
      } finally {
        this.isSending = false;
      }
    },
    formatDateDDMMYYYY(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d)) return "";
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("acceptQuoteModal", () => ({
    open: false,
    clientName: "",
    providerName: "",
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const detail = event?.detail || {};
        this.clientName =
          detail.clientName ||
          this.extractClientName(detail.recipients) ||
          "Client";
        this.providerName =
          detail.providerName ||
          this.extractProviderName() ||
          "Service Provider";
        this.open = true;
      };
      window.addEventListener("quote:accept-preview", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("quote:accept-preview", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    extractClientName(recipients = []) {
      if (!Array.isArray(recipients) || !recipients.length) return "";
      return recipients[0]?.displayName || "";
    },
    extractProviderName() {
      const field = document.getElementById("allocate-provider-input");
      const placeholder = field?.getAttribute("placeholder") || "";
      if (placeholder.toLowerCase().startsWith("allocated to ")) {
        return (
          placeholder.replace(/^Allocated to\s*/i, "").trim() ||
          "Service Provider"
        );
      }
      return "Service Provider";
    },
    async handleAccept() {
      if (this.isSubmitting) return;
      if (!JOB_ID) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        const nowTs = Math.floor(Date.now() / 1000);
        const formatted = this.formatDateDDMMYYYY(new Date());
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: JOB_ID,
          payload: {
            quote_status: "Accepted",
            date_quoted_accepted: String(nowTs),
          },
        });
        window.dispatchEvent(
          new CustomEvent("quote:status-change", {
            detail: {
              quoteStatus: "Accepted",
              dateQuoteAccepted: formatted,
            },
          })
        );
        this.emitToast("Quote marked as accepted.");
        this.close();
      } catch (error) {
        console.error("Failed to accept quote", error);
        this.emitToast(
          error?.message || "Unable to accept quote right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    formatDateDDMMYYYY(date) {
      const d = date instanceof Date ? date : new Date(date);
      if (Number.isNaN(d)) return "";
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = d.getFullYear();
      return `${dd}/${mm}/${yy}`;
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("viewActivitiesModal", () => ({
    open: false,
    activities: [
      {
        id: "a-1",
        task: "Possum Proofing",
        service: "Pigeon Removal",
        price: "$1,250.00",
        note: "Inspect roofline, seal active entry points, and install mesh guards across the eaves.",
        technician: "Alan Smith",
        updated: "10/11/2025",
        status: "Scheduled",
      },
      {
        id: "a-2",
        task: "Roof Clean & Sanitize",
        service: "Roof Restoration",
        price: "$860.00",
        note: "High-pressure clean and apply sanitation treatment to remove nesting debris.",
        technician: "Mikaela Jones",
        updated: "08/11/2025",
        status: "Completed",
      },
      {
        id: "a-3",
        task: "Gutter Guard Install",
        service: "Add-On Service",
        price: "$420.00",
        note: "Fit aluminium gutter guards to western elevation to prevent re-entry.",
        technician: "Team Bravo",
        updated: "05/11/2025",
        status: "Scheduled",
      },
    ],
    boundListener: null,
    init() {
      this.boundListener = () => {
        this.open = true;
      };
      window.addEventListener("activities:view-all", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("activities:view-all", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      this.open = false;
    },
  }));

  Alpine.data("popupCommentModal", () => ({
    open: false,
    comment: "",
    inquiryId: document.body?.dataset?.inquiryId || "",
    contactId: document.body?.dataset?.contactId || "",
    isSubmitting: false,
    boundShowListener: null,
    init() {
      this.boundShowListener = (event) => {
        const detail = event?.detail || {};
        const text = typeof detail.comment === "string" ? detail.comment : "";
        const shouldOpen = detail.force || text.trim().length > 0;
        if (shouldOpen) {
          this.comment = text;
          this.open = true;
        }
      };
      window.addEventListener("popup-comment:show", this.boundShowListener);
    },
    destroy() {
      if (this.boundShowListener) {
        window.removeEventListener(
          "popup-comment:show",
          this.boundShowListener
        );
        this.boundShowListener = null;
      }
    },
    handleClose() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    async handleUpdate() {
      if (this.isSubmitting) return;
      const targetContactId = CONTACT_ID;
      if (!targetContactId) {
        this.emitToast("Missing contact id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(UPDATE_CONTACT_MUTATION, {
          id: targetContactId,
          payload: {
            popup_comment: this.comment,
          },
        });
        this.emitToast("Popup note updated.");
        this.open = false;
      } catch (error) {
        console.error("Failed to update popup comment", error);
        this.emitToast(
          error?.message || "Unable to update popup note right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("uploadsModal", () => ({
    open: false,
    attachments: [],
    activeIndex: 0,
    boundShowListener: null,
    init() {
      this.boundShowListener = (event) => {
        const detail = event?.detail || {};
        const payload = detail.attachments;
        let parsed = this.parseAttachments(payload);
        if (!parsed.length) {
          parsed = this.collectFromDom(detail.target);
        }
        this.attachments = parsed;
        this.activeIndex = 0;
        this.open = true;
      };
      window.addEventListener("uploads:show", this.boundShowListener);
    },
    destroy() {
      if (this.boundShowListener) {
        window.removeEventListener("uploads:show", this.boundShowListener);
        this.boundShowListener = null;
      }
    },
    parseAttachments(raw) {
      if (!raw) return [];
      let data = raw;
      if (typeof raw === "string") {
        try {
          data = JSON.parse(raw);
        } catch {
          data = [];
        }
      }
      if (!Array.isArray(data)) data = [data];
      return data
        .map((item) => this.normalizeAttachment(item))
        .flat()
        .filter(Boolean);
    },
    normalizeAttachment(entry, kind = "") {
      const results = [];
      if (!entry) return results;
      if (Array.isArray(entry)) {
        entry.forEach((item) =>
          results.push(...this.normalizeAttachment(item, kind))
        );
        return results;
      }
      if (entry.File) {
        const nested = this.tryParseJson(entry.File);
        if (nested) {
          results.push(...this.normalizeAttachment(nested, "File"));
        }
        return results;
      }
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        const parsed = this.tryParseJson(trimmed);
        if (parsed) {
          results.push(...this.normalizeAttachment(parsed, kind));
        } else if (this.looksLikeUrl(trimmed)) {
          results.push({
            name: this.extractName(trimmed),
            url: trimmed,
            type: this.inferMimeFromUrl(trimmed),
            isImage: this.isImageType("", trimmed),
            kind,
            typeLabel: this.describeType("", trimmed, kind),
          });
        }
        return results;
      }
      const url = entry.url || entry.path || entry.src || entry.link || "";
      if (!url) return results;
      const name = entry.name || entry.filename || this.extractName(url);
      const effectiveKind = kind || entry.kind || "";
      const mime = (entry.mime || entry.type || "").toLowerCase();
      const type = mime || this.inferMimeFromUrl(url);
      const isImage = entry.isImage ?? this.isImageType(type, url) ?? false;
      results.push({
        name,
        url,
        type,
        isImage,
        kind: effectiveKind,
        typeLabel:
          entry.typeLabel || this.describeType(type, url, effectiveKind),
      });
      return results;
    },
    extractName(url = "") {
      try {
        const parts = url.split("/");
        return decodeURIComponent(parts[parts.length - 1] || "Attachment");
      } catch {
        return "Attachment";
      }
    },
    inferMimeFromUrl(url = "") {
      const ext = url.split(".").pop()?.toLowerCase();
      switch (ext) {
        case "jpg":
        case "jpeg":
          return "image/jpeg";
        case "png":
          return "image/png";
        case "gif":
          return "image/gif";
        case "webp":
          return "image/webp";
        case "pdf":
          return "application/pdf";
        case "doc":
        case "docx":
          return "application/msword";
        case "txt":
          return "text/plain";
        default:
          return "";
      }
    },
    isImageType(type = "", url = "") {
      if (type.startsWith("image/")) return true;
      const ext = url.split(".").pop()?.toLowerCase();
      return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"].includes(ext);
    },
    describeType(type = "", url = "", kind = "") {
      if (kind) {
        if (/photo/i.test(kind)) return "Photo";
        if (/file/i.test(kind)) return "File";
      }
      if (type.startsWith("image/")) return "Image";
      if (type.includes("pdf")) return "PDF Document";
      if (type.includes("word") || /\.docx?$/i.test(url)) {
        return "Word Document";
      }
      if (type.includes("text") || /\.txt$/i.test(url)) {
        return "Text File";
      }
      if (/\.xls[x]?$/i.test(url)) return "Spreadsheet";
      return "File Attachment";
    },
    close() {
      this.open = false;
    },
    collectFromDom(target = "") {
      const sources = [];
      const hostList = target
        ? Array.from(
            document.querySelectorAll(`[data-upload-source="${target}"]`)
          )
        : Array.from(document.querySelectorAll("[data-upload-source]"));
      if (!hostList.length) return sources;

      hostList.forEach((host) => {
        if (!host) return;
        const containers = host.querySelectorAll("[data-upload-sources]");
        const targets = containers.length ? containers : [host];

        targets.forEach((root) => {
          if (!root) return;
          const photoSlots = root.querySelectorAll("[data-photo-uploads-slot]");
          photoSlots.forEach((slot) => {
            sources.push(
              ...this.extractFromSlot(
                slot,
                this.normalizeKind(slot.dataset.type) || "Photo"
              )
            );
          });

          const fileSlots = root.querySelectorAll("[data-file-uploads-slot]");
          fileSlots.forEach((slot) => {
            sources.push(
              ...this.extractFromSlot(
                slot,
                this.normalizeKind(slot.dataset.type) || "File"
              )
            );
          });
        });
      });

      return this.parseAttachments(sources);
    },
    extractFromSlot(slot, kind = "") {
      if (!slot) return [];
      const items = [];
      const effectiveKind = this.normalizeKind(kind);
      slot.querySelectorAll("img").forEach((img) => {
        if (!img.src) return;
        items.push({
          url: img.currentSrc || img.src,
          name: img.alt || img.dataset.name || this.extractName(img.src),
          mime: img.dataset.mime || "",
          kind: effectiveKind,
          typeLabel: this.describeType(
            img.dataset.mime || "",
            img.src,
            effectiveKind
          ),
          isImage: true,
        });
      });
      slot.querySelectorAll("a[href]").forEach((anchor) => {
        if (anchor.querySelector("img")) return;
        const url = anchor.href;
        if (!url) return;
        items.push({
          url,
          name:
            anchor.dataset.name ||
            anchor.textContent.trim() ||
            this.extractName(url),
          mime: anchor.dataset.mime || "",
          kind: effectiveKind,
          typeLabel: this.describeType(
            anchor.dataset.mime || "",
            url,
            effectiveKind
          ),
        });
      });
      const raw = slot.textContent?.trim();
      if (raw) {
        const parsed = this.tryParseJson(raw);
        if (parsed) {
          items.push(...this.normalizeAttachment(parsed, effectiveKind));
        } else {
          raw
            .split(/\n+/)
            .map((line) => line.trim().replace(/,$/, ""))
            .filter(Boolean)
            .forEach((line) => {
              const json = this.tryParseJson(line);
              if (json) {
                items.push(...this.normalizeAttachment(json, effectiveKind));
              } else if (this.looksLikeUrl(line)) {
                items.push({
                  url: line,
                  name: this.extractName(line),
                  mime: "",
                  kind: effectiveKind,
                  typeLabel: this.describeType("", line, effectiveKind),
                });
              }
            });
        }
      }
      return items;
    },
    tryParseJson(raw = "") {
      const trimmed = raw.trim();
      if (!trimmed) return null;
      try {
        return JSON.parse(trimmed);
      } catch {
        return null;
      }
    },
    normalizeKind(raw = "") {
      if (!raw) return "";
      if (raw.includes("[") && raw.includes("]")) return "";
      return raw;
    },
    looksLikeUrl(value = "") {
      return /^https?:\/\//i.test(value);
    },
    prev() {
      if (this.hasPrev) {
        this.activeIndex -= 1;
      }
    },
    next() {
      if (this.hasNext) {
        this.activeIndex += 1;
      }
    },
    get hasPrev() {
      return this.activeIndex > 0;
    },
    get hasNext() {
      return this.activeIndex < this.attachments.length - 1;
    },
    get currentAttachment() {
      return this.attachments[this.activeIndex] || {};
    },
    get attachmentLabel() {
      if (!this.attachments.length) return "";
      return `Attachment ${this.activeIndex + 1} of ${this.attachments.length}`;
    },
  }));

  Alpine.data("recommendationModal", () => ({
    open: false,
    value: "",
    jobId: null,
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const detail = event?.detail || {};
        this.value =
          typeof detail.recommendation === "string"
            ? detail.recommendation
            : "";
        this.jobId = detail.jobId || JOB_ID;
        this.open = true;
      };
      window.addEventListener("recommendation:edit", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener("recommendation:edit", this.boundListener);
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    async submit() {
      if (this.isSubmitting) return;
      const targetJobId = this.jobId || JOB_ID;
      if (!targetJobId) {
        this.emitToast("Missing job id.", "error");
        return;
      }
      this.isSubmitting = true;
      try {
        await graphqlRequest(UPDATE_JOB_MUTATION, {
          id: targetJobId,
          payload: { admin_recommendation: this.value },
        });
        this.emitToast("Recommendation updated.");
        this.open = false;
      } catch (error) {
        console.error("Failed to update recommendation", error);
        this.emitToast(
          error?.message || "Unable to update recommendation right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("activityModal", () => ({
    open: false,
    form: {
      job: "Job 1",
      option: "Option 1",
      service: "Possum",
      activityPrice: "0.00",
      serviceOption: "R4.1 ECOWOOL to ceiling cavity.",
      activityText: "",
      warranty: "",
      note: "",
      invoiceClient: true,
      includeDocuments: true,
    },
    mode: "create",
    activityId: null,
    boundAddListener: null,
    boundEditListener: null,
    isSubmitting: false,
    notify(message, variant = "success") {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
    normalizePrice(value) {
      if (typeof value === "number") return value.toFixed(2);
      const numeric = parseFloat(String(value || "").replace(/[^0-9.-]/g, ""));
      if (Number.isFinite(numeric)) {
        return numeric.toFixed(2);
      }
      return "0.00";
    },
    normalizeBoolean(value) {
      if (typeof value === "boolean") return value;
      const str = String(value ?? "")
        .trim()
        .toLowerCase();
      return ["1", "true", "yes", "y"].includes(str);
    },
    services: [],
    serviceOptions: [],
    filteredServiceOptions: [],
    tempSelectOptions: {},
    serviceCatalog: [],
    servicesById: new Map(),
    servicesCatalogLoaded: false,
    init() {
      this.boundAddListener = () => {
        this.openModal("create", {});
      };
      this.boundEditListener = (event) => {
        const detail = event?.detail || {};
        this.openModal("edit", detail);
      };
      window.addEventListener("activity:add", this.boundAddListener);
      window.addEventListener("activity:edit", this.boundEditListener);
    },
    destroy() {
      if (this.boundAddListener) {
        window.removeEventListener("activity:add", this.boundAddListener);
        this.boundAddListener = null;
      }
      if (this.boundEditListener) {
        window.removeEventListener("activity:edit", this.boundEditListener);
        this.boundEditListener = null;
      }
      this.cleanupTempOptions();
    },
    handleClose() {
      this.open = false;
      this.cleanupTempOptions();
    },
    openModal(mode, detail = {}) {
      this.mode = mode;
      this.activityId = detail.activityId || null;
      this.resetForm();
      this.open = true;
      this.$nextTick(async () => {
        await Promise.all([
          this.ensureServiceData(),
          this.ensureServicesCatalog(),
        ]);
        this.prefillFromDetail(detail);
      });
    },
    resetForm() {
      this.cleanupTempOptions();
      this.form = {
        job: "",
        option: "",
        service: "",
        activityPrice: "0.00",
        serviceOption: "",
        activityText: "",
        warranty: "",
        note: "",
        invoiceClient: true,
        includeDocuments: true,
      };
      this.pendingServiceId = "";
      this.pendingServiceOptionId = "";
    },
    prefillFromDetail(detail = {}) {
      if (!detail) return;
      this.form.job = detail.task || "";
      this.form.option = detail.option || "";
      this.ensureTempSelectOption("job", this.$refs.jobSelect, this.form.job);
      this.ensureTempSelectOption(
        "option",
        this.$refs.optionSelect,
        this.form.option
      );
      this.form.activityPrice = this.normalizePrice(detail.activityPrice);
      this.form.activityText = detail.activityText || "";
      this.form.warranty = detail.warranty || "";
      this.form.note = detail.note || "";
      this.form.invoiceClient =
        detail.invoiceToClient !== undefined
          ? this.normalizeBoolean(detail.invoiceToClient)
          : true;
      const fallbackParentId = this.sanitizeId(detail.serviceParentId);
      const fallbackOptionId = this.sanitizeId(detail.serviceOptionId);
      const recordId =
        this.sanitizeId(detail.serviceRecordId) ||
        this.sanitizeId(detail.serviceId) ||
        fallbackOptionId ||
        fallbackParentId;
      const { primaryId, optionId } = this.resolveServicePrefill(
        recordId,
        fallbackParentId,
        fallbackOptionId
      );
      this.form.service = primaryId || "";
      this.form.serviceOption = optionId || "";
      this.pendingServiceId = this.form.service;
      this.pendingServiceOptionId = optionId || "";
      this.ensureTempSelectOption(
        "service",
        this.$refs.serviceSelect,
        this.form.service
      );
      if (this.form.serviceOption) {
        this.ensureTempSelectOption(
          "service-option",
          this.$refs.serviceOptionSelect,
          this.form.serviceOption
        );
      }
      this.$nextTick(() => {
        this.handleServiceChange();
        if (
          this.pendingServiceOptionId &&
          this.form.serviceOption !== this.pendingServiceOptionId
        ) {
          this.form.serviceOption = this.pendingServiceOptionId;
          this.ensureTempSelectOption(
            "service-option",
            this.$refs.serviceOptionSelect,
            this.pendingServiceOptionId
          );
        }
      });
    },
    async handleSubmit() {
      if (this.isSubmitting) return;
      const serviceId = this.getServiceIdForPayload();
      if (!serviceId) {
        this.notify("Select a service first.", "error");
        return;
      }
      const payload = {
        job_id: JOB_ID,
        service_id: serviceId,
        task: this.form.job,
        option: this.form.option,
        activity_price: parseFloat(
          this.normalizePrice(this.form.activityPrice)
        ),
        activity_text: this.form.activityText,
        warranty: this.form.warranty,
        note: this.form.note,
        invoice_to_client: Boolean(this.form.invoiceClient),
      };
      const isEdit = this.mode === "edit" && this.activityId;
      const mutation = isEdit
        ? UPDATE_ACTIVITY_MUTATION
        : CREATE_ACTIVITY_MUTATION;
      const variables = isEdit ? { id: this.activityId, payload } : { payload };
      this.isSubmitting = true;
      try {
        await graphqlRequest(mutation, variables);
        this.notify(isEdit ? "Activity updated." : "Activity created.");
        this.open = false;
      } catch (error) {
        console.error("Failed to submit activity", error);
        this.notify(
          error?.message || "Unable to save activity right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    getServiceIdForPayload() {
      if (this.filteredServiceOptions.length && this.form.serviceOption) {
        return this.form.serviceOption;
      }
      return this.form.service || null;
    },
    ensureServicesCatalog() {
      if (this.servicesCatalogLoaded) {
        return Promise.resolve();
      }
      if (!this.servicesCatalogLoaded) {
        return fetchServicesCatalog().then((catalog) => {
          const list = Array.isArray(catalog) ? catalog : [];
          this.serviceCatalog = list;
          this.servicesById = new Map();
          list.forEach((entry) => {
            if (!entry) return;
            const id = this.sanitizeId(
              entry.serviceid ?? entry.serviceId ?? entry.id
            );
            if (!id) return;
            const parentId = this.sanitizeId(
              entry.primary_service_id ?? entry.Primary_Service_ID ?? ""
            );
            this.servicesById.set(id, {
              id,
              name:
                entry.service_name || entry.Service_Name || entry.name || "",
              type:
                entry.service_type || entry.Service_Type || entry.type || "",
              parentId,
            });
          });
          this.servicesCatalogLoaded = true;
        });
      }
      return Promise.resolve();
    },
    getServiceMetaById(id) {
      const key = this.sanitizeId(id);
      if (!key) return null;
      return this.servicesById.get(key) || null;
    },
    resolveServicePrefill(recordId, fallbackParentId, fallbackOptionId) {
      const meta = this.getServiceMetaById(recordId);
      if (meta) {
        const type = (meta.type || "").toLowerCase();
        if (type.includes("option") && meta.parentId) {
          return { primaryId: meta.parentId, optionId: meta.id };
        }
        return { primaryId: meta.id, optionId: "" };
      }
      if (fallbackParentId) {
        return {
          primaryId: fallbackParentId,
          optionId: fallbackOptionId || recordId || "",
        };
      }
      if (recordId) {
        return { primaryId: recordId, optionId: "" };
      }
      return { primaryId: "", optionId: "" };
    },
    ensureServiceData() {
      if (this.tryLoadServiceData()) {
        return Promise.resolve();
      }
      return new Promise((resolve) => {
        const maxAttempts = 10;
        const attemptLoad = (attempt = 0) => {
          if (this.tryLoadServiceData() || attempt >= maxAttempts) {
            resolve();
          } else {
            setTimeout(() => attemptLoad(attempt + 1), 100);
          }
        };
        attemptLoad();
      });
    },
    tryLoadServiceData() {
      let hasServices = false;
      if (this.$refs.serviceSource) {
        const parsedServices = this.parseOptions(
          this.$refs.serviceSource,
          false
        );
        if (parsedServices.length) {
          this.services = parsedServices;
          hasServices = true;
          const hasCurrentSelection = parsedServices.some(
            (service) => service.id === this.form.service
          );
          if (!this.form.service || !hasCurrentSelection) {
            this.form.service = parsedServices[0].id;
          }
        }
      }
      if (this.$refs.serviceOptionSource) {
        const parsedOptions = this.parseOptions(
          this.$refs.serviceOptionSource,
          true
        );
        if (parsedOptions.length) {
          this.serviceOptions = parsedOptions;
        }
      }
      this.handleServiceChange();
      return hasServices;
    },
    parseOptions(container, withParent = false) {
      if (!container) return [];
      const options = Array.from(container.querySelectorAll("option"));
      return options
        .map((option) => {
          const id = this.sanitizeId(
            option.value ?? option.getAttribute("value") ?? option.textContent
          );
          const name =
            option.dataset.serviceName?.trim() ||
            option.textContent?.trim() ||
            "";
          if (!id || (name && name.includes("["))) return null;
          const type = option.dataset.serviceType?.trim() || "";
          if (!withParent && type && /option/i.test(type)) return null;
          const parentId = this.sanitizeId(option.dataset.parentService);
          return {
            id,
            name: name || id,
            type,
            parentId: withParent ? parentId : "",
          };
        })
        .filter(Boolean);
    },
    handleServiceChange() {
      const targetServiceId = this.pendingServiceId || this.form.service;
      if (targetServiceId && targetServiceId !== this.form.service) {
        this.form.service = targetServiceId;
      }
      if (this.form.service) {
        this.pendingServiceId = "";
      }
      this.ensureTempSelectOption(
        "service",
        this.$refs.serviceSelect,
        this.form.service
      );
      if (!this.form.service) {
        this.filteredServiceOptions = [];
        if (!this.pendingServiceOptionId) {
          this.form.serviceOption = "";
        }
        return;
      }
      this.filteredServiceOptions = this.serviceOptions.filter(
        (option) => option.parentId === this.form.service
      );
      if (!this.filteredServiceOptions.length) {
        if (!this.pendingServiceOptionId) {
          this.form.serviceOption = "";
        }
        return;
      }
      const desiredOptionId =
        this.pendingServiceOptionId || this.form.serviceOption;
      const hasDesired =
        desiredOptionId &&
        this.filteredServiceOptions.some(
          (option) => option.id === desiredOptionId
        );
      if (hasDesired) {
        this.form.serviceOption = desiredOptionId;
        this.pendingServiceOptionId = "";
      } else {
        const hasSelected = this.filteredServiceOptions.some(
          (option) => option.id === this.form.serviceOption
        );
        if (!hasSelected) {
          this.form.serviceOption = this.filteredServiceOptions[0].id;
        }
      }
      this.ensureTempSelectOption(
        "service-option",
        this.$refs.serviceOptionSelect,
        this.form.serviceOption
      );
    },
    cleanupTempOptions() {
      Object.values(this.tempSelectOptions || {}).forEach((option) => {
        if (option && typeof option.remove === "function") {
          option.remove();
        }
      });
      this.tempSelectOptions = {};
    },
    ensureTempSelectOption(key, selectEl, value) {
      if (!selectEl || value === undefined || value === null || value === "")
        return;
      const normalizedValue = String(value);
      const options = Array.from(selectEl.options);
      const hasRealOption = options.some(
        (option) =>
          option.value === normalizedValue && option.dataset.tempOption !== key
      );
      if (hasRealOption) {
        if (this.tempSelectOptions[key]) {
          this.tempSelectOptions[key].remove();
          delete this.tempSelectOptions[key];
        }
        return;
      }
      if (
        this.tempSelectOptions[key] &&
        this.tempSelectOptions[key].value === normalizedValue
      ) {
        return;
      }
      if (this.tempSelectOptions[key]) {
        this.tempSelectOptions[key].remove();
      }
      const option = document.createElement("option");
      option.value = normalizedValue;
      option.textContent = normalizedValue;
      option.dataset.tempOption = key;
      selectEl.appendChild(option);
      this.tempSelectOptions[key] = option;
    },
    sanitizeId(value) {
      if (value === null || value === undefined) return "";
      const trimmed = String(value).trim();
      if (!trimmed) return "";
      const lower = trimmed.toLowerCase();
      if (
        lower === "null" ||
        lower === "undefined" ||
        trimmed.includes("[") ||
        trimmed.includes("]")
      ) {
        return "";
      }
      return trimmed;
    },
  }));

  Alpine.data("deleteActivityModal", () => ({
    open: false,
    activityId: null,
    isSubmitting: false,
    boundListener: null,
    init() {
      this.boundListener = (event) => {
        const id = event?.detail?.activityId;
        if (!id) return;
        this.activityId = id;
        this.open = true;
      };
      window.addEventListener("activity:confirm-delete", this.boundListener);
    },
    destroy() {
      if (this.boundListener) {
        window.removeEventListener(
          "activity:confirm-delete",
          this.boundListener
        );
        this.boundListener = null;
      }
    },
    close() {
      if (this.isSubmitting) return;
      this.open = false;
    },
    async confirm() {
      if (!this.activityId || this.isSubmitting) return;
      this.isSubmitting = true;
      try {
        await graphqlRequest(DELETE_ACTIVITY_MUTATION, {
          id: this.activityId,
        });
        this.emitToast("Activity deleted.");
        this.open = false;
      } catch (error) {
        console.error("Failed to delete activity", error);
        this.emitToast(
          error?.message || "Unable to delete activity right now.",
          "error"
        );
      } finally {
        this.isSubmitting = false;
      }
    },
    emitToast(message, variant = "success") {
      if (!message) return;
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { message, variant } })
      );
    },
  }));

  Alpine.data("dealInfoModal", () => ({
    open: false,
    isSubmitting: false,
    form: {
      dealName: "Possum Roof Service Request - Baldivis 11/7/24",
      dealValue: "0.00",
      salesStage: "",
      expectedWinPercentage: "",
      expectedCloseDate: "",
      actualCloseDate: "",
      weightedValue: "0.00",
      recentActivity: "",
    },
    salesStageOptions: [
      "New Lead",
      "Qualified Prospect",
      "Visit Scheduled",
      "Consideration",
      "Committed",
      "Closed - Won",
      "Closed - Lost",
    ],
    recentActivityOptions: [
      "Active more than a month ago",
      "Active in the last month",
      "Active in the last week",
    ],

    init() {
      this.boundOpenListener = (event) => {
        const detail = event?.detail || {};
        // later we can hydrate from detail or server
        if (detail.dealName) {
          this.form.dealName = detail.dealName;
        }
        this.open = true;
      };

      window.addEventListener("dealInfo:open", this.boundOpenListener);
      window.addEventListener("dealInfo:prefill", (event) => {
        const data = event.detail || {};
        console.log("Prefilling deal info modal with data:", data);
        this.form.dealName = data.dealName ?? "";
        this.form.dealValue = data.dealValue ?? "";
        this.form.salesStage = data.salesStage ?? "";
        this.form.expectedWinPercentage = data.expectedWin ?? "";

        // 👇 IMPORTANT: normalize the DD/MM/YYYY or DD-MM-YYYY
        this.form.expectedCloseDate = this.normalizeDateInput(
          data.expectedCloseDate
        );
        this.form.actualCloseDate = this.normalizeDateInput(
          data.actualCloseDate
        );

        this.form.weightedValue = data.weightedValue ?? "";
        this.form.recentActivity = data.recentActivity ?? "";
      });
    },

    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value; // already correct
      }
      const timestamp = this.convertDateToUnix(value);
      if (timestamp === null) return "";
      const date = new Date(timestamp * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },

    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value)) {
        return Math.floor(value);
      }
      const str = String(value).trim();
      if (!str) return null;

      // pure digits (timestamp)
      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (!Number.isFinite(num)) return null;
        return num > 4102444800 ? Math.floor(num / 1000) : num; // seconds vs ms
      }

      let parsed = null;
      const slashMatch = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dashMatch = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);

      if (slashMatch) {
        const [, day, month, year] = slashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (dashMatch) {
        const [, day, month, year] = dashMatch.map(Number);
        parsed = new Date(year, month - 1, day);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }

      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },

    handleClose() {
      this.open = false;
    },

    handleSave: async function () {
      if (this.isSubmitting) return;

      this.isSubmitting = true;
      this.error = "";

      try {
        const dealId = document.body.dataset.inquiryId;
        if (!dealId) throw new Error("Missing deal ID");

        // Build payload – tweak field names to what your API expects
        const payload = {
          deal_value: this.form.dealValue || null,
          sales_stage: this.form.salesStage || null,
          expected_win: this.form.expectedWinPercentage || null,
          expected_close_date: this.convertDateToUnix(
            this.form.expectedCloseDate
          ),
          actual_close_date: this.convertDateToUnix(this.form.actualCloseDate),
          weighted_value: this.form.weightedValue || null,
          recent_activity: this.form.recentActivity || null,
        };

        // 🔹 Wait for the API call to finish
        await graphqlRequest(UPDATE_DEAL_MUTATION, {
          id: dealId,
          payload,
        });

        // Only after success:
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Deal updated successfully.",
            },
          })
        );

        this.handleClose();
      } catch (error) {
        console.error(error);
        this.error = "Failed to save deal information. Please try again.";

        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: this.error,
            },
          })
        );
      } finally {
        this.isSubmitting = false;
      }
    },
  }));

  Alpine.data("addTaskModal", () => ({
    open: false,
    isSubmitting: false,
    error: "",
    jobId: null,
    titleSuffix: "",

    form: {
      subject: "",
      assigneeId: null,
      assigneeName: "",
      dueDate: "", // store as YYYY-MM-DD (normalized)
      notes: "",
    },

    init() {
      // Open modal (optionally pass jobId + jobLabel)
      this.boundOpenListener = (event) => {
        const d = event?.detail || {};
        this.jobId = d.jobId ?? document.body.dataset.inquiryId ?? null;
        this.titleSuffix = d.jobLabel ?? "";
        if (d.prefill) this.prefill(d.prefill);
        this.open = true;
      };

      window.addEventListener("addTask:open", this.boundOpenListener);
    },

    // === date helpers (same approach/semantics as your dealInfoModal) ===
    normalizeDateInput(value) {
      if (!value) return "";
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value))
        return value;
      const ts = this.convertDateToUnix(value);
      if (ts === null) return "";
      const date = new Date(ts * 1000);
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },

    convertDateToUnix(value) {
      if (value === null || value === undefined) return null;
      if (typeof value === "number" && Number.isFinite(value))
        return Math.floor(value);
      const str = String(value).trim();
      if (!str) return null;

      if (/^\d+$/.test(str)) {
        const num = Number(str);
        if (!Number.isFinite(num)) return null;
        return num > 4102444800 ? Math.floor(num / 1000) : num; // seconds vs ms
      }

      let parsed = null;
      const slash = str.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      const dash = str.match(/^(\d{2})-(\d{2})-(\d{4})$/);

      if (slash) {
        const [, d, m, y] = slash.map(Number);
        parsed = new Date(y, m - 1, d);
      } else if (dash) {
        const [, d, m, y] = dash.map(Number);
        parsed = new Date(y, m - 1, d);
      } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
        parsed = new Date(str);
      } else {
        parsed = new Date(str);
      }

      if (!parsed || isNaN(parsed)) return null;
      return Math.floor(parsed.getTime() / 1000);
    },

    handleClose() {
      this.open = false;
    },

    // Calendar overlay pick -> store yyyy-mm-dd
    handlePickDate(e) {
      const iso = e.target.value; // yyyy-mm-dd
      this.form.dueDate = iso || "";
    },

    assignToMe() {
      const me = window?.CURRENT_USER || { id: null, name: "Me" };
      this.form.assigneeId = me.id;
      this.form.assigneeName = me.name;
    },

    // === SAVE (keeps modal open & shows "Saving…" until success) ===
    handleSave: async function () {
      if (this.isSubmitting) return;
      this.isSubmitting = true;
      this.error = "";

      try {
        const jobId = this.jobId || document.body.dataset.inquiryId;
        if (!jobId) throw new Error("Missing job ID");

        const payload = {
          Job_id: jobId,
          subject: this.form.subject || null,
          assignee_id: 1,
          date_due: this.form.dueDate
            ? this.convertDateToUnix(this.form.dueDate)
            : null,
          details: this.form.notes || null,
        };

        await graphqlRequest(CREATE_JOB_TASK, {
          payload,
        });

        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Task added and notification sent.",
            },
          })
        );
        this.handleClose();
      } catch (error) {
        console.error(error);
        this.error = error?.message || "Failed to add task.";
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: { type: "error", message: this.error },
          })
        );
      } finally {
        this.isSubmitting = false;
      }
    },
  }));

  Alpine.data("taskListModal", () => ({
    open: false,
    isLoading: false,
    error: "",
    jobId: null,
    titleSuffix: "",

    tasks: [],
    actionLoading: {},

    // demo assignees — replace with real list
    assignees: [
      {
        id: "1",
        name: "Andrew Wadsworth",
        email: "andrew+inspect@itmooti.com",
      },
    ],

    init() {
      this.boundOpenListener = (e) => {
        const d = e?.detail || {};
        this.jobId = JOB_ID;
        this.titleSuffix = d.jobLabel ?? "";
        this.fetchTasks();
        this.open = true;
      };
      window.addEventListener("taskList:open", this.boundOpenListener);
    },

    async fetchTasks() {
      if (!this.jobId) {
        this.error = "Missing job ID.";
        return;
      }
      this.isLoading = true;
      this.error = "";
      try {
        const data = await graphqlRequest(JOB_TASKS_QUERY, {
          Job_id: this.jobId,
        });
        const rows = Array.isArray(data?.calcTasks) ? data.calcTasks : [];
        this.tasks = rows.map((row, idx) => this.normalizeTask(row, idx));
        this.tasks.sort(
          (a, b) => (a.dueTs ?? Infinity) - (b.dueTs ?? Infinity)
        );
        this.actionLoading = {};
        for (const t of this.tasks) this.actionLoading[t.uid] = false;
        // nudge reactivity
        this.actionLoading = { ...this.actionLoading };
      } catch (err) {
        console.error(err);
        this.error = err?.message || "Failed to load tasks.";
        this.tasks = [];
      } finally {
        this.isLoading = false;
      }
    },

    normalizeTask(row, idx = 0) {
      const subject = row?.Subject ?? "";
      const notes = row?.Details ?? "";
      const assigneeName = [
        row?.Assignee_First_Name ?? "",
        row?.Assignee_Last_Name ?? "",
      ]
        .filter(Boolean)
        .join(" ")
        .trim();
      const assigneeEmail = row?.AssigneeEmail ?? "";
      const dueRaw = row?.Date_Due ?? "";
      const dueDate = this.parseDate(dueRaw);
      const dueISO = dueDate
        ? new Date(
            dueDate.getTime() - dueDate.getTimezoneOffset() * 60000
          ).toISOString()
        : "";
      const dueTs = dueDate ? Math.floor(dueDate.getTime() / 1000) : null;

      const id = row?.ID ?? null; // might not be present in your current query
      const uid = id ?? `${this.jobId}::${idx}::${subject.slice(0, 16)}`;
      const status = (row?.Status ?? "open").toLowerCase();

      return {
        id,
        uid,
        status,
        subject,
        notes,
        bullets: [],
        assigneeName,
        assigneeEmail,
        dueISO,
        dueTs,
      };
    },

    // UI helpers
    pillClass(s) {
      return s === "completed"
        ? "bg-emerald-100 text-emerald-700"
        : "bg-amber-100 text-amber-700";
    },
    pillText(s) {
      return s === "completed" ? "Completed" : "Open";
    },

    humanDue(iso) {
      if (!iso) return "No due date";
      const d = this.parseDate(iso);
      if (!d) return "No due date";
      const now = new Date(),
        tmr = new Date(now);
      tmr.setDate(now.getDate() + 1);
      const same = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
      const hh = String(d.getHours()).padStart(2, "0"),
        mm = String(d.getMinutes()).padStart(2, "0");
      const hasTime = d.getHours() + d.getMinutes() !== 0;
      if (same(d, now) && hasTime) return `Today ${this.to12h(hh, mm)}`;
      if (same(d, tmr) && hasTime) return `Tomorrow ${this.to12h(hh, mm)}`;
      const day = d.getDate(),
        month = d.toLocaleString(undefined, { month: "long" }),
        year = d.getFullYear();
      return hasTime
        ? `${day} ${month}, ${year} ${this.to12h(hh, mm)}`
        : `${day} ${month}, ${year}`;
    },
    to12h(hh, mm) {
      let h = parseInt(hh, 10),
        ap = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      return `${h}${mm !== "00" ? `:${mm}` : ""}${ap}`;
    },
    parseDate(v) {
      if (!v) return null;
      if (/^\d{10}$/.test(v)) return new Date(Number(v) * 1000);
      if (/^\d{13}$/.test(v)) return new Date(Number(v));
      if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00`);
      const d = new Date(v);
      return isNaN(d) ? null : d;
    },

    mailtoLink(task) {
      if (!task?.assigneeEmail) return null;
      const addr = task.assigneeEmail.trim();
      const qs = new URLSearchParams({
        subject: `Job task: ${task.subject || ""}`,
        // body: `Hi ${task.assigneeName || ''},\n\nRe: ${task.subject || ''}\n\nThanks,\n`
      }).toString();
      return qs ? `mailto:${addr}?${qs}` : `mailto:${addr}`;
    },

    // Actions (kept — guarded if no real id yet)
    async markComplete(task) {
      const key = task.uid;
      if (this.actionLoading[key]) return;

      this.actionLoading[key] = true;
      this.actionLoading = { ...this.actionLoading };

      try {
        if (!task.id) throw new Error("Missing task ID for update.");
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { status: "completed" },
        });
        task.status = "completed";
        this.toast("success", "Task marked as complete.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to complete task.");
      } finally {
        this.actionLoading[key] = false;
        this.actionLoading = { ...this.actionLoading };
      }
    },

    async reopen(task) {
      const key = task.uid;
      if (this.actionLoading[key]) return;

      this.actionLoading[key] = true;
      this.actionLoading = { ...this.actionLoading };

      try {
        if (!task.id) throw new Error("Missing task ID for update.");
        await graphqlRequest(UPDATE_TASK_MUTATION, {
          id: task.id,
          payload: { status: "open" },
        });
        task.status = "open";
        this.toast("success", "Task reopened.");
      } catch (e) {
        console.error(e);
        this.toast("error", e?.message || "Failed to reopen task.");
      } finally {
        this.actionLoading[key] = false;
        this.actionLoading = { ...this.actionLoading };
      }
    },

    isBusy(task) {
      return !!this.actionLoading[task.uid];
    },

    handleMarkComplete(task) {
      console.log("clicked mark complete for", task);
      this.markComplete(task);
    },

    toast(type, message) {
      window.dispatchEvent(
        new CustomEvent("toast:show", { detail: { type, message } })
      );
    },
    handleClose() {
      this.open = false;
    },
  }));
});
