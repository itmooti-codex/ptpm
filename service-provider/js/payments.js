const tabs = document.querySelectorAll(".tab");
const NULL_TEXT_RE = /^null$/i;
const ID_FIELD_RE = /^id$/i;
const STATUS_FIELD_RE = /^job_status/i;
const PAYMENT_STATUS_FIELD_RE = /^payment_status/i;
const PRIORITY_FIELD_RE = /^xero_bill_status/i;

const ACTIONS_FIELD = "__actions";
const LIST_CONFIG = {
  waitingapproval: waitingApprovalPayments,
  scheduled: scheduledPayments,
  awaitingpayment: awaitingPayments,
  paid: paidPayments,
  cancelled: cancelledPayments,
};
const TABLE_ATTRS = {
  entity: "peterpm",
  entityKey: "1rBR-jpR3yE3HE1VhFD0j",
  varServiceproviderid: SERVICE_PROVIDER_ID,
  table: "true",
  op: "subscribe",
  initCbName: "initInquiryTable",
};
const STATUS_STYLES = {
  Quote: "bg-[#e8d3ee] text-[#8e24aa]",
  "On Hold": "bg-[#ececec] text-[#9e9e9e]",
  Booked: "bg-[#d2e7fa] text-[#1e88e5]",
  Scheduled: "bg-[#cceef3] text-[#00acc1]",
  Reschedule: "bg-[#fce2cc] text-[#ef6c00]",
  "In Progress": "bg-[#cceef3] text-[#00acc1]",
  "Waiting For Payment": "bg-[#fee8cc] text-[#fb8c00]",
  Completed: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#e3e3e3] text-[#757575]",
  Default: "bg-gray-200 text-gray-500",
};

const PAYMENT_STATUS_STYLES = {
  "Invoice Required": "bg-[#e8d3ee] text-[#8e24aa]",
  "Invoice Sent": "bg-[#d7dbee] text-[#3949ab]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Overdue: "bg-[#fddcd2] text-[#f4511e]",
  "Written Off": "bg-[#fee8cc] text-[#fb8c00]",
  Cancelled: "bg-[#dfdfdf] text-[#616161]",
  Default: "bg-gray-200 text-gray-500",
};

const PRIORITY_STYLES = {
  "Create Bill Line Item'": "bg-[#e8d3ee] text-[#8e24aa]",
  "Update Bill Line Item": "bg-[#e8d3ee] text-[#8e24aa]",
  "Waiting Approval": "bg-[#cdebfa] text-[#039be5]",
  Scheduled: "bg-[#fee8cc] text-[#fb8c00]",
  "Awaiting Payment": "bg-[#fddcd2] text-[#f4511e]",
  Paid: "bg-[#d9ecda] text-[#43a047]",
  Cancelled: "bg-[#cccccc] text-[#000000]",
  Default: "bg-gray-200 text-gray-500",
};

const STATUS_FALLBACK = "bg-gray-200 text-gray-500";

const makeInquiryLink = (id) =>
  `https://my.awesomate.pro/inquiry/${encodeURIComponent(id)}`;

const isNullValue = (value) => {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === "string") {
    return NULL_TEXT_RE.test(value.trim());
  }
  return false;
};

const getAlpineData = () => {
  const root = document.body;
  if (root && root.__x && root.__x.$data) {
    return root.__x.$data;
  }
  return null;
};

const openPaymentModal = (row) => {
  const alpineData = getAlpineData();
  if (alpineData) {
    alpineData.paymentsData = row || {};
    alpineData.modalIsOpen = true;
    return;
  }
  window.paymentsData = row || {};
  window.modalIsOpen = true;
};

const tableRoot = document.getElementById("inquiry-table-root");

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
  elem.dataset.varServiceproviderid = TABLE_ATTRS.varServiceproviderid;
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

    // tab active state
    tabs.forEach((t) => t.classList.remove("activeTab"));
    tab.classList.add("activeTab");

    replaceDynamicList(type);
  });
});

const refreshCurrentList = () => {
  if (!tableRoot) {
    return;
  }
  const mgr = window.vitalStatsDynamicListsMgr;
  if (!mgr || typeof mgr.get !== "function") {
    return;
  }
  const elem = tableRoot.querySelector("[data-dynamic-list]");
  if (!elem) {
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

window.initInquiryTable = (dynamicList) => {
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
          if (isId) {
            if (rawValue === "-") {
              return "-";
            }
            return React.createElement(
              "a",
              {
                href: makeInquiryLink(rawValue),
                className: "text-blue-600 underline",
              },
              String(rawValue),
            );
          }
          const isPaymentStatus = PAYMENT_STATUS_FIELD_RE.test(col.field || "");
          const isPriority = PRIORITY_FIELD_RE.test(col.field || "");

          if (isStatus || isPaymentStatus || isPriority) {
            const text = String(rawValue || "");

            let style = isStatus
              ? STATUS_STYLES[text]
              : isPaymentStatus
                ? PAYMENT_STATUS_STYLES[text]
                : PRIORITY_STYLES[text];

            const finalClass = style || "bg-gray-200 text-gray-500";

            return React.createElement(
              "span",
              {
                className:
                  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold " +
                  finalClass,
              },
              text || "-",
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
        headerName: "Actions",
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
                openPaymentModal(params.row);
              },
              className: "text-[#0052CC] hover:text-[#003882]",
              "aria-label": "View payment",
              title: "View payment",
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
