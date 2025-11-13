document.addEventListener("DOMContentLoaded", () => {
  const btn = document.getElementById("copy-link-btn");
  if (!btn || !navigator.clipboard) return;

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
});
