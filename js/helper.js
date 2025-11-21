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

export function showLoader(loaderElement, loaderMessageEl, counterRef, message) {
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
