const tabs = document.querySelectorAll(".tab");
const tableRoot = document.getElementById("appointment-table-root");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /(^id$|_id$)/i;
const STATUS_FIELD_RE = /^status$/i;
const ACTIONS_FIELD = "__actions";

const LIST_CONFIG = {
  all: allAppointments,
  new: newAppointments,
  scheduled: scheduledAppointments,
  completed: completedAppointments,
};

const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid: loggedInUserIdOp,
  table: "true",
  op: "subscribe",
  initCbName: "initAppointmentTable",
};

const STATUS_STYLES = {
  New: "bg-[#E8D3EE] text-[#8E24AA]",
  "To Be Scheduled": "bg-[#FEE8CC] text-[#FB8C00]",
  Scheduled: "bg-[#CCE7F6] text-[#0288D1]",
  Completed: "bg-[#D9ECDA] text-[#43A047]",
  Cancelled: "bg-[#ECECEC] text-[#9E9E9E]",
};
const STATUS_FALLBACK = "bg-gray-200 text-gray-500";

let currentTab = "all";
let currentRange = "all";
let currentRangeVars = null;

const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const toUnixSeconds = (date) => Math.floor(date.getTime() / 1000);

const getRangeVars = (rangeType) => {
  const now = new Date();
  let start;
  let end;

  if (rangeType === "all") {
    return {
      startTime: 0,
      endTime: 4102444800,
    };
  }
  if (rangeType === "week") {
    const startOfWeek = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - now.getDay(),
    );
    start = startOfWeek;
    end = new Date(
      startOfWeek.getFullYear(),
      startOfWeek.getMonth(),
      startOfWeek.getDate() + 6,
      23,
      59,
      59,
    );
  } else if (rangeType === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
    );
  }

  return {
    startTime: toUnixSeconds(start),
    endTime: toUnixSeconds(end),
  };
};

const applyRangeToElement = (elem) => {
  if (!elem) {
    return;
  }
  if (!currentRangeVars) {
    return;
  }
  elem.dataset.varSttime = String(currentRangeVars.startTime);
  elem.dataset.varEndtime = String(currentRangeVars.endTime);
};

const refreshDynamicList = () => {
  if (!tableRoot) {
    return;
  }
  const elem = tableRoot.querySelector("[data-dynamic-list]");
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!elem || !mgr || typeof mgr.get !== "function") {
    return;
  }
  const instance = mgr.get(elem);
  if (!instance) {
    return;
  }
  if (typeof instance.render === "function") {
    instance.render();
    return;
  }
  if (typeof instance.refresh === "function") {
    instance.refresh();
  }
};

const setRange = (rangeType, { refresh } = {}) => {
  currentRange = rangeType;
  currentRangeVars = getRangeVars(rangeType);
  const elem = tableRoot
    ? tableRoot.querySelector("[data-dynamic-list]")
    : null;
  if (elem) {
    applyRangeToElement(elem);
  }
  if (refresh) {
    refreshDynamicList();
  }
};

const createDynamicListElement = (type) => {
  const listId = LIST_CONFIG[type];
  if (!listId) {
    return null;
  }
  const elem = document.createElement("div");
  elem.dataset.inquiryType = type;
  elem.dataset.dynamicList = listId;
  elem.dataset.entity = TABLE_ATTRS.entity;
  elem.dataset.entityKey = TABLE_ATTRS.entityKey;
  if (TABLE_ATTRS.varServiceproviderid) {
    elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
  }
  applyRangeToElement(elem);
  elem.dataset.table = TABLE_ATTRS.table;
  elem.dataset.op = TABLE_ATTRS.op;
  elem.dataset.initCbName = TABLE_ATTRS.initCbName;
  return elem;
};

const replaceDynamicList = (type) => {
  if (!tableRoot) {
    return;
  }
  const oldElem = tableRoot.querySelector("[data-dynamic-list]");
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.renderNew !== "function") {
    return;
  }
  if (oldElem) {
    const instance = mgr && mgr.get ? mgr.get(oldElem) : null;
    if (instance && typeof instance.destroy === "function") {
      instance.destroy();
    }
    oldElem.remove();
  }
  const nextElem = createDynamicListElement(type);
  if (!nextElem) {
    return;
  }
  tableRoot.appendChild(nextElem);
  mgr.renderNew().subscribe(() => {});
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    const type = tab.dataset.status;

    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");

    currentTab = type;
    replaceDynamicList(type);
  });
});

const getTimestampSeconds = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const asNumber = Number(String(value).trim());
  if (Number.isFinite(asNumber)) {
    return asNumber;
  }
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return Math.floor(parsed.getTime() / 1000);
  }
  return null;
};

const formatDateAndTime = (value) => {
  const timestamp = getTimestampSeconds(value);
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp * 1000);
  return date
    .toLocaleString("en-GB", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    })
    .replace(",", " at");
};

const getAlpineData = () => {
  const root = document.body;
  if (root && root.__x && root.__x.$data) {
    return root.__x.$data;
  }
  return null;
};

const normalizeAppointmentData = (row) => {
  const inquiryId =
    row.Inquiry_Unique_ID || row.Inquiry_ID || row.inquiry_id || "";
  const jobId = row.Job_Unique_ID || row.Job_ID || row.job_id || "";
  const title = row.Title || row.title || "";
  const description = row.Description || row.description || "";
  const status = row.Status || row.status || "";
  const type = row.Type || row.type || "";
  const durationHours = row.Duration_Hours || row.duration_hours || 0;
  const durationMinutes = row.Duration_Minutes || row.duration_minutes || 0;
  const startTime = row.Start_Time || row.Start || row.start_time || "";
  const endTime = row.End_Time || row.End || row.end_time || "";
  const uniqueId =
    row.ID ||
    row.unique_id ||
    row.Unique_ID ||
    row.uniqueId ||
    inquiryId ||
    jobId ||
    "";
  const locationPropertyName =
    row.Location_Property_Name || row.location_property_name || "";
  const locationAddress1 =
    row.Location_Address_1 || row.location_address_1 || "";
  const locationSuburbTown =
    row.Location_Suburb_Town || row.location_suburb_town || "";
  const locationState =
    row.LocationState || row.location_state || row.Location_State || "";
  const primaryGuestFirstName =
    row.Primary_Guest_First_Name || row.primary_guest_first_name || "";
  const primaryGuestLastName =
    row.Primary_Guest_Last_Name || row.primary_guest_last_name || "";
  const primaryGuestContactId =
    row.Primary_Guest_Contact_ID || row.primary_guest_contact_id || "";
  const primaryGuestEmail =
    row.Primary_GuestEmail ||
    row.Primary_Guest_Email ||
    row.Primary_Guest_Email_Address ||
    row.Primary_Guest_Email_Address_1 ||
    row.Primary_Guest_Email_Address_2 ||
    row.primary_guest_email ||
    "";
  const primaryGuestSms =
    row.Primary_Guest_SMS_Number ||
    row.Primary_Guest_SMS ||
    row.primary_guest_sms_number ||
    row.primary_guest_sms ||
    "";
  const contactId = row.Contact_Contact_ID || row.contact_contact_id || "";
  const contactFirstName =
    row.Contact_First_Name || row.contact_first_name || "";
  const contactLastName = row.Contact_Last_Name || row.contact_last_name || "";

  return {
    ...row,
    formattedDateAndTime:
      formatDateAndTime(startTime) || row.Start || row.Start_Time || "",
    descriptions: description,
    description,
    title,
    status,
    type,
    unique_id: uniqueId,
    inquiry_id: inquiryId,
    job_id: jobId,
    duration_hours: durationHours,
    duration_minutes: durationMinutes,
    start_time: startTime,
    end_time: endTime,
    Location_Property_Name: locationPropertyName,
    Location_Address_1: locationAddress1,
    Location_Suburb_Town: locationSuburbTown,
    LocationState: locationState,
    location_property_name: locationPropertyName,
    location_address_1: locationAddress1,
    location_suburb_town: locationSuburbTown,
    location_state: locationState,
    Primary_Guest_First_Name: primaryGuestFirstName,
    Primary_Guest_Last_Name: primaryGuestLastName,
    Primary_Guest_Contact_ID: primaryGuestContactId,
    primary_guest_contact_id: primaryGuestContactId,
    Primary_GuestEmail: primaryGuestEmail,
    Primary_Guest_SMS_Number: primaryGuestSms,
    Contact_Contact_ID: contactId,
    Contact_First_Name: contactFirstName,
    Contact_Last_Name: contactLastName,
    contact_contact_id: contactId,
    contact_first_name: contactFirstName,
    contact_last_name: contactLastName,
    Inquiry_Unique_ID: inquiryId,
    Job_Unique_ID: jobId,
    PeterpmJob_Unique_ID: row.PeterpmJob_Unique_ID || jobId,
    Primary_Guest_Unique_ID:
      row.Primary_Guest_Unique_ID || primaryGuestContactId,
    PeterpmProperty_Unique_ID:
      row.PeterpmProperty_Unique_ID || row.Location_ID || row.location_id || "",
    location_id: row.location_id || row.Location_ID || "",
  };
};

const handleAppointmentSelect = (row) => {
  if (!row) {
    return;
  }

  const appointmentData = normalizeAppointmentData(row);
  const alpineData = getAlpineData();
  if (alpineData) {
    alpineData.appointmentData = appointmentData;
  } else {
    window.appointmentData = appointmentData;
  }

  const jobData = document.querySelectorAll(".jobData");
  const inquiryData = document.querySelectorAll(".inquiryData");
  if (appointmentData.type === "Job") {
    jobData.forEach((element) => {
      element.classList.remove("hidden");
    });
    inquiryData.forEach((element) => {
      element.classList.add("hidden");
    });
  } else {
    jobData.forEach((element) => {
      element.classList.add("hidden");
    });
    inquiryData.forEach((element) => {
      element.classList.remove("hidden");
    });
  }

  if (alpineData) {
    alpineData.modalIsOpen = true;
  } else {
    window.modalIsOpen = true;
  }
};

window.initAppointmentTable = (dynamicList) => {
  const React = window.vitalStatsReact || window.React;
  if (!dynamicList || !dynamicList.tableCtx || !React) {
    return;
  }

  dynamicList.tableCtx.setFinalizeDataGridProps((props) => {
    const wrapStyles = {
      "& .MuiDataGrid-cell": {
        whiteSpace: "normal",
        lineHeight: "1.4",
        alignItems: "flex-start",
        paddingTop: 2,
        paddingBottom: 2,
      },
      "& .MuiDataGrid-columnHeaderTitle": {
        whiteSpace: "normal",
        lineHeight: "1.2",
      },
    };
    const sx = Array.isArray(props.sx)
      ? [...props.sx, wrapStyles]
      : props.sx
        ? [props.sx, wrapStyles]
        : wrapStyles;
    return {
      ...props,
      getRowHeight: () => "auto",
      sx,
      onRowClick: (params) => {
        handleAppointmentSelect(params.row);
      },
    };
  });

  dynamicList.tableCtx.setFinalizeColumns((cols) => {
    const mapped = cols.map((col) => {
      const isId = ID_FIELD_RE.test(col.field || "");
      const isStatus = STATUS_FIELD_RE.test(col.field || "");
      if (col.field === ACTIONS_FIELD) {
        return col;
      }
      const baseRender = col.renderCell;
      return {
        ...col,
        minWidth: isId ? 100 : 160,
        width: isId ? 120 : col.width,
        flex: isId ? 0 : col.flex,
        renderCell: (params) => {
          const rawValue = params.value;
          if (isNullValue(rawValue)) {
            return "-";
          }
          if (isStatus) {
            const statusText = String(rawValue || "");
            const statusClass = STATUS_STYLES[statusText] || STATUS_FALLBACK;
            return React.createElement(
              "span",
              {
                className: `inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${statusClass}`,
              },
              statusText || "-",
            );
          }
          if (baseRender) {
            const rendered = baseRender(params);
            if (
              typeof rendered === "string" &&
              NULL_TEXT_RE.test(rendered.trim())
            ) {
              return "-";
            }
            return rendered;
          }
          return rawValue;
        },
      };
    });

    if (mapped.some((col) => col.field === ACTIONS_FIELD)) {
      return mapped;
    }

    return [
      ...mapped,
      {
        field: ACTIONS_FIELD,
        headerName: "Action",
        sortable: false,
        filterable: false,
        flex: 0,
        width: 80,
        renderCell: (params) =>
          React.createElement(
            "button",
            {
              type: "button",
              onClick: (event) => {
                event.stopPropagation();
                handleAppointmentSelect(params.row);
              },
              className: "text-[#0052CC] hover:text-[#003882]",
              "aria-label": "View appointment",
              title: "View appointment",
            },
            React.createElement("svg", {
              viewBox: "0 0 24 24",
              width: 18,
              height: 18,
              "aria-hidden": "true",
              fill: "currentColor",
              children: React.createElement("path", {
                d: "M12 5c-5 0-9 5-9 7s4 7 9 7 9-5 9-7-4-7-9-7zm0 12c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8a3 3 0 100 6 3 3 0 000-6z",
              }),
            }),
          ),
      },
    ];
  });
};

const dayFilter = document.querySelector(".showDayData");
const weekFilter = document.querySelector(".showWeekData");
const monthFilter = document.querySelector(".showMonthData");
const allFilter = document.querySelector(".showAllData");

if (allFilter) {
  allFilter.addEventListener("click", () => {
    setRange("all");
    replaceDynamicList(currentTab);
  });
}

if (dayFilter) {
  dayFilter.addEventListener("click", () => {
    setRange("day");
    replaceDynamicList(currentTab);
  });
}

if (weekFilter) {
  weekFilter.addEventListener("click", () => {
    setRange("week");
    replaceDynamicList(currentTab);
  });
}

if (monthFilter) {
  monthFilter.addEventListener("click", () => {
    setRange("month");
    replaceDynamicList(currentTab);
  });
}

setRange(currentRange, { refresh: true });

const SDK_CONFIG = {
  slug: "peterpm",
  apiKey: "1rBR-jpR3yE3HE1VhFD0j",
};

const loadVitalStatsSdk = () => {
  if (window.initVitalStats || window.initVitalStatsSDK) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://static-au03.vitalstats.app/static/sdk/v1/latest.js";
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

const getVitalStatsPlugin = async () => {
  if (window.vitalStatsPlugin) {
    return window.vitalStatsPlugin;
  }
  if (!window.vitalStatsPluginPromise) {
    window.vitalStatsPluginPromise = (async () => {
      await loadVitalStatsSdk();
      const initFn = window.initVitalStats || window.initVitalStatsSDK;
      if (!initFn) {
        throw new Error("VitalStats SDK init function missing");
      }
      const { plugin } = await initFn({
        slug: SDK_CONFIG.slug,
        apiKey: SDK_CONFIG.apiKey,
        isDefault: true,
      }).toPromise();
      window.vitalStatsPlugin = plugin;
      return plugin;
    })();
  }
  return window.vitalStatsPluginPromise;
};

const scheduleAppointmentFromModal = async () => {
  try {
    const alpineData = getAlpineData();
    const appointmentData =
      (alpineData && alpineData.appointmentData) || window.appointmentData;
    if (!appointmentData) {
      alert("Appointment data is missing.");
      return;
    }

    const dateTimeInputEl = document.querySelector(
      ".dateTimeScheduleInquiry",
    );
    const scheduleDescriptionEl = document.querySelector(
      ".scheduleDescription",
    );
    const appointmentTitleEl = document.querySelector("#appointmentTitle");
    const durationHourEl = document.getElementById("durationHour");
    const durationMinuteEl = document.getElementById("durationMinute");

    const dateTimeInput = dateTimeInputEl ? dateTimeInputEl.value : "";
    const scheduleDescription = scheduleDescriptionEl
      ? scheduleDescriptionEl.value
      : "";
    const appointmentTitle = appointmentTitleEl ? appointmentTitleEl.value : "";
    const durationHour = durationHourEl ? durationHourEl.value : "0";
    const durationMinute = durationMinuteEl ? durationMinuteEl.value : "0";

    if (!dateTimeInput) {
      alert("Please select a date and time.");
      return;
    }

    const dateObj = new Date(dateTimeInput);
    if (Number.isNaN(dateObj.getTime())) {
      alert("Invalid date/time selected.");
      return;
    }

    const timestamp = Math.floor(dateObj.getTime() / 1000);
    const propertyID =
      appointmentData.location_id ||
      appointmentData.Location_ID ||
      appointmentData.PeterpmProperty_Unique_ID ||
      "";
    const inquiryId =
      appointmentData.inquiry_id ||
      appointmentData.Inquiry_ID ||
      appointmentData.Inquiry_Unique_ID ||
      "";
    const contactID =
      appointmentData.Primary_Guest_Contact_ID ||
      appointmentData.primary_guest_contact_id ||
      "";

    if (!propertyID || !inquiryId || !contactID) {
      alert("Missing property, inquiry, or contact details.");
      return;
    }

    const payload = {
      inquiry_id: inquiryId,
      status: "New",
      start_time: timestamp,
      title: appointmentTitle,
      location_id: propertyID,
      primary_guest_id: contactID,
      duration_minutes: parseInt(durationMinute, 10) || 0,
      duration_hours: parseInt(durationHour, 10) || 0,
      description: scheduleDescription,
      Inquiry: {
        inquiry_status: "Site Visit to be Re-Scheduled",
      },
    };

    const plugin = await getVitalStatsPlugin();
    const appointmentModel = plugin.switchTo("PeterpmAppointment");
    const appointmentMutation = appointmentModel.mutation();
    appointmentMutation.createOne(payload);
    await appointmentMutation.execute(true).toPromise();

    const dealModel = plugin.switchTo("PeterpmDeal");
    const dealMutation = dealModel.mutation();
    const inquiryField =
      typeof inquiryId === "string" && inquiryId.trim().length
        ? Number.isFinite(Number(inquiryId))
          ? "id"
          : "unique_id"
        : "id";
    dealMutation.update((q) =>
      q.where(inquiryField, inquiryId).set({
        inquiry_status: "Site Visit to be Re-Scheduled",
      }),
    );
    await dealMutation.execute(true).toPromise();

    alert("Appointment scheduled successfully.");
    location.reload();
  } catch (error) {
    console.error("Reschedule appointment failed:", error);
    alert("Failed to schedule appointment. Check console for details.");
  }
};

window.scheduleAppointmentFromModal = scheduleAppointmentFromModal;
