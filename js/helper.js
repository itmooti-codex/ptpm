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
    const toIsoDate = (v) => {
      if (!v) return null;
      // If looks like ISO already
      if (/^\d{4}-\d{2}-\d{2}/.test(String(v))) return String(v).slice(0, 10);
      if (dayjsRef) {
        const d = dayjsRef(v);
        if (d.isValid()) return d.format("YYYY-MM-DD");
      }
      try {
        const d = new Date(v);
        if (!isNaN(d)) return d.toISOString().slice(0, 10);
      } catch {}
      return null;
    };

    return Object.values(records).map((data) => {
      // Some fields live on the first job object within data.Jobs (object keyed by id)
      const firstJob = Object.values(data?.Jobs ?? {})[0] ?? null;
      return {
        uniqueId: data?.unique_id || null,
        "date-added": toIsoDate(data?.created_at) || null,
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
        "date-quoted-accepted": toIsoDate(
          firstJob?.date_quoted_accepted ?? data?.date_quoted_accepted ?? null
        ),
        "quote-date": toIsoDate(
          firstJob?.quote_date ?? data?.quote_date ?? null
        ),
        "quote-total": toNumber(
          firstJob?.quote_total ?? data?.quote_total ?? null
        ),
        "quote-status": firstJob?.quote_status ?? data?.quote_status ?? null,
        "date-started": toIsoDate(
          firstJob?.date_started ?? data?.date_started ?? null
        ),
        "payment-status":
          firstJob?.payment_status ?? data?.payment_status ?? null,
        "date-job-required-by": toIsoDate(
          firstJob?.date_job_required_by ?? data?.date_job_required_by ?? null
        ),
        "date-booked": toIsoDate(
          firstJob?.date_booked ?? data?.date_booked ?? null
        ),
        "job-status": firstJob?.job_status ?? data?.job_status ?? null,
        "invoice-date": toIsoDate(
          firstJob?.invoice_date ?? data?.invoice_date ?? null
        ),
        "invoice-total": toNumber(
          firstJob?.invoice_total ?? data?.invoice_total ?? null
        ),
        "bill-time-paid": toIsoDate(
          firstJob?.bill_time_paid ?? data?.bill_time_paid ?? null
        ),
        "xero-invoice-status":
          firstJob?.xero_invoice_status ?? data?.xero_invoice_status ?? null,
        "due-date": toIsoDate(firstJob?.due_date ?? data?.due_date ?? null),
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
      },
    }));
  }

  mapQuoteRows(mappedData, formatDisplayDate) {
    return mappedData.map((records) => {
      return {
        id: `#${records.uniqueId ?? ""}`,
        client:
          [records["client-firstName"], records["client-lastName"]]
            .filter(Boolean)
            .join(" ") || "-",
        created:
          records["date-added"] && formatDisplayDate
            ? formatDisplayDate(records["date-added"])
            : "-",
        quoteDate:
          records["quote-date"] && formatDisplayDate
            ? formatDisplayDate(records["quote-date"])
            : "-",
        service: records["service-name"] ?? "-",
        type: records.type ?? "-",
        quoteStatus: records["quote-status"] ?? "-",
        quoteTotal:
          records["quote-total"] != null
            ? `$${records["quote-total"].toFixed(2)}`
            : "-",
        dateQuotedAccepted:
          records["date-quoted-accepted"] && formatDisplayDate
            ? formatDisplayDate(records["date-quoted-accepted"])
            : "-",
        meta: {
          address: records["client-address"] ?? null,
          email: records["client-email"] ?? null,
          sms: records["client-smsNumber"] ?? null,
          accountName: records["account-name"] ?? null,
          recommendation: records["recommendations"] ?? null,
        },
      };
    });
  }
}
