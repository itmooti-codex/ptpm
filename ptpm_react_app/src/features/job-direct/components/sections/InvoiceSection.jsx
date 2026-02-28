import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { Card } from "../../../../shared/components/ui/Card.jsx";
import { InputField } from "../../../../shared/components/ui/InputField.jsx";
import { useToast } from "../../../../shared/providers/ToastProvider.jsx";
import {
  PAYMENT_STATUS_OPTIONS,
  XERO_BILL_STATUS_OPTIONS,
  XERO_INVOICE_STATUS_OPTIONS,
} from "../../constants/options.js";
import {
  fetchInvoiceBillContextByJobUid,
  updateInvoiceTriggerByJobId,
  updateJobRecordById,
  waitForJobInvoiceApiResponseChange,
} from "../../sdk/jobDirectSdk.js";

function toText(value) {
  return String(value ?? "").trim();
}

function normalizeId(value) {
  const text = toText(value);
  if (!text) return "";
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return text;
}

function toNumber(value) {
  const numeric = Number(String(value ?? "").replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(numeric) ? numeric : 0;
}

function round2(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function toDateInput(value) {
  const text = toText(value);
  if (!text) return "";

  if (/^\d+$/.test(text)) {
    const numeric = Number.parseInt(text, 10);
    if (Number.isFinite(numeric)) {
      const asMs = String(Math.abs(numeric)).length <= 10 ? numeric * 1000 : numeric;
      const date = new Date(asMs);
      if (!Number.isNaN(date.getTime())) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";
  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toEpochSecondsFromDateInput(value) {
  const text = toText(value);
  if (!text) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(text) ? `${text}T00:00:00` : text;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  return Math.floor(parsed.getTime() / 1000);
}

function formatDateDisplay(value) {
  const iso = toDateInput(value);
  if (!iso) return "-";
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function formatDateTimeDisplay(value) {
  const text = toText(value);
  if (!text) return "-";

  let date = null;
  if (/^\d+$/.test(text)) {
    const numeric = Number.parseInt(text, 10);
    if (Number.isFinite(numeric)) {
      const asMs = String(Math.abs(numeric)).length <= 10 ? numeric * 1000 : numeric;
      date = new Date(asMs);
    }
  } else {
    date = new Date(text);
  }

  if (!date || Number.isNaN(date.getTime())) return text;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function normalizeStatus(value = "") {
  return String(value || "").trim().toLowerCase();
}

function resolveStatusOption(options = [], value = "") {
  const key = normalizeStatus(value);
  if (!key) return null;
  return (
    options.find((item) => normalizeStatus(item?.value) === key) ||
    options.find((item) => normalizeStatus(item?.label) === key) ||
    null
  );
}

function isTrue(value) {
  if (typeof value === "boolean") return value;
  const normalized = normalizeStatus(value);
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function isFinalXeroState(value = "") {
  const key = normalizeStatus(value);
  return key.includes("paid") || key.includes("cancelled") || key.includes("written off");
}

function lineAmount(record) {
  const quantity = Math.max(1, toNumber(record?.quantity || 1));
  const price = toNumber(record?.activity_price || record?.quoted_price || 0);
  return round2(quantity * price);
}

function createStatusStyle(option) {
  if (!option) return undefined;
  return {
    color: option.color,
    backgroundColor: option.backgroundColor,
  };
}

function statusWithFallback(status, palette) {
  const raw = toText(status);
  if (!raw) {
    return {
      label: "Not Synced",
      style: createStatusStyle(resolveStatusOption(palette, "Not Synced")),
    };
  }
  const option = resolveStatusOption(palette, raw);
  return {
    label: option?.label || raw,
    style: createStatusStyle(option),
  };
}

function statusFromRawValue(status, palette) {
  const raw = toText(status);
  if (!raw) {
    return {
      label: "--",
      style: {
        color: "#475569",
        backgroundColor: "#f1f5f9",
      },
    };
  }
  const option = resolveStatusOption(palette, raw);
  return {
    label: option?.label || raw,
    style: option
      ? createStatusStyle(option)
      : {
          color: "#475569",
          backgroundColor: "#f1f5f9",
        },
  };
}

function resolveApiResponseTone(responseText = "") {
  const text = normalizeStatus(responseText);
  if (!text) {
    return {
      tone: "idle",
      className: "border-slate-200 bg-slate-50 text-slate-700",
      title: "Xero API Response",
    };
  }
  if (/error|fail|failed|invalid|unable|cancel|denied|rejected/.test(text)) {
    return {
      tone: "error",
      className: "border-red-200 bg-red-50 text-red-700",
      title: "Xero API Response (Error)",
    };
  }
  if (/pending|processing|in progress|queued|wait/.test(text)) {
    return {
      tone: "pending",
      className: "border-amber-200 bg-amber-50 text-amber-800",
      title: "Xero API Response (Processing)",
    };
  }
  if (/success|created|updated|complete|completed|ok/.test(text)) {
    return {
      tone: "success",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800",
      title: "Xero API Response (Success)",
    };
  }
  return {
    tone: "info",
    className: "border-sky-200 bg-sky-50 text-sky-800",
    title: "Xero API Response",
  };
}

function collectMaterialSummary(materials = []) {
  return (Array.isArray(materials) ? materials : []).reduce(
    (acc, item) => {
      const total = toNumber(item?.total || item?.Total);
      const transactionType = normalizeStatus(item?.transaction_type || item?.Transaction_Type);
      if (transactionType === "reimburse") acc.reimburse += total;
      if (transactionType === "deduct") acc.deduct += total;
      return acc;
    },
    { reimburse: 0, deduct: 0 }
  );
}

function buildAccountSummary(job = {}) {
  const accountType =
    normalizeStatus(job?.account_type || job?.Account_Type) === "company"
      ? "Company"
      : "Contact";
  const accountsContact = job?.Accounts_Contact?.Contact || {};
  const accountsContactFirstName = toText(
    job?.accounts_contact_contact_first_name ||
      job?.Contact_First_Name1 ||
      job?.Accounts_Contact_Contact_First_Name ||
      accountsContact?.first_name ||
      accountsContact?.First_Name
  );
  const accountsContactLastName = toText(
    job?.accounts_contact_contact_last_name ||
      job?.Contact_Last_Name1 ||
      job?.Accounts_Contact_Contact_Last_Name ||
      accountsContact?.last_name ||
      accountsContact?.Last_Name
  );
  const accountsContactName = [accountsContactFirstName, accountsContactLastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  const accountsContactEmail = toText(
    job?.accounts_contact_contact_email ||
      job?.ContactEmail1 ||
      job?.Accounts_Contact_Contact_Email ||
      accountsContact?.email ||
      accountsContact?.Email
  );

  return {
    accountType,
    accountName: accountsContactName || "--",
    accountEmail: accountsContactEmail || "--",
    accountId:
      accountType === "Company"
        ? normalizeId(job?.client_entity_id || job?.Client_Entity_ID)
        : normalizeId(job?.client_individual_id || job?.Client_Individual_ID),
    accountsContactId:
      normalizeId(job?.accounts_contact_id || job?.Accounts_Contact_ID) ||
      normalizeId(job?.contact_id || job?.Contact_ID) ||
      normalizeId(job?.client_individual_id || job?.Client_Individual_ID) ||
      "",
    contactXeroId: toText(job?.client_individual_xero_contact_id || job?.Client_Individual_Xero_Contact_ID),
    companyXeroId: toText(job?.client_entity_xero_contact_id || job?.Client_Entity_Xero_Contact_ID),
  };
}

function buildServiceProviderSummary(job = {}) {
  const firstName = toText(
    job?.primary_service_provider_contact_first_name ||
      job?.Primary_Service_Provider_Contact_First_Name ||
      job?.Contact_First_Name2 ||
      job?.Primary_Service_Provider?.Contact_Information?.first_name ||
      job?.Primary_Service_Provider?.Contact_Information?.First_Name
  );
  const lastName = toText(
    job?.primary_service_provider_contact_last_name ||
      job?.Primary_Service_Provider_Contact_Last_Name ||
      job?.Contact_Last_Name2 ||
      job?.Primary_Service_Provider?.Contact_Information?.last_name ||
      job?.Primary_Service_Provider?.Contact_Information?.Last_Name
  );
  const email = toText(
    job?.primary_service_provider_contact_email ||
      job?.Primary_Service_Provider_Contact_Email ||
      job?.ContactEmail2 ||
      job?.Primary_Service_Provider?.Contact_Information?.email ||
      job?.Primary_Service_Provider?.Contact_Information?.Email
  );
  const id = normalizeId(
    job?.primary_service_provider_id ||
      job?.Primary_Service_Provider_ID ||
      job?.Primary_Service_Provider?.id ||
      job?.Primary_Service_Provider?.ID
  );
  const label =
    [firstName, lastName].filter(Boolean).join(" ").trim() ||
    email ||
    (id ? `Provider #${id}` : "--");

  return {
    id,
    firstName,
    lastName,
    email,
    label,
  };
}

function LinkButton({ href, children }) {
  const safeHref = toText(href);
  if (!safeHref) {
    return (
      <span className="inline-flex cursor-not-allowed items-center rounded border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-400">
        {children}
      </span>
    );
  }
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:border-slate-400"
    >
      {children}
    </a>
  );
}

function SectionTitle({ title, subtitle }) {
  return (
    <div className="space-y-1">
      <h3 className="type-subheadline text-slate-800">{title}</h3>
      {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
    </div>
  );
}

export function InvoiceSection({ plugin, jobData, jobUid, onExternalUnsavedChange }) {
  const { success, error } = useToast();
  const [context, setContext] = useState({ job: null, activities: [], materials: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [activeBillingTab, setActiveBillingTab] = useState("client-invoice");

  const [invoiceDate, setInvoiceDate] = useState("");
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);

  const [billDate, setBillDate] = useState("");
  const [billDueDate, setBillDueDate] = useState("");

  const [invoiceDirty, setInvoiceDirty] = useState(false);
  const [billDirty, setBillDirty] = useState(false);

  const [isInvoiceSaving, setIsInvoiceSaving] = useState(false);
  const [isBillSaving, setIsBillSaving] = useState(false);
  const [isSendingToCustomer, setIsSendingToCustomer] = useState(false);
  const [isWaitingForInvoiceResponse, setIsWaitingForInvoiceResponse] = useState(false);

  const activeJob = context.job || jobData || null;
  const activeActivities = useMemo(() => {
    if (context.activities?.length) return context.activities;
    return Array.isArray(jobData?.activities) ? jobData.activities : [];
  }, [context.activities, jobData]);
  const activeMaterials = useMemo(() => {
    if (context.materials?.length) return context.materials;
    return Array.isArray(jobData?.materials) ? jobData.materials : [];
  }, [context.materials, jobData]);

  const jobId = normalizeId(activeJob?.id || activeJob?.ID);

  const accountSummary = useMemo(() => buildAccountSummary(activeJob || {}), [activeJob]);
  const serviceProviderSummary = useMemo(
    () => buildServiceProviderSummary(activeJob || {}),
    [activeJob]
  );

  const providerRate = useMemo(() => {
    const rate = Number(
      activeJob?.primary_service_provider_job_rate_percentage ??
        activeJob?.Primary_Service_Provider_Job_Rate_Percentage ??
        activeJob?.Primary_Service_Provider?.job_rate_percentage ??
        0
    );
    return Number.isFinite(rate) ? rate : 0;
  }, [activeJob]);

  const selectedActivityIdSet = useMemo(
    () => new Set(selectedActivityIds.map((value) => toText(value)).filter(Boolean)),
    [selectedActivityIds]
  );

  const selectedActivities = useMemo(
    () => activeActivities.filter((record) => selectedActivityIdSet.has(toText(record?.id || record?.ID))),
    [activeActivities, selectedActivityIdSet]
  );

  const invoiceSubtotal = useMemo(
    () => round2(selectedActivities.reduce((sum, record) => sum + lineAmount(record), 0)),
    [selectedActivities]
  );
  const invoiceGst = useMemo(() => round2(invoiceSubtotal / 11), [invoiceSubtotal]);
  const invoiceTotal = useMemo(() => round2(invoiceSubtotal), [invoiceSubtotal]);

  const billActivityRows = useMemo(
    () =>
      selectedActivities.map((record) => {
        const base = lineAmount(record);
        const providerAmount = round2((base * providerRate) / 100);
        return {
          id: toText(record?.id || record?.ID),
          service: toText(record?.service_name || record?.Service_Service_Name || "-"),
          task: toText(record?.task || record?.Task || "-"),
          option: toText(record?.option || record?.Option || "-"),
          amount: providerAmount,
        };
      }),
    [selectedActivities, providerRate]
  );

  const materialSummary = useMemo(() => collectMaterialSummary(activeMaterials), [activeMaterials]);
  const materialsNetTotal = useMemo(
    () => round2(materialSummary.reimburse - materialSummary.deduct),
    [materialSummary]
  );

  const billSubtotal = useMemo(
    () => round2(billActivityRows.reduce((sum, item) => sum + item.amount, 0) + materialsNetTotal),
    [billActivityRows, materialsNetTotal]
  );
  const billGst = useMemo(() => round2(billSubtotal / 11), [billSubtotal]);
  const billTotal = useMemo(() => round2(billSubtotal), [billSubtotal]);

  const invoiceStatus = useMemo(
    () =>
      statusFromRawValue(
        activeJob?.xero_invoice_status || activeJob?.Xero_Invoice_Status,
        XERO_INVOICE_STATUS_OPTIONS
      ),
    [activeJob]
  );
  const paymentStatus = useMemo(
    () =>
      statusFromRawValue(
        activeJob?.payment_status || activeJob?.Payment_Status,
        PAYMENT_STATUS_OPTIONS
      ),
    [activeJob]
  );
  const xeroApiResponse = useMemo(
    () => toText(activeJob?.xero_api_response || activeJob?.Xero_API_Response),
    [activeJob]
  );
  const xeroApiResponseTone = useMemo(
    () => resolveApiResponseTone(xeroApiResponse),
    [xeroApiResponse]
  );
  const billStatus = useMemo(
    () => statusWithFallback(activeJob?.xero_bill_status || activeJob?.Xero_Bill_Status, XERO_BILL_STATUS_OPTIONS),
    [activeJob]
  );
  const storedInvoiceTotal = useMemo(
    () => round2(toNumber(activeJob?.invoice_total || activeJob?.Invoice_Total)),
    [activeJob]
  );

  const hasUnsavedChanges = invoiceDirty || billDirty;

  const refetchContext = useCallback(async () => {
    if (!plugin || !jobUid) return;
    setIsLoading(true);
    setLoadError("");
    try {
      const nextContext = await fetchInvoiceBillContextByJobUid({
        plugin,
        jobUid,
      });
      if (!nextContext) {
        setContext({ job: null, activities: [], materials: [] });
        return;
      }
      const normalizedActivities = Array.isArray(nextContext.activities)
        ? nextContext.activities
        : [];
      const preselectedIds = normalizedActivities
        .filter((record) => isTrue(record?.invoice_to_client || record?.Invoice_to_Client))
        .map((record) => toText(record?.id || record?.ID))
        .filter(Boolean);

      setContext({
        job: nextContext.job || null,
        activities: normalizedActivities,
        materials: Array.isArray(nextContext.materials) ? nextContext.materials : [],
      });
      setInvoiceDate(toDateInput(nextContext.job?.invoice_date || nextContext.job?.Invoice_Date));
      setInvoiceDueDate(toDateInput(nextContext.job?.due_date || nextContext.job?.Due_Date));
      setBillDate(toDateInput(nextContext.job?.bill_date || nextContext.job?.Bill_Date));
      setBillDueDate(
        toDateInput(nextContext.job?.bill_due_date || nextContext.job?.Bill_Due_Date)
      );
      setSelectedActivityIds(preselectedIds);
      setInvoiceDirty(false);
      setBillDirty(false);
    } catch (fetchError) {
      console.error("[JobDirect] Failed loading invoice context", fetchError);
      setLoadError(fetchError?.message || "Unable to load invoice and bill data.");
    } finally {
      setIsLoading(false);
    }
  }, [jobUid, plugin]);

  useEffect(() => {
    refetchContext();
  }, [refetchContext]);

  useEffect(() => {
    if (typeof onExternalUnsavedChange !== "function") return;
    onExternalUnsavedChange(hasUnsavedChanges);
  }, [hasUnsavedChanges, onExternalUnsavedChange]);

  const toggleActivitySelection = (activityId, checked) => {
    const normalized = toText(activityId);
    if (!normalized) return;
    setSelectedActivityIds((previous) => {
      const nextSet = new Set(previous.map((item) => toText(item)).filter(Boolean));
      if (checked) {
        nextSet.add(normalized);
      } else {
        nextSet.delete(normalized);
      }
      return Array.from(nextSet);
    });
    setInvoiceDirty(true);
  };

  const waitForInvoiceApiResponse = useCallback(
    async (previousSnapshot = null) => {
      if (!plugin || !jobId) return "";

      setIsWaitingForInvoiceResponse(true);
      try {
        const latestResponse = await waitForJobInvoiceApiResponseChange({
          plugin,
          jobId,
          previous: previousSnapshot,
          timeoutMs: 45000,
        });
        if (!latestResponse) {
          success("Invoice request submitted", "Waiting for Xero response. Refresh if needed.");
          return "";
        }

        const responseMessage = toText(latestResponse?.xero_api_response);
        const responseTone = resolveApiResponseTone(responseMessage);
        if (responseMessage && responseTone.tone === "error") {
          error("Invoice failed", responseMessage);
        } else if (responseMessage) {
          success("Invoice response", responseMessage);
        } else if (
          latestResponse?.invoice_url_admin ||
          latestResponse?.invoice_url_client ||
          latestResponse?.invoice_number
        ) {
          success("Invoice ready", "Invoice links/status were updated.");
        } else {
          success("Invoice response", "Invoice status changed.");
        }
        await refetchContext();
        return latestResponse;
      } catch (pollError) {
        console.error("[JobDirect] Failed while waiting for Xero API response", pollError);
        error("Response check failed", pollError?.message || "Unable to read Xero API response.");
        return "";
      } finally {
        setIsWaitingForInvoiceResponse(false);
      }
    },
    [error, jobId, plugin, refetchContext, success]
  );

  const handleGenerateOrUpdateInvoice = async () => {
    if (isInvoiceSaving) return;
    if (!plugin) {
      error("Save failed", "SDK is still initializing.");
      return;
    }
    if (!jobId) {
      error("Save failed", "Job ID is missing.");
      return;
    }
    if (!invoiceDate || !invoiceDueDate) {
      error("Validation failed", "Invoice Date and Due Date are required.");
      return;
    }

    setIsInvoiceSaving(true);
    try {
      const previousApiResponse = toText(
        activeJob?.xero_api_response || activeJob?.Xero_API_Response
      );
      const previousInvoiceSnapshot = {
        xero_api_response: previousApiResponse,
        invoice_url_admin: toText(activeJob?.invoice_url_admin || activeJob?.Invoice_URL_Admin),
        invoice_url_client: toText(activeJob?.invoice_url_client || activeJob?.Invoice_URL_Client),
        xero_invoice_status: toText(activeJob?.xero_invoice_status || activeJob?.Xero_Invoice_Status),
        xero_invoice_pdf: toText(activeJob?.xero_invoice_pdf || activeJob?.Xero_Invoice_PDF),
        invoice_number: toText(activeJob?.invoice_number || activeJob?.Invoice_Number),
      };

      await updateInvoiceTriggerByJobId({
        plugin,
        jobId,
        payload: {
          invoice_date: invoiceDate,
          due_date: invoiceDueDate,
          xero_invoice_status: "Create Invoice",
        },
      });

      await refetchContext();
      await waitForInvoiceApiResponse(previousInvoiceSnapshot);
    } catch (saveError) {
      console.error("[JobDirect] Invoice trigger failed", saveError);
      error("Save failed", saveError?.message || "Unable to update invoice right now.");
    } finally {
      setIsInvoiceSaving(false);
    }
  };

  const handleApproveBill = async () => {
    if (isBillSaving) return;
    if (!plugin) {
      error("Save failed", "SDK is still initializing.");
      return;
    }
    if (!jobId) {
      error("Save failed", "Job ID is missing.");
      return;
    }

    const approved = isTrue(activeJob?.bill_approved_admin || activeJob?.Bill_Approved_Admin);
    if (approved) {
      error("Already approved", "Bill is already approved by admin.");
      return;
    }
    if (!billDate || !billDueDate) {
      error("Validation failed", "Bill Date and Bill Due Date are required.");
      return;
    }

    const billDateEpoch = toEpochSecondsFromDateInput(billDate);
    const billDueDateEpoch = toEpochSecondsFromDateInput(billDueDate);
    if (billDateEpoch === null || billDueDateEpoch === null) {
      error("Validation failed", "Bill dates are invalid.");
      return;
    }

    setIsBillSaving(true);
    try {
      await updateJobRecordById({
        plugin,
        id: jobId,
        payload: {
          bill_date: billDateEpoch,
          bill_due_date: billDueDateEpoch,
        },
      });
      await updateJobRecordById({
        plugin,
        id: jobId,
        payload: {
          bill_date: billDateEpoch,
          bill_due_date: billDueDateEpoch,
          bill_approved_admin: true,
        },
      });
      await refetchContext();
      setBillDirty(false);
      success("Bill approved", "Bill was approved by admin.");
    } catch (saveError) {
      console.error("[JobDirect] Bill approval failed", saveError);
      error("Save failed", saveError?.message || "Unable to approve bill right now.");
    } finally {
      setIsBillSaving(false);
    }
  };

  const handleSendToCustomer = async () => {
    if (isSendingToCustomer) return;
    if (!plugin || !jobId) {
      error("Send failed", "Job data is not ready.");
      return;
    }

    const invoiceUrl = toText(
      activeJob?.invoice_url_client || activeJob?.Invoice_URL_Client || ""
    );
    if (!invoiceUrl) {
      error("Send failed", "No client invoice URL found. Generate invoice first.");
      return;
    }

    setIsSendingToCustomer(true);
    try {
      await updateJobRecordById({
        plugin,
        id: jobId,
        payload: {
          send_to_contact: true,
        },
      });
      await refetchContext();
      success("Sent", "Invoice send flag was updated for customer delivery.");
    } catch (sendError) {
      console.error("[JobDirect] Failed sending invoice", sendError);
      error("Send failed", sendError?.message || "Unable to send invoice right now.");
    } finally {
      setIsSendingToCustomer(false);
    }
  };

  const handleCopyToClipboard = useCallback(
    async (value, label = "Value") => {
      const text = toText(value);
      if (!text) return;

      try {
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.setAttribute("readonly", "");
          textarea.style.position = "absolute";
          textarea.style.left = "-9999px";
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand("copy");
          document.body.removeChild(textarea);
        }
        success("Copied", `${label} copied.`);
      } catch {
        error("Copy failed", `Unable to copy ${label.toLowerCase()}.`);
      }
    },
    [error, success]
  );

  const billStatusFinal = isFinalXeroState(billStatus.label);
  const billApprovedByAdmin = isTrue(
    activeJob?.bill_approved_admin || activeJob?.Bill_Approved_Admin
  );
  const billApprovalTimeLabel = formatDateTimeDisplay(
    activeJob?.bill_approval_time || activeJob?.Bill_Approval_Time
  );

  const tableHeaderCellClass =
    "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500";
  const tableBodyCellClass = "px-3 py-2.5 align-middle text-[13px] text-slate-700";
  const accountXeroId =
    accountSummary.accountType === "Company"
      ? accountSummary.companyXeroId || ""
      : accountSummary.contactXeroId || "";

  return (
    <section data-section="invoice" className="mx-auto w-full max-w-full space-y-4 pb-10 xl:w-[60%]">
      <div className="border-b border-slate-300 bg-white pt-1">
        <div className="inline-flex items-center">
          <button
            type="button"
            className={`inline-flex items-center px-6 py-3 ${
              activeBillingTab === "client-invoice"
                ? "border-b-2 border-sky-900 text-sky-900"
                : "text-neutral-700"
            }`}
            onClick={() => setActiveBillingTab("client-invoice")}
            data-tab="client-invoice"
          >
            Client Invoice
          </button>
          <button
            type="button"
            className={`inline-flex items-center px-6 py-3 ${
              activeBillingTab === "service-provider-bill"
                ? "border-b-2 border-sky-900 text-sky-900"
                : "text-neutral-700"
            }`}
            onClick={() => setActiveBillingTab("service-provider-bill")}
            data-tab="service-provider-bill"
          >
            Service Provider Bill
          </button>
        </div>
      </div>

      {activeBillingTab === "client-invoice" ? (
      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden border border-[var(--color-line)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <div className="h-1.5 w-full bg-[var(--color-primary)]" />
          <div className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle
                title="Client Invoice"
              />
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-semibold"
                  style={invoiceStatus.style}
                >
                  {invoiceStatus.label}
                </span>
                <span className="rounded border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  Invoice # {toText(activeJob?.invoice_number || activeJob?.Invoice_Number) || "--"}
                </span>
              </div>
            </div>

            {isLoading ? (
              <div className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                Loading invoice and bill context...
              </div>
            ) : null}

            {!isLoading && loadError ? (
              <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {loadError}
              </div>
            ) : null}

            {isWaitingForInvoiceResponse ? (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Waiting for Xero response...
              </div>
            ) : null}

            {xeroApiResponse ? (
              <div className={`rounded border px-3 py-2 text-sm ${xeroApiResponseTone.className}`}>
                <div className="text-[11px] font-semibold uppercase tracking-wide">
                  {xeroApiResponseTone.title}
                </div>
                <div className="mt-1 whitespace-pre-wrap">{xeroApiResponse}</div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
              <Card className="space-y-3 border-slate-200 bg-slate-50/55 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</div>
                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Account Type</span>
                    <span className="font-medium text-slate-800">{accountSummary.accountType}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Accounts Contact</span>
                    <span className="max-w-[240px] truncate whitespace-nowrap font-medium text-slate-800">
                      {accountSummary.accountName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Email</span>
                    {accountSummary.accountEmail !== "--" ? (
                      <a
                        href={`mailto:${accountSummary.accountEmail}`}
                        className="max-w-[240px] truncate whitespace-nowrap font-medium text-sky-700 underline-offset-2 hover:underline"
                        title={accountSummary.accountEmail}
                      >
                        {accountSummary.accountEmail}
                      </a>
                    ) : (
                      <span className="max-w-[240px] truncate whitespace-nowrap font-medium text-slate-800">
                        {accountSummary.accountEmail}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Xero ID</span>
                    {accountXeroId ? (
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(accountXeroId, "Xero ID")}
                        className="max-w-[210px] truncate text-right font-mono text-[12px] font-medium text-sky-700 underline underline-offset-2 hover:text-sky-800"
                        title="Click to copy Xero ID"
                      >
                        {accountXeroId}
                      </button>
                    ) : (
                      <span className="max-w-[210px] truncate text-right font-mono text-[12px] font-medium text-slate-800">
                        --
                      </span>
                    )}
                  </div>
                </div>
              </Card>

              <Card className="space-y-3 border-slate-200 bg-slate-50/55 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dates</div>
                <div className="grid grid-cols-1 gap-3">
                  <InputField
                    label="Invoice Date"
                    type="date"
                    data-field="invoice_date"
                    value={invoiceDate}
                    onChange={(event) => {
                      setInvoiceDate(event.target.value);
                      setInvoiceDirty(true);
                    }}
                  />
                  <InputField
                    label="Due Date"
                    type="date"
                    data-field="due_date"
                    value={invoiceDueDate}
                    onChange={(event) => {
                      setInvoiceDueDate(event.target.value);
                      setInvoiceDirty(true);
                    }}
                  />
                </div>
              </Card>
            </div>

            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-700">Invoice Activities</div>
                <div className="text-xs text-slate-500">Select activities to include in invoice</div>
              </div>
              <div className="w-full overflow-x-auto rounded border border-slate-200">
                <table className="w-full min-w-[900px] table-fixed text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-100/90">
                    <tr>
                      <th className={`w-[90px] ${tableHeaderCellClass}`}>Include</th>
                      <th className={`w-[130px] ${tableHeaderCellClass}`}>Task</th>
                      <th className={`w-[150px] ${tableHeaderCellClass}`}>Option</th>
                      <th className={`w-[240px] ${tableHeaderCellClass}`}>Service</th>
                      <th className={`w-[80px] text-right ${tableHeaderCellClass}`}>Qty</th>
                      <th className={`w-[130px] text-right ${tableHeaderCellClass}`}>Price</th>
                      <th className={`w-[130px] text-right ${tableHeaderCellClass}`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {!activeActivities.length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={7}>
                          No activities found for this job.
                        </td>
                      </tr>
                    ) : (
                      activeActivities.map((record) => {
                        const activityId = toText(record?.id || record?.ID);
                        const checked = selectedActivityIdSet.has(activityId);
                        const quantity = Math.max(1, toNumber(record?.quantity || 1));
                        const price = toNumber(record?.activity_price || record?.quoted_price || 0);
                        const amount = lineAmount(record);

                        return (
                          <tr
                            key={activityId || `${record?.task}-${record?.service_name}`}
                            className="border-b border-slate-100 transition-colors hover:bg-slate-50/65 last:border-b-0"
                          >
                            <td className={tableBodyCellClass}>
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-slate-300 accent-[#0A3E8C]"
                                checked={checked}
                                onChange={(event) =>
                                  toggleActivitySelection(activityId, event.target.checked)
                                }
                              />
                            </td>
                            <td className={`${tableBodyCellClass} text-slate-800`}>
                              {toText(record?.task || record?.Task) || "-"}
                            </td>
                            <td className={`${tableBodyCellClass} text-slate-800`}>
                              {toText(record?.option || record?.Option) || "-"}
                            </td>
                            <td className={`${tableBodyCellClass} text-slate-800`}>
                              {toText(record?.service_name || record?.Service_Service_Name) || "-"}
                            </td>
                            <td className={`${tableBodyCellClass} text-right text-slate-800`}>{quantity}</td>
                            <td className={`${tableBodyCellClass} text-right text-slate-800`}>
                              {formatCurrency(price)}
                            </td>
                            <td className={`${tableBodyCellClass} text-right font-semibold text-slate-900`}>
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <Card className="space-y-2 border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-700">Line Items</div>
              <div className="w-full overflow-x-auto rounded border border-slate-200">
                <table className="w-full min-w-[640px] table-fixed text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-100/90">
                    <tr>
                      <th className={tableHeaderCellClass}>Service</th>
                      <th className={tableHeaderCellClass}>Task</th>
                      <th className={`w-[90px] text-right ${tableHeaderCellClass}`}>Qty</th>
                      <th className={`w-[130px] text-right ${tableHeaderCellClass}`}>Price</th>
                      <th className={`w-[130px] text-right ${tableHeaderCellClass}`}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!selectedActivities.length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={5}>
                          No line items selected.
                        </td>
                      </tr>
                    ) : (
                      selectedActivities.map((record) => {
                        const quantity = Math.max(1, toNumber(record?.quantity || 1));
                        const price = toNumber(record?.activity_price || record?.quoted_price || 0);
                        const amount = lineAmount(record);
                        return (
                          <tr
                            key={`line-${toText(record?.id || record?.ID)}`}
                            className="border-b border-slate-100 last:border-b-0"
                          >
                            <td className={`${tableBodyCellClass} text-slate-800`}>
                              {toText(record?.service_name || record?.Service_Service_Name) || "-"}
                            </td>
                            <td className={`${tableBodyCellClass} text-slate-800`}>
                              {toText(record?.task || record?.Task) || "-"}
                            </td>
                            <td className={`${tableBodyCellClass} text-right text-slate-800`}>{quantity}</td>
                            <td className={`${tableBodyCellClass} text-right text-slate-800`}>
                              {formatCurrency(price)}
                            </td>
                            <td className={`${tableBodyCellClass} text-right font-semibold text-slate-900`}>
                              {formatCurrency(amount)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <div className="ml-auto w-full max-w-[420px] space-y-2 pr-3 text-sm text-slate-700">
                  <div className="flex items-center justify-between">
                    <span>Invoice Total (Saved)</span>
                    <span className="min-w-[130px] text-right font-medium">
                      {formatCurrency(storedInvoiceTotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="min-w-[130px] text-right font-medium">
                      {formatCurrency(invoiceSubtotal)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Includes GST</span>
                    <span className="min-w-[130px] text-right font-medium">
                      {formatCurrency(invoiceGst)}
                    </span>
                  </div>
                  <div className="border-t-2 border-slate-300 pt-2.5">
                    <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                      <span>Total</span>
                      <span data-field="invoice_total" className="min-w-[130px] text-right">
                        {formatCurrency(invoiceTotal)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                    <span>Payment Status</span>
                    <span
                      className="inline-flex items-center rounded-full border border-transparent px-3 py-1 text-[11px] font-semibold"
                      style={paymentStatus.style}
                    >
                      {paymentStatus.label}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#003882] text-white hover:bg-[#003882]"
                  onClick={handleGenerateOrUpdateInvoice}
                  disabled={isInvoiceSaving || isLoading || isWaitingForInvoiceResponse}
                >
                  {isInvoiceSaving
                    ? "Saving..."
                    : isWaitingForInvoiceResponse
                      ? "Waiting for Xero..."
                      : "Generate/Update Invoice"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSendToCustomer}
                  disabled={
                    isSendingToCustomer ||
                    !toText(activeJob?.invoice_url_client || activeJob?.Invoice_URL_Client)
                  }
                >
                  {isSendingToCustomer ? "Sending..." : "Send To Customer"}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <LinkButton href={activeJob?.xero_invoice_pdf || activeJob?.Xero_Invoice_PDF}>
                  Download Invoice PDF
                </LinkButton>
                <LinkButton href={activeJob?.invoice_url_admin || activeJob?.Invoice_URL_Admin}>
                  View Xero Invoice (Admin)
                </LinkButton>
                <LinkButton href={activeJob?.invoice_url_client || activeJob?.Invoice_URL_Client}>
                  View Xero Invoice (Client)
                </LinkButton>
              </div>
            </div>
          </div>
        </Card>
      </div>
      ) : null}

      {activeBillingTab === "service-provider-bill" ? (
      <div className="min-w-0 space-y-4">
        <Card className="overflow-hidden border border-[var(--color-line)] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <div className="h-1.5 w-full bg-[var(--color-primary)]" />
          <div className="space-y-4 p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionTitle
                title="Service Provider Bill"
                subtitle="Service provider share of selected activities and materials"
              />
              <span
                className="inline-flex items-center rounded-full border border-transparent px-3 py-1 text-xs font-semibold"
                style={billStatus.style}
              >
                {billStatus.label}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <Card className="space-y-2 border-slate-200 bg-slate-50/55 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Bill From</div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Service Provider</span>
                    <span className="truncate font-medium text-slate-900">
                      {serviceProviderSummary.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Rate</span>
                    <span className="font-medium text-slate-900">{providerRate}%</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Bill Xero ID</span>
                    <span className="font-mono text-[12px] text-slate-900">
                      {toText(activeJob?.bill_xero_id || activeJob?.Bill_Xero_ID) || "--"}
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="space-y-2 border-slate-200 bg-slate-50/55 p-3">
                <div className="text-xs uppercase tracking-wide text-slate-500">Bill To</div>
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Reference</span>
                    <span className="font-medium text-slate-900">
                      {toText(activeJob?.unique_id || activeJob?.Unique_ID) || "--"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Client</span>
                    <span className="truncate font-medium text-slate-900">{accountSummary.accountName}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-3 py-2">
                    <span>Account Type</span>
                    <span className="font-medium text-slate-900">{accountSummary.accountType}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <InputField
                label="Bill Date"
                type="date"
                data-field="bill_date"
                value={billDate}
                disabled={billApprovedByAdmin}
                onChange={(event) => {
                  setBillDate(event.target.value);
                  setBillDirty(true);
                }}
              />
              <InputField
                label="Bill Due Date"
                type="date"
                data-field="bill_due_date"
                value={billDueDate}
                disabled={billApprovedByAdmin}
                onChange={(event) => {
                  setBillDueDate(event.target.value);
                  setBillDirty(true);
                }}
              />
            </div>

            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-700">Activity Share Line Items</div>
              <div className="w-full overflow-x-auto rounded border border-slate-200">
                <table className="w-full min-w-[740px] table-fixed text-left text-sm text-slate-600">
                  <thead className="border-b border-slate-200 bg-slate-100/90">
                    <tr>
                      <th className={tableHeaderCellClass}>Service</th>
                      <th className={tableHeaderCellClass}>Task</th>
                      <th className={tableHeaderCellClass}>Option</th>
                      <th className={`text-right ${tableHeaderCellClass}`}>Provider Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!billActivityRows.length ? (
                      <tr>
                        <td className="px-3 py-4 text-center text-slate-400" colSpan={4}>
                          No selected activity line items.
                        </td>
                      </tr>
                    ) : (
                      billActivityRows.map((row) => (
                        <tr key={`bill-row-${row.id}`} className="border-b border-slate-100 last:border-b-0">
                          <td className={`${tableBodyCellClass} text-slate-800`}>{row.service || "-"}</td>
                          <td className={`${tableBodyCellClass} text-slate-800`}>{row.task || "-"}</td>
                          <td className={`${tableBodyCellClass} text-slate-800`}>{row.option || "-"}</td>
                          <td className={`${tableBodyCellClass} text-right font-semibold text-slate-900`}>
                            {formatCurrency(row.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="space-y-2 rounded border border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-700">Materials Summary</div>
              <div className="grid grid-cols-1 gap-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Reimburse Total</span>
                  <span className="font-medium">{formatCurrency(materialSummary.reimburse)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Deduct Total</span>
                  <span className="font-medium">{formatCurrency(materialSummary.deduct)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span>Materials Net</span>
                  <span className="font-semibold">{formatCurrency(materialsNetTotal)}</span>
                </div>
              </div>
            </div>

            <Card className="space-y-2 border-slate-200 bg-white p-3">
              <div className="text-sm font-semibold text-slate-700">Bill Totals</div>
              <div className="space-y-2 text-sm text-slate-700">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-medium">{formatCurrency(billSubtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Includes GST</span>
                  <span className="font-medium">{formatCurrency(billGst)}</span>
                </div>
                <div className="flex items-center justify-between border-t-2 border-slate-300 pt-2 text-base font-semibold text-slate-900">
                  <span>Total</span>
                  <span data-field="bill_total">{formatCurrency(billTotal)}</span>
                </div>
                <div className="text-xs text-slate-500">
                  Last bill date: {formatDateDisplay(activeJob?.bill_date || activeJob?.Bill_Date)} | Due:{" "}
                  {formatDateDisplay(activeJob?.bill_due_date || activeJob?.Bill_Due_Date)}
                </div>
                <div
                  className={`text-xs font-semibold ${
                    billApprovedByAdmin ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {billApprovedByAdmin
                    ? billApprovalTimeLabel && billApprovalTimeLabel !== "-"
                      ? `Approved by admin on ${billApprovalTimeLabel}`
                      : "Approved by admin"
                    : "Waiting approval by admin"}
                </div>
              </div>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-[#003882] text-white hover:bg-[#003882]"
                  onClick={handleApproveBill}
                  disabled={isBillSaving || isLoading || billApprovedByAdmin}
                >
                  {isBillSaving ? "Saving..." : billApprovedByAdmin ? "Approved by admin" : "Approve Bill"}
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
      ) : null}
    </section>
  );
}
