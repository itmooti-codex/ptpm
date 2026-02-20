import { API_KEY, ACCOUNT_NAME } from "../sdk/config.js";

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
    const list = Array.isArray(records?.resp)
      ? records.resp
      : Array.isArray(records)
      ? records
      : Object.values(records ?? {});
    return list.map((data) => {
      const inquiryJobId =
        data?.Inquiry_for_Job?.id ??
        data?.Inquiry_For_Job?.id ??
        data?.Inquiry_For_Job_ID ??
        null;
      const inquiryJobUid =
        data?.Inquiry_for_Job?.unique_id ??
        data?.Inquiry_For_Job?.unique_id ??
        data?.Inquiry_For_Job_Unique_ID ??
        null;
      const quoteJobId =
        data?.Quote_Record?.id ?? data?.Quote_Record_ID ?? null;
      const quoteJobUid =
        data?.Quote_Record?.unique_id ?? data?.Quote_Record_Unique_ID ?? null;
      const jobId = inquiryJobId ?? quoteJobId ?? null;
      const jobUid = inquiryJobUid ?? quoteJobUid ?? null;
      return {
        uniqueId: data?.unique_id ?? data?.Unique_ID ?? null,
        recordId: data?.id ?? null,
        "inquiry-id": data?.id ?? null,
        "inquiry-uid": data?.unique_id ?? data?.Unique_ID ?? null,
        "contact-id": data?.Primary_Contact?.id ?? null,
        "company-id": data?.Company?.id ?? null,
        "property-id": data?.Property?.id ?? data?.property_id ?? null,
        "service-provider-id":
          data?.Service_Provider?.id ?? data?.service_provider_id ?? null,
        "account-type": data?.Account_Type ?? data?.account_type ?? null,
        "company-account-type":
          data?.Company?.account_type ?? data?.Company_Account_Type ?? null,
        "job-id": jobId,
        "job-uid": jobUid,
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
        dealId: r.recordId ?? null,
        inquiryId: r["inquiry-id"] ?? r.recordId ?? null,
        inquiryUid: r["inquiry-uid"] ?? r.uniqueId ?? null,
        contactId: r["contact-id"] ?? null,
        companyId: r["company-id"] ?? null,
        propertyId: r["property-id"] ?? null,
        serviceProviderId: r["service-provider-id"] ?? null,
        accountType: r["account-type"] ?? null,
        companyAccountType: r["company-account-type"] ?? null,
        jobId: r["job-id"] ?? null,
        jobUid: r["job-uid"] ?? null,
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

    return Object.values(quoteData).map((item) => {
      const rowUniqueId = item?.unique_id ?? item?.Unique_ID ?? null;
      return {
        id: rowUniqueId ? `#${rowUniqueId}` : null,
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
        jobId: item?.id ?? null,
        jobUid: rowUniqueId ?? null,
        inquiryId:
          item?.Inquiry_Record?.id ?? item?.inquiry_record?.id ?? null,
        inquiryUid:
          item?.Inquiry_Record?.unique_id ??
          item?.inquiry_record?.unique_id ??
          null,
        contactId:
          item?.Client_Individual?.id ?? item?.client_individual?.id ?? null,
        companyId: item?.Client_Entity?.id ?? item?.client_entity?.id ?? null,
        propertyId: item?.Property?.id ?? item?.property?.id ?? null,
        serviceProviderId:
          item?.Primary_Service_Provider?.id ??
          item?.primary_service_provider?.id ??
          null,
        accountType: item?.Account_Type ?? item?.account_type ?? null,
        companyAccountType:
          item?.Client_Entity?.account_type ??
          item?.client_entity?.account_type ??
          null,
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    };
    });
  }

  mapJobRows(jobData) {
    if (!jobData || typeof jobData !== "object") return [];

    return Object.values(jobData).map((item) => {
      const rowUniqueId = item?.unique_id ?? item?.Unique_ID ?? null;
      return {
        id: rowUniqueId ? `#${rowUniqueId}` : null,
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
        jobId: item?.id ?? null,
        jobUid: rowUniqueId ?? null,
        inquiryId:
          item?.Inquiry_Record?.id ?? item?.inquiry_record?.id ?? null,
        inquiryUid:
          item?.Inquiry_Record?.unique_id ??
          item?.inquiry_record?.unique_id ??
          null,
        contactId:
          item?.Client_Individual?.id ?? item?.client_individual?.id ?? null,
        companyId: item?.Client_Entity?.id ?? item?.client_entity?.id ?? null,
        propertyId: item?.Property?.id ?? item?.property?.id ?? null,
        serviceProviderId:
          item?.Primary_Service_Provider?.id ??
          item?.primary_service_provider?.id ??
          null,
        accountType: item?.Account_Type ?? item?.account_type ?? null,
        companyAccountType:
          item?.Client_Entity?.account_type ??
          item?.client_entity?.account_type ??
          null,
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    };
    });
  }

  mapPaymentRows(paymentData) {
    if (!paymentData || typeof paymentData !== "object") return [];

    return Object.values(paymentData).map((item) => {
      const rowUniqueId = item?.unique_id ?? item?.Unique_ID ?? null;
      return {
        id: rowUniqueId ? `#${rowUniqueId}` : null,
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
        jobId: item?.id ?? null,
        jobUid: rowUniqueId ?? null,
        inquiryId:
          item?.Inquiry_Record?.id ?? item?.inquiry_record?.id ?? null,
        inquiryUid:
          item?.Inquiry_Record?.unique_id ??
          item?.inquiry_record?.unique_id ??
          null,
        contactId:
          item?.Client_Individual?.id ?? item?.client_individual?.id ?? null,
        companyId: item?.Client_Entity?.id ?? item?.client_entity?.id ?? null,
        propertyId: item?.Property?.id ?? item?.property?.id ?? null,
        serviceProviderId:
          item?.Primary_Service_Provider?.id ??
          item?.primary_service_provider?.id ??
          null,
        accountType: item?.Account_Type ?? item?.account_type ?? null,
        companyAccountType:
          item?.Client_Entity?.account_type ??
          item?.client_entity?.account_type ??
          null,
        email: item?.Client_Individual?.email ?? null,
        sms: item?.Client_Individual?.sms_number ?? null,
        address: item?.Property?.address_1 ?? null,
      },
    };
    });
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
        dealId: records.recordId ?? null,
        inquiryId: records["inquiry-id"] ?? records.recordId ?? null,
        inquiryUid: records["inquiry-uid"] ?? records.uniqueId ?? null,
        contactId: records["contact-id"] ?? null,
        companyId: records["company-id"] ?? null,
        propertyId: records["property-id"] ?? null,
        serviceProviderId: records["service-provider-id"] ?? null,
        accountType: records["account-type"] ?? null,
        companyAccountType: records["company-account-type"] ?? null,
        jobId: records["job-id"] ?? null,
        jobUid: records["job-uid"] ?? null,
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
      <div class="flex flex-col items-center gap-3 rounded-2xl bg-white/95 px-6 py-5 shadow-lg ring-1 ring-slate-200 hover:!bg-white/95 active:!bg-white/95 hover:bg-white/95 active:bg-white/95 focus:bg-white/95 focus-visible:bg-white/95 hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg hover:ring-1 active:ring-1 focus:ring-1 focus-visible:ring-1 hover:ring-slate-200 active:ring-slate-200 focus:ring-slate-200 focus-visible:ring-slate-200">
        <div class="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-[#003882] hover:!border-slate-200 active:!border-slate-200 hover:border-4 active:border-4 focus:border-4 focus-visible:border-4 hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200 hover:border-t-[#003882] active:border-t-[#003882] focus:border-t-[#003882] focus-visible:border-t-[#003882]"></div>
        <p class="text-sm font-semibold text-slate-800 hover:!text-slate-800 active:!text-slate-800  hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800" data-loader-message>Working...</p>
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
      <div class="bg-white rounded-lg shadow-xl w-[350px] text-center p-6 flex flex-col items-center space-y-4 font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-xl active:shadow-xl focus:shadow-xl focus-visible:shadow-xl hover:text-center active:text-center focus:text-center focus-visible:text-center">
        <div id="statusIcon" class="w-12 h-12 rounded-full flex items-center justify-center text-white text-2xl hover:!text-white active:!text-white hover:text-white active:text-white focus:text-white focus-visible:text-white hover:text-2xl active:text-2xl focus:text-2xl focus-visible:text-2xl"></div>
        <h3 id="statusTitle" class="text-lg font-semibold text-gray-800 hover:!text-gray-800 active:!text-gray-800 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800">Success</h3>
        <p id="statusMessage" class="text-sm text-gray-600 hover:!text-gray-600 active:!text-gray-600  hover:text-gray-600 active:text-gray-600 focus:text-gray-600 focus-visible:text-gray-600">Your action was successful.</p>
        <button id="statusCloseBtn" class="!mt-3 !px-4 !py-2 !bg-[#003882] !text-white !rounded hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">
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

function getFilesFromEvent(e) {
  const dt = e?.dataTransfer;
  if (!dt) return [];
  const directFiles = Array.from(dt.files || []).filter(Boolean);
  if (directFiles.length) return directFiles;
  if (dt.items) {
    return Array.from(dt.items || [])
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter(Boolean);
  }
  return [];
}

export function ensureFilePreviewModal(id = "ptpm-file-preview-modal") {
  let modal = document.getElementById(id);
  if (!modal) {
    modal = document.createElement("div");
    modal.id = id;
    modal.className =
      "flex fixed inset-0 z-[9999] hidden items-center justify-center bg-black/50";
    modal.innerHTML = `
      <div class="bg-white rounded-lg shadow-lg max-w-4xl w-[95vw] max-h-[90vh] overflow-hidden relative font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-lg active:shadow-lg focus:shadow-lg focus-visible:shadow-lg">
        <button type="button" data-file-preview-close class="!absolute !top-3 !right-3 !text-slate-500 !bg-transparent hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="p-4 flex flex-col gap-4">
          <div class="text-base font-semibold text-slate-800 hover:!text-slate-800 active:!text-slate-800 hover:text-base active:text-base focus:text-base focus-visible:text-base hover:text-slate-800 active:text-slate-800 focus:text-slate-800 focus-visible:text-slate-800" data-file-preview-title>Preview</div>
          <div class="flex-1 overflow-auto max-h-[70vh]">
            <img data-file-preview-img class="max-h-[70vh] mx-auto object-contain hidden" alt="File preview" />
            <iframe data-file-preview-frame class="w-full h-[70vh] hidden" frameborder="0"></iframe>
          </div>
          <div class="flex justify-end">
            <button type="button" data-file-preview-close class="!px-4 !py-2 !rounded !border !border-slate-300 !text-slate-700 hover:!border-slate-300 active:!border-slate-300 focus:!border-slate-300 focus-visible:!border-slate-300 hover:!text-slate-700 active:!text-slate-700 focus:!text-slate-700 focus-visible:!text-slate-700">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  }

  const hide = () => modal.classList.add("hidden");
  const closeEls = modal.querySelectorAll("[data-file-preview-close]");
  closeEls.forEach((btn) => {
    if (btn.dataset.boundPreviewClose) return;
    btn.dataset.boundPreviewClose = "true";
    btn.addEventListener("click", hide);
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) hide();
  });

  const imgEl = modal.querySelector("[data-file-preview-img]");
  const frameEl = modal.querySelector("[data-file-preview-frame]");
  const titleEl = modal.querySelector("[data-file-preview-title]");

  const show = ({ src, name = "Preview", type = "" } = {}) => {
    if (!src) return;
    const isImage = (type || "").startsWith("image/");
    if (titleEl) titleEl.textContent = name || "Preview";
    if (imgEl && frameEl) {
      if (isImage) {
        imgEl.src = src;
        imgEl.classList.remove("hidden");
        frameEl.classList.add("hidden");
        frameEl.src = "";
      } else {
        frameEl.src = src;
        frameEl.classList.remove("hidden");
        imgEl.classList.add("hidden");
        imgEl.src = "";
      }
    }
    modal.classList.remove("hidden");
  };

  return { show, hide, modal };
}

let unsavedModalCache = null;

function buildUnsavedChangesModal() {
  if (unsavedModalCache) return unsavedModalCache;

  const modal = document.createElement("div");
  modal.id = "ptpm-unsaved-modal";
  modal.className =
    "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-lg inline-flex flex-col justify-start items-start overflow-hidden font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white">
      <div class="self-stretch px-6 py-4 border-b border-gray-300 inline-flex justify-end items-center gap-4 hover:!border-gray-300 active:!border-gray-300 hover:border-b active:border-b focus:border-b focus-visible:border-b">
        <div class="flex-1 justify-start text-neutral-700 text-lg font-semibold leading-5 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700">Unsaved Changes</div>
        <button type="button" data-unsaved-close class="!bg-transparent !w-6 !h-6 !relative !overflow-hidden hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="self-stretch p-6 inline-flex justify-start items-start gap-8">
        <div class="w-96 rounded inline-flex flex-col justify-start items-end gap-8">
          <div class="self-stretch justify-start font-'Inter' text-neutral-700 text-base font-normal leading-5 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700">You have unsaved changes. Do you want to discard them or save and exit?</div>
        </div>
      </div>
      <div class="self-stretch px-6 py-4 bg-white border-t border-gray-300 inline-flex justify-end items-center gap-4 hover:!border-gray-300 active:!border-gray-300 hover:border-t active:border-t focus:border-t focus-visible:border-t">
        <button type="button" data-unsaved-discard class="!bg-transparent !px-4 !py-3 !rounded !outline !outline-1 !outline-offset-[-1px] !outline-red-600 !flex !justify-center !items-center !gap-2 !overflow-hidden hover:!outline-red-600 active:!outline-red-600 focus:!outline-red-600 focus-visible:!outline-red-600 hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
          <div class="justify-start text-red-600 text-sm font-medium leading-4 hover:!text-red-600 active:!text-red-600 focus:!text-red-600 focus-visible:!text-red-600">Discard Changes</div>
        </button>
        <button type="button" data-unsaved-save class="!px-4 !py-3 !bg-[#003882] !rounded !outline !outline-1 !outline-offset-[-1px] !outline-white !flex !justify-center !items-center !gap-2 !overflow-hidden hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!outline-white active:!outline-white focus:!outline-white focus-visible:!outline-white hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">
          <div class="justify-start text-white text-sm font-medium leading-4 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">Save & Exit</div>
        </button>
      </div>
    </div>
  `;

  const closeBtn = modal.querySelector("[data-unsaved-close]");
  const discardBtn = modal.querySelector("[data-unsaved-discard]");
  const saveBtn = modal.querySelector("[data-unsaved-save]");
  const saveBtnLabel = saveBtn?.querySelector("div") || saveBtn;

  const hide = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  const show = ({ onDiscard, onSave } = {}) => {
    modal._onDiscard = typeof onDiscard === "function" ? onDiscard : null;
    modal._onSave = typeof onSave === "function" ? onSave : null;
    if (saveBtnLabel && !saveBtn.dataset.defaultLabel) {
      saveBtn.dataset.defaultLabel = saveBtnLabel.textContent?.trim() || "Save";
    }
    if (saveBtn) {
      saveBtn.disabled = false;
      saveBtn.classList.remove("opacity-60", "pointer-events-none");
      saveBtn.removeAttribute("aria-busy");
    }
    if (saveBtnLabel) {
      saveBtnLabel.textContent = saveBtn?.dataset.defaultLabel || "Save";
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  };

  const handleDiscard = () => {
    hide();
    modal._onDiscard?.();
  };

  const handleSave = async () => {
    if (!saveBtn || saveBtn.dataset.saving === "true") return;

    saveBtn.dataset.saving = "true";
    saveBtn.disabled = true;
    saveBtn.classList.add("opacity-60", "pointer-events-none");
    saveBtn.setAttribute("aria-busy", "true");
    if (saveBtnLabel) {
      saveBtnLabel.textContent = "Saving...";
    }

    try {
      const result = await modal._onSave?.();
      if (result !== false) {
        hide();
      }
    } finally {
      saveBtn.dataset.saving = "false";
      saveBtn.disabled = false;
      saveBtn.classList.remove("opacity-60", "pointer-events-none");
      saveBtn.removeAttribute("aria-busy");
      if (saveBtnLabel) {
        saveBtnLabel.textContent = saveBtn.dataset.defaultLabel || "Save";
      }
    }
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
let saveViewAsModalCache = null;

function buildResetConfirmModal() {
  if (resetModalCache) return resetModalCache;

  const modal = document.createElement("div");
  modal.id = "ptpm-reset-modal";
  modal.className =
    "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-lg inline-flex flex-col justify-start items-start overflow-hidden font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white">
      <div class="self-stretch px-6 py-4 border-b border-gray-300 inline-flex justify-end items-center gap-4 hover:!border-gray-300 active:!border-gray-300 hover:border-b active:border-b focus:border-b focus-visible:border-b">
        <div class="flex-1 justify-start text-neutral-700 text-lg font-semibold leading-5 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700">Reset Form</div>
        <button type="button" data-reset-close class="!w-6 !h-6 !relative !overflow-hidden !text-zinc-800 hover:!text-zinc-800 active:!text-zinc-800 focus:!text-zinc-800 focus-visible:!text-zinc-800 hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="self-stretch p-6 inline-flex justify-start items-start gap-8">
        <div class="w-96 rounded inline-flex flex-col justify-start items-end gap-8">
          <div class="self-stretch justify-start text-neutral-700 text-base font-normal leading-5 hover:!text-neutral-700 active:!text-neutral-700 focus:!text-neutral-700 focus-visible:!text-neutral-700">This will clear all entered information. This action cannot be undone.</div>
        </div>
      </div>
      <div class="self-stretch px-6 py-4 bg-white border-t border-gray-300 inline-flex justify-end items-center gap-4 hover:!border-gray-300 active:!border-gray-300 hover:border-t active:border-t focus:border-t focus-visible:border-t">
        <div class="flex justify-start items-center gap-4">
          <button type="button" data-reset-cancel class="!rounded !flex !justify-center !items-center !gap-2 !overflow-hidden !text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500 hover:!bg-transparent active:!bg-transparent focus:!bg-transparent focus-visible:!bg-transparent">
            <div class="justify-start text-slate-500 text-sm font-medium leading-4 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500">Cancel</div>
          </button>
          <button type="button" data-reset-confirm class="!px-4 !py-3 !bg-red-600 !rounded !outline !outline-1 !outline-offset-[-1px] !outline-white !flex !justify-center !items-center !gap-2 !overflow-hidden hover:!bg-red-600 active:!bg-red-600 focus:!bg-red-600 focus-visible:!bg-red-600 hover:!outline-white active:!outline-white focus:!outline-white focus-visible:!outline-white hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">
            <div class="justify-start text-white text-sm font-medium leading-4 hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">Reset</div>
          </button>
        </div>
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

function buildSaveViewAsModal() {
  if (saveViewAsModalCache) return saveViewAsModalCache;

  const modal = document.createElement("div");
  modal.id = "ptpm-save-view-modal";
  modal.className =
    "fixed inset-0 z-[9998] hidden items-center justify-center bg-black/40";
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl w-full max-w-[560px] mx-4 overflow-hidden font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-xl active:shadow-xl focus:shadow-xl focus-visible:shadow-xl">
      <div class="flex items-center justify-between px-4 py-3 border-b border-slate-200 hover:!border-slate-200 active:!border-slate-200 hover:border-b active:border-b focus:border-b focus-visible:border-b hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200">
        <h3 class="text-lg font-semibold text-slate-900 hover:!text-slate-900 active:!text-slate-900 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg hover:text-slate-900 active:text-slate-900 focus:text-slate-900 focus-visible:text-slate-900">Save View As</h3>
        <button type="button" data-save-view-close class="!text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="px-4 py-5 space-y-2 text-left hover:text-left active:text-left focus:text-left focus-visible:text-left">
        <label for="ptpm-save-view-input" class="block text-sm text-slate-700 hover:!text-slate-700 active:!text-slate-700  hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700">Name</label>
        <input id="ptpm-save-view-input" type="text" class="w-full rounded-md px-3 py-2 text-sm text-slate-800
        !outline !outline-1 browser-default !outline-slate-300
        focus:!outline focus:!outline-1 focus:!outline-slate-300
        ">
      </div>
      <div class="flex justify-end gap-3 px-4 py-3 border-t border-slate-200 hover:!border-slate-200 active:!border-slate-200 hover:border-t active:border-t focus:border-t focus-visible:border-t hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200">
        <button type="button" data-save-view-cancel class="!px-4 !py-2 !rounded !text-slate-600 !text-sm !font-medium hover:!text-slate-600 active:!text-slate-600 focus:!text-slate-600 focus-visible:!text-slate-600 ">Cancel</button>
        <button type="button" data-save-view-save class="!px-4 !py-2 !rounded !bg-[#003882] !text-white !text-sm !font-semibold hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white ">Save</button>
      </div>
    </div>
  `;

  const closeBtn = modal.querySelector("[data-save-view-close]");
  const cancelBtn = modal.querySelector("[data-save-view-cancel]");
  const saveBtn = modal.querySelector("[data-save-view-save]");
  const input = modal.querySelector("#ptpm-save-view-input");

  const hide = () => {
    modal.classList.add("hidden");
    modal.classList.remove("flex");
    document.body.style.overflow = "";
  };

  const show = ({ onSave, onCancel, defaultName = "" } = {}) => {
    modal._onSave = typeof onSave === "function" ? onSave : null;
    modal._onCancel = typeof onCancel === "function" ? onCancel : null;
    if (input) {
      input.value = defaultName || "";
      input.focus();
    }
    modal.classList.remove("hidden");
    modal.classList.add("flex");
    document.body.style.overflow = "hidden";
  };

  const handleCancel = () => {
    hide();
    modal._onCancel?.();
  };

  const handleSave = () => {
    const value = (input?.value || "").trim();
    const shouldClose = modal._onSave ? modal._onSave(value) !== false : true;
    if (shouldClose) hide();
  };

  closeBtn?.addEventListener("click", handleCancel);
  cancelBtn?.addEventListener("click", handleCancel);
  saveBtn?.addEventListener("click", handleSave);
  input?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSave();
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) handleCancel();
  });

  document.body.appendChild(modal);
  saveViewAsModalCache = { modal, show, hide, input };
  return saveViewAsModalCache;
}

export function showSaveViewAsModal({ onSave, onCancel, defaultName } = {}) {
  const inst = buildSaveViewAsModal();
  inst.show({ onSave, onCancel, defaultName });
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

const uploadApiBase = `https://${(
  ACCOUNT_NAME || ""
).toLowerCase()}.vitalstats.app`;

function sanitizeFolderName(folderName) {
  if (!folderName || typeof folderName !== "string") return "";
  return folderName.replace(/^[\\/]+|[\\/]+$/g, "");
}

export async function requestUploadDetails(file, folderName = "") {
  const safeFolder = sanitizeFolderName(folderName);
  const name = (safeFolder ? `${safeFolder}/` : "") + (file?.name || "upload");
  const params = new URLSearchParams({
    type: file?.type || "application/octet-stream",
    name,
    generateName: "1",
  });
  const res = await fetch(`${uploadApiBase}/api/v1/rest/upload?${params}`, {
    headers: { "Api-Key": API_KEY },
  });
  const data = await res.json();
  if (!res.ok || data.statusCode !== 200) {
    throw new Error("Failed to obtain upload URL");
  }
  return data.data;
}

export async function uploadFileToS3(url, file) {
  const res = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file?.type || "application/octet-stream" },
    body: file,
  });
  if (!res.ok) {
    throw new Error("File upload failed");
  }
}

export async function uploadAndGetFileLink(file, folderName = "") {
  const { uploadUrl, url } = await requestUploadDetails(file, folderName);
  await uploadFileToS3(uploadUrl, file);
  return url;
}

export async function uploadImage(file, folderName = "uploads") {
  return uploadAndGetFileLink(file, folderName);
}

export function initFileUploadArea({
  triggerEl,
  inputEl,
  listEl,
  nameEl,
  previewBtn,
  removeBtn,
  uploadPath = "uploads",
  loaderElement,
  loaderMessageEl,
  loaderCounter,
  acceptRegex = /^(image\/|application\/pdf)/,
  multiple = true,
  replaceExisting = true,
  renderItem,
  onClear,
  dropHighlightClass = ["ring-2", "ring-sky-500"],
  uploadResolver,
} = {}) {
  if (!triggerEl || !inputEl) return;
  if (multiple) inputEl.multiple = true;

  const previewModal = ensureFilePreviewModal();

  const resetUI = () => {
    if (nameEl) nameEl.textContent = "No file selected";
    if (previewBtn) previewBtn.classList.add("hidden");
    if (removeBtn) removeBtn.classList.add("hidden");
    if (listEl && replaceExisting) listEl.innerHTML = "";
    if (inputEl) inputEl.value = "";
    if (typeof onClear === "function") onClear();
  };

  const defaultRender = (meta) => {
    const node = document.createElement("div");
    node.className = "hidden";
    node.setAttribute("data-upload-url", meta.url);
    node.setAttribute("data-file-name", meta.name || "Upload");
    node.setAttribute("file-type", meta.type || "");
    return node;
  };

  const handleFiles = async (fileLike) => {
    const files = Array.from(fileLike || []).filter((f) =>
      (f?.type || "").match(acceptRegex)
    );
    if (!files.length) {
      resetUI();
      return;
    }
    showLoader(loaderElement, loaderMessageEl, loaderCounter, "Uploading...");
    try {
      const metas = [];
      for (const file of files) {
        const url = uploadResolver
          ? await uploadResolver(file, uploadPath)
          : await uploadImage(file, uploadPath);
        metas.push({ url, type: file.type, name: file.name, file });
      }
      if (listEl && replaceExisting) listEl.innerHTML = "";
      metas.forEach((meta) => {
        const node = (renderItem || defaultRender)(meta);
        if (node && listEl) listEl.appendChild(node);
      });
      if (nameEl && metas.length) {
        const extra = metas.length > 1 ? ` (+${metas.length - 1} more)` : "";
        nameEl.textContent = (metas[0].name || "Upload") + extra;
      }
      if (previewBtn) previewBtn.classList.remove("hidden");
      if (removeBtn) removeBtn.classList.remove("hidden");
      return metas;
    } catch (err) {
      console.error("File upload failed", err);
      resetUI();
    } finally {
      hideLoader(loaderElement, loaderCounter);
    }
  };

  const previewFromList = () => {
    const item = listEl?.querySelector("[data-upload-url]");
    if (!item) return;
    const url = item.getAttribute("data-upload-url");
    const name = item.getAttribute("data-file-name") || "Preview";
    const type = item.getAttribute("file-type") || "";
    if (!url) return;
    const src = url.startsWith("http")
      ? url
      : url.startsWith("data:")
      ? url
      : `data:${type || "application/octet-stream"};base64,${url}`;
    previewModal.show({ src, name, type });
  };

  inputEl.addEventListener("click", (e) => {
    e.target.value = "";
  });
  inputEl.addEventListener("change", async (e) => {
    await handleFiles(e.target.files);
  });
  const stop = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };
  ["dragenter", "dragover"].forEach((evt) => {
    triggerEl.addEventListener(evt, (e) => {
      stop(e);
      dropHighlightClass.forEach((c) => triggerEl.classList.add(c));
    });
  });
  ["dragleave", "drop"].forEach((evt) => {
    triggerEl.addEventListener(evt, (e) => {
      stop(e);
      dropHighlightClass.forEach((c) => triggerEl.classList.remove(c));
    });
  });
  triggerEl.addEventListener("drop", async (e) => {
    stop(e);
    const files = getFilesFromEvent(e);
    if (files.length) await handleFiles(files);
  });

  if (previewBtn) {
    previewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      previewFromList();
    });
  }
  if (removeBtn) {
    removeBtn.addEventListener("click", (e) => {
      e.preventDefault();
      resetUI();
    });
  }

  return {
    reset: resetUI,
    upload: handleFiles,
    preview: previewFromList,
    modal: previewModal,
  };
}

export function buildUploadCard(
  { name = "Upload", type = "", url = "" } = {},
  { onView, onDelete } = {}
) {
  const isPdf = (type || "").toLowerCase().includes("pdf");
  const isImage = (type || "").startsWith("image/");
  const icon =
    isImage && url
      ? `<img src="${url}" class="w-10 h-10 object-cover rounded-md" />`
      : `<div class="w-10 h-10 rounded-md bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-semibold hover:!bg-slate-200 active:!bg-slate-200 hover:!text-slate-600 active:!text-slate-600 hover:bg-slate-200 active:bg-slate-200 focus:bg-slate-200 focus-visible:bg-slate-200 hover:text-slate-600 active:text-slate-600 focus:text-slate-600 focus-visible:text-slate-600 hover:text-xs active:text-xs focus:text-xs focus-visible:text-xs">
        ${isPdf ? "PDF" : "FILE"}
      </div>`;

  const card = document.createElement("div");
  card.className = "bg-[#F5F6F8] p-3 rounded-lg";
  card.innerHTML = `
    <div class="flex flex-row justify-between items-center">
      <div class="flex flex-row items-center gap-3">
        ${icon}
        <p class="text-gray-800 text-sm break-all hover:!text-gray-800 active:!text-gray-800 hover:text-gray-800 active:text-gray-800 focus:text-gray-800 focus-visible:text-gray-800 ">${name}</p>
      </div>
      <div class="flex items-center gap-3">
        <button type="button" data-upload-action="view" class="!text-sky-700 hover:!text-sky-700 active:!text-sky-700 focus:!text-sky-700 focus-visible:!text-sky-700" title="Preview">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M18.2848 9.49731C18.2605 9.44245 17.6723 8.13758 16.3646 6.82994C14.6223 5.08758 12.4216 4.16675 9.99935 4.16675C7.57712 4.16675 5.37643 5.08758 3.63407 6.82994C2.32643 8.13758 1.73545 9.44453 1.71393 9.49731C1.68234 9.56836 1.66602 9.64525 1.66602 9.723C1.66602 9.80076 1.68234 9.87765 1.71393 9.9487C1.73823 10.0036 2.32643 11.3077 3.63407 12.6154C5.37643 14.357 7.57712 15.2779 9.99935 15.2779C12.4216 15.2779 14.6223 14.357 16.3646 12.6154C17.6723 11.3077 18.2605 10.0036 18.2848 9.9487C18.3164 9.87765 18.3327 9.80076 18.3327 9.723C18.3327 9.64525 18.3164 9.56836 18.2848 9.49731ZM9.99935 12.5001C9.44996 12.5001 8.9129 12.3372 8.4561 12.0319C7.99929 11.7267 7.64326 11.2929 7.43301 10.7853C7.22277 10.2777 7.16776 9.71923 7.27494 9.18039C7.38212 8.64155 7.64668 8.1466 8.03516 7.75812C8.42364 7.36964 8.91859 7.10508 9.45743 6.9979C9.99627 6.89072 10.5548 6.94573 11.0624 7.15597C11.5699 7.36622 12.0038 7.72225 12.309 8.17906C12.6142 8.63586 12.7771 9.17291 12.7771 9.72231C12.7771 10.459 12.4845 11.1656 11.9635 11.6865C11.4426 12.2074 10.7361 12.5001 9.99935 12.5001Z" fill="#0052CC"></path>
          </svg>
        </button>
        <button type="button" data-upload-action="delete" class="!text-rose-600 hover:!text-rose-600 active:!text-rose-600 focus:!text-rose-600 focus-visible:!text-rose-600" title="Delete">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13.7949 3.38453H11.2308V2.87171C11.2308 2.46369 11.0687 2.07237 10.7802 1.78386C10.4916 1.49534 10.1003 1.33325 9.69231 1.33325H6.61539C6.20736 1.33325 5.81605 1.49534 5.52753 1.78386C5.23901 2.07237 5.07692 2.46369 5.07692 2.87171V3.38453H2.51282C2.37681 3.38453 2.24637 3.43856 2.1502 3.53474C2.05403 3.63091 2 3.76135 2 3.89735C2 4.03336 2.05403 4.1638 2.1502 4.25997C2.24637 4.35615 2.37681 4.41018 2.51282 4.41018H3.02564V13.6409C3.02564 13.913 3.1337 14.1738 3.32604 14.3662C3.51839 14.5585 3.77927 14.6666 4.05128 14.6666H12.2564C12.5284 14.6666 12.7893 14.5585 12.9816 14.3662C13.174 14.1738 13.2821 13.913 13.2821 13.6409V4.41018H13.7949C13.9309 4.41018 14.0613 4.35615 14.1575 4.25997C14.2537 4.1638 14.3077 4.03336 14.3077 3.89735C14.3077 3.76135 14.2537 3.63091 14.1575 3.53474C14.0613 3.43856 13.9309 3.38453 13.7949 3.38453Z" fill="#0052CC"></path>
          </svg>
        </button>
      </div>
    </div>`;

  const viewBtn = card.querySelector('[data-upload-action="view"]');
  if (viewBtn) {
    viewBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onView?.();
    });
  }
  const deleteBtn = card.querySelector('[data-upload-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onDelete?.();
    });
  }
  return card;
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
      <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 overflow-hidden font-['Inter'] hover:!bg-white active:!bg-white hover:bg-white active:bg-white focus:bg-white focus-visible:bg-white hover:shadow-xl active:shadow-xl focus:shadow-xl focus-visible:shadow-xl">
        <div class="flex items-start justify-between px-4 py-3 border-b border-slate-200 hover:!border-slate-200 active:!border-slate-200 hover:border-b active:border-b focus:border-b focus-visible:border-b hover:border-slate-200 active:border-slate-200 focus:border-slate-200 focus-visible:border-slate-200">
          <h3 class="text-lg font-semibold text-slate-900 hover:!text-slate-900 active:!text-slate-900 hover:text-lg active:text-lg focus:text-lg focus-visible:text-lg hover:text-slate-900 active:text-slate-900 focus:text-slate-900 focus-visible:text-slate-900" data-alert-title>Notice</h3>
          <button type="button" data-alert-close class="!bg-transparent !text-slate-500 hover:!text-slate-500 active:!text-slate-500 focus:!text-slate-500 focus-visible:!text-slate-500">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="px-4 py-5 space-y-4 text-left hover:text-left active:text-left focus:text-left focus-visible:text-left">
          <p class="text-sm text-slate-700 hover:!text-slate-700 active:!text-slate-700  hover:text-slate-700 active:text-slate-700 focus:text-slate-700 focus-visible:text-slate-700" data-alert-message></p>
          <div class="flex justify-end gap-3">
            <button type="button" data-alert-confirm class="!px-4 !py-2 !rounded !bg-[#003882] !text-white !text-sm !font-semibold hover:!bg-[#003882] active:!bg-[#003882] focus:!bg-[#003882] focus-visible:!bg-[#003882] hover:!text-white active:!text-white focus:!text-white focus-visible:!text-white">OK</button>
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

export async function createAlert(
  type = "",
  title = "",
  isRead = false,
  originUrl = "",
  createdAt = "",
  notifiedContact = "",
  quoteJobId = "",
  inquiry_id = "",
  Plugin = ""
) {
  let alertObj = {
    title: title,
    created_at: createdAt,
    type: type,
    quote_job_id: quoteJobId,
    inquiry_id: inquiry_id,
    notified_contact_id: notifiedContact,
    is_read: isRead,
    origin_url: originUrl,
  };

  let query = Plugin.switchTo("PeterpmAnnouncement").mutation();
  query.createOne(alertObj);
  let result = await query.execute(true).toPromise();
  return result.resp;
}
