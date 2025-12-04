export class DashboardHelper {
  constructor() {}

  formatUnixDate(unixTimestamp) {
    if (!unixTimestamp) return null;
    const date = new Date(unixTimestamp * 1000);
    const dd = String(date.getUTCDate()).padStart(2, "0");
    const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = date.getUTCFullYear();
    const hh = String(date.getUTCHours()).padStart(2, "0");
    const min = String(date.getUTCMinutes()).padStart(2, "0");
    const ss = String(date.getUTCSeconds()).padStart(2, "0");
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
  }

  mapDealToTableRow(records) {
    return Object.values(records).map((data) => {
      return {
        uniqueId: data?.unique_id || null,
        "date-added": this.formatUnixDate(data?.created_at) || null,
        "inquiry-source": data?.how_did_you_hear || null,
        type: data?.type || null,
        "inquiry-status": data?.inquiry_status || null,
        "service-provider-first-name":
          data?.Service_Provider?.Contact_Information?.first_name || null,
        "service-provider-last-name":
          data?.Service_Provider?.Contact_Information?.last_name || null,
        "service-name": data?.Service_Inquiry?.service_name || null,
        "client-firstName": data?.Primary_Contact?.first_name || null,
        "client-lastName": data?.Primary_Contact?.last_name || null,
        "client-email": data?.Primary_Contact?.email || null,
        "client-smsNumber": data?.Primary_Contact?.sms_number || null,
        "client-address": data?.Property?.address_1 || null,
        "account-name": data.Company?.name || null,
        recommendations: data.admin_notes || null,
      };
    });
  }

  mapInquirysRows(mappedData, formatDisplayDate) {
    return mappedData.map((r) => ({
      id: `#${r.uniqueId ?? ""}`,
      client:
        [r["client-firstName"], r["client-lastName"]]
          .filter(Boolean)
          .join(" ") || "-",
      created:
        r["date-added"] && formatDisplayDate
          ? formatDisplayDate(r["date-added"])
          : "-",
      serviceman:
        [r["service-provider-first-name"], r["service-provider-last-name"]]
          .filter(Boolean)
          .join(" ") || "-",
      followUp:
        r["date-added"] && formatDisplayDate
          ? formatDisplayDate(r["date-added"])
          : "-",
      source: r["inquiry-source"] ?? "-",
      service: r["service-name"] ?? "-",
      type: r.type ?? "-",
      status: r["inquiry-status"] ?? "-",
      meta: {
        address: r["client-address"] ?? null,
        email: r["client-email"] ?? null,
        sms: r["client-smsNumber"] ?? null,
        accountName: r["account-name"] ?? null,
        createdIso: r["date-added"] ?? null,
      },
    }));
  }

  mapQuoteRows(quoteData) {
    if (!quoteData || typeof quoteData !== "object") return [];

    return Object.values(quoteData).map((item) => ({
      id: item?.unique_id ? `#${item.unique_id}` : null,
      client: `${item?.Client_Individual?.first_name ?? ""} ${
        item?.Client_Individual?.last_name ?? ""
      }`.trim(),
      dateQuotedAccepted: this.formatUnixDate(
        item?.date_quoted_accepted ?? null
      ),
      service: item?.Inquiry_Record?.Service_Inquiry?.service_name ?? null,
      quoteDate: this.formatUnixDate(item?.quote_date ?? null),
      quoteTotal: item?.quote_total ?? 0,
      quoteStatus: item?.quote_status ?? "Unknown",
      meta: {
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    }));
  }

  mapJobRows(jobData) {
    if (!jobData || typeof jobData !== "object") return [];

    return Object.values(jobData).map((item) => ({
      id: item?.unique_id ? `#${item.unique_id}` : null,
      client: `${item?.Client_Individual?.first_name ?? ""} ${
        item?.Client_Individual?.last_name ?? ""
      }`.trim(),
      startDate: item.date_started
        ? this.formatUnixDate(item?.date_started)
        : null,
      service: item?.Inquiry_Record?.Service_Inquiry?.service_name ?? null,
      paymentStatus: item?.payment_status ?? "null",
      jobRequiredBy: item?.date_job_required_by
        ? this.formatUnixDate(item?.date_job_required_by)
        : null,
      bookedDate: item?.date_booked
        ? this.formatUnixDate(item?.date_booked)
        : null,
      jobTotal: item?.job_total ?? null,
      jobStatus: item?.job_status ?? "Unknown",
      meta: {
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    }));
  }

  mapPaymentRows(paymentData) {
    if (!paymentData || typeof paymentData !== "object") return [];

    return Object.values(paymentData).map((item) => ({
      id: item?.unique_id ? `#${item.unique_id}` : null,
      client: `${item?.Client_Individual?.first_name ?? ""} ${
        item?.Client_Individual?.last_name ?? ""
      }`.trim(),
      invoiceNumber: item.invoice_number ? item.invoice_number : null,
      paymentStatus: item?.payment_status ?? "null",
      invoiceDate: item?.invoice_date
        ? this.formatUnixDate(item?.invoice_date)
        : null,
      dueDate: item?.due_date ? this.formatUnixDate(item?.due_date) : null,
      invoiceTotal: item?.invoice_total ?? null,
      billPaidDate: item?.bill_time_paid
        ? this.formatUnixDate(item?.bill_time_paid)
        : null,
      xeroInvoiceStatus: item?.xero_invoice_status ?? null,
      serviceApproved: item?.bill_approved_service_provider ?? null,
      adminApproved: item?.bill_approved_admin ?? null,
      meta: {
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    }));
  }

  mapUrgentCallRows(mappedData) {
    const list = Array.isArray(mappedData)
      ? mappedData
      : Array.from(Object.values(mappedData ?? {}));
    return list.map((records) => ({
      id: `#${records.uniqueId ?? ""}`,
      client:
        [records["client-firstName"], records["client-lastName"]]
          .filter(Boolean)
          .join(" ") || "-",
      service: records["service-name"] ?? "-",
      requiredBy: records["date-job-required-by"] ?? null,
      bookedDate: records["date-booked"] ?? null,
      startDate: records["date-started"] ?? null,
      meta: {
        address: records["client-address"] ?? null,
      },
    }));
  }
}

export function initOperationLoader() {
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

export function showLoader(
  loaderElement,
  loaderMessageEl,
  counterRef,
  message
) {
  if (!loaderElement || !counterRef) return;
  counterRef.count = (counterRef.count || 0) + 1;
  if (loaderMessageEl && message) loaderMessageEl.textContent = message;
  loaderElement.classList.remove("hidden");
}

export function hideLoader(loaderElement, counterRef, force = false) {
  if (!loaderElement || !counterRef) return;
  if (force) {
    counterRef.count = 0;
  } else if (counterRef.count > 0) {
    counterRef.count -= 1;
  }
  if (counterRef.count <= 0) {
    loaderElement.classList.add("hidden");
    counterRef.count = 0;
  }
}

export function initCustomModal({ id = "statusModal" } = {}) {
  let modal = document.getElementById(id);

  if (!modal) {
    modal = document.createElement("div");
    modal.id = id;
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
  }

  const headerEl = modal.querySelector("#statusTitle");
  const bodyEl = modal.querySelector("#statusMessage");
  const iconEl = modal.querySelector("#statusIcon");
  const closeBtn = modal.querySelector("#statusCloseBtn");

  const hide = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  if (closeBtn && !closeBtn.dataset.boundClose) {
    closeBtn.dataset.boundClose = "true";
    closeBtn.addEventListener("click", hide);
  }

  if (!modal.dataset.boundOverlay) {
    modal.dataset.boundOverlay = "true";
    modal.addEventListener("click", (e) => {
      if (e.target === modal) hide();
    });
  }

  const escHandler = (e) => {
    if (!modal.classList.contains("hidden") && e.key === "Escape") hide();
  };

  if (!modal.dataset.boundEscape) {
    modal.dataset.boundEscape = "true";
    document.addEventListener("keydown", escHandler);
  }

  return { modal, headerEl, bodyEl, iconEl, hide };
}

let unsavedModalCache = null;

function buildUnsavedChangesModal() {
  if (unsavedModalCache) return unsavedModalCache;

  const modal = document.createElement("div");
  modal.id = "ptpm-unsaved-modal";
  modal.className =
    "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
      <div class="flex items-start justify-between px-4 py-3 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-900">Unsaved Changes</h3>
        <button type="button" data-unsaved-close class="text-slate-500 hover:text-slate-700">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="px-4 py-5 space-y-4 text-left">
        <p class="text-sm text-slate-700">You have unsaved changes. Do you want to discard them or save and exit?</p>
        <div class="flex justify-end gap-3">
          <button type="button" data-unsaved-discard class="px-4 py-2 rounded border border-red-500 text-red-600 hover:bg-red-50 text-sm font-semibold">Discard Changes</button>
          <button type="button" data-unsaved-save class="px-4 py-2 rounded bg-[#003882] text-white hover:bg-[#0b4b9f] text-sm font-semibold">Save & Exit</button>
        </div>
      </div>
    </div>
  `;

  const closeBtn = modal.querySelector("[data-unsaved-close]");
  const discardBtn = modal.querySelector("[data-unsaved-discard]");
  const saveBtn = modal.querySelector("[data-unsaved-save]");

  const hide = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  const show = ({ onDiscard, onSave } = {}) => {
    modal._onDiscard = typeof onDiscard === "function" ? onDiscard : null;
    modal._onSave = typeof onSave === "function" ? onSave : null;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  };

  const handleDiscard = () => {
    hide();
    modal._onDiscard?.();
  };

  const handleSave = () => {
    hide();
    modal._onSave?.();
  };

  discardBtn?.addEventListener("click", handleDiscard);
  saveBtn?.addEventListener("click", handleSave);
  closeBtn?.addEventListener("click", hide);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) hide();
  });

  document.body.appendChild(modal);
  unsavedModalCache = { modal, show, hide };
  return unsavedModalCache;
}

export function showUnsavedChangesModal({ onDiscard, onSave } = {}) {
  const inst = buildUnsavedChangesModal();
  inst.show({ onDiscard, onSave });
  return inst;
}

let resetModalCache = null;

function buildResetConfirmModal() {
  if (resetModalCache) return resetModalCache;

  const modal = document.createElement("div");
  modal.id = "ptpm-reset-modal";
  modal.className =
    "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
      <div class="flex items-start justify-between px-4 py-3 border-b border-slate-200">
        <h3 class="text-lg font-semibold text-slate-900">Reset Form</h3>
        <button type="button" data-reset-close class="text-slate-500 hover:text-slate-700">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="px-4 py-5 space-y-4 text-left">
        <p class="text-sm text-slate-700">This will clear all entered information. This action cannot be undone.</p>
      </div>
      <div class="flex justify-end gap-3 px-4 py-3 border-t border-slate-200">
          <button type="button" data-reset-cancel class="px-4 py-2 rounded text-slate-700 hover:bg-slate-50 text-sm font-semibold">Cancel</button>
          <button type="button" data-reset-confirm class="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700 text-sm font-semibold">Reset</button>
        </div>
    </div>
  `;

  const closeBtn = modal.querySelector("[data-reset-close]");
  const cancelBtn = modal.querySelector("[data-reset-cancel]");
  const confirmBtn = modal.querySelector("[data-reset-confirm]");

  const hide = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  const show = ({ onConfirm } = {}) => {
    modal._onConfirm = typeof onConfirm === "function" ? onConfirm : null;
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  };

  const handleConfirm = () => {
    hide();
    modal._onConfirm?.();
  };

  [closeBtn, cancelBtn].forEach((btn) => btn?.addEventListener("click", hide));
  confirmBtn?.addEventListener("click", handleConfirm);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.classList.contains("hidden")) hide();
  });

  document.body.appendChild(modal);
  resetModalCache = { modal, show, hide };
  return resetModalCache;
}

export function showResetConfirmModal({ onConfirm } = {}) {
  const inst = buildResetConfirmModal();
  inst.show({ onConfirm });
  return inst;
}

export function resetFormFields(container = document) {
  if (!container) return;
  const fields = container.querySelectorAll("input, select, textarea");
  fields.forEach((field) => {
    const type = (field.getAttribute("type") || "").toLowerCase();
    if (type === "checkbox" || type === "radio") {
      field.checked = false;
    } else if (field.tagName === "SELECT") {
      field.selectedIndex = 0;
    } else {
      field.value = "";
    }
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function showAlertModal({
  title = "Notice",
  message = "",
  buttonLabel = "OK",
} = {}) {
  let modal = document.getElementById("ptpm-alert-modal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "ptpm-alert-modal";
    modal.className =
      "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden">
        <div class="flex items-start justify-between px-4 py-3 border-b border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900" data-alert-title>Notice</h3>
          <button type="button" data-alert-close class="text-slate-500 hover:text-slate-700">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="px-4 py-5 space-y-4 text-left">
          <p class="text-sm text-slate-700" data-alert-message></p>
          <div class="flex justify-end gap-3">
            <button type="button" data-alert-confirm class="px-4 py-2 rounded bg-[#003882] text-white hover:bg-[#0b4b9f] text-sm font-semibold">OK</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    const close = () => {
      modal.classList.add("hidden");
      modal.classList.remove("flex");
      document.body.style.overflow = "";
    };
    modal.querySelector("[data-alert-close]").addEventListener("click", close);
    modal
      .querySelector("[data-alert-confirm]")
      .addEventListener("click", close);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modal.classList.contains("hidden")) close();
    });
  }

  const titleEl = modal.querySelector("[data-alert-title]");
  const msgEl = modal.querySelector("[data-alert-message]");
  const confirmEl = modal.querySelector("[data-alert-confirm]");
  if (titleEl) titleEl.textContent = title;
  if (msgEl) msgEl.textContent = message;
  if (confirmEl) confirmEl.textContent = buttonLabel || "OK";

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden";
  return modal;
}
