// models/DashboardModel.js
const dayjsRef = window.dayjs;
if (!dayjsRef) {
  throw new Error("Day.js is required for the dashboard model to operate.");
}

export class DashboardModel {
  constructor() {
    // --- Config / constants the app relies on ---
    this.statusClasses = {
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

    this.dayCount = 14;
    this.startDate = dayjsRef("2024-03-15");
    this.totalsPattern = [8, 13, 19, 8, 12, 3, 11, 8, 13, 19, 8, 13, 19, 11];
    this.rowTotals = [45, 45];

    this.sampleRows = [
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

    // --- Derived state ---
    this.calendarDays = this.#buildCalendarDays();
    this.inquiryDataByDate = {
      [this.calendarDays[0].iso]: this.sampleRows,
      [this.calendarDays[1].iso]: this.sampleRows.slice(0, 5),
      [this.calendarDays[7].iso]: this.sampleRows.slice(2),
    };
    this.selectedDate = this.calendarDays[6]?.iso ?? this.calendarDays[0].iso;
  }

  // PRIVATE: compute calendar days grid
  #buildCalendarDays() {
    return Array.from({ length: this.dayCount }, (_, index) => {
      const current = this.startDate.add(index, "day");
      return {
        iso: current.format("YYYY-MM-DD"),
        label: current.format("ddd D/M"),
        total:
          this.totalsPattern[index] ??
          this.totalsPattern[index % this.totalsPattern.length],
      };
    });
  }

  // --- Getters ---
  getCalendarDays() {
    return this.calendarDays;
  }
  getRowTotals() {
    return this.rowTotals;
  }
  getSelectedDate() {
    return this.selectedDate;
  }
  getStatusClasses() {
    return this.statusClasses;
  }
  getRowsForDate(dateIso) {
    return this.inquiryDataByDate[dateIso] ?? [];
  }

  // --- Mutations ---
  setSelectedDate(dateIso) {
    this.selectedDate = dateIso;
  }

  // --- Utilities ---
  formatDisplayDate(dateIso) {
    return dayjsRef(dateIso).format("D MMM YYYY");
  }
}
