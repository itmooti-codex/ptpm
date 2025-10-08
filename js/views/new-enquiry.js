export class NewEnquiryView {
  constructor(model) {
    this.model = model;
    this.init();
  }

  init() {
    this.createSwitchAccountModal();
    this.createAddContactModal();
    this.createCancelModal();
    this.createResetModal();
  }

  createSwitchAccountModal() {
    // Create wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "switchAccountModalWrapper";
    modalWrapper.className =
      "flex flex-col item-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50";

    modalWrapper.innerHTML = `
      <div id="switchAccountBox" class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">
            Switch Account Type
          </div>
          <button id="closeSwitchAccountBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content -->
        <div class="py-6 text-neutral-700 text-base font-normal leading-tight">
          Switching to the Company will reset all filled data. Do you want to continue?
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end space-x-3 border-t">
          <button id="cancelSwitchAccountBtn" class="text-slate-500 text-sm font-medium hover:text-gray-700">
            Cancel
          </button>
          <button id="confirmSwitchAccountBtn" class="px-4 py-3 bg-sky-900 text-white text-sm font-medium rounded hover:bg-sky-800">
            Continue
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // References
    const modal = document.getElementById("switchAccountModalWrapper");
    const modalBox = document.getElementById("switchAccountBox");
    const closeBtn = document.getElementById("closeSwitchAccountBtn");
    const cancelBtn = document.getElementById("cancelSwitchAccountBtn");
    const confirmBtn = document.getElementById("confirmSwitchAccountBtn");

    this.toggleSwitchAccountModal = (show = true) => {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleSwitchAccountModal(false);
    });

    closeBtn.onclick = () => this.toggleSwitchAccountModal(false);
    cancelBtn.onclick = () => this.toggleSwitchAccountModal(false);

    confirmBtn.onclick = () => {
      console.log("Continue clicked");
      this.toggleSwitchAccountModal(false);
    };
  }

  createAddContactModal() {
    const element = document.createElement("div");
    element.id = "contactModalWrapper";
    element.className =
      "flex flex-col justify-center items-center fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50";

    element.innerHTML = `
      <div id="contactModalBox" class="bg-white w-full max-w-lg rounded-lg shadow-lg overflow-hidden">
        <!-- Header -->
        <div class="flex justify-between items-center px-6 py-4 border-b">
          <h2 class="text-lg font-semibold text-neutral-700">Add Property Contact</h2>
          <button id="closeModalBtn" class="text-gray-500 hover:text-gray-700">✕</button>
        </div>
  
        <!-- Tabs -->
        <div class="flex space-x-2 px-6 py-3 border-b">
          <button id="tabIndividual"
            class="px-4 py-1 border rounded-full text-sm font-medium text-blue-600 border-blue-600 bg-blue-50">
            Individual
          </button>
          <button id="tabEntity"
            class="px-4 py-1 border rounded-full text-sm font-medium text-gray-600 border-gray-300 hover:bg-gray-50">
            Entity
          </button>
        </div>
  
        <!-- Body -->
        <div class="px-6 py-4 overflow-y-auto max-h-[70vh]">
          <!-- Individual Form -->
          <div id="individualForm">
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Contact</label>
              <div class="relative">
                <input type="text" placeholder="Search by name, email, phone"
                  class="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <span class="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Role</label>
              <select class="text-slate-500 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Resident</option>
                <option>Owner</option>
                <option>Agent</option>
              </select>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">First Name<span class="text-red-500">*</span></label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email<span class="text-red-500">*</span></label>
                <input type="email" class="w-full border rounded-md px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">SMS Number</label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
            </div>
            <label class="inline-flex items-center space-x-2 mb-4">
              <input type="checkbox" class="accent-blue-600">
              <span class="text-sm text-gray-700">Is Primary Contact</span>
            </label>

            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Owner Type</label>
              <select class="text-slate-500 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Body Corp</option>
                <option>Company</option>
                <option>Trust</option>
              </select>
            </div>
          </div>
  
          <!-- Entity Form -->
          <div id="entityForm" class="hidden">
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Entity</label>
              <div class="relative">
                <input type="text" placeholder="Search entity"
                  class="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <span class="absolute right-3 top-2.5 text-gray-400">🔍</span>
              </div>
            </div>
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Entity Type</label>
              <select class="text-slate-500 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Body Corp</option>
                <option>Company</option>
                <option>Trust</option>
              </select>
            </div>
            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Role</label>
              <select class="text-slate-500 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Owner</option>
                <option>Agent</option>
                <option>Resident</option>
              </select>
            </div>
            <h3 class="font-medium text-gray-800 mb-2">Primary Contact</h3>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">First Name<span class="text-red-500">*</span></label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
            </div>
            <div class="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">Email<span class="text-red-500">*</span></label>
                <input type="email" class="w-full border rounded-md px-3 py-2">
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">SMS Number</label>
                <input type="text" class="w-full border rounded-md px-3 py-2">
              </div>
            </div>
            <label class="inline-flex items-center space-x-2 mb-4">
              <input type="checkbox" class="accent-blue-600">
              <span class="text-sm text-gray-700">Is Primary Contact</span>
            </label>

            <div class="mb-4">
              <label class="block text-sm text-gray-700 mb-1">Owner Type</label>
              <select class="text-slate-500 w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500">
                <option>Body Corp</option>
                <option>Company</option>
                <option>Trust</option>
              </select>
            </div>
          </div>
        </div>
  
        <!-- Footer -->
        <div class="flex justify-end space-x-3 px-6 py-4 border-t bg-gray-50">
          <button id="cancelBtn" class="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
          <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Save Contact</button>
        </div>
      </div>
    `;

    document.body.appendChild(element);

    const modal = document.getElementById("contactModalWrapper");
    const modalBox = document.getElementById("contactModalBox");
    const closeBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const tabIndividual = document.getElementById("tabIndividual");
    const tabEntity = document.getElementById("tabEntity");
    const individualForm = document.getElementById("individualForm");
    const entityForm = document.getElementById("entityForm");

    this.toggleAddContactModal = function (show = true) {
      if (show) {
        modal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      } else {
        modal.classList.add("hidden");
        document.body.style.overflow = "";
      }
    };

    modal.addEventListener("click", (e) => {
      if (!modalBox.contains(e.target)) this.toggleAddContactModal(false);
    });

    closeBtn.onclick = () => this.toggleAddContactModal(false);
    cancelBtn.onclick = () => this.toggleAddContactModal(false);

    function showForm(type) {
      if (type === "individual") {
        individualForm.classList.remove("hidden");
        entityForm.classList.add("hidden");
        tabIndividual.classList.add(
          "text-blue-600",
          "border-blue-600",
          "bg-blue-50"
        );
        tabEntity.classList.remove(
          "text-blue-600",
          "border-blue-600",
          "bg-blue-50"
        );
        tabEntity.classList.add("text-gray-600", "border-gray-300");
      } else {
        individualForm.classList.add("hidden");
        entityForm.classList.remove("hidden");
        tabEntity.classList.add(
          "text-blue-600",
          "border-blue-600",
          "bg-blue-50"
        );
        tabIndividual.classList.remove(
          "text-blue-600",
          "border-blue-600",
          "bg-blue-50"
        );
        tabIndividual.classList.add("text-gray-600", "border-gray-300");
      }
    }

    tabIndividual.addEventListener("click", () => showForm("individual"));
    tabEntity.addEventListener("click", () => showForm("entity"));
  }

  createCancelModal() {
    // Create wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "cancelModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="cancelModalBox" class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">
           Unsaved Changes
          </div>
          <button id="closeCancelBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content -->
        <div class="py-6 text-neutral-700 text-base font-normal leading-tight">
         You have unsaved changes. Do you want to discard them or save and exit?
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end space-x-3 border-t">
        <div id="cancelCancelBtn" data-lead-icon="false" data-size="medium" data-state="Default" data-text="true" data-trail-icon="false" data-type="outline" class="px-4 py-3 rounded outline outline-1 outline-offset-[-1px] outline-red-600 inline-flex justify-center items-center gap-2 overflow-hidden">
             <div class="justify-start text-red-600 text-sm font-medium font-sans leading-none">Discard Changes</div>
        </div>
          
        <div id="confirmCancelBtn" data-lead-icon="false" data-size="medium" data-state="Default" data-text="true" data-trail-icon="false" data-type="main" class="px-4 py-3 bg-sky-900 rounded outline outline-1 outline-offset-[-1px] outline-white inline-flex justify-center items-center gap-2 overflow-hidden">
            <div class="justify-start text-white text-sm font-medium font-sans leading-none">Save & Exit</div>
        </div>

        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // References
    const modal = document.getElementById("cancelModalWrapper");
    const modalBox = document.getElementById("cancelModalBox");
    const closeBtn = document.getElementById("closeCancelBtn");
    const cancelBtn = document.getElementById("cancelCancelBtn");
    const confirmBtn = document.getElementById("confirmCancelBtn");

    // Toggle visibility
    this.toggleCancelModal = (show = true) => {
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
      if (!modalBox.contains(e.target)) this.toggleCancelModal(false);
    });

    // Close on buttons
    closeBtn.onclick = () => this.toggleCancelModal(false);
    cancelBtn.onclick = () => this.toggleCancelModal(false);

    // Confirm cancel action
    confirmBtn.onclick = () => {
      console.log("Cancel confirmed");
      this.toggleCancelModal(false);
    };
  }

  createResetModal() {
    // Create wrapper
    const modalWrapper = document.createElement("div");
    modalWrapper.id = "resetModalWrapper";
    modalWrapper.className =
      "flex flex-col items-center justify-center fixed inset-0 bg-black bg-opacity-50 hidden z-50";

    modalWrapper.innerHTML = `
      <div id="resetModalBox" class="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <!-- Header -->
        <div class="flex justify-between items-center border-b pb-3">
          <div class="text-neutral-700 text-lg font-semibold leading-tight">
            Reset Confirmation
          </div>
          <button id="closeResetBtn" class="text-gray-600 hover:text-gray-800">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M18.75 6.81984L17.1802 5.25L12 10.4302L6.81984 5.25L5.25 6.81984L10.4302 12L5.25 17.1802L6.81984 18.75L12 13.5698L17.1802 18.75L18.75 17.1802L13.5698 12L18.75 6.81984Z" fill="#21272A"/>
            </svg>
          </button>
        </div>
  
        <!-- Content -->
        <div class="py-6 text-neutral-700 text-base font-normal leading-tight">
          Are you sure you want to reset? This action will clear all entered data and cannot be undone.
        </div>
  
        <!-- Actions -->
        <div class="pt-3 flex justify-end space-x-3 border-t">
          <button id="cancelResetBtn" class="text-slate-500 text-sm font-medium hover:text-gray-700">
            Cancel
          </button>
          <button id="confirmResetBtn" class="px-4 py-3 bg-orange-600 text-white text-sm font-medium rounded hover:bg-orange-700">
            Reset
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modalWrapper);

    // References
    const modal = document.getElementById("resetModalWrapper");
    const modalBox = document.getElementById("resetModalBox");
    const closeBtn = document.getElementById("closeResetBtn");
    const cancelBtn = document.getElementById("cancelResetBtn");
    const confirmBtn = document.getElementById("confirmResetBtn");

    // Toggle visibility
    this.toggleResetModal = (show = true) => {
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
      if (!modalBox.contains(e.target)) this.toggleResetModal(false);
    });

    // Close on buttons
    closeBtn.onclick = () => this.toggleResetModal(false);
    cancelBtn.onclick = () => this.toggleResetModal(false);

    // Confirm reset action
    confirmBtn.onclick = () => {
      console.log("Reset confirmed");
      this.toggleResetModal(false);
    };
  }
}
