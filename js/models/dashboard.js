const dayjsRef = window.dayjs;

if (!dayjsRef) {
  throw new Error("Day.js is required for the dashboard model to operate.");
}

export const statusClasses = {
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

const dayCount = 14;
const startDate = dayjsRef("2024-03-15");
const totalsPattern = [8, 13, 19, 8, 12, 3, 11, 8, 13, 19, 8, 13, 19, 11];
const rowTotals = [45, 45];

const sampleRows = [
  {
    id: "#321322",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Rita Ora",
    followUp: "15 May 2020",
    source: "Web Form",
    service: "Possum Roof Removal",
    type: "General Inquiry",
    status: "New Inquiry",
  },
  {
    id: "#321324",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Savannah Nguyen",
    followUp: "15 May 2020",
    source: "SMS",
    service: "Possum Roof",
    type: "Service Request of Quote",
    status: "Not Allocated",
  },
  {
    id: "#321326",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Darlene Robertson",
    followUp: "15 May 2020",
    source: "Phone Call",
    service: "Possum Roof",
    type: "General Inquiry",
    status: "Contact Client",
  },
  {
    id: "#321328",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Cameron Williamson",
    followUp: "15 May 2020",
    source: "Email",
    service: "Wasp Removal",
    type: "General Inquiry",
    status: "Contact For Site Visit",
  },
  {
    id: "#321330",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Cameron Williamson",
    followUp: "15 May 2020",
    source: "Web Form",
    service: "Wasp Removal",
    type: "General Inquiry",
    status: "Site Visit Scheduled",
  },
  {
    id: "#321332",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Cameron Williamson",
    followUp: "15 May 2020",
    source: "Web Form",
    service: "Wasp Removal",
    type: "General Inquiry",
    status: "Site Visit to be Re-Scheduled",
  },
  {
    id: "#321334",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Cameron Williamson",
    followUp: "15 May 2020",
    source: "Web Form",
    service: "Wasp Removal",
    type: "General Inquiry",
    status: "Generate Quote",
  },
  {
    id: "#321336",
    client: "Devon Lane",
    created: "15 May 2020",
    serviceman: "Cameron Williamson",
    followUp: "15 May 2020",
    source: "Web Form",
    service: "Wasp Removal",
    type: "General Inquiry",
    status: "Quote Created",
  },
];

function buildCalendarDays() {
  return Array.from({ length: dayCount }, (_, index) => {
    const current = startDate.add(index, "day");
    return {
      iso: current.format("YYYY-MM-DD"),
      label: current.format("ddd D/M"),
      total:
        totalsPattern[index] ?? totalsPattern[index % totalsPattern.length],
    };
  });
}

export function createState() {
  const calendarDays = buildCalendarDays();

  const inquiryDataByDate = {
    [calendarDays[0].iso]: sampleRows,
    [calendarDays[1].iso]: sampleRows.slice(0, 5),
    [calendarDays[7].iso]: sampleRows.slice(2),
  };

  return {
    calendarDays,
    rowTotals,
    inquiryDataByDate,
    selectedDate: calendarDays[6]?.iso ?? calendarDays[0].iso,
  };
}

export function setSelectedDate(state, dateIso) {
  state.selectedDate = dateIso;
}

export function getRowsForDate(state, dateIso) {
  return state.inquiryDataByDate[dateIso] ?? [];
}

export function formatDisplayDate(dateIso) {
  return dayjsRef(dateIso).format("D MMM YYYY");
}
