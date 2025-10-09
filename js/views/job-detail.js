export class JobDetailView {
  constructor(model) {
    this.model = model;
    this.init();
  }

  init() {
    this.createDealInformationModal();
    this.CreateQuoteOnBehalfOfServicemanModal();
    this.EditNotes();
    this.createViewJobDocumentsModal();
    this.createActivityListModal();
    this.createWildlifeReportModal();
    this.createTasksModal();
  }

  createDealInformationModal() {
    // wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "dealInformationWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="dealInformationBox" class="bg-white rounded-lg shadow-lg w-full max-w-4xl p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">Deal Information</div>
          <button id="dealInformationCloseBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content (template only) -->
        <div class="py-6 space-y-4">
          <label class="block">
            <span class="block text-sm text-neutral-700 mb-2">Deal Name</span>
            <input class="w-full rounded border border-neutral-300 px-3 py-2 bg-neutral-100 outline-none" placeholder="Deal name"/>
          </label>
  
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2">Deal Value</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2" placeholder="0.00"/>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2">Sales Stage</span>
              <select class="w-full rounded border border-neutral-300 px-3 py-2">
                <option>Select</option>
              </select>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2">Expected Win Percentage</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2" placeholder=""/>
            </label>
  
            <div class="grid grid-cols-2 gap-4">
              <label class="block">
                <span class="block text-sm text-neutral-700 mb-2">Expected Close Date</span>
                <input class="w-full rounded border border-neutral-300 px-3 py-2" placeholder="DD/MM/YYYY"/>
              </label>
              <label class="block">
                <span class="block text-sm text-neutral-700 mb-2">Actual Close Date</span>
                <input class="w-full rounded border border-neutral-300 px-3 py-2" placeholder="DD/MM/YYYY"/>
              </label>
            </div>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2">Weighted Value</span>
              <input class="w-full rounded border border-neutral-300 px-3 py-2" placeholder="0.00"/>
            </label>
  
            <label class="block">
              <span class="block text-sm text-neutral-700 mb-2">Recent Activity</span>
              <select class="w-full rounded border border-neutral-300 px-3 py-2">
                <option>Select</option>
              </select>
            </label>
          </div>
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end items-center gap-3 border-t">
          <button id="dealInformationCancelBtn"
            class="px-4 py-3 rounded text-neutral-700 text-sm font-medium">Cancel</button>
  
          <button id="dealInformationSaveBtn"
            class="px-4 py-3 bg-sky-900 rounded text-white text-sm font-medium">Save</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper);

    // refs
    const modal = modalWrapper;
    const box = document.getElementById("dealInformationBox");
    const close = document.getElementById("dealInformationCloseBtn");
    const cancel = document.getElementById("dealInformationCancelBtn");
    const save = document.getElementById("dealInformationSaveBtn");

    // toggle
    this.toggleDealInformation = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // outside click
    modal.addEventListener("click", (e) => {
      if (!box.contains(e.target)) this.toggleDealInformation(false);
    });

    // buttons
    close.onclick = () => this.toggleDealInformation(false);
    cancel.onclick = () => this.toggleDealInformation(false);
    save.onclick = () => {
      console.log("Deal Information: Save clicked");
      this.toggleDealInformation(false);
    };
  }

  CreateQuoteOnBehalfOfServicemanModal() {
    // wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "createQuoteWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="createQuoteBox" class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">
            Create Quote on Behalf of Serviceman?
          </div>
          <button id="createQuoteCloseBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content (template only, no data wiring) -->
        <div class="py-6 space-y-4">
          <p class="text-neutral-700 text-base">
            You're creating this quote as the admin, but it will be attributed to:
          </p>
          <p class="text-neutral-900">
            <span class="font-semibold">Jack Lawson</span>
            <span class="text-neutral-600">(Serviceman ID:
              <a href="#" class="text-sky-700 hover:underline">#JL-042</a>)</span>
          </p>
          <p class="text-neutral-700">Do you want to proceed?</p>
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end gap-3 border-t">
          <button id="createQuoteCancelBtn"
            class="px-4 py-3 rounded text-neutral-700 text-sm font-medium">Cancel</button>
  
          <button id="createQuoteConfirmBtn"
            class="px-4 py-3 bg-sky-900 rounded text-white text-sm font-medium">Create & Notify</button>
        </div>
      </div>
    `;
    document.body.appendChild(modalWrapper);

    // refs
    const modal = modalWrapper;
    const box = document.getElementById("createQuoteBox");
    const close = document.getElementById("createQuoteCloseBtn");
    const cancel = document.getElementById("createQuoteCancelBtn");
    const confirm = document.getElementById("createQuoteConfirmBtn");

    // toggle
    this.toggleCreateQuoteOnBehalfOfServiceman = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // outside click
    modal.addEventListener("click", (e) => {
      if (!box.contains(e.target))
        this.toggleCreateQuoteOnBehalfOfServiceman(false);
    });

    // buttons
    close.onclick = () => this.toggleCreateQuoteOnBehalfOfServiceman(false);
    cancel.onclick = () => this.toggleCreateQuoteOnBehalfOfServiceman(false);
    confirm.onclick = () => {
      console.log("Create & Notify confirmed");
      this.toggleCreateQuoteOnBehalfOfServiceman(false);
    };
  }

  EditNotes() {
    // Build wrapper
    const wrapper = document.createElement("div");
    wrapper.id = "editNotesWrapper";
    wrapper.className =
      "fixed inset-0 z-50 hidden items-center justify-center bg-black/50";

    // Modal HTML
    wrapper.innerHTML = `
      <div id="editNotesBox" class="w-full max-w-2xl rounded-lg bg-white shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between border-b px-6 py-4">
          <h2 class="text-lg font-semibold text-neutral-800">Edit Notes</h2>
          <button id="editNotesCloseBtn" type="button" aria-label="Close"
                  class="text-neutral-500 hover:text-neutral-700">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z"
                    fill="#4B5563"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-6 py-5">
          <label for="notesRecommendations" class="mb-2 block text-sm font-medium text-neutral-700">
            Recommendations
          </label>
          <textarea id="notesRecommendations" rows="3"
            class="w-full resize-y rounded-md border border-slate-300 bg-white p-3 outline-none focus:border-sky-600 focus:ring-1 focus:ring-sky-600"
            placeholder=""></textarea>
        </div>
  
        <!-- Footer -->
        <div class="flex items-center justify-end gap-3 border-t px-6 py-4">
          <button id="editNotesCancelBtn" type="button"
            class="rounded px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-slate-100">
            Cancel
          </button>
          <button id="editNotesSaveBtn" type="button"
            class="rounded bg-sky-900 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800">
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const box = wrapper.querySelector("#editNotesBox");
    const btnX = wrapper.querySelector("#editNotesCloseBtn");
    const btnCancel = wrapper.querySelector("#editNotesCancelBtn");
    const btnSave = wrapper.querySelector("#editNotesSaveBtn");
    const textarea = wrapper.querySelector("#notesRecommendations");

    this.toggleEditNotes = (show = true) => {
      if (show) {
        wrapper.classList.remove("hidden");
        wrapper.classList.add("flex");
        document.body.style.overflow = "hidden";
        setTimeout(() => textarea?.focus(), 0);
      } else {
        wrapper.classList.add("hidden");
        wrapper.classList.remove("flex");
        document.body.style.overflow = "";
      }
    };

    wrapper.addEventListener("click", (e) => {
      if (!box.contains(e.target)) this.toggleEditNotes(false);
    });

    btnX.addEventListener("click", () => this.toggleEditNotes(false));
    btnCancel.addEventListener("click", () => this.toggleEditNotes(false));
    btnSave.addEventListener("click", () => {
      const value = textarea.value.trim();
      console.log("Save notes:", value); // replace with your save handler
      this.toggleEditNotes(false);
    });
  }

  createViewJobDocumentsModal() {
    // Create wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "quoteDocsModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="quoteDocsModalBox" class="bg-white rounded-lg shadow-lg w-full max-w-xl p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">
            Quote Documents
          </div>
          <button id="closeQuoteDocsBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>

        <div class="my-3 p-3 flex flex-col gap-2 border border-slate-200 rounded-xl">
        <!-- Upload Dropzone -->
        <div class="py-6">
          <div class="border-2 border-dashed border-gray-300 rounded-lg bg-slate-50">
            <div class="flex flex-col items-center justify-center text-center px-6 py-10">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mb-3" viewBox="0 0 24 24" fill="none">
                <path d="M12 3l-4 4h3v6h2V7h3l-4-4Z" fill="#64748B"/>
                <path d="M5 14a5 5 0 0 0 5 5h4a5 5 0 0 0 0-10" stroke="#CBD5E1" stroke-width="2" stroke-linecap="round"/>
              </svg>
              <p class="text-sm">
                <button id="quoteDocsUploadBtn" class="text-blue-600 hover:underline font-medium">Click to upload</button>
                <span class="text-gray-500"> or drag and drop</span>
              </p>
              <p class="text-gray-500 text-xs mt-2">SVG, PNG, JPG or GIF (max 800×400px)</p>
              <input id="quoteDocsFileInput" type="file" class="hidden" multiple accept=".svg,.png,.jpg,.jpeg,.gif" />
            </div>
          </div>
        </div>
  
        <!-- Files List -->
        <div id="quoteDocsList" class="space-y-3">
          ${["image1.jpg", "image1.jpg", "image1.jpg"]
            .map(
              (name) => `
            <div class="flex items-center justify-between bg-gray-100 rounded-md px-4 py-3">
              <div class="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
                </svg>
                <span class="text-sm text-gray-700">${name}</span>
              </div>
              <button class="quoteDocsDeleteBtn text-gray-500 hover:text-gray-700" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M9 3h6m-8 4h10m-8 0v12m6-12v12M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
            </div>
          `
            )
            .join("")}
        </div></div>
  
        
  
        <!-- Actions -->
        <div class="pt-6 mt-6 flex justify-end space-x-3 border-t">
          <button id="cancelQuoteDocsBtn" class="text-slate-500 text-sm font-medium hover:text-gray-700">
            Cancel
          </button>
          <button id="saveQuoteDocsBtn" class="px-4 py-3 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">
            Save
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // References
    const modal = document.getElementById("quoteDocsModalWrapper");
    const modalBox = document.getElementById("quoteDocsModalBox");
    const closeBtn = document.getElementById("closeQuoteDocsBtn");
    const cancelBtn = document.getElementById("cancelQuoteDocsBtn");
    const saveBtn = document.getElementById("saveQuoteDocsBtn");
    const uploadBtn = document.getElementById("quoteDocsUploadBtn");
    const fileInput = document.getElementById("quoteDocsFileInput");
    const list = document.getElementById("quoteDocsList");

    // Toggle visibility
    this.toggleQuoteDocsModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleQuoteDocsModal(false);
    });

    // Close on buttons
    closeBtn.onclick = () => this.toggleQuoteDocsModal(false);
    cancelBtn.onclick = () => this.toggleQuoteDocsModal(false);

    // Save action
    saveBtn.onclick = () => {
      console.log("Quote Documents saved");
      this.toggleQuoteDocsModal(false);
    };

    // Upload triggers
    uploadBtn.onclick = () => fileInput.click();
    fileInput.onchange = (e) => {
      const files = Array.from(e.target.files || []);
      files.forEach((f) => {
        const row = document.createElement("div");
        row.className =
          "flex items-center justify-between bg-gray-100 rounded-md px-4 py-3";
        row.innerHTML = `
          <div class="flex items-center space-x-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5c-7 0-10 7-10 7s3 7 10 7 10-7 10-7-3-7-10-7zm0 12a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 .001 6.001A3 3 0 0 0 12 9z"/>
            </svg>
            <span class="text-sm text-gray-700">${f.name}</span>
          </div>
          <button class="quoteDocsDeleteBtn text-gray-500 hover:text-gray-700" aria-label="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M9 3h6m-8 4h10m-8 0v12m6-12v12M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" stroke="#64748B" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        `;
        list.appendChild(row);
      });
      fileInput.value = "";
    };

    // Delegate delete clicks
    list.addEventListener("click", (e) => {
      const btn = e.target.closest(".quoteDocsDeleteBtn");
      if (btn) btn.parentElement.remove();
    });
  }

  createActivityListModal(records) {
    // -------- Dummy data (used if no records passed in) --------
    const demoRows = [
      {
        task: "Task 1",
        option: 1,
        service: "Possum",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 129.99,
        status: "Quoted",
      },
      {
        task: "Task 1",
        option: 2,
        service: "Possum",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 119.99,
        status: "To Be Scheduled",
      },
      {
        task: "Task 2",
        option: 1,
        service: "Rat removal",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 89.99,
        status: "Scheduled",
      },
      {
        task: "Task 2",
        option: 2,
        service: "Rat removal",
        text: "Lorem ipsum dolor sit amet consectetur. Neque libero enim aliquam a vestibulum lobortis...",
        price: 109.99,
        status: "Completed",
      },
    ];

    const rows = Array.isArray(records) && records.length ? records : demoRows;

    // Status → Tailwind pill styles
    const statusStyles = {
      Quoted: "bg-purple-100 text-purple-700",
      "To Be Scheduled": "bg-yellow-100 text-yellow-700",
      Scheduled: "bg-blue-100 text-blue-700",
      Completed: "bg-emerald-100 text-emerald-700",
      Cancelled: "bg-red-100 text-red-700",
      Pending: "bg-gray-100 text-gray-700",
    };

    // -------- Create wrapper --------
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "activityListModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="activityListModalBox" class="bg-white rounded-lg shadow-lg w-[90vw]">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-6 py-3">
          <h3 class="text-lg font-semibold leading-tight">Activity List</h3>
          <button id="closeActivityListBtn" class="p-1 rounded hover:bg-blue-700/60">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-4">
          <div class="overflow-x-auto">
            <table class="min-w-full text-left">
              <thead>
                <tr class="text-gray-600 text-sm">
                  <th class="font-medium py-3 px-4">Task</th>
                  <th class="font-medium py-3 px-4">Option</th>
                  <th class="font-medium py-3 px-4">Service</th>
                  <th class="font-medium py-3 px-4">Quoted Text</th>
                  <th class="font-medium py-3 px-4">Quoted Price</th>
                  <th class="font-medium py-3 px-4">Activity Status</th>
                </tr>
              </thead>
              <tbody id="activityListTbody" class="text-gray-800"></tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // -------- Render function --------
    this.renderRows = (data) => {
      const tbody = document.getElementById("activityListTbody");
      tbody.innerHTML = data
        .map((r, i) => {
          const pill = statusStyles[r.status] || "bg-gray-100 text-gray-700";
          const price =
            typeof r.price === "number" ? `$${r.price.toFixed(2)}` : r.price;

          return `
          <tr class="${i % 2 ? "bg-gray-50" : "bg-white"}">
            <td class="py-4 px-4 whitespace-nowrap">${r.task ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">${r.option ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">${r.service ?? "-"}</td>
            <td class="py-4 px-4 max-w-[520px]">
              <div class="truncate" title="${(r.text ?? "").replace(
                /"/g,
                "&quot;"
              )}">
                ${r.text ?? ""}
              </div>
            </td>
            <td class="py-4 px-4 whitespace-nowrap">${price ?? "-"}</td>
            <td class="py-4 px-4 whitespace-nowrap">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${pill}">
                ${r.status ?? "Pending"}
              </span>
            </td>
          </tr>`;
        })
        .join("");
    };

    // Initial render
    this.renderRows(rows);

    // -------- Wiring / controls --------
    const modal = document.getElementById("activityListModalWrapper");
    const modalBox = document.getElementById("activityListModalBox");
    const closeBtn = document.getElementById("closeActivityListBtn");

    // Toggle visibility
    this.toggleActivityListModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close when clicking outside
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleActivityListModal(false);
    });

    // Close on button
    closeBtn.onclick = () => this.toggleActivityListModal(false);

    // Optional: expose a way to re-render with new data later
    this.updateActivityListModal = (nextRecords = []) => {
      this.renderRows(nextRecords);
    };
  }

  createWildlifeReportModal(initial = {}) {
    const defaults = {
      possums: String(initial.possums ?? "1"),
      possumComment: initial.possumComment ?? "",
      turkeys: String(initial.turkeys ?? "1"),
      turkeyComment: initial.turkeyComment ?? "",
      address: initial.address ?? "NSW 2482 Mullumbimby, 13 Parakeet Place",
    };

    // Wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "wildlifeReportModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black/50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="wildlifeReportModalBox" class="bg-white rounded-lg shadow-lg w-[95vw] max-w-md">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-4 py-3">
          <div class="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21.4566 7.97344C21.29 7.90795 21.1125 7.87455 20.9335 7.875H20.9147C19.9693 7.88906 18.9089 8.77453 18.3525 10.1138C17.6855 11.7159 17.9925 13.3552 19.0435 13.7766C19.2099 13.8421 19.3873 13.8755 19.5661 13.875C20.5163 13.875 21.5911 12.9844 22.1522 11.6363C22.8146 10.0341 22.5028 8.39484 21.4566 7.97344ZM15.3563 14.2256C14.0532 12.0633 13.4907 11.25 12 11.25C10.5094 11.25 9.94222 12.0684 8.6391 14.2256C7.52347 16.0706 5.26879 16.2244 4.70629 17.7914C4.59216 18.0784 4.53485 18.3849 4.53754 18.6937C4.53754 19.9683 5.51254 21 6.71254 21C8.20316 21 10.2328 19.8098 12.0047 19.8098C13.7766 19.8098 15.7969 21 17.2875 21C18.4875 21 19.4579 19.9687 19.4579 18.6937C19.4589 18.3846 19.4 18.0781 19.2844 17.7914C18.7219 16.2187 16.4719 16.0706 15.3563 14.2256ZM9.02394 9.1875C9.08671 9.18756 9.14939 9.18286 9.21144 9.17344C10.2994 9.01547 10.9786 7.50797 10.7321 5.80547C10.5 4.20047 9.52597 3 8.50738 3C8.44462 2.99994 8.38194 3.00465 8.31988 3.01406C7.23191 3.17203 6.55269 4.67953 6.79926 6.38203C7.03129 7.98234 8.00535 9.1875 9.02394 9.1875ZM17.1994 6.38203C17.446 4.67953 16.7668 3.17203 15.6788 3.01406C15.6167 3.00465 15.5541 2.99994 15.4913 3C14.4727 3 13.5005 4.20047 13.268 5.80547C13.0214 7.50797 13.7007 9.01547 14.7886 9.17344C14.8507 9.18286 14.9134 9.18756 14.9761 9.1875C15.9947 9.1875 16.9688 7.98234 17.1994 6.38203ZM4.95801 13.7766C6.00754 13.3547 6.3141 11.7141 5.64801 10.1138C5.08738 8.76563 4.01347 7.875 3.06472 7.875C2.88585 7.8745 2.7085 7.9079 2.54207 7.97344C1.49254 8.39531 1.18597 10.0359 1.85207 11.6363C2.41269 12.9844 3.4866 13.875 4.43535 13.875C4.61422 13.8755 4.79157 13.8421 4.95801 13.7766Z" stroke="white" stroke-miterlimit="10"/>
            </svg>
            <h3 class="text-base font-semibold">Wildlife Report</h3>
          </div>
          <button id="closeWildlifeReportBtn" class="p-1 rounded hover:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-4 py-4 space-y-4">
          <!-- Possums -->
          <div>
            <label class="block text-sm text-gray-700 mb-1">Possums</label>
            <div class="relative">
              <select id="wrPossums" class="appearance-none w-full border border-gray-300 rounded-md px-3 py-2 pr-9 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                ${Array.from(
                  { length: 10 },
                  (_, i) =>
                    `<option value="${i + 1}" ${
                      defaults.possums == String(i + 1) ? "selected" : ""
                    }>${i + 1}</option>`
                ).join("")}
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z"/>
              </svg>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">Comment</label>
            <textarea id="wrPossumComment" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder=""></textarea>
          </div>
  
          <!-- Turkeys -->
          <div>
            <label class="block text-sm text-gray-700 mb-1">Turkeys</label>
            <div class="relative">
              <select id="wrTurkeys" class="appearance-none w-full border border-gray-300 rounded-md px-3 py-2 pr-9 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                ${Array.from(
                  { length: 10 },
                  (_, i) =>
                    `<option value="${i + 1}" ${
                      defaults.turkeys == String(i + 1) ? "selected" : ""
                    }>${i + 1}</option>`
                ).join("")}
              </select>
              <svg class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5H7z"/>
              </svg>
            </div>
          </div>
          <div>
            <label class="block text-sm text-gray-700 mb-1">Comment</label>
            <textarea id="wrTurkeyComment" rows="3" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder=""></textarea>
          </div>
  
          <!-- Address -->
          <div>
            <label class="block text-sm text-gray-700 mb-1">Release Address</label>
            <input id="wrAddress" type="text" class="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
        </div>
  
        <!-- Footer -->
        <div class="flex justify-end gap-3 px-4 py-3 border-t rounded-b-lg">
          <button id="cancelWildlifeReportBtn" class="text-sm text-slate-500 font-medium hover:text-gray-700">Cancel</button>
          <button id="saveWildlifeReportBtn" class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // Pre-fill values
    document.getElementById("wrPossums").value = defaults.possums;
    document.getElementById("wrPossumComment").value = defaults.possumComment;
    document.getElementById("wrTurkeys").value = defaults.turkeys;
    document.getElementById("wrTurkeyComment").value = defaults.turkeyComment;
    document.getElementById("wrAddress").value = defaults.address;

    // Refs
    const modal = document.getElementById("wildlifeReportModalWrapper");
    const modalBox = document.getElementById("wildlifeReportModalBox");
    const closeBtn = document.getElementById("closeWildlifeReportBtn");
    const cancelBtn = document.getElementById("cancelWildlifeReportBtn");
    const saveBtn = document.getElementById("saveWildlifeReportBtn");

    // Toggle
    this.toggleWildlifeReportModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    // Close interactions
    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleWildlifeReportModal(false);
    });
    closeBtn.onclick = () => this.toggleWildlifeReportModal(false);
    cancelBtn.onclick = () => this.toggleWildlifeReportModal(false);

    // Save: collect values (hook up to your API as needed)
    saveBtn.onclick = () => {
      const payload = {
        possums: Number(document.getElementById("wrPossums").value),
        possumComment: document.getElementById("wrPossumComment").value.trim(),
        turkeys: Number(document.getElementById("wrTurkeys").value),
        turkeyComment: document.getElementById("wrTurkeyComment").value.trim(),
        address: document.getElementById("wrAddress").value.trim(),
      };
      console.log("Wildlife Report saved:", payload);
      this.toggleWildlifeReportModal(false);
    };
  }

  createTasksModal(tasks) {
    // ---- Demo data (used if none passed) ----
    const demo = [
      {
        title: "Field Inspection and building inspection",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "In Progress",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
      {
        title: "Rat Removal",
        description:
          "Lorem ipsum dolor sit amet consectetur. Mi sed ac diam ac orci nec iaculis aliquet. Eu ut pretium...",
        status: "To-Do",
      },
    ];

    const rows = Array.isArray(tasks) && tasks.length ? tasks : demo;

    const statusPills = {
      "In Progress": "bg-yellow-100 text-yellow-800",
      "To-Do": "bg-blue-100 text-blue-700",
      Completed: "bg-emerald-100 text-emerald-700",
      Blocked: "bg-red-100 text-red-700",
    };

    // ---- Wrapper ----
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "tasksModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black/50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="tasksModalBox" class="bg-white rounded-lg shadow-lg">
        <!-- Header -->
        <div class="flex items-center justify-between bg-blue-800 text-white rounded-t-lg px-5 py-3">
          <h3 class="text-base font-semibold">Tasks</h3>
          <button id="closeTasksBtn" class="p-1 rounded hover:bg-white/10">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.82 17.18 5.25 12 10.43 6.82 5.25 5.25 6.82 10.43 12 5.25 17.18 6.82 18.75 12 13.57 17.18 18.75 18.75 17.18 13.57 12 18.75 6.82Z" fill="white"/>
            </svg>
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-2 py-2">
          <ul id="tasksList" class="divide-y divide-gray-200">
            <!-- rows injected -->
          </ul>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // ---- Render ----
    function render(list) {
      const ul = document.getElementById("tasksList");
      ul.innerHTML = list
        .map((t) => {
          const pill = statusPills[t.status] || "bg-gray-100 text-gray-700";
          return `
            <li class="px-4 py-3">
              <div class="flex items-center gap-3">
                <!-- left icon -->
                <div class="flex-shrink-0">
                  <span class="inline-flex items-center justify-center w-6 h-6">
                    <svg viewBox="0 0 24 24" class="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 12l2.5 2.5L16 9" />
                    </svg>
                  </span>
                </div>
  
                <!-- text block -->
                <div class="flex-1 w-full flex items-center gap-3">
                  <div class="flex flex-nowrap min-w-0 gap-9">
                    <div class="w-fit text-neutral-700">
                      ${t.title ?? "-"}
                    </div>
                    <div class="text-sm text-gray-600 truncate min-w-0">
                      ${t.description ?? ""}
                    </div>
                  </div>
  
                  <!-- status pill -->
                  <span class="ml-auto inline-flex items-center px-3 py-1 rounded-full text-xs ${pill}">
                    ${t.status ?? "To-Do"}
                  </span>
  
                </div>
              </div>
            </li>
          `;
        })
        .join("");
    }

    render(rows);

    // ---- Wiring ----
    const modal = document.getElementById("tasksModalWrapper");
    const modalBox = document.getElementById("tasksModalBox");
    const closeBtn = document.getElementById("closeTasksBtn");

    this.toggleTasksModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleTasksModal(false);
    });
    closeBtn.onclick = () => this.toggleTasksModal(false);

    // Expose a way to update later
    this.updateTasksModal = (next = []) => render(next);
  }
}
