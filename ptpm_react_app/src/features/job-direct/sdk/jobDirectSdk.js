import { VITAL_STATS_CONFIG } from "./vitalStatsConfig.js";

function extractArrayFromDataObject(dataObject) {
  if (!dataObject || typeof dataObject !== "object") return [];
  for (const value of Object.values(dataObject)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function extractFirstRecord(payload) {
  const records = extractRecords(payload);
  return records[0] || null;
}

function extractRecords(payload) {
  if (!payload) return [];
  if (Array.isArray(payload?.resp)) return payload.resp;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.data)) return payload.data;
  if (payload?.data && typeof payload.data === "object") {
    const fromData = extractArrayFromDataObject(payload.data);
    if (fromData.length) return fromData;
  }
  if (payload?.payload?.data && typeof payload.payload.data === "object") {
    const fromNestedData = extractArrayFromDataObject(payload.payload.data);
    if (fromNestedData.length) return fromNestedData;
  }
  if (Array.isArray(payload)) return payload;
  if (payload?.resp && typeof payload.resp === "object") return [payload.resp];
  if (payload && typeof payload === "object") return [payload];
  return [];
}

function isPersistedId(value) {
  return /^\d+$/.test(String(value || "").trim());
}

function normalizeObjectList(input) {
  const queue = [input];
  const seen = new Set();
  const objects = [];

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);
    objects.push(current);

    if (Array.isArray(current)) {
      current.forEach((item) => queue.push(item));
      continue;
    }

    if (current.payload && typeof current.payload === "object") queue.push(current.payload);
    if (current.resp && typeof current.resp === "object") queue.push(current.resp);
    if (current.data && typeof current.data === "object") queue.push(current.data);
  }

  return objects;
}

function sanitizeUploadPath(path = "") {
  return String(path || "").trim().replace(/^[\\/]+|[\\/]+$/g, "");
}

function extractStatusFailure(result) {
  const objects = normalizeObjectList(result);
  for (const item of objects) {
    const statusCode = Number(item?.statusCode || item?.extensions?.statusCode || 0);
    if (Number.isFinite(statusCode) && statusCode >= 400) {
      const statusMessage =
        item?.extensions?.statusMessage || item?.statusMessage || item?.error || "";
      return {
        statusCode,
        statusMessage,
      };
    }
  }
  return null;
}

function findMutationData(result, operationName) {
  const objects = normalizeObjectList(result);
  for (const item of objects) {
    const record = item?.data?.[operationName];
    if (record === null) {
      return null;
    }
    if (Array.isArray(record)) {
      if (!record.length) return [];
      const firstObject = record.find((entry) => entry && typeof entry === "object");
      return firstObject || record;
    }
    if (record && typeof record === "object") {
      return record;
    }
  }
  return undefined;
}

function findMutationDataByMatcher(result, matcher) {
  const objects = normalizeObjectList(result);
  for (const item of objects) {
    const data = item?.data;
    if (!data || typeof data !== "object") continue;
    for (const [key, value] of Object.entries(data)) {
      if (!matcher(key)) continue;
      if (value === null) return null;
      if (Array.isArray(value)) {
        if (!value.length) return [];
        const firstObject = value.find((entry) => entry && typeof entry === "object");
        return firstObject || value;
      }
      if (value && typeof value === "object") return value;
    }
  }
  return undefined;
}

function extractMutationErrorMessage(rawMessage = "") {
  const message = String(rawMessage || "").trim();
  if (!message) return "";

  const lower = message.toLowerCase();
  if (lower.includes("field email is not a valid email")) {
    return "Email is not valid. Please enter a valid email address.";
  }

  const ontraportPrefix = "ontraport response:";
  const index = lower.indexOf(ontraportPrefix);
  if (index >= 0) {
    const trimmed = message.slice(index + ontraportPrefix.length).trim();
    return trimmed || message;
  }

  return message;
}

function extractCreatedRecordId(payload, key) {
  const managed = payload?.mutations?.[key]?.managedData;
  if (managed && typeof managed === "object") {
    for (const [managedKey, managedValue] of Object.entries(managed)) {
      if (isPersistedId(managedKey)) return String(managedKey);
      const nestedId = managedValue?.id || managedValue?.ID || managedValue?.Contact_ID;
      if (isPersistedId(nestedId)) return String(nestedId);
    }
  }
  const pkMap = payload?.extensions?.pkMap || payload?.pkMap;
  if (pkMap && typeof pkMap === "object") {
    for (const value of Object.values(pkMap)) {
      if (isPersistedId(value)) return String(value);
    }
  }
  const respId = payload?.resp?.id;
  if (isPersistedId(respId)) {
    return String(respId);
  }

  const objects = normalizeObjectList(payload);
  for (const item of objects) {
    const itemPkMap = item?.extensions?.pkMap || item?.pkMap;
    if (itemPkMap && typeof itemPkMap === "object") {
      for (const value of Object.values(itemPkMap)) {
        if (isPersistedId(value)) return String(value);
      }
    }
  }
  return "";
}

function resolvePlugin(plugin) {
  return (
    plugin ||
    window.getVitalStatsPlugin?.() ||
    window.__ptpmVitalStatsPlugin ||
    window.tempPlugin ||
    window.plugin ||
    null
  );
}

function toPromiseLike(result) {
  if (!result) return Promise.resolve(result);

  if (typeof result.then === "function") {
    return result;
  }

  if (typeof result.toPromise === "function") {
    return result.toPromise();
  }

  if (typeof result.subscribe === "function") {
    let subscription = null;
    const promise = new Promise((resolve, reject) => {
      let settled = false;
      subscription = result.subscribe({
        next: (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
          subscription?.unsubscribe?.();
        },
        error: (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        }
      });
    });
    promise.cancel = () => subscription?.unsubscribe?.();
    return promise;
  }

  return Promise.resolve(result);
}

async function fetchDirectWithTimeout(query, options = null, timeoutMs = 10000) {
  const request = options ? query.fetchDirect(options) : query.fetchDirect();
  const requestPromise = toPromiseLike(request);

  let timeoutId = null;
  let didTimeout = false;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      didTimeout = true;
      reject(new Error(`Query request timed out after ${timeoutMs}ms.`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([requestPromise, timeoutPromise]);
  } catch (error) {
    if (didTimeout && typeof requestPromise?.cancel === "function") {
      requestPromise.cancel();
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

function getFirstNonEmptyText(...values) {
  for (const value of values) {
    const text = String(value || "").trim();
    if (text) return text;
  }
  return "";
}

function normalizeJobRecord(rawJob) {
  if (!rawJob || typeof rawJob !== "object") return rawJob;

  const serviceProvider = rawJob?.Primary_Service_Provider;
  const serviceProviderContact = serviceProvider?.Contact_Information;

  const providerId = getFirstNonEmptyText(
    rawJob?.primary_service_provider_id,
    rawJob?.Primary_Service_Provider_ID,
    serviceProvider?.id,
    serviceProvider?.ID
  );
  const contactFirstName = getFirstNonEmptyText(
    rawJob?.Primary_Service_Provider_Contact_First_Name,
    rawJob?.contact_first_name,
    serviceProviderContact?.first_name,
    serviceProviderContact?.First_Name
  );
  const contactLastName = getFirstNonEmptyText(
    rawJob?.Primary_Service_Provider_Contact_Last_Name,
    rawJob?.contact_last_name,
    serviceProviderContact?.last_name,
    serviceProviderContact?.Last_Name
  );
  const contactEmail = getFirstNonEmptyText(
    rawJob?.Primary_Service_Provider_Contact_Email,
    rawJob?.contact_email,
    serviceProviderContact?.email,
    serviceProviderContact?.Email
  );

  const next = {
    ...rawJob,
    Primary_Service_Provider_ID: getFirstNonEmptyText(
      rawJob?.Primary_Service_Provider_ID,
      providerId
    ),
    Primary_Service_Provider_Contact_First_Name: getFirstNonEmptyText(
      rawJob?.Primary_Service_Provider_Contact_First_Name,
      contactFirstName
    ),
    Primary_Service_Provider_Contact_Last_Name: getFirstNonEmptyText(
      rawJob?.Primary_Service_Provider_Contact_Last_Name,
      contactLastName
    ),
    Primary_Service_Provider_Contact_Email: getFirstNonEmptyText(
      rawJob?.Primary_Service_Provider_Contact_Email,
      contactEmail
    ),
  };

  if (!next.primary_service_provider_id && providerId) {
    next.primary_service_provider_id = providerId;
  }

  if (!next.Primary_Service_Provider && providerId) {
    next.Primary_Service_Provider = {
      id: providerId,
      Contact_Information:
        contactFirstName || contactLastName || contactEmail
          ? {
              first_name: contactFirstName,
              last_name: contactLastName,
              email: contactEmail,
            }
          : null,
    };
  }

  return next;
}

async function fetchFirstByField(jobModel, field, value) {
  const query = jobModel
    .query()
    .where(field, value)
    .deSelectAll()
    .select([
      "id",
      "unique_id",
      "job_status",
      "job_type",
      "account_type",
      "contact_type",
      "client_individual_id",
      "client_entity_id",
      "inquiry_record_id",
      "contact_id",
      "priority",
      "property_id",
      "primary_service_provider_id",
      "date_started",
      "date_booked",
      "date_job_required_by",
      "payment_status",
      "job_total",
    ])
    .include("Client_Individual", (q) =>
      q.deSelectAll().select(["id", "first_name", "last_name", "email", "sms_number"])
    )
    .include("Client_Entity", (q) =>
      q
        .deSelectAll()
        .select(["id", "name", "account_type"])
        .include("Primary_Person", (personQuery) =>
          personQuery
            .deSelectAll()
            .select(["id", "first_name", "last_name", "email", "sms_number", "office_phone"])
        )
    )
    .include("Inquiry_Record", (q) =>
      q.deSelectAll().select(["id", "unique_id", "deal_name"])
    )
    .include("Primary_Service_Provider", (providerQuery) =>
      providerQuery
        .deSelectAll()
        .select(["id", "unique_id", "status"])
        .include("Contact_Information", (contactQuery) =>
          contactQuery.deSelectAll().select(["first_name", "last_name", "email"])
        )
    )
    .include("Property", (q) =>
      q.deSelectAll().select([
        "id",
        "unique_id",
        "property_name",
        "lot_number",
        "unit_number",
        "address_1",
        "address_2",
        "address",
        "city",
        "suburb_town",
        "state",
        "postal_code",
        "zip_code",
        "country",
        "property_type",
        "building_type",
        "building_type_other",
        "foundation_type",
        "bedrooms",
        "manhole",
        "stories",
        "building_age",
        "building_features",
        "building_features_options_as_text",
      ])
    )
    .noDestroy();

  query.getOrInitQueryCalc?.();
  const result = await query.fetchDirect().toPromise();
  return normalizeJobRecord(extractFirstRecord(result));
}

export async function fetchJobDirectDataByUid({ jobUid, plugin } = {}) {
  const normalizedUid = String(jobUid || "").trim();
  if (!normalizedUid) return null;

  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin) {
    console.warn("[JobDirect] SDK plugin not found on window. Job fetch skipped.");
    return null;
  }

  const jobModel = resolvedPlugin.switchTo?.("PeterpmJob");
  if (!jobModel) return null;

  try {
    const byUniqueId = await fetchFirstByField(jobModel, "unique_id", normalizedUid);
    if (byUniqueId) return byUniqueId;

    if (/^\d+$/.test(normalizedUid)) {
      const byId = await fetchFirstByField(jobModel, "id", Number.parseInt(normalizedUid, 10));
      if (byId) return byId;
    }
  } catch (error) {
    console.error("[JobDirect] Failed to fetch job by jobuid", normalizedUid, error);
  }

  return null;
}

export async function fetchContactsForSearch({ plugin } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  try {
    const query = resolvedPlugin
      .switchTo("PeterpmContact")
      .query()
      .deSelectAll()
      .select(["id", "first_name", "last_name", "email", "sms_number", "office_phone"])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    const response = await query.fetchDirect().toPromise();
    return extractRecords(response);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch contact search data", error);
    return [];
  }
}

export async function fetchCompaniesForSearch({ plugin } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  try {
    const query = resolvedPlugin
      .switchTo("PeterpmCompany")
      .query()
      .deSelectAll()
      .select(["id", "account_type", "name"])
      .include("Primary_Person", (personQuery) =>
        personQuery
          .deSelectAll()
          .select(["id", "first_name", "last_name", "email", "sms_number", "office_phone"])
      )
      .noDestroy();
    query.getOrInitQueryCalc?.();
    const response = await query.fetchDirect().toPromise();
    return extractRecords(response);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch company search data", error);
    return [];
  }
}

export async function fetchPropertiesForSearch({ plugin } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  try {
    const query = resolvedPlugin
      .switchTo("PeterpmProperty")
      .query()
      .deSelectAll()
      .select([
        "id",
        "unique_id",
        "property_name",
        "lot_number",
        "unit_number",
        "address_1",
        "address_2",
        "address",
        "city",
        "suburb_town",
        "state",
        "postal_code",
        "zip_code",
        "country",
        "property_type",
        "building_type",
        "building_type_other",
        "foundation_type",
        "bedrooms",
        "manhole",
        "stories",
        "building_age",
        "building_features",
        "building_features_options_as_text",
      ]);

    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    return extractRecords(response);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch property search data", error);
    return [];
  }
}

function normalizeServiceProviderRecord(rawProvider = {}) {
  const firstName = String(
    rawProvider?.contact_information_first_name ||
      rawProvider?.Contact_Information_First_Name ||
      rawProvider?.Contact_Information?.first_name ||
      rawProvider?.Contact_Information?.First_Name ||
      ""
  ).trim();
  const lastName = String(
    rawProvider?.contact_information_last_name ||
      rawProvider?.Contact_Information_Last_Name ||
      rawProvider?.Contact_Information?.last_name ||
      rawProvider?.Contact_Information?.Last_Name ||
      ""
  ).trim();

  return {
    id: String(rawProvider?.id || rawProvider?.ID || "").trim(),
    unique_id: String(rawProvider?.unique_id || rawProvider?.Unique_ID || "").trim(),
    type: String(rawProvider?.type || rawProvider?.Type || "").trim(),
    status: String(rawProvider?.status || rawProvider?.Status || "").trim(),
    first_name: firstName,
    last_name: lastName,
    email: String(
      rawProvider?.contact_information_email ||
        rawProvider?.Contact_Information_Email ||
        rawProvider?.Contact_Information?.email ||
        rawProvider?.Contact_Information?.Email ||
        ""
    ).trim(),
    sms_number: String(
      rawProvider?.contact_information_sms_number ||
        rawProvider?.Contact_Information_SMS_Number ||
        rawProvider?.Contact_Information?.sms_number ||
        rawProvider?.Contact_Information?.SMS_Number ||
        ""
    ).trim(),
    profile_image: String(
      rawProvider?.contact_information_profile_image ||
        rawProvider?.Contact_Information_Profile_Image ||
        rawProvider?.Contact_Information?.profile_image ||
        rawProvider?.Contact_Information?.Profile_Image ||
        ""
    ).trim(),
  };
}

function isActiveAdminServiceProvider(record = {}) {
  const type = String(record?.type || "").trim().toLowerCase();
  const status = String(record?.status || "").trim().toLowerCase();
  return type === "service provider" && status === "active";
}

export async function fetchServiceProvidersForSearch({ plugin } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  const modelName = "PeterpmServiceProvider";

  try {
    const customQuery = resolvedPlugin
      .switchTo(modelName)
      .query()
      .fromGraphql(`
        query calcServiceProviders {
          calcServiceProviders(
            query: [
              { where: { type: "Service Provider" } }
              { andWhere: { status: "Active" } }
            ]
          ) {
            ID: field(arg: ["id"])
            Unique_ID: field(arg: ["unique_id"])
            Type: field(arg: ["type"])
            Status: field(arg: ["status"])
            Contact_Information_First_Name: field(arg: ["Contact_Information", "first_name"])
            Contact_Information_Last_Name: field(arg: ["Contact_Information", "last_name"])
            Contact_Information_Email: field(arg: ["Contact_Information", "email"])
            Contact_Information_SMS_Number: field(arg: ["Contact_Information", "sms_number"])
            Contact_Information_Profile_Image: field(arg: ["Contact_Information", "profile_image"])
          }
        }
      `);
    const response = await fetchDirectWithTimeout(customQuery);
    const records = extractRecords(response)
      .map((record) => normalizeServiceProviderRecord(record))
      .filter((record) => record.id)
      .filter((record) => isActiveAdminServiceProvider(record));
    if (records.length) return records;
  } catch (error) {
    console.warn("[JobDirect] Custom service provider query failed, using include fallback", error);
  }

  try {
    const query = resolvedPlugin
      .switchTo(modelName)
      .query()
      .where("type", "Service Provider")
      .andWhere("status", "Active")
      .deSelectAll()
      .select(["id", "unique_id", "type", "status"])
      .include("Contact_Information", (contactQuery) =>
        contactQuery
          .deSelectAll()
          .select(["first_name", "last_name", "email", "sms_number", "profile_image"])
      )
      .noDestroy();

    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    return extractRecords(response)
      .map((record) => normalizeServiceProviderRecord(record))
      .filter((record) => record.id)
      .filter((record) => isActiveAdminServiceProvider(record));
  } catch (error) {
    console.error("[JobDirect] Failed to fetch service providers", error);
    return [];
  }
}

function parseUploadFileObject(raw = null) {
  if (!raw) return null;
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const parsed = parseUploadFileObject(item);
      if (parsed) return parsed;
    }
    return null;
  }
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        return parseUploadFileObject(JSON.parse(trimmed));
      } catch {
        return null;
      }
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return { link: trimmed };
    }
    return null;
  }
  if (typeof raw === "object") {
    if (raw.File) {
      const nested = parseUploadFileObject(raw.File);
      if (nested) return nested;
    }
    const link = raw.link || raw.url || raw.path || raw.src || "";
    if (!link) return null;
    return {
      link,
      name: raw.name || raw.filename || "",
      size: raw.size ?? "",
      type: raw.type || raw.mime || "",
      s3_id: raw.s3_id || raw.s3Id || "",
    };
  }
  return null;
}

function extractFileNameFromUrl(url = "") {
  const value = String(url || "").trim();
  if (!value) return "";
  try {
    const clean = value.split("?")[0];
    const parts = clean.split("/");
    return decodeURIComponent(parts[parts.length - 1] || "");
  } catch {
    return "";
  }
}

function isImageUpload(fileType = "", fileName = "", uploadType = "") {
  if (/photo/i.test(String(uploadType || ""))) return true;
  if (/^image\//i.test(String(fileType || "").trim())) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg|heic|heif|avif)$/i.test(String(fileName || "").trim());
}

function normalizeUploadRecord(rawUpload = {}) {
  const id = String(rawUpload?.id || rawUpload?.ID || "").trim();
  const uploadType = String(rawUpload?.type || rawUpload?.Type || "").trim();
  const photoUpload = String(rawUpload?.photo_upload || rawUpload?.Photo_Upload || "").trim();
  const fileUploadObj = parseUploadFileObject(rawUpload?.file_upload || rawUpload?.File_Upload);
  const fileUploadUrl = String(fileUploadObj?.link || fileUploadObj?.url || "").trim();
  const url = photoUpload || fileUploadUrl;

  const explicitFileName = String(
    rawUpload?.file_name ||
      rawUpload?.File_Name ||
      rawUpload?.photo_name ||
      rawUpload?.Photo_Name ||
      fileUploadObj?.name ||
      ""
  ).trim();
  const derivedFileName = explicitFileName || extractFileNameFromUrl(url) || "Upload";
  const mime = String(fileUploadObj?.type || "").trim();
  const isPhoto = isImageUpload(mime, derivedFileName, uploadType) || Boolean(photoUpload);

  return {
    id,
    type: uploadType || (isPhoto ? "Photo" : "File"),
    photo_upload: photoUpload,
    file_upload: fileUploadObj,
    url,
    name: derivedFileName,
    file_type: mime,
    created_at: rawUpload?.created_at || rawUpload?.Created_At || "",
    property_name_id: String(
      rawUpload?.property_name_id || rawUpload?.Property_Name_ID || ""
    ).trim(),
  };
}

async function requestSignedUpload({ file, uploadPath = "uploads" } = {}) {
  const apiKey = String(VITAL_STATS_CONFIG.apiKey || "").trim();
  const slug = String(VITAL_STATS_CONFIG.slug || "").trim().toLowerCase();
  const uploadEndpoint = String(
    import.meta.env.VITE_VITALSTATS_UPLOAD_ENDPOINT || (slug ? `https://${slug}.vitalstats.app/api/v1/rest/upload` : "")
  ).trim();

  if (!apiKey || !uploadEndpoint) {
    throw new Error("Upload endpoint config is missing.");
  }

  const safePath = sanitizeUploadPath(uploadPath || "uploads");
  const baseName = String(file?.name || "upload").trim() || "upload";
  const scopedName = safePath ? `${safePath}/${baseName}` : baseName;

  const response = await fetch(uploadEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Api-Key": apiKey,
    },
    body: JSON.stringify([
      {
        type: file?.type || "application/octet-stream",
        name: scopedName,
        generateName: true,
      },
    ]),
  });

  if (!response.ok) {
    throw new Error("Unable to request upload URL.");
  }

  const payload = await response.json().catch(() => null);
  const result = Array.isArray(payload) ? payload[0] : payload;
  if (Number(result?.statusCode || 200) >= 400) {
    throw new Error("Upload endpoint rejected the request.");
  }

  const data = result?.data || result || {};
  if (!data?.uploadUrl || !data?.url) {
    throw new Error("Invalid upload response.");
  }
  return data;
}

async function uploadToSignedUrl({ uploadUrl, file } = {}) {
  const response = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file?.type || "application/octet-stream",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to upload file.");
  }
}

async function fetchUploadsByField({
  plugin,
  fieldName,
  variableName,
  variableType,
  idValue,
  fetchErrorLabel = "uploads",
} = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  const normalizedId = normalizeIdentifier(idValue);
  if (!normalizedId) return [];

  const uploadModel = resolvedPlugin.switchTo("PeterpmUpload");
  if (!uploadModel?.query) return [];

  try {
    const customQuery = uploadModel.query().fromGraphql(`
      query calcUploads($${variableName}: ${variableType}!) {
        calcUploads(query: [{ where: { ${fieldName}: $${variableName} } }]) {
          ID: field(arg: ["id"])
          File_Upload: field(arg: ["file_upload"])
          Type: field(arg: ["type"])
          Photo_Upload: field(arg: ["photo_upload"])
          File_Name: field(arg: ["file_name"])
          Photo_Name: field(arg: ["photo_name"])
          Created_At: field(arg: ["created_at"])
          Property_Name_ID: field(arg: ["property_name_id"])
          Job_ID: field(arg: ["job_id"])
        }
      }
    `);
    const response = await fetchDirectWithTimeout(customQuery, {
      variables: { [variableName]: normalizedId },
    });
    const records = extractRecords(response).map((item) => normalizeUploadRecord(item));
    if (records.length) return records;
  } catch (error) {
    console.warn(
      `[JobDirect] Custom ${fetchErrorLabel} query failed, using model fallback`,
      error
    );
  }

  try {
    const query = uploadModel
      .query()
      .where(fieldName, normalizedId)
      .deSelectAll()
      .select([
        "id",
        "photo_upload",
        "file_upload",
        "type",
        "file_name",
        "photo_name",
        "created_at",
        "property_name_id",
        "job_id",
      ])
      .noDestroy();
    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    return extractRecords(response).map((item) => normalizeUploadRecord(item));
  } catch (error) {
    console.error(`[JobDirect] Failed to fetch ${fetchErrorLabel}`, error);
    return [];
  }
}

async function createUploadFromFileByField({
  plugin,
  fieldName,
  idValue,
  missingIdMessage,
  file,
  uploadPath,
} = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(idValue);
  if (!normalizedId) {
    throw new Error(missingIdMessage || "Record ID is missing.");
  }
  if (!file) {
    throw new Error("No file selected.");
  }

  const signed = await requestSignedUpload({
    file,
    uploadPath: sanitizeUploadPath(uploadPath),
  });
  await uploadToSignedUrl({ uploadUrl: signed.uploadUrl, file });

  const isPhoto = isImageUpload(file?.type || "", file?.name || "", "");
  const payload = {
    [fieldName]: normalizedId,
    type: isPhoto ? "Photo" : "File",
    photo_upload: isPhoto ? signed.url : "",
    file_upload: isPhoto
      ? ""
      : {
          link: signed.url,
          name: file?.name || "",
          size: file?.size || "",
          type: file?.type || "",
          s3_id: signed?.key || "",
        },
    file_name: isPhoto ? "" : file?.name || "",
    photo_name: isPhoto ? file?.name || "" : "",
  };

  const uploadModel = resolvedPlugin.switchTo("PeterpmUpload");
  if (!uploadModel?.mutation) {
    throw new Error("Upload model is unavailable.");
  }

  const mutation = await uploadModel.mutation();
  mutation.createOne(payload);
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Upload create was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to save upload."
    );
  }

  const created =
    findMutationData(result, "createUpload") ??
    findMutationData(result, "createUploads") ??
    findMutationDataByMatcher(result, (key) => /^create/i.test(key) && /upload/i.test(key));
  const createdRecord = Array.isArray(created) ? created[0] || null : created;
  const createdId = extractCreatedRecordId(result, "PeterpmUpload");

  return normalizeUploadRecord({
    ...payload,
    ...(createdRecord && typeof createdRecord === "object" ? createdRecord : {}),
    id: createdRecord?.id || createdRecord?.ID || createdId || "",
  });
}

export async function fetchPropertyUploads({ plugin, propertyId } = {}) {
  return fetchUploadsByField({
    plugin,
    fieldName: "property_name_id",
    variableName: "property_name_id",
    variableType: "PeterpmPropertyID",
    idValue: propertyId,
    fetchErrorLabel: "property uploads",
  });
}

export async function createPropertyUploadFromFile({
  plugin,
  propertyId,
  file,
  uploadPath = "property-uploads",
} = {}) {
  return createUploadFromFileByField({
    plugin,
    fieldName: "property_name_id",
    idValue: propertyId,
    missingIdMessage: "Property ID is missing.",
    file,
    uploadPath,
  });
}

export async function fetchJobUploads({ plugin, jobId } = {}) {
  return fetchUploadsByField({
    plugin,
    fieldName: "job_id",
    variableName: "jobid",
    variableType: "PeterpmJobID",
    idValue: jobId,
    fetchErrorLabel: "job uploads",
  });
}

export async function createJobUploadFromFile({
  plugin,
  jobId,
  file,
  uploadPath = "job-uploads",
} = {}) {
  return createUploadFromFileByField({
    plugin,
    fieldName: "job_id",
    idValue: jobId,
    missingIdMessage: "Job ID is missing.",
    file,
    uploadPath,
  });
}

export async function deleteUploadRecord({ plugin, id } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(id);
  if (!normalizedId) {
    throw new Error("Upload ID is missing.");
  }

  const uploadModel = resolvedPlugin.switchTo("PeterpmUpload");
  if (!uploadModel?.mutation) {
    throw new Error("Upload model is unavailable.");
  }

  const mutation = await uploadModel.mutation();
  mutation.delete((query) => query.where("id", normalizedId));
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Upload delete was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to delete upload."
    );
  }

  return true;
}

export async function createContactRecord({ plugin, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const contactModel = resolvedPlugin.switchTo("PeterpmContact");
  if (!contactModel?.mutation) {
    throw new Error("Contact model is unavailable.");
  }

  const mutation = await contactModel.mutation();
  mutation.createOne(payload || {});
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Contact create was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to create contact."
    );
  }

  const created = findMutationData(result, "createContact");
  if (created === null) {
    throw new Error("Unable to create contact.");
  }

  const id = extractCreatedRecordId(result, "PeterpmContact");
  const resolvedId = String(created?.id || created?.ID || created?.Contact_ID || id || "").trim();
  if (!isPersistedId(resolvedId)) {
    throw new Error("Contact was not confirmed by server. Please try again.");
  }

  return {
    ...payload,
    ...(created && typeof created === "object" ? created : {}),
    id: resolvedId,
  };
}

export async function createCompanyRecord({ plugin, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const companyModel = resolvedPlugin.switchTo("PeterpmCompany");
  if (!companyModel?.mutation) {
    throw new Error("Company model is unavailable.");
  }

  const mutation = await companyModel.mutation();
  mutation.createOne(payload || {});
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Company create was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to create company."
    );
  }

  const created = findMutationData(result, "createCompany");
  if (created === null) {
    throw new Error("Unable to create company.");
  }

  const id = extractCreatedRecordId(result, "PeterpmCompany");
  const resolvedId = String(created?.id || created?.ID || id || "").trim();
  if (!isPersistedId(resolvedId)) {
    throw new Error("Company was not confirmed by server. Please try again.");
  }

  return {
    ...payload,
    ...(created && typeof created === "object" ? created : {}),
    id: resolvedId,
  };
}

const PROPERTY_FEATURE_OPTIONS = [
  { value: "713", label: "Brick" },
  { value: "712", label: "Concrete" },
  { value: "711", label: "Flat Roof" },
  { value: "710", label: "Highset" },
  { value: "709", label: "Iron Roof" },
  { value: "708", label: "Lowset" },
  { value: "707", label: "PostWar" },
  { value: "706", label: "Queenslander" },
  { value: "705", label: "Raked Ceiling" },
  { value: "704", label: "Sloping Block" },
  { value: "703", label: "Super 6 / Fibro roof" },
  { value: "702", label: "Tile Roof" },
  { value: "701", label: "Town house" },
  { value: "700", label: "Unit Block" },
  { value: "699", label: "Warehouse" },
  { value: "698", label: "Wood" },
  { value: "697", label: "Wood & Brick" },
];

const PROPERTY_FEATURE_LABEL_BY_VALUE = Object.fromEntries(
  PROPERTY_FEATURE_OPTIONS.map((option) => [String(option.value), option.label])
);
const PROPERTY_FEATURE_VALUE_BY_LABEL = Object.fromEntries(
  PROPERTY_FEATURE_OPTIONS.map((option) => [String(option.label).trim().toLowerCase(), String(option.value)])
);

function normalizePropertyFeatureValue(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (PROPERTY_FEATURE_LABEL_BY_VALUE[raw]) return raw;
  const fromLabel = PROPERTY_FEATURE_VALUE_BY_LABEL[raw.toLowerCase()];
  if (fromLabel) return fromLabel;
  const idMatch = raw.match(/\d+/);
  if (idMatch && PROPERTY_FEATURE_LABEL_BY_VALUE[idMatch[0]]) return idMatch[0];
  return "";
}

function extractPropertyFeatureTokens(value) {
  if (value === null || value === undefined) return [];

  const raw =
    typeof value === "object" && !Array.isArray(value)
      ? value.id || value.value || value.name || value.label || ""
      : value;
  const text = String(raw || "").trim();
  if (!text) return [];

  return text
    .replace(/\*\/\*/g, ",")
    .split(/[,;\n|]/)
    .map((item) => String(item || "").trim())
    .filter(Boolean);
}

function preparePropertyMutationPayload(payload = {}) {
  const valueOrEmpty = (value) => String(value || "").trim();
  const features = Array.isArray(payload?.building_features)
    ? payload.building_features
        .flatMap((item) => extractPropertyFeatureTokens(item))
        .map((item) => normalizePropertyFeatureValue(item))
        .filter(Boolean)
    : extractPropertyFeatureTokens(valueOrEmpty(payload?.building_features))
        .map((item) => normalizePropertyFeatureValue(item))
        .filter(Boolean);
  const uniqueFeatures = Array.from(new Set(features));
  const featuresText = uniqueFeatures
    .map((featureId) => PROPERTY_FEATURE_LABEL_BY_VALUE[featureId] || featureId)
    .join(", ");
  const buildingFeaturesRelation = uniqueFeatures.map((featureId) => ({
    id: /^\d+$/.test(String(featureId)) ? Number.parseInt(featureId, 10) : featureId,
  }));

  return {
    property_name: valueOrEmpty(payload?.property_name),
    lot_number: valueOrEmpty(payload?.lot_number),
    unit_number: valueOrEmpty(payload?.unit_number),
    address_1: valueOrEmpty(payload?.address_1),
    address_2: valueOrEmpty(payload?.address_2),
    suburb_town: valueOrEmpty(payload?.suburb_town),
    postal_code: valueOrEmpty(payload?.postal_code),
    state: valueOrEmpty(payload?.state),
    country: valueOrEmpty(payload?.country),
    property_type: valueOrEmpty(payload?.property_type),
    building_type: valueOrEmpty(payload?.building_type),
    building_type_other: valueOrEmpty(payload?.building_type_other),
    foundation_type: valueOrEmpty(payload?.foundation_type),
    bedrooms: valueOrEmpty(payload?.bedrooms),
    manhole: Boolean(payload?.manhole),
    stories: valueOrEmpty(payload?.stories),
    building_age: valueOrEmpty(payload?.building_age),
    building_features: featuresText,
    building_features_options_as_text: featuresText,
    Building_Features: buildingFeaturesRelation,
  };
}

export async function createPropertyRecord({ plugin, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const propertyModel = resolvedPlugin.switchTo("PeterpmProperty");
  if (!propertyModel?.mutation) {
    throw new Error("Property model is unavailable.");
  }

  const mutation = await propertyModel.mutation();
  mutation.createOne(preparePropertyMutationPayload(payload || {}));
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Property create was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to create property."
    );
  }

  const created = findMutationData(result, "createProperty");
  if (created === null) {
    throw new Error("Unable to create property.");
  }

  const id = extractCreatedRecordId(result, "PeterpmProperty");
  const resolvedId = String(created?.id || created?.ID || created?.Property_ID || id || "").trim();
  if (!isPersistedId(resolvedId)) {
    throw new Error("Property was not confirmed by server. Please try again.");
  }

  return {
    ...(payload || {}),
    ...(created && typeof created === "object" ? created : {}),
    id: resolvedId,
  };
}

export async function updatePropertyRecord({ plugin, id, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(id);
  if (!normalizedId) {
    throw new Error("Property ID is missing.");
  }

  const propertyModel = resolvedPlugin.switchTo("PeterpmProperty");
  if (!propertyModel?.mutation) {
    throw new Error("Property model is unavailable.");
  }

  const mutation = await propertyModel.mutation();
  mutation.update((query) =>
    query.where("id", normalizedId).set(preparePropertyMutationPayload(payload || {}))
  );
  const result = await mutation.execute(true).toPromise();

  if (!result || result?.isCancelling) {
    throw new Error("Property update was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to update property."
    );
  }

  const updated =
    findMutationData(result, "updateProperty") ??
    findMutationData(result, "updateProperties") ??
    findMutationDataByMatcher(result, (key) => /^update/i.test(key) && /property/i.test(key));
  const createdId = extractCreatedRecordId(result, "PeterpmProperty");
  const updatedRecord = Array.isArray(updated) ? updated[0] || null : updated;

  if (updatedRecord === null || (!updatedRecord && !createdId)) {
    console.warn(
      "[JobDirect] Property update returned no updated record. Treating as success.",
      result
    );
  }

  return {
    ...(payload || {}),
    ...(updatedRecord && typeof updatedRecord === "object" ? updatedRecord : {}),
    id: normalizeIdentifier(updatedRecord?.id || updatedRecord?.ID || createdId || normalizedId),
  };
}

export async function fetchPropertyRecordById({ plugin, propertyId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(propertyId);
  if (!normalizedId) return null;

  const propertyModel = resolvedPlugin.switchTo("PeterpmProperty");
  if (!propertyModel?.query) {
    throw new Error("Property model is unavailable.");
  }

  const query = propertyModel
    .query()
    .where("id", normalizedId)
    .deSelectAll()
    .select([
      "id",
      "unique_id",
      "property_name",
      "lot_number",
      "unit_number",
      "address_1",
      "address_2",
      "address",
      "city",
      "suburb_town",
      "state",
      "postal_code",
      "zip_code",
      "country",
      "property_type",
      "building_type",
      "building_type_other",
      "foundation_type",
      "bedrooms",
      "manhole",
      "stories",
      "building_age",
      "building_features",
      "building_features_options_as_text",
    ])
    .include("Building_Features", (featureQuery) =>
      featureQuery.deSelectAll().select(["id"])
    );

  query.getOrInitQueryCalc?.();
  const response = await fetchDirectWithTimeout(query);
  const record = extractFirstRecord(response);
  if (!record) return null;
  return normalizePropertyRecord(record);
}

export async function fetchPropertyRecordByUniqueId({ plugin, uniqueId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedUid = String(uniqueId || "").trim();
  if (!normalizedUid) return null;

  const propertyModel = resolvedPlugin.switchTo("PeterpmProperty");
  if (!propertyModel?.query) {
    throw new Error("Property model is unavailable.");
  }

  const query = propertyModel
    .query()
    .where("unique_id", normalizedUid)
    .deSelectAll()
    .select([
      "id",
      "unique_id",
      "property_name",
      "lot_number",
      "unit_number",
      "address_1",
      "address_2",
      "address",
      "city",
      "suburb_town",
      "state",
      "postal_code",
      "zip_code",
      "country",
      "property_type",
      "building_type",
      "building_type_other",
      "foundation_type",
      "bedrooms",
      "manhole",
      "stories",
      "building_age",
      "building_features",
      "building_features_options_as_text",
    ])
    .include("Building_Features", (featureQuery) =>
      featureQuery.deSelectAll().select(["id"])
    );

  query.getOrInitQueryCalc?.();
  const response = await fetchDirectWithTimeout(query);
  const record = extractFirstRecord(response);
  if (!record) return null;
  return normalizePropertyRecord(record);
}

function normalizeIdentifier(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^\d+$/.test(text)) return Number.parseInt(text, 10);
  return text;
}

function normalizeDealRecord(rawDeal = {}) {
  return {
    id: String(rawDeal?.id || rawDeal?.ID || rawDeal?.DealsID || "").trim(),
    unique_id: String(
      rawDeal?.unique_id || rawDeal?.Unique_ID || rawDeal?.Deals_Unique_ID || ""
    ).trim(),
    deal_name: String(
      rawDeal?.deal_name || rawDeal?.Deal_Name || rawDeal?.Deals_Deal_Name || ""
    ).trim(),
  };
}

function normalizeDealDetailRecord(rawDeal = {}) {
  return {
    id: String(rawDeal?.id || rawDeal?.ID || rawDeal?.DealsID || "").trim(),
    deal_name: String(rawDeal?.deal_name || rawDeal?.Deal_Name || "").trim(),
    deal_value: String(rawDeal?.deal_value || rawDeal?.Deal_Value || "").trim(),
    sales_stage: String(rawDeal?.sales_stage || rawDeal?.Sales_Stage || "").trim(),
    expected_win: String(rawDeal?.expected_win || rawDeal?.Expected_Win || "").trim(),
    expected_close_date: rawDeal?.expected_close_date || rawDeal?.Expected_Close_Date || "",
    actual_close_date: rawDeal?.actual_close_date || rawDeal?.Actual_Close_Date || "",
    weighted_value: String(rawDeal?.weighted_value || rawDeal?.Weighted_Value || "").trim(),
    recent_activity: String(rawDeal?.recent_activity || rawDeal?.Recent_Activity || "").trim(),
  };
}

function parseBooleanValue(value) {
  if (typeof value === "boolean") return value;
  const text = String(value || "").trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes";
}

function normalizePropertyRecord(rawProperty = {}) {
  const featureArray = Array.isArray(rawProperty?.Building_Features)
    ? rawProperty.Building_Features.map((item) => item?.id || item?.value || item?.name || item?.label || item)
        .filter(Boolean)
        .map((item) => String(item).trim())
    : [];

  return {
    id: String(
      rawProperty?.id ||
        rawProperty?.ID ||
        rawProperty?.Property_ID ||
        rawProperty?.PropertiesID ||
        ""
    ).trim(),
    unique_id: String(
      rawProperty?.unique_id ||
        rawProperty?.Unique_ID ||
        rawProperty?.Property_Unique_ID ||
        rawProperty?.Properties_Unique_ID ||
        ""
    ).trim(),
    property_name: String(
      rawProperty?.property_name ||
        rawProperty?.Property_Name ||
        rawProperty?.Property_Property_Name ||
        rawProperty?.Properties_Property_Name ||
        ""
    ).trim(),
    lot_number: String(rawProperty?.lot_number || rawProperty?.Lot_Number || "").trim(),
    unit_number: String(rawProperty?.unit_number || rawProperty?.Unit_Number || "").trim(),
    address_1: String(rawProperty?.address_1 || rawProperty?.Address_1 || "").trim(),
    address_2: String(rawProperty?.address_2 || rawProperty?.Address_2 || "").trim(),
    address: String(rawProperty?.address || rawProperty?.Address || "").trim(),
    city: String(rawProperty?.city || rawProperty?.City || "").trim(),
    suburb_town: String(rawProperty?.suburb_town || rawProperty?.Suburb_Town || "").trim(),
    state: String(rawProperty?.state || rawProperty?.State || "").trim(),
    postal_code: String(
      rawProperty?.postal_code ||
        rawProperty?.Postal_Code ||
        rawProperty?.zip_code ||
        rawProperty?.Zip_Code ||
        ""
    ).trim(),
    zip_code: String(rawProperty?.zip_code || rawProperty?.Zip_Code || "").trim(),
    country: String(rawProperty?.country || rawProperty?.Country || "").trim(),
    property_type: String(rawProperty?.property_type || rawProperty?.Property_Type || "").trim(),
    building_type: String(rawProperty?.building_type || rawProperty?.Building_Type || "").trim(),
    building_type_other: String(
      rawProperty?.building_type_other || rawProperty?.Building_Type_Other || ""
    ).trim(),
    foundation_type: String(rawProperty?.foundation_type || rawProperty?.Foundation_Type || "").trim(),
    bedrooms: String(rawProperty?.bedrooms || rawProperty?.Bedrooms || "").trim(),
    manhole:
      rawProperty?.manhole === true || String(rawProperty?.manhole || rawProperty?.Manhole || "").trim().toLowerCase() === "true",
    stories: String(rawProperty?.stories || rawProperty?.Stories || "").trim(),
    building_age: String(rawProperty?.building_age || rawProperty?.Building_Age || "").trim(),
    building_features:
      featureArray.length > 0
        ? featureArray
        : extractPropertyFeatureTokens(
            String(
            rawProperty?.building_features ||
              rawProperty?.Building_Features_Options_As_Text ||
              rawProperty?.building_features_options_as_text ||
              ""
            )
          )
            .map((item) => normalizePropertyFeatureValue(item) || String(item || "").trim())
            .filter(Boolean),
    building_features_options_as_text: String(
      rawProperty?.building_features_options_as_text ||
        rawProperty?.Building_Features_Options_As_Text ||
        rawProperty?.building_features ||
        ""
    ).trim(),
  };
}

function normalizeAffiliationRecord(rawAffiliation = {}) {
  const contactFirstName = String(
    rawAffiliation?.contact_first_name ||
      rawAffiliation?.Contact_First_Name ||
      rawAffiliation?.Contact?.first_name ||
      rawAffiliation?.Contact?.First_Name ||
      ""
  ).trim();
  const contactLastName = String(
    rawAffiliation?.contact_last_name ||
      rawAffiliation?.Contact_Last_Name ||
      rawAffiliation?.Contact?.last_name ||
      rawAffiliation?.Contact?.Last_Name ||
      ""
  ).trim();
  const companyName = String(
    rawAffiliation?.company_name ||
      rawAffiliation?.CompanyName ||
      rawAffiliation?.Company?.name ||
      rawAffiliation?.Company?.Name ||
      ""
  ).trim();
  const accountsCompanyName = String(
    rawAffiliation?.company_as_accounts_contact_name ||
      rawAffiliation?.Company_as_Accounts_Contact_Name ||
      rawAffiliation?.Company_as_Accounts_Contact?.name ||
      rawAffiliation?.Company_as_Accounts_Contact?.Name ||
      ""
  ).trim();

  return {
    id: String(rawAffiliation?.id || rawAffiliation?.ID || "").trim(),
    role: String(rawAffiliation?.role || rawAffiliation?.Role || "").trim(),
    property_id: String(rawAffiliation?.property_id || rawAffiliation?.Property_ID || "").trim(),
    contact_id: String(rawAffiliation?.contact_id || rawAffiliation?.Contact_ID || "").trim(),
    company_id: String(rawAffiliation?.company_id || rawAffiliation?.Company_ID || "").trim(),
    company_as_accounts_contact_id: String(
      rawAffiliation?.company_as_accounts_contact_id ||
        rawAffiliation?.Company_as_Accounts_Contact_ID ||
        ""
    ).trim(),
    primary_owner_contact: parseBooleanValue(
      rawAffiliation?.primary_owner_contact || rawAffiliation?.Primary_Owner_Contact
    ),
    primary_resident_contact: parseBooleanValue(
      rawAffiliation?.primary_resident_contact || rawAffiliation?.Primary_Resident_Contact
    ),
    primary_property_manager_contact: parseBooleanValue(
      rawAffiliation?.primary_property_manager_contact ||
        rawAffiliation?.Primary_Property_Manager_Contact
    ),
    contact_first_name: contactFirstName,
    contact_last_name: contactLastName,
    contact_email: String(
      rawAffiliation?.contact_email ||
        rawAffiliation?.ContactEmail ||
        rawAffiliation?.Contact?.email ||
        rawAffiliation?.Contact?.Email ||
        ""
    ).trim(),
    contact_sms_number: String(
      rawAffiliation?.contact_sms_number ||
        rawAffiliation?.Contact_SMS_Number ||
        rawAffiliation?.Contact?.sms_number ||
        rawAffiliation?.Contact?.SMS_Number ||
        ""
    ).trim(),
    company_name: companyName,
    company_phone: String(
      rawAffiliation?.company_phone ||
        rawAffiliation?.CompanyPhone ||
        rawAffiliation?.Company?.phone ||
        rawAffiliation?.Company?.Phone ||
        ""
    ).trim(),
    company_as_accounts_contact_name: accountsCompanyName,
  };
}

function dedupeAffiliations(affiliations = []) {
  const seen = new Set();
  return affiliations.filter((item) => {
    const key = String(item?.id || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeDealsFromFlatFields(record = {}) {
  const ids = record?.DealsID;
  const uniqueIds = record?.Deals_Unique_ID;
  const names = record?.Deals_Deal_Name;

  if (Array.isArray(ids) || Array.isArray(uniqueIds) || Array.isArray(names)) {
    const maxLength = Math.max(ids?.length || 0, uniqueIds?.length || 0, names?.length || 0);
    const deals = [];
    for (let index = 0; index < maxLength; index += 1) {
      deals.push(
        normalizeDealRecord({
          DealsID: ids?.[index],
          Deals_Unique_ID: uniqueIds?.[index],
          Deals_Deal_Name: names?.[index],
        })
      );
    }
    return deals.filter((deal) => deal.id || deal.unique_id || deal.deal_name);
  }

  const single = normalizeDealRecord(record);
  if (!single.id && !single.unique_id && !single.deal_name) return [];
  return [single];
}

function extractDealsFromAccountRecord(record) {
  if (!record || typeof record !== "object") return [];

  if (Array.isArray(record?.Deals)) {
    return record.Deals.map((item) => normalizeDealRecord(item)).filter(
      (deal) => deal.id || deal.unique_id || deal.deal_name
    );
  }

  return normalizeDealsFromFlatFields(record);
}

function dedupeDeals(deals = []) {
  const seen = new Set();
  return deals.filter((deal) => {
    const key = String(deal.id || deal.unique_id || deal.deal_name || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizePropertiesFromFlatFields(record = {}) {
  const ids = record?.PropertiesID || record?.Property_ID;
  const uniqueIds = record?.Properties_Unique_ID || record?.Property_Unique_ID;
  const names = record?.Properties_Property_Name || record?.Property_Property_Name;

  if (Array.isArray(ids) || Array.isArray(uniqueIds) || Array.isArray(names)) {
    const maxLength = Math.max(ids?.length || 0, uniqueIds?.length || 0, names?.length || 0);
    const properties = [];
    for (let index = 0; index < maxLength; index += 1) {
      properties.push(
        normalizePropertyRecord({
          PropertiesID: ids?.[index],
          Properties_Unique_ID: uniqueIds?.[index],
          Properties_Property_Name: names?.[index],
        })
      );
    }
    return properties.filter((property) => property.id || property.unique_id || property.property_name);
  }

  const single = normalizePropertyRecord(record);
  if (!single.id && !single.unique_id && !single.property_name) return [];
  return [single];
}

function extractPropertiesFromAccountRecord(record) {
  if (!record || typeof record !== "object") return [];

  if (Array.isArray(record?.Properties)) {
    return record.Properties.map((item) => normalizePropertyRecord(item)).filter(
      (property) => property.id || property.unique_id || property.property_name
    );
  }

  return normalizePropertiesFromFlatFields(record);
}

function dedupeProperties(properties = []) {
  const seen = new Set();
  return properties.filter((property) => {
    const key = String(property.id || property.unique_id || property.property_name || "").trim();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchDealsByAccountId({ plugin, accountType, accountId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  const modelName = accountType === "Company" ? "PeterpmCompany" : "PeterpmContact";
  const resolvedId = normalizeIdentifier(accountId);
  if (!resolvedId) return [];

  try {
    const customDealQuery =
      accountType === "Company"
        ? `
          query calcCompanies($id: PeterpmCompanyID!) {
            calcCompanies(query: [{ where: { id: $id } }]) {
              Deals_Unique_ID: field(arg: ["Deals", "unique_id"])
              DealsID: field(arg: ["Deals", "id"])
              Deals_Deal_Name: field(arg: ["Deals", "deal_name"])
            }
          }
        `
        : `
          query calcContacts($id: PeterpmContactID!) {
            calcContacts(query: [{ where: { id: $id } }]) {
              Deals_Unique_ID: field(arg: ["Deals", "unique_id"])
              DealsID: field(arg: ["Deals", "id"])
              Deals_Deal_Name: field(arg: ["Deals", "deal_name"])
            }
          }
        `;

    const customQuery = resolvedPlugin
      .switchTo(modelName)
      .query()
      .fromGraphql(customDealQuery);
    const customResponse = await fetchDirectWithTimeout(customQuery, {
      variables: { id: resolvedId },
    });
    const customRecords = extractRecords(customResponse);
    const customDeals = dedupeDeals(
      customRecords.flatMap((record) => extractDealsFromAccountRecord(record))
    );
    if (customDeals.length) return customDeals;
  } catch (error) {
    console.warn("[JobDirect] Custom deal query failed, using include fallback", error);
  }

  try {
    const query = resolvedPlugin
      .switchTo(modelName)
      .query()
      .where("id", resolvedId)
      .deSelectAll()
      .select(["id"])
      .include("Deals", (dealQuery) =>
        dealQuery.deSelectAll().select(["id", "unique_id", "deal_name"])
      );

    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    const accountRecords = extractRecords(response);
    const dealsFromAllRows = accountRecords.flatMap((record) =>
      extractDealsFromAccountRecord(record)
    );
    return dedupeDeals(dealsFromAllRows);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch linked deals", { accountType, accountId, error });
    return [];
  }
}

async function executeJobUpdateMutation({ plugin, whereField, whereValue, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const jobModel = resolvedPlugin.switchTo("PeterpmJob");
  if (!jobModel?.mutation) {
    throw new Error("Job model is unavailable.");
  }

  const mutation = await jobModel.mutation();
  mutation.update((query) => query.where(whereField, whereValue).set(payload || {}));
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Job update was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to update job."
    );
  }

  const updated =
    findMutationData(result, "updateJob") ??
    findMutationData(result, "updateJobs") ??
    findMutationDataByMatcher(result, (key) => /^update/i.test(key) && /job/i.test(key));
  const id = extractCreatedRecordId(result, "PeterpmJob");
  const updatedRecord = Array.isArray(updated) ? updated[0] || null : updated;

  if (updatedRecord === null || (!updatedRecord && !id)) {
    console.warn("[JobDirect] Job update returned no updated record. Treating as success.", result);
  }

  return { updatedRecord, id };
}

export async function updateJobRecordByUid({ plugin, uniqueId, payload } = {}) {
  const normalizedUid = String(uniqueId || "").trim();
  if (!normalizedUid) {
    throw new Error("Job UID is missing.");
  }

  const { updatedRecord, id } = await executeJobUpdateMutation({
    plugin,
    whereField: "unique_id",
    whereValue: normalizedUid,
    payload,
  });

  return {
    unique_id: normalizedUid,
    ...(updatedRecord && typeof updatedRecord === "object" ? updatedRecord : {}),
    id: normalizeIdentifier(updatedRecord?.id || updatedRecord?.ID || id || ""),
  };
}

export async function updateJobRecordById({ plugin, id, payload } = {}) {
  const normalizedId = normalizeIdentifier(id);
  if (!normalizedId) {
    throw new Error("Job ID is missing.");
  }

  const { updatedRecord, id: mutationId } = await executeJobUpdateMutation({
    plugin,
    whereField: "id",
    whereValue: normalizedId,
    payload,
  });

  return {
    id: normalizeIdentifier(updatedRecord?.id || updatedRecord?.ID || mutationId || normalizedId),
    ...(updatedRecord && typeof updatedRecord === "object" ? updatedRecord : {}),
  };
}

export async function fetchLinkedDealsByAccount({ plugin, accountType, accountId } = {}) {
  const normalizedType = String(accountType || "").trim().toLowerCase();
  const resolvedType = normalizedType === "company" || normalizedType === "entity" ? "Company" : "Contact";
  return fetchDealsByAccountId({
    plugin,
    accountType: resolvedType,
    accountId,
  });
}

export async function fetchLinkedPropertiesByAccount({ plugin, accountType, accountId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  const normalizedType = String(accountType || "").trim().toLowerCase();
  const resolvedType = normalizedType === "company" || normalizedType === "entity" ? "Company" : "Contact";
  const modelName = resolvedType === "Company" ? "PeterpmCompany" : "PeterpmContact";
  const normalizedId = normalizeIdentifier(accountId);
  if (!normalizedId) return [];

  try {
    const customPropertyQuery =
      resolvedType === "Company"
        ? `
          query getCompany($id: PeterpmCompanyID!) {
            getCompany(query: [{ where: { id: $id } }]) {
              Properties {
                id
                unique_id
                property_name
                lot_number
                unit_number
                address_1
                address_2
                address
                city
                suburb_town
                postal_code
                zip_code
                state
                country
                property_type
                building_type
                building_type_other
                foundation_type
                bedrooms
                manhole
                stories
                building_age
                building_features
                building_features_options_as_text
              }
            }
          }
        `
        : `
          query getContact($id: PeterpmContactID!) {
            getContact(query: [{ where: { id: $id } }]) {
              Properties {
                id
                unique_id
                property_name
                lot_number
                unit_number
                address_1
                address_2
                address
                city
                suburb_town
                postal_code
                zip_code
                state
                country
                property_type
                building_type
                building_type_other
                foundation_type
                bedrooms
                manhole
                stories
                building_age
                building_features
                building_features_options_as_text
              }
            }
          }
        `;

    const customQuery = resolvedPlugin
      .switchTo(modelName)
      .query()
      .fromGraphql(customPropertyQuery);
    const customResponse = await fetchDirectWithTimeout(customQuery, {
      variables: { id: normalizedId },
    });
    const customRecords = extractRecords(customResponse);
    const customProperties = dedupeProperties(
      customRecords.flatMap((record) => extractPropertiesFromAccountRecord(record))
    );
    if (customProperties.length) return customProperties;
  } catch (error) {
    console.warn("[JobDirect] Custom property query failed, using include fallback", error);
  }

  try {
    const query = resolvedPlugin
      .switchTo(modelName)
      .query()
      .where("id", normalizedId)
      .deSelectAll()
      .select(["id"])
      .include("Properties", (propertyQuery) =>
        propertyQuery.deSelectAll().select([
          "id",
          "unique_id",
          "property_name",
          "lot_number",
          "unit_number",
          "address_1",
          "address_2",
          "address",
          "city",
          "suburb_town",
          "postal_code",
          "zip_code",
          "state",
          "country",
          "property_type",
          "building_type",
          "building_type_other",
          "foundation_type",
          "bedrooms",
          "manhole",
          "stories",
          "building_age",
          "building_features",
          "building_features_options_as_text",
        ])
      );

    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    const accountRecords = extractRecords(response);
    const propertiesFromAllRows = accountRecords.flatMap((record) =>
      extractPropertiesFromAccountRecord(record)
    );
    return dedupeProperties(propertiesFromAllRows);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch linked properties", {
      accountType: resolvedType,
      accountId: normalizedId,
      error,
    });
    return [];
  }
}

export async function fetchDealRecordById({ plugin, dealId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(dealId);
  if (!normalizedId) {
    throw new Error("Deal ID is missing.");
  }

  const dealModel = resolvedPlugin.switchTo("PeterpmDeal");
  if (!dealModel?.query) {
    throw new Error("Deal model is unavailable.");
  }

  const query = dealModel
    .query()
    .where("id", normalizedId)
    .deSelectAll()
    .select([
      "id",
      "deal_name",
      "deal_value",
      "sales_stage",
      "expected_win",
      "expected_close_date",
      "actual_close_date",
      "weighted_value",
      "recent_activity",
    ]);

  query.getOrInitQueryCalc?.();
  const result = await fetchDirectWithTimeout(query);
  const deal = extractFirstRecord(result);
  if (!deal) return null;
  return normalizeDealDetailRecord(deal);
}

export async function updateDealRecordById({ plugin, dealId, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(dealId);
  if (!normalizedId) {
    throw new Error("Deal ID is missing.");
  }

  const dealModel = resolvedPlugin.switchTo("PeterpmDeal");
  if (!dealModel?.mutation) {
    throw new Error("Deal model is unavailable.");
  }

  const mutation = await dealModel.mutation();
  mutation.update((query) => query.where("id", normalizedId).set(payload || {}));
  const result = await mutation.execute(true).toPromise();

  if (!result || result?.isCancelling) {
    throw new Error("Deal update was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to update deal."
    );
  }

  const updated =
    findMutationData(result, "updateDeal") ??
    findMutationData(result, "updateDeals") ??
    findMutationDataByMatcher(result, (key) => /^update/i.test(key) && /deal/i.test(key));
  const id = extractCreatedRecordId(result, "PeterpmDeal");
  const updatedRecord = Array.isArray(updated) ? updated[0] || null : updated;
  if (updatedRecord === null || (!updatedRecord && !id)) {
    console.warn(
      "[JobDirect] Deal update returned no updated record. Treating as success.",
      result
    );
  }

  return {
    ...(updatedRecord && typeof updatedRecord === "object"
      ? normalizeDealDetailRecord(updatedRecord)
      : normalizeDealDetailRecord(payload || {})),
    id: normalizeIdentifier(updatedRecord?.id || updatedRecord?.ID || id || normalizedId),
  };
}

export async function fetchPropertyAffiliationsByPropertyId({ plugin, propertyId } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) return [];

  const normalizedPropertyId = normalizeIdentifier(propertyId);
  if (!normalizedPropertyId) return [];

  try {
    const query = resolvedPlugin
      .switchTo("PeterpmAffiliation")
      .query()
      .where("property_id", normalizedPropertyId)
      .deSelectAll()
      .select([
        "id",
        "role",
        "property_id",
        "contact_id",
        "company_id",
        "company_as_accounts_contact_id",
        "primary_owner_contact",
        "primary_resident_contact",
        "primary_property_manager_contact",
      ])
      .include("Contact", (contactQuery) =>
        contactQuery.deSelectAll().select(["first_name", "last_name", "email", "sms_number"])
      )
      .include("Company", (companyQuery) =>
        companyQuery.deSelectAll().select(["name", "phone"])
      )
      .include("Company_as_Accounts_Contact", (companyQuery) =>
        companyQuery.deSelectAll().select(["name", "phone"])
      )
      .noDestroy();
    query.getOrInitQueryCalc?.();
    const response = await fetchDirectWithTimeout(query);
    const records = extractRecords(response).map((item) => normalizeAffiliationRecord(item));
    return dedupeAffiliations(records);
  } catch (error) {
    console.error("[JobDirect] Failed to fetch property affiliations", error);
    return [];
  }
}

export async function createAffiliationRecord({ plugin, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const model = resolvedPlugin.switchTo("PeterpmAffiliation");
  if (!model?.mutation) {
    throw new Error("Affiliation model is unavailable.");
  }

  const mutation = await model.mutation();
  mutation.createOne(payload || {});
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Property contact create was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to create property contact."
    );
  }

  const created =
    findMutationData(result, "createAffiliation") ??
    findMutationData(result, "createAffiliations") ??
    findMutationDataByMatcher(result, (key) => /^create/i.test(key) && /affiliation/i.test(key));
  if (created === null) {
    throw new Error("Unable to create property contact.");
  }
  const createdRecord = Array.isArray(created) ? created[0] || null : created;
  const id = extractCreatedRecordId(result, "PeterpmAffiliation");
  const resolvedId = String(createdRecord?.id || createdRecord?.ID || id || "").trim();
  if (!isPersistedId(resolvedId)) {
    throw new Error("Property contact was not confirmed by server. Please try again.");
  }

  return normalizeAffiliationRecord({
    ...(payload || {}),
    ...(createdRecord && typeof createdRecord === "object" ? createdRecord : {}),
    id: resolvedId,
  });
}

export async function updateAffiliationRecord({ plugin, id, payload } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(id);
  if (!normalizedId) {
    throw new Error("Affiliation ID is missing.");
  }

  const model = resolvedPlugin.switchTo("PeterpmAffiliation");
  if (!model?.mutation) {
    throw new Error("Affiliation model is unavailable.");
  }

  const mutation = await model.mutation();
  mutation.update((query) => query.where("id", normalizedId).set(payload || {}));
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Property contact update was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to update property contact."
    );
  }

  const updated =
    findMutationData(result, "updateAffiliation") ??
    findMutationData(result, "updateAffiliations") ??
    findMutationDataByMatcher(result, (key) => /^update/i.test(key) && /affiliation/i.test(key));
  const updatedRecord = Array.isArray(updated) ? updated[0] || null : updated;
  if (updatedRecord === null || !updatedRecord) {
    console.warn(
      "[JobDirect] Affiliation update returned no updated record. Treating as success.",
      result
    );
    return normalizeAffiliationRecord({
      ...(payload || {}),
      id: normalizedId,
    });
  }
  return normalizeAffiliationRecord({
    ...(payload || {}),
    ...(updatedRecord && typeof updatedRecord === "object" ? updatedRecord : {}),
    id: updatedRecord?.id || updatedRecord?.ID || normalizedId,
  });
}

export async function deleteAffiliationRecord({ plugin, id } = {}) {
  const resolvedPlugin = resolvePlugin(plugin);
  if (!resolvedPlugin?.switchTo) {
    throw new Error("SDK plugin is not ready.");
  }

  const normalizedId = normalizeIdentifier(id);
  if (!normalizedId) {
    throw new Error("Affiliation ID is missing.");
  }

  const model = resolvedPlugin.switchTo("PeterpmAffiliation");
  if (!model?.mutation) {
    throw new Error("Affiliation model is unavailable.");
  }

  const mutation = await model.mutation();
  if (typeof mutation.delete !== "function") {
    throw new Error("Affiliation delete operation is unavailable.");
  }
  mutation.delete((query) => query.where("id", normalizedId));
  const result = await mutation.execute(true).toPromise();
  if (!result || result?.isCancelling) {
    throw new Error("Property contact delete was cancelled.");
  }

  const failure = extractStatusFailure(result);
  if (failure) {
    throw new Error(
      extractMutationErrorMessage(failure.statusMessage) || "Unable to delete property contact."
    );
  }

  const deleted =
    findMutationData(result, "deleteAffiliation") ??
    findMutationData(result, "deleteAffiliations") ??
    findMutationDataByMatcher(result, (key) => /^delete/i.test(key) && /affiliation/i.test(key));
  const deletedRecord = Array.isArray(deleted) ? deleted[0] || null : deleted;
  const deletedId = String(
    deletedRecord?.id || deletedRecord?.ID || extractCreatedRecordId(result, "PeterpmAffiliation") || normalizedId
  ).trim();
  if (!deletedId) {
    throw new Error("Unable to delete property contact.");
  }
  return deletedId;
}
