import {
  buildClientCell,
  buildStatusBadge,
  actionButtons,
  money,
} from "../../shared/dom.js";

import { formatDisplayDate } from "../../shared/dateFormat.js";

export function createViewEnquiryURL(inquiryID) {
  return `https://my.awesomate.pro/create-inquiry/${inquiryID}`;
}

export const DASHBOARD_STATUS_CLASSES = {
  "New Inquiry": "bg-rose-50 text-rose-500",
  "Not Allocated": "bg-fuchsia-50 text-fuchsia-600",
  "Contact Client": "bg-indigo-50 text-indigo-600",
  "Contact For Site Visit": "bg-sky-50 text-sky-600",
  "Site Visit Scheduled": "bg-amber-50 text-amber-600",
  "Site Visit to be Re-Scheduled": "bg-orange-50 text-orange-600",
  "Generate Quote": "bg-brand-50 text-brand-600",
  "Quote Created": "bg-emerald-50 text-emerald-600",
  "Awaiting Quote": "bg-amber-50 text-amber-600",
  Scheduled: "bg-emerald-50 text-emerald-600",
  "In Progress": "bg-sky-50 text-sky-600",
  Closed: "bg-slate-100 text-slate-600",
};

export const InquiryHeaders = [
  {
    key: "id",
    label: "Unique ID",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
    render: (row) =>
      `<a href="#" class="font-normal text-[#0052CC] hover:!underline hover:!text-[#0052CC] active:!text-[#0052CC] hover:text-[#0052CC] active:text-[#0052CC] focus:text-[#0052CC] focus-visible:text-[#0052CC]">${
        row.id ?? ""
      }</a>`,
  },
  {
    key: "client",
    label: "Client Info",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
    render: (row) => buildClientCell(row),
  },
  {
    key: "created",
    label: "Created Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    html: `
        <span class="inline-flex items-center gap-1">
          Created Date
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400 hover:!text-brand-400 active:!text-brand-400 hover:text-brand-400 active:text-brand-400 focus:text-brand-400 focus-visible:text-brand-400" viewBox="0 0 20 20" fill="none">
            <path d="M7 8l3-3 3 3M7 12l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      `,
  },
  {
    key: "serviceman",
    label: "Serviceman",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
  },
  {
    key: "followUp",
    label: "Follow Up",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    html: `
        <span class="inline-flex items-center gap-1">
          Follow Up
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-brand-400 hover:!text-brand-400 active:!text-brand-400 hover:text-brand-400 active:text-brand-400 focus:text-brand-400 focus-visible:text-brand-400" viewBox="0 0 20 20" fill="none">
            <path d="M7 8l3-3 3 3M7 12l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </span>
      `,
  },
  {
    key: "source",
    label: "Source",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
  },
  {
    key: "service",
    label: "Service Inquiry",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
  },
  {
    key: "type",
    label: "Type",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
  },
  {
    key: "status",
    label: "Status",
    headerClass: "px-6 py-4 text-center",
    cellClass: "px-6 py-4 text-center",
    render: (row) => buildStatusBadge(row, DASHBOARD_STATUS_CLASSES),
  },
  {
    key: "actions",
    label: "Action",
    headerClass: "px-6 py-4 text-center",
    cellClass: "px-6 py-4 text-center",
    render: () => actionButtons,
  },
];

export const JobHeaders = [
  {
    key: "id",
    label: "Unique ID",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
  },
  {
    key: "client",
    label: "Client Info",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
    render: (row) => buildClientCell(row),
  },
  {
    key: "startDate",
    label: "Start Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      const value = row.startDate;
      return value ? value : "-";
    },
  },
  {
    key: "service",
    label: "Services",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => row.service ?? "-",
  },
  {
    key: "paymentStatus",
    label: "Payment Status",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => row.paymentStatus ?? "-",
  },
  {
    key: "jobRequiredBy",
    label: "Job Required By",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      return row.requiredBy ? row.requiredBy : "-";
    },
  },
  {
    key: "bookedDate",
    label: "Booked Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      return row.bookedDate ? row.bookedDate : "-";
      r;
    },
  },
  {
    key: "jobTotal",
    label: "Job Total",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => money(row.price ?? row?.meta?.price),
  },
  {
    key: "jobStatus",
    label: "Job Status",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-left",
    render: (row) => {
      const status = row.jobStatus ?? row.status ?? "-";
      return buildStatusBadge({ status }, DASHBOARD_STATUS_CLASSES);
    },
  },
  {
    key: "actions",
    label: "Action",
    headerClass: "px-6 py-4 text-center",
    cellClass: "px-6 py-4 text-center",
    render: () => actionButtons,
  },
];

export const quotesHeaders = [
  {
    key: "id",
    label: "Unique ID",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
  },
  {
    key: "client",
    label: "Client Info",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
    render: (row) => buildClientCell(row),
  },
  {
    key: "dateQuotedAccepted",
    label: "Quote Accepted Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      return row.dateQuotedAccepted ? row.dateQuotedAccepted : "-";
    },
  },
  {
    key: "service",
    label: "Services",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => row.service ?? "-",
  },
  {
    key: "quoteDate",
    label: "Quoted Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      return row.quoteDate ? row.quoteDate : "-";
    },
  },
  {
    key: "quoteTotal",
    label: "Quote Total",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => money(row.quoteTotal ?? row?.meta?.quoteTotal),
  },
  {
    key: "quoteStatus",
    label: "Status",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-left",
    render: (row) => {
      const status = row.quoteStatus ?? row.status ?? "-";
      return buildStatusBadge({ status }, DASHBOARD_STATUS_CLASSES);
    },
  },

  {
    key: "actions",
    label: "Action",
    headerClass: "px-6 py-4 text-center",
    cellClass: "px-6 py-4 text-center",
    render: () => actionButtons,
  },
];

export const paymentHeaders = [
  {
    key: "id",
    label: "Unique ID",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
  },
  {
    key: "client",
    label: "Client Info",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4",
    render: (row) => buildClientCell(row),
  },
  {
    key: "invoiceNumber",
    label: "Invoice No.",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => row.invoiceNumber ?? row?.meta?.invoiceNumber ?? "-",
  },
  {
    key: "invoiceDate",
    label: "Invoice Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => (row.invoiceDate ? row.invoiceDate : "-"),
  },
  {
    key: "dueDate",
    label: "Due Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => (row.dueDate ? row.dueDate : "-"),
  },
  {
    key: "invoiceTotal",
    label: "Invoice Total",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => money(row.invoiceTotal ?? row?.meta?.invoiceTotal),
  },
  {
    key: "billPaidDate",
    label: "Bill Paid Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => (row.billPaidDate ? row.billPaidDate : "-"),
  },
  {
    key: "serviceApproved",
    label: "Serviceman Approved",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => `
      ${
        row.serviceApproved
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2E7D32">
              <circle cx="12" cy="12" r="10" fill="#2E7D32"></circle>
              <path d="M9 12l2 2l4-4" fill="none" stroke="#fff" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"></path>
            </svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9 12l2 2l4-4"></path>
            </svg>`
      }
    `,
  },
  {
    key: "adminApproved",
    label: "Admin Approved",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => `
    ${
      row.adminApproved
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="#2E7D32">
            <circle cx="12" cy="12" r="10" fill="#2E7D32"></circle>
            <path d="M9 12l2 2l4-4" fill="none" stroke="#fff" stroke-width="2"
              stroke-linecap="round" stroke-linejoin="round"></path>
          </svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="#4b5563" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9 12l2 2l4-4"></path>
          </svg>`
    }
  `,
  },
  {
    key: "xeroInvoiceStatus",
    label: "Xero Invoice Status",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-left",
    render: (row) => row.xeroInvoiceStatus ?? "-",
  },
  {
    key: "actions",
    label: "Action",
    headerClass: "px-6 py-4 text-center",
    cellClass: "px-6 py-4 text-center",
    render: () => actionButtons,
  },
];

export const filtersConfig = {
  quote: [
    "status-filter-btn",
    "service-provider-filter-btn",
    "account-name-filter",
    "resident-search-filter",
    "address-filter",
    "account-type-filter",
    "taken-by-filter",
    "Source-filter",
    "date-filters",
    "quote-number-filter",
    "recommendation-filter",
    "price-range-filter",
  ],
  inquiry: [
    "status-filter-btn",
    "account-name-filter",
    "resident-search-filter",
    "address-filter",
    "account-type-filter",
    "taken-by-filter",
    "Source-filter",
  ],
  jobs: [
    "status-filter-btn",
    "service-provider-filter-btn",
    "account-name-filter",
    "resident-search-filter",
    "address-filter",
    "account-type-filter",
    "taken-by-filter",
    "Source-filter",
    "date-filters",
    "quote-number-filter",
    "invoice-number-filter",
    "recommendation-filter",
    "price-range-filter",
  ],
  payment: [
    "status-filter-btn",
    "service-provider-filter-btn",
    "account-name-filter",
    "resident-search-filter",
    "address-filter",
    "account-type-filter",
    "taken-by-filter",
    "Source-filter",
    "date-filters",
    "quote-number-filter",
    "invoice-number-filter",
    "recommendation-filter",
    "price-range-filter",
  ],
  "active-jobs": [
    "status-filter-btn",
    "service-provider-filter-btn",
    "account-name-filter",
    "resident-search-filter",
    "address-filter",
    "account-type-filter",
    "taken-by-filter",
    "Source-filter",
    "date-filters",
    "quote-number-filter",
    "invoice-number-filter",
    "recommendation-filter",
    "price-range-filter",
  ],
  "urgent-calls": ["job-filters", "task-filters"],
};

export const DASHBOARD_TABS = {
  inquiry: "Inquiries",
  quote: "Quotes",
  jobs: "Jobs",
  payment: "Payments",
  "active-jobs": "Active Jobs",
  "urgent-calls": "Urgent Calls",
};

export const DASHBOARD_NAVIGATION_CONFIG = {
  navId: "top-tabs",
  panelsId: "tab-panels",
  defaultTab: "inquiry",
};

export const STATUSES = {
  inquiryStatues: [
    "New Inquiry",
    "Not Allocated",
    "Contact Client",
    "Contact For Site Visit",
    "Site Visit Scheduled",
    "Site Visit to be Re-Scheduled",
    "Generate Quote",
    "Quote Created",
    "Completed",
    "Cancelled",
    "Expired",
  ],
  quoteStatuses: [
    "New",
    "Requested",
    "Sent",
    "Accepted",
    "Declined",
    "Expired",
    "Cancelled",
  ],
  jobStatuses: [
    "Quote",
    "On Hold",
    "Booked",
    "Call Back",
    "Scheduled",
    "Reschedule",
    "In Progress",
    "Waiting For Payment",
    "Completed",
    "Cancelled",
  ],
  paymentStatuses: [
    "Invoice Required",
    "Invoice Sent",
    "Paid",
    "Overdue",
    "Written Off",
    "Cancelled",
  ],
};

export const QUERY_SOURCES = [
  "Select none",
  "Google",
  "Bing",
  "Facebook",
  "Yellow Pages",
  "Referral",
  "Car Signage",
  "Returning Customers",
  "Other",
];
