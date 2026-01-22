import {
  formatUnixDate,
  formatDisplayDate,
} from "../../ui/shared/dateFormat.js";

export const PAYMENT_MAPPER = {
  unique_id: "id",

  client_individual_first_name: "client_firstName",
  client_individual_last_name: "client_lastName",
  client_individual_email: "client_email",
  client_individual_sms_number: "client_phone",

  invoice_number: "invoiceNumber",
  payment_status: "paymentStatus",

  invoice_date: "invoiceDate",
  due_date: "dueDate",
  bill_time_paid: "billPaidDate",

  invoice_total: "invoiceTotal",

  xero_invoice_status: "xeroInvoiceStatus",
  bill_approved_service_provider: "serviceApproved",
  bill_approved_admin: "adminApproved",

  property_property_name: "address",
};

export function mapPayment(normalizedObj = {}, mapper = PAYMENT_MAPPER) {
  const mapped = {};

  for (const sourceKey in mapper) {
    const targetKey = mapper[sourceKey];
    const val = normalizedObj?.[sourceKey];

    if (
      sourceKey === "invoice_date" ||
      sourceKey === "due_date" ||
      sourceKey === "bill_time_paid"
    ) {
      mapped[targetKey] = val ? formatDisplayDate(formatUnixDate(val)) : null;
      continue;
    }

    if (sourceKey === "invoice_total") {
      mapped[targetKey] = val != null ? Number(val) : 0;
      continue;
    }

    mapped[targetKey] = val ?? null;
  }

  return mapped;
}

export function mapPaymentArray(list = [], mapper = PAYMENT_MAPPER) {
  const flatPayments = list.map((item) => mapPayment(item, mapper));
  return mapPaymentRows(flatPayments);
}

function mapPaymentRows(paymentData = []) {
  if (!Array.isArray(paymentData)) return [];

  return paymentData.map((item = {}) => {
    const firstName = item.client_firstName ?? "";
    const lastName = item.client_lastName ?? "";

    return {
      id: item.id ? `#${item.id}` : null,
      client: `${firstName} ${lastName}`.trim() || null,
      invoiceNumber: item.invoiceNumber ?? null,
      paymentStatus: item.paymentStatus ?? "Unknown",
      invoiceDate: item.invoiceDate ?? null,
      dueDate: item.dueDate ?? null,
      invoiceTotal: item.invoiceTotal ?? 0,
      billPaidDate: item.billPaidDate ?? null,
      xeroInvoiceStatus: item.xeroInvoiceStatus ?? null,
      serviceApproved: item.serviceApproved ?? null,
      adminApproved: item.adminApproved ?? null,
      meta: {
        email: item.client_email ?? null,
        sms: item.client_phone ?? null,
        address: item.address ?? null,
      },
    };
  });
}
