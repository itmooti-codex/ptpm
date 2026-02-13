  window.addEventListener("load", function () {
    const loader = document.getElementById("page-loader");
    loader.style.opacity = "0";
    loader.style.transition = "opacity 0.5s ease";
    setTimeout(() => {loader.style.display = "none";}, 500);
  });

  
const normalizePrimaryFlag = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  if (/^\[[^\]]+\]$/.test(normalized)) return false;
  if (["false", "0", "no", "n", "f", "off"].includes(normalized)) return false;
  return ["true", "1", "yes", "y", "t", "on"].includes(normalized);
};

const hasPrimaryFlag = (dataset = {}) =>
  normalizePrimaryFlag(dataset.primaryOwner) ||
  normalizePrimaryFlag(dataset.primaryResident) ||
  normalizePrimaryFlag(dataset.primaryManager);

const updatePropertyContactStars = () => {
  const stars = document.querySelectorAll(".property-contact-star");
  stars.forEach((star) => {
    const container = star.closest(
      "[data-primary-owner], [data-primary-resident], [data-primary-manager]",
    );
    const isPrimary =
      hasPrimaryFlag(star.dataset) ||
      (container ? hasPrimaryFlag(container.dataset) : false);
    star.classList.toggle("is-primary", isPrimary);
  });
};

const initPropertyContactStars = () => {
  const list = document.querySelector("[data-property-contact-list]");
  updatePropertyContactStars();
  const target = list || document.body;
  const observer = new MutationObserver(() => updatePropertyContactStars());
  observer.observe(target, {
    childList: true,
    subtree: true,
    attributes: true,
  });
  window.addEventListener("propertyContacts:changed", () =>
    updatePropertyContactStars(),
  );
};

const initRecommendationCard = () => {
  const card = document.querySelector("[data-recommendation-card]");
  if (!card) return;
  const list = card.querySelector("[data-recommendation-list]");
  const empty = card.querySelector("[data-recommendation-empty]");
  if (!list || !empty) return;

  const normalizeText = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    if (/^\[[^\]]+\]$/.test(raw)) return "";
    return raw;
  };

  const update = () => {
    const admin = list.querySelector("[data-admin-recommendation]");
    const adminText = normalizeText(admin?.textContent);
    const listText = (list.textContent || "").toLowerCase();
    const hasNoResults =
      listText.includes("no results found") ||
      listText.includes("no result found");
    const showEmpty = hasNoResults || !adminText;
    empty.hidden = !showEmpty;
    list.classList.toggle("hidden", showEmpty);
  };

  update();
  const observer = new MutationObserver(() => update());
  observer.observe(list, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

const normalizeIdentifier = (value) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  const cleaned = raw.replace(/^#/, "").trim();
  if (!cleaned) return "";
  const lowered = cleaned.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";
  if (/^\[[^\]]+\]$/.test(cleaned)) return "";
  return cleaned;
};

const normalizeMetaValue = (value) => {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return "";
  // Ignore unresolved token-like values such as Company_Account_Type.
  if (/^[A-Za-z]+(?:_[A-Za-z0-9]+)+$/.test(normalized)) return "";
  return normalized;
};

const initJobSheetGuard = () => {
  const noJobSheet = document.getElementById("no-job-sheet");
  const jobSheet = document.getElementById("job-sheet");
  if (!noJobSheet || !jobSheet) return;

  const params = new URLSearchParams(window.location.search || "");
  const inquiryId = normalizeIdentifier(params.get("inquiryid"));
  const inquiryUid = normalizeIdentifier(params.get("inquiryuid"));
  const jobId = normalizeIdentifier(params.get("jobid"));
  const jobUid = normalizeIdentifier(params.get("jobuid"));

  const hasInquiryIdentifiers = Boolean(inquiryId || inquiryUid);
  const hasJobIdentifiers = Boolean(jobId || jobUid);
  const shouldShowNoJobSheet = !hasInquiryIdentifiers && !hasJobIdentifiers;

  noJobSheet.classList.toggle("hidden", !shouldShowNoJobSheet);
  jobSheet.classList.toggle("hidden", shouldShowNoJobSheet);
};

const initProgressiveUrlIds = () => {
  const DEAL_PROPERTY_QUERY = `
    query calcDeals($id: PeterpmDealID!) {
      calcDeals(query: [{ where: { id: $id } }]) {
        Property_ID: field(arg: ["property_id"])
      }
    }
  `;

  const JOB_PROPERTY_QUERY = `
    query calcJobs($id: PeterpmJobID!) {
      calcJobs(query: [{ where: { id: $id } }]) {
        Property_ID: field(arg: ["property_id"])
      }
    }
  `;

  const searchParams = new URLSearchParams(window.location.search || "");
  const inquiryReloadKeyPart =
    normalizeIdentifier(searchParams.get("inquiryid")) ||
    normalizeIdentifier(searchParams.get("inquiryuid")) ||
    "unknown";
  let reloadTriggered = false;
  let reloadTimer = null;
  let resolvedPropertyId = "";
  let dealLookupAttempted = false;
  let jobLookupAttempted = false;
  let propertyLookupInFlight = false;

  const scheduleFinalReload = () => {
    if (reloadTriggered) return;
    if (reloadTimer) window.clearTimeout(reloadTimer);
    // Wait for URL updates to settle, then reload once.
    reloadTimer = window.setTimeout(() => {
      if (reloadTriggered) return;
      reloadTriggered = true;
      window.location.reload();
    }, 1500);
  };

  const applyUrlUpdates = (updates = {}) => {
    const url = new URL(window.location.href);
    let changed = false;

    Object.entries(updates).forEach(([key, value]) => {
      const normalized = normalizeIdentifier(value);
      if (!normalized) return;
      if (url.searchParams.get(key) === normalized) return;
      url.searchParams.set(key, normalized);
      changed = true;
    });

    if (changed) {
      window.history.replaceState(window.history.state, "", url.toString());
      scheduleFinalReload();
    }
  };

  const readUrlParam = (key) => {
    const url = new URL(window.location.href);
    return normalizeIdentifier(url.searchParams.get(key));
  };

  const getFirstRecord = (rows) => (Array.isArray(rows) ? rows[0] : rows || null);

  const resolvePropertyFromDealThenJob = async ({ inquiryId, jobId, propertyId }) => {
    if (propertyLookupInFlight) return;
    if (resolvedPropertyId) return;

    const urlPropertyId = readUrlParam("propertyid");
    if (urlPropertyId) {
      resolvedPropertyId = urlPropertyId;
      return;
    }

    if (propertyId) {
      resolvedPropertyId = propertyId;
      applyUrlUpdates({ propertyid: propertyId });
      return;
    }

    if (!inquiryId && !jobId) return;

    propertyLookupInFlight = true;
    try {
      if (!dealLookupAttempted && inquiryId) {
        dealLookupAttempted = true;
        const dealData = await graphqlRequest(DEAL_PROPERTY_QUERY, { id: inquiryId });
        const dealRecord = getFirstRecord(dealData?.calcDeals);
        const dealPropertyId = normalizeIdentifier(dealRecord?.Property_ID || "");
        if (dealPropertyId) {
          resolvedPropertyId = dealPropertyId;
          applyUrlUpdates({ propertyid: dealPropertyId });
          return;
        }
      }

      if (!jobLookupAttempted && jobId) {
        jobLookupAttempted = true;
        const jobData = await graphqlRequest(JOB_PROPERTY_QUERY, { id: jobId });
        const jobRecord = getFirstRecord(jobData?.calcJobs);
        const jobPropertyId = normalizeIdentifier(jobRecord?.Property_ID || "");
        if (jobPropertyId) {
          resolvedPropertyId = jobPropertyId;
          applyUrlUpdates({ propertyid: jobPropertyId });
        }
      }
    } catch (error) {
      console.error("Failed to resolve property id from deal/job", error);
    } finally {
      propertyLookupInFlight = false;
    }
  };

  const readJobUidFromLinks = () => {
    const links = Array.from(
      document.querySelectorAll("a[href*='/forms/'], a[href*='/job-sheet']"),
    );
    for (const link of links) {
      const href = (link.getAttribute("href") || "").trim();
      if (!href) continue;
      let candidate = "";
      try {
        const url = new URL(href, window.location.origin);
        const parts = (url.pathname || "")
          .split("/")
          .map((part) => part.trim())
          .filter(Boolean);
        if (
          parts.length >= 2 &&
          (parts[1] === "forms" || parts[1] === "job-sheet")
        ) {
          candidate = normalizeIdentifier(parts[0]);
        }
      } catch (error) {
        candidate = "";
      }
      if (candidate) return candidate;
    }
    return "";
  };

  const readJobUidFromUi = () => {
    const direct =
      normalizeIdentifier(
        document.querySelector("[data-job-unique-source]")?.textContent || "",
      ) || "";
    if (direct) return direct;

    const workOrderLabel = Array.from(document.querySelectorAll("span")).find(
      (el) => (el.textContent || "").trim() === "Work Order No:",
    );
    const fromSibling = normalizeIdentifier(
      workOrderLabel?.nextElementSibling?.textContent || "",
    );
    if (fromSibling) return fromSibling;

    return "";
  };

  const readText = (selector) => {
    const el = document.querySelector(selector);
    return normalizeIdentifier(el?.textContent || "");
  };

  const readMetaDataset = () => {
    const meta = document.querySelector(
      "[data-account-type], [data-company-account-type], [data-contact-id], [data-company-id]",
    );
    return meta?.dataset || {};
  };

  const syncFromKnownSources = () => {
    const meta = readMetaDataset();
    const inquiryId =
      normalizeIdentifier(
        document.querySelector("[data-var-inquiryid]")?.dataset?.varInquiryid || "",
      ) ||
      normalizeIdentifier(readUrlParam("inquiryid")) ||
      normalizeIdentifier(
        typeof INQUIRY_RECORD_ID !== "undefined" ? INQUIRY_RECORD_ID : "",
      );

    const providerId =
      normalizeIdentifier(document.body?.dataset?.serviceProviderId || "") ||
      normalizeIdentifier(
        typeof SERVICE_PROVIDER_ID !== "undefined" ? SERVICE_PROVIDER_ID : "",
      );

    const jobId =
      normalizeIdentifier(document.body?.dataset?.jobId || "") ||
      normalizeIdentifier(
        document.querySelector("[data-var-jobid]")?.dataset?.varJobid || "",
      ) ||
      normalizeIdentifier(typeof JOB_ID !== "undefined" ? JOB_ID : "");

    const jobUid =
      normalizeIdentifier(document.body?.dataset?.jobUid || "") ||
      normalizeIdentifier(
        typeof JOB_UNIQUE_ID !== "undefined" ? JOB_UNIQUE_ID : "",
      ) ||
      readJobUidFromUi() ||
      readJobUidFromLinks();

    const accountTypeValue =
      normalizeMetaValue(meta.accountType || "") ||
      readText(".accountType") ||
      normalizeIdentifier(
        typeof accountType !== "undefined" ? accountType : "",
      );

    const companyAccountTypeValue =
      normalizeMetaValue(meta.companyAccountType || "") ||
      readText(".companyAccountType") ||
      normalizeIdentifier(
        typeof companyType !== "undefined" ? companyType : "",
      );

    const contactIdValue =
      normalizeMetaValue(meta.contactId || "") ||
      normalizeIdentifier(typeof CONTACT_ID !== "undefined" ? CONTACT_ID : "");

    const companyIdValue =
      normalizeMetaValue(meta.companyId || "") ||
      normalizeIdentifier(typeof COMPANY_ID !== "undefined" ? COMPANY_ID : "");

    const propertyIdValue =
      normalizeIdentifier(document.body?.dataset?.propertyId || "") ||
      normalizeIdentifier(
        document.querySelector("[data-var-propertyid]")?.dataset?.varPropertyid || "",
      ) ||
      normalizeIdentifier(typeof PROPERTY_ID !== "undefined" ? PROPERTY_ID : "");

    applyUrlUpdates({
      serviceproviderid: providerId,
      jobid: jobId,
      jobuid: jobUid,
      accounttype: accountTypeValue,
      companyaccounttype: companyAccountTypeValue,
      contactid: contactIdValue,
      companyid: companyIdValue,
      propertyid: propertyIdValue,
    });

    void resolvePropertyFromDealThenJob({
      inquiryId,
      jobId,
      propertyId: propertyIdValue,
    });
  };

  syncFromKnownSources();

  window.addEventListener("provider-selected", (event) => {
    const providerId =
      event?.detail?.provider?.id ||
      event?.detail?.providerId ||
      event?.detail?.provider_id ||
      "";

    const normalizedProviderId = normalizeIdentifier(providerId);
    if (normalizedProviderId) {
      document.body.dataset.serviceProviderId = normalizedProviderId;
    }
    applyUrlUpdates({ serviceproviderid: providerId });
  });

  window.addEventListener("quote:created", (event) => {
    const detail = event?.detail || {};
    const jobId =
      detail.jobId || detail.id || detail.ID || detail.job_id || detail.Job_ID;
    const jobUid =
      detail.uniqueId ||
      detail.Unique_ID ||
      detail.unique_id ||
      detail.jobUid ||
      detail.jobuid ||
      detail.job_uid ||
      "";

    const normalizedJobId = normalizeIdentifier(jobId);
    const normalizedJobUid = normalizeIdentifier(jobUid);
    if (normalizedJobId) {
      document.body.dataset.jobId = normalizedJobId;
    }
    if (normalizedJobUid) {
      document.body.dataset.jobUid = normalizedJobUid;
    }
    applyUrlUpdates({
      jobid: jobId,
      jobuid: jobUid,
    });
  });

  // Some IDs resolve shortly after first paint via dynamic content.
  let attempts = 0;
  const maxAttempts = 90;
  const intervalId = window.setInterval(() => {
    syncFromKnownSources();
    attempts += 1;
    if (attempts >= maxAttempts) {
      window.clearInterval(intervalId);
    }
  }, 1000);
};

const initInquiryAccountSections = () => {
  const contact = document.querySelector('[data-section="contact"]');
  const company = document.querySelector('[data-section="company"]');
  const bodycorp = document.querySelector('[data-section="bodycorp"]');
  if (!contact || !company || !bodycorp) return;

  const normalizeType = (value) =>
    normalizeIdentifier(value).toLowerCase().replace(/[_-]+/g, " ").trim();

  const apply = () => {
    const params = new URLSearchParams(window.location.search || "");
    const account = normalizeType(
      (typeof accountType !== "undefined" ? accountType : "") ||
        params.get("accounttype"),
    );
    const companyTypeNormalized = normalizeType(
      (typeof companyType !== "undefined" ? companyType : "") ||
        params.get("companyaccounttype"),
    );

    // Exact rules requested:
    // accounttype => Contact | Company
    // companyaccounttype => Body Corp Company
    const showContact = account === "contact";
    const showCompany = account === "company";
    const showBodyCorp =
      showCompany && companyTypeNormalized === "body corp company";

    contact.classList.toggle("hidden", !showContact);
    contact.classList.toggle("flex", showContact);
    company.classList.toggle("hidden", !showCompany);
    company.classList.toggle("flex", showCompany);
    bodycorp.classList.toggle("hidden", !showBodyCorp);
    bodycorp.classList.toggle("flex", showBodyCorp);
  };

  apply();

  const root =
    document.querySelector("[data-var-inquiryid]") ||
    document.querySelector(".hideIfNoInquiry") ||
    document.body;
  if (!root) return;

  const observer = new MutationObserver(() => apply());
  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initJobSheetGuard();
  initProgressiveUrlIds();
  initInquiryAccountSections();

  const btn = document.getElementById("copy-link-btn");
  if (btn && navigator.clipboard) {
    const handleCopy = async () => {
      try {
        await navigator.clipboard.writeText(window.location.href);

        // reuse your toast system
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Link copied to clipboard.",
            },
          }),
        );
      } catch (error) {
        console.error("Failed to copy link", error);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: "Failed to copy link.",
            },
          }),
        );
      }
    };

    btn.addEventListener("click", handleCopy);
  }

  initPropertyContactStars();
  initRecommendationCard();
});

(function () {
  const normalize = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (lower === "null" || lower === "undefined") return "";
    if (/^\[.*\]$/.test(raw)) return "";
    return raw.replace(/^#/, "").trim();
  };

  const apply = () => {
    const params = new URLSearchParams(window.location.search || "");
    const inquiryId =
      normalize(params.get("inquiryid")) ||
      normalize(
        document.querySelector("[data-var-inquiryid]")?.dataset?.varInquiryid || "",
      ) ||
      normalize(
        typeof INQUIRY_RECORD_ID !== "undefined" ? INQUIRY_RECORD_ID : "",
      );
    const inquiryUid =
      normalize(params.get("inquiryuid")) ||
      normalize(typeof INQUIRY_UID !== "undefined" ? INQUIRY_UID : "");
    const propertyId =
      normalize(params.get("propertyid")) ||
      normalize(
        document.querySelector("[data-var-propertyid]")?.dataset?.varPropertyid || "",
      ) ||
      normalize(typeof PROPERTY_ID !== "undefined" ? PROPERTY_ID : "");

    const hasInquiry = Boolean(inquiryId || inquiryUid);
    const hasProperty = Boolean(propertyId);

    document.body.classList.toggle("no-inquiry", !hasInquiry);
    document.body.classList.toggle("no-property", !hasProperty);
  };

  if (document.body) apply();
  else document.addEventListener("DOMContentLoaded", apply);
})();
