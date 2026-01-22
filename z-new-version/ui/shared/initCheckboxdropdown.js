export function initCheckboxDropdown({
  btnId,
  cardId,
  checkboxSelector,
  allToggleId = null,
  onChange = null, //optional callback
  storeTo = null, // optional {target: obj, key: str}
}) {
  const btn = document.getElementById(btnId);
  const card = document.getElementById(cardId);
  if (!btn || !card) return;

  const boxes = Array.from(card.querySelectorAll(checkboxSelector));
  const allToggle = allToggleId ? card.querySelector(allToggleId) : null;

  // Toggle visibility
  const onBtnClick = (e) => {
    e.stopPropagation();
    card.classList.toggle("hidden");
  };

  // Close on outside click
  const onDocClick = (e) => {
    if (
      !card.classList.contains("hidden") &&
      !card.contains(e.target) &&
      e.target !== btn
    ) {
      card.classList.add("hidden");
    }
  };

  // Sync "select all" checkbox
  const syncAll = () => {
    if (!allToggle) return;
    const allChecked = boxes.every((b) => b.checked);
    allToggle.checked = allChecked;
  };

  // // Main checkbox handler
  // const onBoxChange = () => {
  //   syncAll();

  //   if (storeTo) {
  //     storeTo.target[storeTo.key] = boxes
  //       .filter((b) => b.checked)
  //       .map((b) => (b.value || "").toLowerCase().trim());
  //   }

  //   if (onChange) onChange();
  // };

  // boxes.forEach((b) => b.addEventListener("change", onBoxChange));

  // "ALL" toggle case
  if (allToggle) {
    allToggle.addEventListener("change", () => {
      const next = allToggle.checked;
      boxes.forEach((b) => (b.checked = next));
      onBoxChange();
    });
  }

  // Attach open/close listeners
  btn.addEventListener("click", onBtnClick);
  document.addEventListener("click", onDocClick);

  // Set initial UI
  syncAll();
}
