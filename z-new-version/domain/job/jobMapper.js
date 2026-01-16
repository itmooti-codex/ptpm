import {
  formatDisplayDate,
  formatUnixDate,
} from "../../ui/shared/dateFormat.js";

export const DIRECT_JOB_MAPPER = {
  unique_id: "id",
  client_entity_name: "companyName",
  client_entity_type: "companyType",
  client_individual_email: "client_email",
  client_individual_first_name: "client_firstName",
  client_individual_last_name: "client_lastName",
  client_individual_sms_number: "client_phone",
  contact_first_name: "serviceman_firstName",
  contact_last_name: "serviceman_lastName",
  date_booked: "dateBooked",
  date_quoted_accepted: "dateQuotedAccepted",
  date_started: "dateStarted",
  inquiry_record_how_did_you_hear: "referral",
  inquiry_record_inquiry_status: "status",
  inquiry_record_type: "type",
  invoice_number: "invoiceNumber",
  job_status: "jobStatus",
  job_total: "jobTotal",
  payment_status: "paymentStatus",
  property_property_name: "address",
  service_service_name: "service",
};

export function mapDirectJob(normalizedObj = {}, mapper = DIRECT_JOB_MAPPER) {
  const mapped = {};

  for (const sourceKey in mapper) {
    const targetKey = mapper[sourceKey];

    // date formatting — check RAW keys
    if (
      sourceKey === "date_booked" ||
      sourceKey === "date_quoted_accepted" ||
      sourceKey === "date_started"
    ) {
      const unixDate = normalizedObj?.[sourceKey];
      mapped[targetKey] = unixDate
        ? formatDisplayDate(formatUnixDate(unixDate))
        : null;
      continue;
    }

    mapped[targetKey] = normalizedObj?.[sourceKey] ?? null;
  }

  return mapped;
}

export function mapDirectJobArray(list, mapper = DIRECT_JOB_MAPPER) {
  const flatJobs = (list ?? []).map((item) => mapDirectJob(item, mapper));
  return mapJobRows(flatJobs);
}

function mapJobRows(jobData = []) {
  if (!Array.isArray(jobData)) return [];

  return jobData.map((item = {}) => {
    const firstName = item.client_firstName ?? "";
    const lastName = item.client_lastName ?? "";

    return {
      id: item.id ? `#${item.id}` : null,
      client: `${firstName} ${lastName}`.trim() || null,
      startDate: item.dateStarted ?? null,
      service: item.service ?? null,
      paymentStatus: item.paymentStatus ?? null,
      jobRequiredBy: item.dateJobRequiredBy ?? null,
      bookedDate: item.dateBooked ?? null,
      jobTotal: item.jobTotal ?? null,
      jobStatus: item.jobStatus ?? "Unknown",

      meta: {
        email: item.client_email ?? null,
        sms: item.client_phone ?? null,
        address: item.address ?? null,
      },
    };
  });
}
