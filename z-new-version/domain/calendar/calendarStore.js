export class CalendarStore {
  constructor() {
    this.selectedDate = null;
    this.calendarDays = [];
    this.inquiryData = [];
  }

  setSelectedDate(dateIso) {
    this.selectedDate = dateIso;
  }

  getSelectedDate() {
    return this.selectedDate;
  }
}
