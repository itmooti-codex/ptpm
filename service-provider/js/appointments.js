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

const handleAppointmentSelect = (row) => {
  if (!row) {
    return;
  }
  window.appointmentData = {
    status: row.Status,
    title: row.Title,
    start_time: row.Start_Time,
    end_time: row.End_Time,
    description: row.Description,
    inquiry_id: row.Inquiry_ID,
    job_id: row.Job_ID,
    type: row.Type,
    duration_hours: row.Duration_Hours,
    duration_minutes: row.Duration_Minutes,
    job_job_status: row.Job_Job_Status,
    location_property_name: row.Location_Property_Name,
    location_address_1: row.Location_Address_1,
    location_suburb_town: row.Location_Suburb_Town,
    location_state: row.LocationState,
    contact_contact_id: row.Contact_Contact_ID,
    contact_first_name: row.Contact_First_Name,
    contact_last_name: row.Contact_Last_Name,
    primary_guest_contact_id: row.Primary_Guest_Contact_ID,
    primary_guest_first_name: row.Primary_Guest_First_Name,
    primary_guest_last_name: row.Primary_Guest_Last_Name,
  };

  const jobData = document.querySelectorAll(".jobData");
  const inquiryData = document.querySelectorAll(".inquiryData");
  if (window.appointmentData.type === "Job") {
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

  window.modalIsOpen = true;
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



