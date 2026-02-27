export const BASIC_OPTIONS = {
  status: [
    { value: "new", label: "New" },
    { value: "scheduled", label: "Scheduled" },
    { value: "completed", label: "Completed" },
  ],
  type: [
    { value: "inspection", label: "Inspection" },
    { value: "repair", label: "Repair" },
    { value: "quote", label: "Quote" },
  ],
  priority: [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
  ],
  paymentStatus: [
    { value: "pending", label: "Pending" },
    { value: "invoiced", label: "Invoiced" },
    { value: "paid", label: "Paid" },
  ],
  jobStatus: [
    { value: "open", label: "Open" },
    { value: "in-progress", label: "In Progress" },
    { value: "closed", label: "Closed" },
  ],
};

export const JOB_TYPE_OPTIONS = [
  { value: "334", label: "PPI" },
  { value: "333", label: "Quote" },
  { value: "332", label: "Inspection" },
  { value: "331", label: "Barrier Treatment" },
  { value: "330", label: "MB Inquiry" },
  { value: "329", label: "Reticulation" },
  { value: "328", label: "Borer Treatment" },
  { value: "327", label: "Drywood Termites" },
  { value: "326", label: "Followup Inquiry - DW" },
  { value: "325", label: "Notes only" },
  { value: "324", label: "Invoice Cancelled" },
  { value: "323", label: "General Pest" },
  { value: "322", label: "Baiting System" },
  { value: "321", label: "42 Day Check" },
  { value: "320", label: "Stump/Tree Treatment" },
  { value: "319", label: "Inspection & General Pest" },
  { value: "318", label: "Nest Treatment" },
  { value: "317", label: "Warranty ReTreatment" },
  { value: "316", label: "Administration" },
  { value: "315", label: "Annual Maintenance" },
];

export const JOB_STATUS_OPTIONS = [
  { value: "579", label: "Quote", color: "#8e24aa", backgroundColor: "#e8d3ee" },
  { value: "133", label: "On Hold", color: "#9e9e9e", backgroundColor: "#ececec" },
  { value: "130", label: "Booked", color: "#1e88e5", backgroundColor: "#d2e7fa" },
  { value: "677", label: "Call Back", color: "#1e88e5", backgroundColor: "#d2e7fa" },
  { value: "129", label: "Scheduled", color: "#00acc1", backgroundColor: "#cceef3" },
  { value: "507", label: "Reschedule", color: "#ef6c00", backgroundColor: "#fce2cc" },
  { value: "663", label: "In Progress", color: "#00acc1", backgroundColor: "#cceef3" },
  {
    value: "128",
    label: "Waiting For Payment",
    color: "#fb8c00",
    backgroundColor: "#fee8cc",
  },
  { value: "127", label: "Completed", color: "#43a047", backgroundColor: "#d9ecda" },
  { value: "126", label: "Cancelled", color: "#757575", backgroundColor: "#e3e3e3" },
];

export const PRIORITY_OPTIONS = [
  { value: "125", label: "Low", color: "#0097a7", backgroundColor: "#cceaed" },
  { value: "124", label: "Medium", color: "#f57c00", backgroundColor: "#fde5cc" },
  { value: "123", label: "High", color: "#d84315", backgroundColor: "#f7d9d0" },
];
