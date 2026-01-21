import { paginationState } from "../pages/dashboard/dashboardState";

export function createPagination() {
  const container = document.querySelector("#pagination-pages");
  const prevBtn = document.querySelector("#lt-btn");
  const nextBtn = document.querySelector("#gt-btn");

  if (!container) return;

  let {
    startIndex,
    endIndex,
    currentPage,
    totalPageButonsGroup: group,
    totalPages,
  } = paginationState;

  let prevBtnIndex = currentPage;

  function renderButtons() {
    container.innerHTML = "";
    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i <= endIndex && i <= totalPages; i++) {
      const btn = document.createElement("div");
      btn.dataset.idx = i;
      btn.className =
        "h-8 px-3 py-1 rounded inline-flex justify-center items-center gap-2 cursor-pointer";

      const text = document.createElement("div");
      text.textContent = i;
      text.className = "text-xs text-slate-500";

      if (i === currentPage) {
        btn.classList.add("bg-primary-50", "border", "border-primary-200");
        text.classList.add("text-primary-600", "font-medium");
      }

      btn.appendChild(text);
      fragment.appendChild(btn);
    }

    if (endIndex < totalPages) {
      const ellipsis = document.createElement("div");
      ellipsis.className =
        "h-8 px-3 py-1 rounded inline-flex items-center text-slate-400 text-xs";
      ellipsis.textContent = "...";
      fragment.appendChild(ellipsis);
    }

    container.appendChild(fragment);
  }

  function handlePageClick(e) {
    const btn = e.target.closest("div[data-idx]");
    if (!btn) return;

    const page = Number(btn.dataset.idx);
    if (page === currentPage) return;

    currentPage = page;
    paginationState.currentPage = page;

    renderButtons();

    document.dispatchEvent(
      new CustomEvent("paginationChange", {
        detail: { currentPage: page },
      })
    );
  }

  function handlePrev() {
    if (startIndex <= 1) return;

    startIndex = Math.max(1, startIndex - group);
    endIndex = startIndex + group - 1;
    currentPage = startIndex;
    paginationState.currentPage = currentPage;

    renderButtons();
  }

  function handleNext() {
    if (endIndex >= totalPages) return;

    startIndex = endIndex + 1;
    endIndex = startIndex + group - 1;
    currentPage = startIndex;
    paginationState.currentPage = currentPage;

    renderButtons();
  }

  container.addEventListener("click", handlePageClick);
  prevBtn?.addEventListener("click", handlePrev);
  nextBtn?.addEventListener("click", handleNext);

  renderButtons();
}
