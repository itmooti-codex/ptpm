import {
  formatDisplayDate,
  formatUnixDate,
} from "../../ui/shared/dateFormat.js";

export const INQUIRY_MAPPER = {
  unique_id: "id",
  contact_first_name: "serviceman_firstName",
  contact_last_name: "serviceman_lastName",
  date_added: "created_at",
  inquiry_status: "status",
  companyname: "company",
  company_account_type: "companyType",
  how_did_you_hear: "referral",
  property_address_1: "address",
  service_inquiry_service_name: "service",
  type: "type",
  primary_contact_first_name: "client_firstName",
  primary_contact_last_name: "client_lastName",
  primary_contact_email: "client_email",
  primary_contact_sms_number: "client_phone",
  property_address_1: "client_address",
};

function mapInquiry(normalizedObj, mapper = INQUIRY_MAPPER) {
  const mapped = {};

  for (const sourceKey in mapper) {
    if (sourceKey == "date_added") {
      const unixDate = normalizedObj[sourceKey];
      mapped[mapper[sourceKey]] = unixDate
        ? formatDisplayDate(formatUnixDate(unixDate))
        : null;
      continue;
    }
    const targetKey = mapper[sourceKey];
    mapped[targetKey] = normalizedObj[sourceKey] ?? null;
  }

  return mapped;
}

export function mapInquiryArray(list, mapper = INQUIRY_MAPPER) {
  const mappedInquiries = list.map((item) => mapInquiry(item, mapper));
  return mapInquiryForRows(mappedInquiries);
}

function mapInquiryForRows(data) {
  return (data ?? []).map((item = {}) => ({
    id: item?.id != null ? `#${item.id}` : "-",

    client:
      [item?.client_firstName, item?.client_lastName]
        .filter(Boolean)
        .join(" ") || "-",

    created: item?.created_at ?? "-",

    serviceman:
      [item?.serviceman_firstName, item?.serviceman_lastName]
        .filter(Boolean)
        .join(" ") || "-",

    followUp: item?.created_at ?? "-",

    source: item?.s ?? "-",
    service: item?.service ?? "-",
    type: item?.type ?? "-",
    status: item?.status ?? "-",

    meta: {
      address: item?.client_address ?? "-",
      email: item?.client_email ?? "-",
      sms: item?.client_phone ?? "-",
    },
  }));
}
