import {
  formatUnixDate,
  formatDisplayDate,
} from "../../ui/shared/dateFormat.js";

export const DIRECT_QUOTE_MAPPER = {
  unique_id: "id",
  client_individual_first_name: "client_firstName",
  client_individual_last_name: "client_lastName",
  client_individual_email: "client_email",
  client_individual_sms_number: "client_phone",
  date_quoted_accepted: "dateQuotedAccepted",
  quote_date: "quoteDate",
  service_service_name: "service",
  quote_total: "quoteTotal",
  quote_status: "quoteStatus",
  property_property_name: "address",
};

export function mapDirectQuote(
  normalizedObj = {},
  mapper = DIRECT_QUOTE_MAPPER
) {
  const mapped = {};

  for (const sourceKey in mapper) {
    const targetKey = mapper[sourceKey];

    if (sourceKey === "date_quoted_accepted" || sourceKey === "quote_date") {
      const unixDate = normalizedObj?.[sourceKey];
      mapped[targetKey] = unixDate
        ? formatDisplayDate(formatUnixDate(unixDate))
        : null;
      continue;
    }

    if (sourceKey === "quote_total") {
      const val = normalizedObj?.[sourceKey];
      mapped[targetKey] = val != null ? Number(val) : 0;
      continue;
    }

    mapped[targetKey] = normalizedObj?.[sourceKey] ?? null;
  }

  return mapped;
}

export function mapDirectQuoteArray(list = [], mapper = DIRECT_QUOTE_MAPPER) {
  const flatQuotes = list.map((item) => mapDirectQuote(item, mapper));
  return mapQuoteRows(flatQuotes);
}

function mapQuoteRows(quoteData = []) {
  if (!Array.isArray(quoteData)) return [];

  return quoteData.map((item = {}) => {
    const firstName = item.client_firstName ?? "";
    const lastName = item.client_lastName ?? "";

    return {
      id: item.id ? `#${item.id}` : null,
      client: `${firstName} ${lastName}`.trim() || null,
      dateQuotedAccepted: item.dateQuotedAccepted ?? null,
      service: item.service ?? null,
      quoteDate: item.quoteDate ?? null,
      quoteTotal: item.quoteTotal ?? 0,
      quoteStatus: item.quoteStatus ?? "Unknown",
      meta: {
        email: item.client_email ?? null,
        sms: item.client_phone ?? null,
        address: item.address ?? null,
      },
    };
  });
}
