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
  const lowered = raw.toLowerCase();
  if (lowered === "null" || lowered === "undefined") return "";
  if (/^\[[^\]]+\]$/.test(raw)) return "";
  return raw;
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
    }
  };

  const initialServiceProviderId =
    typeof SERVICE_PROVIDER_ID !== "undefined" ? SERVICE_PROVIDER_ID : "";
  const initialJobId = typeof JOB_ID !== "undefined" ? JOB_ID : "";
  const initialJobUid =
    typeof JOB_UNIQUE_ID !== "undefined" ? JOB_UNIQUE_ID : "";

  applyUrlUpdates({
    serviceproviderid: initialServiceProviderId,
    jobid: initialJobId,
    jobuid: initialJobUid,
  });

  window.addEventListener("provider-selected", (event) => {
    const providerId =
      event?.detail?.provider?.id ||
      event?.detail?.providerId ||
      event?.detail?.provider_id ||
      "";

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

    applyUrlUpdates({
      jobid: jobId,
      jobuid: jobUid,
    });
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initJobSheetGuard();
  initProgressiveUrlIds();

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

