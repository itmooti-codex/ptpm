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

document.addEventListener("DOMContentLoaded", () => {
  initJobSheetGuard();

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

document.addEventListener("DOMContentLoaded", function () {
  const normalize = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (
      lower === "null" ||
      lower === "undefined" ||
      lower === "none" ||
      /^\\[.*\\]$/.test(raw)
    ) {
      return "";
    }
    return raw;
  };

  const getQueryValue = (...keys) => {
    const params = new URLSearchParams(window.location.search || "");
    for (const key of keys) {
      const value = normalize(params.get(key));
      if (value) return value;
    }
    return "";
  };

  const getHiddenText = (id) => {
    const el = document.getElementById(id);
    return normalize(el?.textContent || "");
  };

  const readGlobal = (name) => {
    try {
      if (typeof globalThis[name] !== "undefined") {
        return normalize(globalThis[name]);
      }
    } catch (error) {
      console.warn(`Unable to read global ${name}`, error);
    }
    return "";
  };

  const resolveAccountType = () =>
    (
      getQueryValue("accounttype", "accountType") ||
      readGlobal("accountType") ||
      getHiddenText("account-type")
    )
      .toString()
      .trim()
      .toLowerCase();

  const resolveCompanyType = () =>
    (
      getQueryValue("companyaccounttype", "companyAccountType") ||
      readGlobal("companyType") ||
      readGlobal("companyAccountType") ||
      getHiddenText("company-internal-type")
    )
      .toString()
      .trim()
      .toLowerCase();

  const isBodyCorpType = (value) => {
    if (!value) return false;
    return value.includes("body corp") || value.includes("body corporate");
  };

  const applySections = () => {
    const contact = document.querySelector('[data-section="contact"]');
    const company = document.querySelector('[data-section="company"]');
    const bodycorp = document.querySelector('[data-section="bodycorp"]');
    if (!contact || !company || !bodycorp) return;

    const accountTypeValue = resolveAccountType();
    const companyTypeValue = resolveCompanyType();
    const isContact = accountTypeValue === "contact";
    const isCompany = accountTypeValue === "company";
    const showBodyCorp = isCompany && isBodyCorpType(companyTypeValue);

    contact.style.display = isContact ? "flex" : "none";
    company.style.display = isCompany ? "flex" : "none";
    bodycorp.style.display = showBodyCorp ? "flex" : "none";
  };

  applySections();

  const inquiryRoot =
    document.querySelector("[data-var-inquiryid]") ||
    document.querySelector(".hideIfNoInquiry") ||
    document.body;
  if (!inquiryRoot) return;

  const observer = new MutationObserver(() => applySections());
  observer.observe(inquiryRoot, {
    childList: true,
    subtree: true,
    characterData: true,
  });
});

(function () {
  const normalize = (value) => {
    const raw = (value || "").toString().trim();
    if (!raw) return "";
    const lower = raw.toLowerCase();
    if (lower === "null" || lower === "undefined") return "";
    if (/^\\[.*\\]$/.test(raw)) return "";
    return raw.replace(/^#/, "").trim();
  };
  const inquiryId = normalize("[inquiryid]");
  const inquiryUid = normalize("[inquiryuid]");
  const propertyId = normalize("[propertyid]");
  const hasInquiry = Boolean(inquiryId || inquiryUid);
  const hasProperty = Boolean(propertyId);
  const apply = () => {
    if (!hasInquiry) document.body.classList.add("no-inquiry");
    if (!hasProperty) document.body.classList.add("no-property");
  };
  if (document.body) apply();
  else document.addEventListener("DOMContentLoaded", apply);
})();
