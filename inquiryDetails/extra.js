const normalizePrimaryFlag = (value) => {
  if (value === null || value === undefined) return false;
  const normalized = String(value).trim().toLowerCase();
  if (!normalized) return false;
  return ["true", "1", "yes", "y", "t"].includes(normalized);
};

const updatePropertyContactStars = (root = document) => {
  const stars = root.querySelectorAll(".property-contact-star");
  stars.forEach((star) => {
    const isPrimary =
      normalizePrimaryFlag(star.dataset.primaryOwner) ||
      normalizePrimaryFlag(star.dataset.primaryResident) ||
      normalizePrimaryFlag(star.dataset.primaryManager);
    star.classList.toggle("is-primary", isPrimary);
  });
};

const initPropertyContactStars = () => {
  const list = document.querySelector("[data-property-contact-list]");
  if (!list) return;
  updatePropertyContactStars(list);
  const observer = new MutationObserver(() =>
    updatePropertyContactStars(list)
  );
  observer.observe(list, { childList: true, subtree: true });
  window.addEventListener("propertyContacts:changed", () =>
    updatePropertyContactStars(list)
  );
};

document.addEventListener("DOMContentLoaded", () => {
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
          })
        );
      } catch (error) {
        console.error("Failed to copy link", error);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: "Failed to copy link.",
            },
          })
        );
      }
    };

    btn.addEventListener("click", handleCopy);
  }

  initPropertyContactStars();
});
