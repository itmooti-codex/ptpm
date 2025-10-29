export class DashboardHelper {
  constructor() {}

  mapDealToTableRow(records) {
    const dayjsRef = (typeof window !== "undefined" && window.dayjs) || null;
    const toNumber = (v) => {
      if (v == null) return null;
      if (typeof v === "number") return Number.isFinite(v) ? v : null;
      const cleaned = String(v).replace(/[^0-9.-]/g, "");
      const n = parseFloat(cleaned);
      return Number.isFinite(n) ? n : null;
    };
    function formatUnixDate(unixTimestamp) {
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

    return Object.values(records).map((data) => {
      const firstJob = Object.values(data?.Jobs ?? {})[0] ?? null;
      return {
        uniqueId: data?.unique_id || null,
        "date-added": formatUnixDate(data?.created_at) || null,
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
        "job-invoice-number": data.Jobs?.invoice_number || null,
        price: toNumber(firstJob?.job_total ?? null),
        "date-quoted-accepted": formatUnixDate(
          firstJob?.date_quoted_accepted ??
            firstJob?.date_quoted_accepted ??
            null
        ),
        "quote-date": formatUnixDate(
          firstJob?.quote_date ?? firstJob?.quote_date ?? null
        ),
        "quote-total": toNumber(
          firstJob?.quote_total ?? firstJob?.quote_total ?? null
        ),
        "quote-status":
          firstJob?.quote_status ?? firstJob?.quote_status ?? null,
        "date-started": formatUnixDate(
          firstJob?.date_started ?? firstJob?.date_started ?? null
        ),
        "payment-status":
          firstJob?.payment_status ?? data?.payment_status ?? null,
        "date-job-required-by": formatUnixDate(
          firstJob?.date_job_required_by ??
            firstJob?.date_job_required_by ??
            null
        ),
        "date-booked": formatUnixDate(
          firstJob?.date_booked ?? firstJob?.date_booked ?? null
        ),
        "job-status": firstJob?.job_status ?? data?.job_status ?? null,
        "invoice-date": formatUnixDate(
          firstJob?.invoice_date ?? firstJob?.invoice_date ?? null
        ),
        "invoice-total": toNumber(
          firstJob?.invoice_total ?? firstJob?.invoice_total ?? null
        ),
        "bill-time-paid": formatUnixDate(
          firstJob?.bill_time_paid ?? firstJob?.bill_time_paid ?? null
        ),
        "xero-invoice-status":
          firstJob?.xero_invoice_status ??
          firstJob?.xero_invoice_status ??
          null,
        "due-date": formatUnixDate(
          firstJob?.due_date ?? firstJob?.due_date ?? null
        ),
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
        recommendation: r["recommendations"] ?? null,
        invoiceNumber: r["job-invoice-number"] ?? null,
        price: r["price"] ?? null,
        createdIso: r["date-added"] ?? null,
      },
    }));
  }

  mapQuoteRows(mappedData) {
    const list = Array.isArray(mappedData)
      ? mappedData
      : Array.from(Object.values(mappedData ?? {}));
    return list.map((records) => ({
      id: `#${records.uniqueId ?? ""}`,
      client:
        [records["client-firstName"], records["client-lastName"]]
          .filter(Boolean)
          .join(" ") || "-",
      created: records["date-added"] ?? null,
      quoteDate: records["quote-date"] ?? null,
      service: records["service-name"] ?? "-",
      type: records.type ?? "-",
      quoteStatus: records["quote-status"] ?? "-",
      quoteTotal: records["quote-total"] ?? null,
      dateQuotedAccepted: records["date-quoted-accepted"] ?? null,
      meta: {
        address: records["client-address"] ?? null,
        email: records["client-email"] ?? null,
        sms: records["client-smsNumber"] ?? null,
        accountName: records["account-name"] ?? null,
        recommendation: records["recommendations"] ?? null,
      },
    }));
  }

  mapJobRows(mappedData) {
    const list = Array.isArray(mappedData)
      ? mappedData
      : Array.from(Object.values(mappedData ?? {}));
    const toNumber = (value) =>
      value != null && !Number.isNaN(Number(value)) ? Number(value) : null;
    return list.map((records) => ({
      id: `#${records.uniqueId ?? ""}`,
      client:
        [records["client-firstName"], records["client-lastName"]]
          .filter(Boolean)
          .join(" ") || "-",
      startDate: records["date-started"] ?? null,
      service: records["service-name"] ?? "-",
      paymentStatus: records["payment-status"] ?? "-",
      requiredBy: records["date-job-required-by"] ?? null,
      bookedDate: records["date-booked"] ?? null,
      price: toNumber(records.price ?? null),
      jobStatus: records["job-status"] ?? "-",
      meta: {
        address: records["client-address"] ?? null,
        email: records["client-email"] ?? null,
        sms: records["client-smsNumber"] ?? null,
        price: toNumber(records.price ?? null),
      },
    }));
  }

  mapPaymentRows(mappedData) {
    const list = Array.isArray(mappedData)
      ? mappedData
      : Array.from(Object.values(mappedData ?? {}));
    const toNumber = (value) =>
      value != null && !Number.isNaN(Number(value)) ? Number(value) : null;
    return list.map((records) => ({
      id: `#${records.uniqueId ?? ""}`,
      client:
        [records["client-firstName"], records["client-lastName"]]
          .filter(Boolean)
          .join(" ") || "-",
      invoiceNumber: records["job-invoice-number"] ?? null,
      invoiceDate: records["invoice-date"] ?? null,
      dueDate: records["due-date"] ?? null,
      invoiceTotal: toNumber(records["invoice-total"] ?? null),
      billPaidDate: records["bill-time-paid"] ?? null,
      service: records["service-name"] ?? "-",
      adminAmount: toNumber(records["admin-amount"] ?? null),
      xeroInvoiceStatus: records["xero-invoice-status"] ?? "-",
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
