import {
  toPromiseLike,
  fetchCalcCount,
  extractFromPayload,
  formatUnixDate,
  toEpochRange,
} from "./dashboardCore.js";
import {
  extractCancellationMessage,
  extractMutationErrorMessage,
  extractStatusFailure,
  isPersistedId,
  normalizeObjectList,
} from "../../job-direct/sdk/utils/sdkResponseUtils.js";

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function getModels(plugin) {
  return {
    dealModel: plugin.switchTo("PeterpmDeal"),
    jobModel: plugin.switchTo("PeterpmJob"),
    spModel: plugin.switchTo("PeterpmServiceProvider"),
  };
}

function calcOffset(page, pageSize) {
  return (page - 1) * pageSize;
}

function firstRecordFromAnyPayload(payload) {
  const records = extractFromPayload(payload);
  return Array.isArray(records) && records.length ? records[0] : null;
}

function extractCreatedRecordId(result, modelKey) {
  const managed = result?.mutations?.[modelKey]?.managedData;
  if (managed && typeof managed === "object") {
    for (const [managedKey, managedValue] of Object.entries(managed)) {
      if (isPersistedId(managedKey)) return String(managedKey);
      const nestedId = managedValue?.id || managedValue?.ID || "";
      if (isPersistedId(nestedId)) return String(nestedId);
    }
  }

  const objects = normalizeObjectList(result);
  for (const item of objects) {
    const pkMap = item?.extensions?.pkMap || item?.pkMap;
    if (!pkMap || typeof pkMap !== "object") continue;
    for (const value of Object.values(pkMap)) {
      if (isPersistedId(value)) return String(value);
    }
  }

  return "";
}

function clientName(contact) {
  if (!contact) return "";
  return [contact.first_name, contact.last_name].filter(Boolean).join(" ").trim();
}

function spName(sp) {
  if (!sp) return "";
  const info = sp.Contact_Information ?? sp;
  return [info.first_name, info.last_name].filter(Boolean).join(" ").trim();
}

// ─── Deal (Inquiry) Filters ───────────────────────────────────────────────────

const ACCOUNT_TYPE_MAP = { Individual: "Contact", Entity: "Company" };

function applyDealFilters(q, f) {
  const like = (s) => `%${s}%`;
  const { startEpoch, endEpoch } = toEpochRange(f.dateFrom, f.dateTo);

  if (Array.isArray(f.statuses) && f.statuses.length) {
    q = q.andWhere("inquiry_status", "in", f.statuses);
  }
  if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
    q = q.andWhere("service_provider_id", "in", f.serviceProviders);
  }
  if (f.accountName) {
    const lv = like(f.accountName);
    q = q.andWhere((sq) => {
      sq.where("Company", (sq2) => sq2.where("name", "like", lv)).orWhere(
        "Primary_Contact",
        (sq2) => {
          sq2.where("first_name", "like", lv).orWhere("last_name", "like", lv);
        }
      );
    });
  }
  if (Array.isArray(f.accountTypes) && f.accountTypes.length) {
    const mapped = f.accountTypes.map((t) => ACCOUNT_TYPE_MAP[t] ?? t);
    q = q.andWhere("account_type", "in", mapped);
  }
  if (f.address) {
    q = q.andWhere("Property", (sq) => {
      sq.where("property_name", "like", like(f.address));
    });
  }
  if (Array.isArray(f.sources) && f.sources.length) {
    q = q.andWhere("inquiry_source", "in", f.sources);
  }
  if (startEpoch != null || endEpoch != null) {
    q = q.andWhere((sq) => {
      if (startEpoch != null) sq.andWhere("created_at", ">=", startEpoch);
      if (endEpoch != null) sq.andWhere("created_at", "<=", endEpoch);
    });
  }
  return q;
}

// ─── Job Shared Filters ───────────────────────────────────────────────────────

function applyCommonJobFilters(q, f, { dateField, statusField } = {}) {
  const like = (s) => `%${s}%`;
  const { startEpoch, endEpoch } = toEpochRange(f.dateFrom, f.dateTo);

  if (statusField && Array.isArray(f.statuses) && f.statuses.length) {
    q = q.andWhere(statusField, "in", f.statuses);
  }
  if (Array.isArray(f.serviceProviders) && f.serviceProviders.length) {
    q = q.andWhere("primary_service_provider_id", "in", f.serviceProviders);
  }
  if (f.quoteNumber) {
    q = q.andWhere("unique_id", "like", like(f.quoteNumber));
  }
  if (f.invoiceNumber) {
    q = q.andWhere("invoice_number", "like", like(f.invoiceNumber));
  }
  if (f.recommendation) {
    q = q.andWhere("admin_recommendation", "like", like(f.recommendation));
  }
  if (f.priceMin !== "" && f.priceMin != null) {
    q = q.andWhere("quote_total", ">=", Number(f.priceMin));
  }
  if (f.priceMax !== "" && f.priceMax != null) {
    q = q.andWhere("quote_total", "<=", Number(f.priceMax));
  }
  if (startEpoch != null || endEpoch != null) {
    q = q.andWhere((sq) => {
      if (startEpoch != null && dateField) sq.andWhere(dateField, ">=", startEpoch);
      if (endEpoch != null && dateField) sq.andWhere(dateField, "<=", endEpoch);
    });
  }
  if (f.address) {
    q = q.andWhere("Property", (sq) => {
      sq.andWhere("property_name", "like", like(f.address));
    });
  }
  if (f.accountName) {
    const lv = like(f.accountName);
    q = q.andWhere((sq) => {
      sq.where("Client_Entity", (sq2) => sq2.where("name", "like", lv)).orWhere(
        "Client_Individual",
        (sq2) => {
          sq2.where("first_name", "like", lv).orWhere("last_name", "like", lv);
        }
      );
    });
  }
  if (Array.isArray(f.accountTypes) && f.accountTypes.length) {
    const mapped = f.accountTypes.map((t) => ACCOUNT_TYPE_MAP[t] ?? t);
    q = q.andWhere("Client_Entity", (sq) => {
      sq.andWhere("type", "in", mapped);
    });
  }
  if (Array.isArray(f.sources) && f.sources.length) {
    q = q.andWhere("Inquiry_Record", (sq) => {
      sq.andWhere("how_did_you_hear", "in", f.sources);
    });
  }
  return q;
}

// ─── Shared Job Includes ──────────────────────────────────────────────────────

function applyJobIncludes(q) {
  return q
    .include("Client_Individual", (sq) =>
      sq.select(["id", "first_name", "last_name", "email", "sms_number", "address_1"])
    )
    .include("Property", (sq) => sq.deSelectAll().select(["id", "property_name"]))
    .include("Primary_Service_Provider", (sq) =>
      sq
        .deSelectAll()
        .select(["id"])
        .include("Contact_Information", (sq2) =>
          sq2.deSelectAll().select(["first_name", "last_name"])
        )
    )
    .include("Client_Entity", (sq) =>
      sq.deSelectAll().select(["id", "name", "type", "account_type"])
    )
    .include("Inquiry_Record", (sq) =>
      sq
        .deSelectAll()
        .select(["id", "unique_id", "inquiry_status", "type", "how_did_you_hear"])
        .include("Service_Inquiry", (sq2) => sq2.deSelectAll().select(["service_name"]))
    );
}

// ─── Row Normalizers ──────────────────────────────────────────────────────────

function normalizeDeal(rec) {
  const accountType = (rec.account_type ?? rec.Account_Type ?? "").trim();
  const isCompany = accountType === "Company";

  const name = isCompany
    ? (rec.Company?.name ?? "")
    : clientName(rec.Primary_Contact);

  const phone = isCompany
    ? (rec.Company?.phone ?? "")
    : (rec.Primary_Contact?.sms_number ?? "");

  const email = isCompany
    ? ""
    : (rec.Primary_Contact?.email ?? "");

  return {
    id: rec.id,
    uid: rec.unique_id ?? rec.Unique_ID ?? "",
    date: formatUnixDate(rec.created_at ?? rec.Date_Added),
    clientName: name,
    phone,
    email,
    address: rec.Property?.property_name ?? "",
    source: rec.inquiry_source ?? rec.how_did_you_hear ?? rec.How_did_you_hear ?? "",
    status: rec.inquiry_status ?? rec.Inquiry_Status ?? "",
    serviceProvider: spName(rec.Service_Provider),
  };
}

function normalizeQuote(rec) {
  return {
    id: rec.id,
    uid: rec.unique_id ?? rec.Unique_ID ?? "",
    date: formatUnixDate(rec.quote_date ?? rec.Quote_Date),
    clientName: clientName(rec.Client_Individual),
    phone: rec.Client_Individual?.sms_number ?? "",
    email: rec.Client_Individual?.email ?? "",
    address: rec.Property?.property_name ?? rec.Client_Individual?.address_1 ?? "",
    quoteNumber: rec.unique_id ?? rec.Unique_ID ?? "",
    amount: rec.quote_total ?? rec.Quote_Total ?? 0,
    status: rec.quote_status ?? rec.Quote_Status ?? "",
  };
}

function normalizeJob(rec) {
  return {
    id: rec.id,
    uid: rec.unique_id ?? rec.Unique_ID ?? "",
    date: formatUnixDate(
      rec.date_started ?? rec.Date_Started ?? rec.date_booked ?? rec.Date_Booked
    ),
    clientName: clientName(rec.Client_Individual),
    phone: rec.Client_Individual?.sms_number ?? "",
    email: rec.Client_Individual?.email ?? "",
    address: rec.Property?.property_name ?? rec.Client_Individual?.address_1 ?? "",
    jobNumber: rec.unique_id ?? rec.Unique_ID ?? "",
    status: rec.job_status ?? rec.Job_Status ?? "",
    serviceProvider: spName(rec.Primary_Service_Provider),
    serviceman: spName(rec.Primary_Service_Provider),
  };
}

function normalizePayment(rec) {
  const isPaid = !!(rec.bill_time_paid ?? rec.Bill_Time_Paid);
  const total = rec.invoice_total ?? rec.Invoice_Total ?? 0;
  return {
    id: rec.id,
    uid: rec.unique_id ?? rec.Unique_ID ?? "",
    date: formatUnixDate(rec.invoice_date ?? rec.Invoice_Date),
    clientName: clientName(rec.Client_Individual),
    phone: rec.Client_Individual?.sms_number ?? "",
    email: rec.Client_Individual?.email ?? "",
    address: rec.Property?.property_name ?? rec.Client_Individual?.address_1 ?? "",
    invoiceNumber: rec.invoice_number ?? rec.Invoice_Number ?? "",
    amount: total,
    paid: isPaid ? total : 0,
    balance: isPaid ? 0 : total,
    status: rec.xero_invoice_status ?? rec.Xero_Invoice_Status ?? "",
  };
}

function normalizeActiveJob(rec) {
  return {
    id: rec.id,
    uid: rec.unique_id ?? rec.Unique_ID ?? "",
    scheduledDate: formatUnixDate(rec.date_booked ?? rec.Date_Booked),
    clientName: clientName(rec.Client_Individual),
    phone: rec.Client_Individual?.sms_number ?? "",
    email: rec.Client_Individual?.email ?? "",
    address: rec.Property?.property_name ?? rec.Client_Individual?.address_1 ?? "",
    status: rec.job_status ?? rec.Job_Status ?? "",
    serviceman: spName(rec.Primary_Service_Provider),
    invoiceNumber: rec.invoice_number ?? "",
  };
}

// ─── Query Builders (for subscription use) ───────────────────────────────────
// Each returns { query, normalize } where:
//   query    — a .noDestroy() query ready for .subscribe() or .fetchDirect()
//   normalize — a function that maps a raw record to a display row

export function buildDealsQuery(plugin, filters = {}, page = 1, pageSize = 25, sortOrder = "desc") {
  const f = filters;
  const { dealModel } = getModels(plugin);

  let q = dealModel
    .query()
    .deSelectAll()
    .select([
      "id",
      "unique_id",
      "inquiry_status",
      "created_at",
      "account_type",
      "inquiry_source",
    ])
    .include("Company", (sq) => sq.deSelectAll().select(["id", "name", "phone"]))
    .include("Primary_Contact", (sq) =>
      sq.deSelectAll().select(["id", "first_name", "last_name", "email", "sms_number"])
    )
    .include("Property", (sq) => sq.deSelectAll().select(["id", "property_name"]))
    .include("Service_Provider", (sq) =>
      sq
        .deSelectAll()
        .select(["id"])
        .include("Contact_Information", (sq2) =>
          sq2.deSelectAll().select(["first_name", "last_name"])
        )
    )
    .orderBy("created_at", sortOrder)
    .limit(pageSize)
    .offset(calcOffset(page, pageSize));

  // Base conditions — always exclude inactive/terminal statuses before any user filter
  q = q
    .andWhere("inquiry_status", "neq", "Cancelled")
    .andWhere("inquiry_status", "neq", "Expired")
    .andWhere("inquiry_status", "neq", "")
    .andWhereNot("inquiry_status", "isNull");

  q = applyDealFilters(q, f);
  return { query: q.noDestroy(), normalize: normalizeDeal };
}

export function buildQuotesQuery(plugin, filters = {}, page = 1, pageSize = 25) {
  const f = filters;
  const { jobModel } = getModels(plugin);

  let q = jobModel
    .query()
    .deSelectAll()
    .select([
      "id",
      "Unique_ID",
      "Quote_Status",
      "Quote_Total",
      "Quote_Date",
      "Date_Quoted_Accepted",
      "Account_Type",
    ]);
  q = applyCommonJobFilters(q, f, { dateField: "quote_date", statusField: "quote_status" });
  q = q.andWhereNot("quote_status", "isNull");
  q = applyJobIncludes(q);
  q = q.orderBy("id", "desc").limit(pageSize).offset(calcOffset(page, pageSize));
  return { query: q.noDestroy(), normalize: normalizeQuote };
}

export function buildJobsQuery(plugin, filters = {}, page = 1, pageSize = 25) {
  const f = filters;
  const { jobModel } = getModels(plugin);

  let q = jobModel
    .query()
    .deSelectAll()
    .select([
      "id",
      "Unique_ID",
      "Date_Started",
      "Date_Booked",
      "Job_Status",
      "Job_Total",
      "invoice_number",
      "Account_Type",
    ]);
  q = applyCommonJobFilters(q, f, { dateField: "date_scheduled", statusField: "job_status" });
  q = q.andWhereNot("job_status", "isNull");
  q = applyJobIncludes(q);
  q = q.orderBy("id", "desc").limit(pageSize).offset(calcOffset(page, pageSize));
  return { query: q.noDestroy(), normalize: normalizeJob };
}

export function buildPaymentsQuery(plugin, filters = {}, page = 1, pageSize = 25) {
  const f = filters;
  const { jobModel } = getModels(plugin);

  let q = jobModel
    .query()
    .deSelectAll()
    .select([
      "id",
      "Unique_ID",
      "Invoice_Number",
      "Invoice_Date",
      "Invoice_Total",
      "Bill_Time_Paid",
      "Xero_Invoice_Status",
      "Account_Type",
    ]);
  q = applyCommonJobFilters(q, f, { dateField: "invoice_date", statusField: "payment_status" });
  q = q.andWhereNot("xero_invoice_status", "isNull");
  q = applyJobIncludes(q);
  q = q.orderBy("id", "desc").limit(pageSize).offset(calcOffset(page, pageSize));
  return { query: q.noDestroy(), normalize: normalizePayment };
}

export function buildActiveJobsQuery(plugin, filters = {}, page = 1, pageSize = 25) {
  const f = filters;
  const { jobModel } = getModels(plugin);
  const activeStatuses =
    Array.isArray(f.statuses) && f.statuses.length ? f.statuses : ["Booked", "In Progress"];

  let q = jobModel
    .query()
    .deSelectAll()
    .select([
      "id",
      "Unique_ID",
      "date_started",
      "date_completed",
      "job_status",
      "Date_Booked",
      "invoice_number",
      "Account_Type",
    ]);
  q = q.andWhere("job_status", "in", activeStatuses);
  q = applyCommonJobFilters(q, f, { dateField: "Date_Booked" });
  q = applyJobIncludes(q);
  q = q.orderBy("id", "desc").limit(pageSize).offset(calcOffset(page, pageSize));
  return { query: q.noDestroy(), normalize: normalizeActiveJob };
}

// ─── fetchTabCounts — runs calc queries on page load ─────────────────────────
// Uses countDistinct calc queries (no tab-click required, no filter conditions yet).

export async function fetchTabCounts({ plugin } = {}) {
  if (!plugin) {
    return { inquiry: 0, quote: 0, jobs: 0, payment: 0, "active-jobs": 0, "urgent-calls": 0 };
  }

  const { dealModel, jobModel } = getModels(plugin);

  // Build calc queries using the SDK's fromGraphql helper.
  // Deal count applies the same base exclusions as the subscription query.
  const dealCountQ = dealModel
    .query()
    .fromGraphql(
      `query calcDeals { calcDeals(query: [{ whereGroup: [
        { where:   { inquiry_status: "Expired"   _OPERATOR_: neq } }
        { orWhere: { inquiry_status: "Cancelled" _OPERATOR_: neq } }
        { orWhere: { inquiry_status: ""          _OPERATOR_: neq } }
      ]}]) { totalCount: countDistinct(args: [{ field: ["id"] }]) } }`
    )
    .noDestroy();

  const jobCountQ = jobModel
    .query()
    .fromGraphql(
      "query calcJobs { calcJobs { totalCount: countDistinct(args: [{ field: [\"id\"] }]) } }"
    )
    .noDestroy();

  const [dealResult, jobResult] = await Promise.allSettled([
    fetchCalcCount(dealCountQ),
    fetchCalcCount(jobCountQ),
  ]);

  if (dealResult.status === "rejected") console.warn("[fetchTabCounts] deal count failed:", dealResult.reason);
  if (jobResult.status === "rejected") console.warn("[fetchTabCounts] job count failed:", jobResult.reason);

  const dealCount = dealResult.status === "fulfilled" ? dealResult.value : 0;
  const jobCount = jobResult.status === "fulfilled" ? jobResult.value : 0;

  return {
    inquiry: dealCount,
    quote: jobCount,
    jobs: jobCount,
    payment: jobCount,
    "active-jobs": jobCount,
    "urgent-calls": 0,
  };
}

// ─── fetchServiceProviders ────────────────────────────────────────────────────

export async function fetchServiceProviders({ plugin } = {}) {
  if (!plugin) return [];
  try {
    const { spModel } = getModels(plugin);
    const q = spModel
      .query()
      .deSelectAll()
      .select(["account_name", "id"])
      .include("Contact_Information", (sq) =>
        sq.deSelectAll().select(["first_name", "last_name"])
      )
      .limit(100)
      .noDestroy();
    q.getOrInitQueryCalc?.();
    const res = await toPromiseLike(q.fetchDirect());
    const records = Array.isArray(res?.resp) ? res.resp : [];
    return records
      .map((rec) => {
        const id = String(rec.id ?? rec.ID ?? "");
        // Contact_Information may be a nested object or flattened by the SDK
        const firstName =
          rec.Contact_Information?.first_name ??
          rec.Contact_Information_First_Name ??
          "";
        const lastName =
          rec.Contact_Information?.last_name ??
          rec.Contact_Information_Last_Name ??
          "";
        const contactName = [firstName, lastName].filter(Boolean).join(" ").trim();
        const name = contactName || rec.Account_Name || rec.account_name || "";
        return { id, name };
      })
      .filter((sp) => sp.id && sp.name)
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.error("[dashboardSdk] fetchServiceProviders failed", err);
    return [];
  }
}

// ─── fetchInquiryCalendarData ─────────────────────────────────────────────────
// Returns a map of { "YYYY-MM-DD": count } for the next `days` days starting
// from today, based on the `created_at` field of deals (inquiry creation date).

export async function fetchInquiryCalendarData({ plugin, days = 14 } = {}) {
  if (!plugin) return {};
  try {
    const { dealModel } = getModels(plugin);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const startEpoch = Math.floor(today.getTime() / 1000);

    const endDate = new Date(today);
    endDate.setUTCDate(endDate.getUTCDate() + days - 1);
    endDate.setUTCHours(23, 59, 59, 999);
    const endEpoch = Math.floor(endDate.getTime() / 1000);

    const q = dealModel
      .query()
      .deSelectAll()
      .select(["id", "created_at"])
      .andWhere("created_at", ">=", startEpoch)
      .andWhere("created_at", "<=", endEpoch)
      .noDestroy();

    const res = await toPromiseLike(q.fetchDirect());
    const records = Array.isArray(res?.resp) ? res.resp : [];

    const counts = {};
    for (const rec of records) {
      const ts = rec.created_at ?? rec.Created_At;
      if (!ts) continue;
      const date = new Date(Number(ts) * 1000);
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, "0");
      const d = String(date.getUTCDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      counts[iso] = (counts[iso] ?? 0) + 1;
    }
    return counts;
  } catch (err) {
    console.error("[dashboardSdk] fetchInquiryCalendarData failed", err);
    return {};
  }
}

// ─── Stubs ────────────────────────────────────────────────────────────────────

export async function fetchNotifications(_args = {}) {
  return [];
}

export async function fetchCalendarData(_args = {}) {
  return {};
}

export async function createTask(_args = {}) {
  return null;
}

function normalizeMutationError(result, fallbackMessage) {
  const failure = extractStatusFailure(result);
  if (failure) {
    const message = extractMutationErrorMessage(failure.statusMessage);
    if (message) return message;
  }
  return String(fallbackMessage || "Operation failed.");
}

export async function createJobRecord({ plugin, payload = null } = {}) {
  if (!plugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const { jobModel } = getModels(plugin);
  const mutation = await jobModel.mutation();
  mutation.createOne(payload || {});
  const result = await mutation.execute(true).toPromise();

  if (!result || result?.isCancelling) {
    throw new Error(extractCancellationMessage(result, "Job create was cancelled."));
  }
  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to create job."
    );
  }

  const createdId = extractCreatedRecordId(result, "PeterpmJob");
  if (!isPersistedId(createdId)) {
    throw new Error(normalizeMutationError(result, "Job create did not return an ID."));
  }

  const detailQuery = jobModel
    .query()
    .where("id", createdId)
    .deSelectAll()
    .select(["id", "unique_id", "job_status"])
    .noDestroy();
  detailQuery.getOrInitQueryCalc?.();
  const detailResult = await toPromiseLike(detailQuery.fetchDirect());
  const record = firstRecordFromAnyPayload(detailResult);
  if (!record) {
    throw new Error("Job created but failed to load job details.");
  }

  const id = String(record?.id ?? record?.ID ?? createdId).trim();
  const uniqueId = String(record?.unique_id ?? record?.Unique_ID ?? "").trim();
  const jobStatus = String(record?.job_status ?? record?.Job_Status ?? "").trim();

  return {
    id,
    unique_id: uniqueId,
    job_status: jobStatus,
  };
}

export async function cancelInquiryById({ plugin, dealId } = {}) {
  if (!plugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedDealId = String(dealId ?? "").trim();
  if (!normalizedDealId) {
    throw new Error("Inquiry ID is missing.");
  }

  const { dealModel } = getModels(plugin);
  const mutation = await dealModel.mutation();
  mutation.update((query) =>
    query.where("id", normalizedDealId).set({
      inquiry_status: "Cancelled",
    })
  );
  const result = await mutation.execute(true).toPromise();

  if (!result || result?.isCancelling) {
    throw new Error(extractCancellationMessage(result, "Deal update was cancelled."));
  }
  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to cancel inquiry."
    );
  }

  const verifyQuery = dealModel
    .query()
    .where("id", normalizedDealId)
    .deSelectAll()
    .select(["id", "inquiry_status"])
    .noDestroy();
  verifyQuery.getOrInitQueryCalc?.();
  const verifyResult = await toPromiseLike(verifyQuery.fetchDirect());
  const record = firstRecordFromAnyPayload(verifyResult);
  if (!record) {
    throw new Error("Inquiry update succeeded but verification failed.");
  }

  const nextStatus = String(record?.inquiry_status ?? record?.Inquiry_Status ?? "").trim();
  if (nextStatus.toLowerCase() !== "cancelled") {
    throw new Error("Inquiry status update was not applied.");
  }

  return {
    inquiry_status: nextStatus,
  };
}

export async function deleteRecord(_args = {}) {
  return null;
}
