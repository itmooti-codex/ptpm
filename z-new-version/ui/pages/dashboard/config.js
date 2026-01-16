import {
  buildClientCell,
  buildStatusBadge,
  actionButtons,
  money,
} from "../../shared/dom.js";

import { formatDisplayDate } from "../../shared/dateFormat.js";

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
      return value ? formatDisplayDate(value) : "-";
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
      const value = row.requiredBy;
      return value ? formatDisplayDate(value) : "-";
    },
  },
  {
    key: "bookedDate",
    label: "Booked Date",
    headerClass: "px-6 py-4 text-left",
    cellClass: "px-6 py-4 text-slate-600",
    render: (row) => {
      const value = row.bookedDate;
      return value ? formatDisplayDate(value) : "-";
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
