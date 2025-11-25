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
    this.createAddActivitiesSection();
    this.createAddMaterialsSection();
    this.createUploadsSection();
    this.createInvoiceSection();
    this.setupSectionNavigation();
    this.setupClientSearch();
  }

  createAddActivitiesSection() {
    // This section stays hidden until the Add Activities tab is shown; rows will be rendered dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "add-activities");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="w-[440px] bg-white rounded-lg outline outline-1 outline-gray-300 p-4 flex flex-col gap-4">
        <div class="flex items-center gap-2">
          <input type="checkbox" class="w-4 h-4 border-gray-300 rounded" />
          <div class="text-neutral-700 text-base font-semibold">Add New Activity</div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Task</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Options</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Service</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Quantity</label>
            <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Activity Price</label>
            <div class="relative">
              <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Activity Text</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Activity Status</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Date Required</label>
            <div class="relative">
              <input type="text" placeholder="dd/mm/yyyy" class="w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-500 placeholder:text-slate-400" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Quoted Price</label>
            <div class="relative">
              <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10" />
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Quoted Text</label>
            <textarea rows="2" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700"></textarea>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Warranty</label>
            <textarea rows="2" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700"></textarea>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Note</label>
            <textarea rows="2" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700"></textarea>
          </div>
        </div>

        <div class="flex items-center gap-6">
          <label class="flex items-center gap-2 text-neutral-700 text-sm">
            <input type="checkbox" class="w-4 h-4 border-gray-300 rounded" /> Include in Quote
          </label>
          <label class="flex items-center gap-2 text-neutral-700 text-sm">
            <input type="checkbox" class="w-4 h-4 border-gray-300 rounded" /> Include in Quote Subtotal
          </label>
        </div>

        <div class="flex justify-end items-center gap-3">
          <button class="text-sky-700 text-sm font-medium px-3 py-2 rounded">Cancel</button>
          <button class="text-white bg-sky-900 text-sm font-medium px-4 py-2 rounded">Add</button>
        </div>
      </div>

      <div class="flex-1 bg-white rounded-lg outline outline-1 outline-gray-300 p-4">
        <div id="addActivitiesTable" class="w-full"></div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
  }

  createAddMaterialsSection() {
    // Hidden container for Materials tab content; table rows to be injected dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "add-materials");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="w-[440px] bg-white rounded-lg outline outline-1 outline-gray-300 p-4 flex flex-col gap-4">
        <div class="text-neutral-700 text-base font-semibold">Add Materials</div>

        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Material Name</label>
            <input type="text" placeholder="Enter material name" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Status</label>
              <div class="relative">
                <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Total</label>
              <div class="relative">
                <input type="text" value="$ 0.00" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10" />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">$</span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Description</label>
            <textarea rows="2" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700"></textarea>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Transaction Type</label>
              <div class="relative">
                <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Tax</label>
              <div class="relative">
                <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Receipt</label>
            <div class="w-full h-20 border border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-sky-700 text-sm">
              <!-- placeholder for upload control -->
              Click to upload or drag and drop
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Service Provider</label>
            <div class="relative">
              <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
              <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
              </span>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-3 pt-2 border-t border-gray-200">
          <div class="text-neutral-700 text-sm font-semibold">Payment</div>
          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Batch Code</label>
              <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Xero Bill ID</label>
              <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Date Scheduled</label>
              <div class="relative">
                <input type="text" placeholder="dd/mm/yyyy" class="w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-500 placeholder:text-slate-400" />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Date Paid</label>
              <div class="relative">
                <input type="text" placeholder="dd/mm/yyyy" class="w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-500 placeholder:text-slate-400" />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex justify-end items-center gap-3">
          <button class="text-sky-700 text-sm font-medium px-3 py-2 rounded">Cancel</button>
          <button class="text-white bg-sky-900 text-sm font-medium px-4 py-2 rounded">Add</button>
        </div>
      </div>

      <div class="flex-1 bg-white rounded-lg outline outline-1 outline-gray-300 p-4">
        <div id="addMaterialsTable" class="w-full"></div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
  }

  createUploadsSection() {
    // Hidden container for Uploads tab; content to be populated dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "uploads");
    wrapper.className =
      "hidden w-full h-full flex flex-row gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="w-[440px] bg-white rounded-lg outline outline-1 outline-gray-300 p-4 flex flex-col gap-4">
        <div class="text-neutral-700 text-base font-semibold">Uploads</div>
        <div class="flex flex-col gap-3">
          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Title</label>
            <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Description</label>
            <textarea rows="3" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700"></textarea>
          </div>
          <div class="flex flex-col gap-1">
            <label class="text-neutral-700 text-sm font-medium">Upload</label>
            <div class="w-full h-24 border border-dashed border-gray-300 rounded bg-gray-50 flex items-center justify-center text-sky-700 text-sm">
              <!-- placeholder for upload control -->
              Click to upload or drag and drop
            </div>
          </div>
        </div>
        <div class="flex justify-end items-center gap-3">
          <button class="text-sky-700 text-sm font-medium px-3 py-2 rounded">Cancel</button>
          <button class="text-white bg-sky-900 text-sm font-medium px-4 py-2 rounded">Add</button>
        </div>
      </div>

      <div class="flex-1 bg-white rounded-lg outline outline-1 outline-gray-300 p-4">
        <div id="uploadsTable" class="w-full"></div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
  }

  createInvoiceSection() {
    // Hidden container for Invoice tab; values/status to be injected dynamically.
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-section", "invoice");
    wrapper.className =
      "hidden w-full h-full flex flex-col gap-4 p-4 bg-gray-50";

    wrapper.innerHTML = `
      <div class="bg-white rounded-lg outline outline-1 outline-gray-300 w-full">
        <div class="h-2 bg-sky-900 rounded-t-lg"></div>

        <div class="p-4 flex flex-col gap-4">
          <div class="flex justify-between items-center">
            <div class="flex flex-col gap-1">
              <div class="text-neutral-700 text-base font-semibold">Invoice Detail</div>
              <div class="text-sm text-neutral-700">
                Invoice Number:
                <a href="#" class="text-sky-700 font-medium underline-offset-2 hover:underline">#INV-0004</a>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <div class="text-neutral-700 text-sm">Xero Invoice Status:</div>
              <div class="px-3 py-1 rounded-full bg-slate-100 text-neutral-700 text-xs font-semibold">Create Invoice</div>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
            <div class="flex flex-col gap-2">
              <div class="text-neutral-700 text-sm font-semibold">Xero Entity Info</div>
              <div class="flex items-center gap-2 text-sky-700 text-sm"><span>◆</span><span>Contact Xero ID</span></div>
              <div class="flex items-center gap-2 text-sky-700 text-sm"><span>◆</span><span>Company Xero ID</span></div>
              <div class="flex items-center gap-2 text-sky-700 text-sm"><span>◆</span><span>Accounts Contact</span></div>
            </div>
            <div class="text-sm text-neutral-700 flex items-center gap-2">
              <span>Invoice ID:</span>
              <a href="#" class="text-sky-700 underline-offset-2 hover:underline">--</a>
            </div>
          </div>

          <div class="border-t border-gray-200 pt-6 pb-4 flex flex-col items-center gap-4">
            <div class="w-64 h-32 bg-slate-100 rounded-md flex items-center justify-center text-neutral-500 text-sm">
              <!-- illustration placeholder -->
              No invoice has been generated yet.
            </div>
            <button class="px-4 py-2 bg-sky-900 text-white text-sm font-medium rounded">Generate Invoice</button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Payment ID</label>
              <input type="text" class="w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700" />
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Payment Method</label>
              <div class="relative">
                <select class="appearance-none w-full px-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 pr-10"></select>
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                  <svg width="15" height="9" viewBox="0 0 15 9" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14.8002 1.16453L7.98236 7.98236C7.91904 8.04575 7.84385 8.09604 7.76108 8.13035C7.67831 8.16466 7.5896 8.18232 7.5 8.18232C7.4104 8.18232 7.32168 8.16466 7.23892 8.13035C7.15615 8.09604 7.08096 8.04575 7.01764 7.98236L0.199801 1.16453C0.0718705 1.03659 -1.34797e-09 0.863084 0 0.682163C1.34796e-09 0.501242 0.0718705 0.327731 0.199801 0.1998C0.327731 0.0718701 0.501242 1.34796e-09 0.682163 0C0.863084 -1.34796e-09 1.03659 0.0718701 1.16452 0.1998L7.5 6.53613L13.8355 0.1998C13.8988 0.136456 13.974 0.0862081 14.0568 0.0519262C14.1395 0.0176443 14.2283 0 14.3178 0C14.4074 0 14.4961 0.0176443 14.5789 0.0519262C14.6617 0.0862081 14.7369 0.136456 14.8002 0.1998C14.8635 0.263145 14.9138 0.338346 14.9481 0.42111C14.9824 0.503874 15 0.59258 15 0.682163C15 0.771746 14.9824 0.860451 14.9481 0.943215C14.9138 1.02598 14.8635 1.10118 14.8002 1.16453Z" fill="#78829D"/></svg>
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Invoice Date</label>
              <div class="relative">
                <input type="text" placeholder="dd/mm/yyyy" class="w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 placeholder:text-slate-500" />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-neutral-700 text-sm font-medium">Due Date</label>
              <div class="relative">
                <input type="text" placeholder="dd/mm/yyyy" class="w-full pr-10 pl-3 py-2.5 bg-white rounded outline outline-1 outline-gray-300 text-slate-700 placeholder:text-slate-500" />
                <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 2.5V4.5M13 2.5V4.5M3.5 7.5H14.5M4 3.5H14C14.5523 3.5 15 3.94772 15 4.5V14C15 14.5523 14.5523 15 14 15H4C3.44772 15 3 14.5523 3 14V4.5C3 3.94772 3.44772 3.5 4 3.5Z" stroke="#94A3B8" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"/></svg>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg outline outline-1 outline-gray-300 w-full flex flex-col gap-4 p-4">
        <div class="flex justify-between items-center">
          <div class="text-neutral-700 text-sm font-semibold">Invoice Total</div>
          <div class="text-neutral-700 text-base font-bold">$ X.XX</div>
        </div>
        <div class="flex flex-wrap justify-end gap-3">
          <button class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm" disabled>Download Invoice (PDF)</button>
          <button class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm" disabled>View Xero Invoice (Admin)</button>
          <button class="px-4 py-2 rounded outline outline-1 outline-gray-300 text-slate-500 text-sm" disabled>Send To Customer</button>
          <button class="px-4 py-2 bg-sky-900 text-white text-sm font-medium rounded">Generate Invoice</button>
        </div>
      </div>
    `;

    document.getElementById("replaceable-section").appendChild(wrapper);
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

  setupSectionNavigation() {
    this.sectionOrder = [
      "job-information",
      "add-activities",
      "add-materials",
      "uploads",
      "invoice",
    ].filter((id) => document.querySelector(`[data-section="${id}"]`));

    this.currentSection = this.sectionOrder[0] || null;
    this.showSection(this.currentSection);
    this.setupJobInformationTabs();

    const sidebarItems = document.querySelectorAll("[data-section-target]");
    sidebarItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const target = item.getAttribute("data-section-target");
        this.showSection(target);
      });
    });

    const nextBtn =
      document.querySelector('[data-nav-action="next"]') ||
      document.querySelector('[data-nav="next"]') ||
      Array.from(document.querySelectorAll("button, div")).find((el) =>
        el.textContent.trim().toLowerCase().startsWith("next")
      );
    const backBtn =
      document.querySelector('[data-nav-action="back"]') ||
      document.querySelector('[data-nav="back"]') ||
      Array.from(document.querySelectorAll("button, div")).find(
        (el) => el.textContent.trim().toLowerCase() === "back"
      );

    if (nextBtn)
      nextBtn.addEventListener("click", (e) => this.goNextSection(e));
    if (backBtn)
      backBtn.addEventListener("click", (e) => this.goPrevSection(e));
  }

  setupJobInformationTabs() {
    const jobInfo = document.querySelector('[data-section="job-information"]');
    if (!jobInfo) return;

    const individualSection = jobInfo.querySelector(
      '[data-job-section="job-section-individual"]'
    );
    const appointmentSection =
      jobInfo.querySelector('[data-job-section="job-section-appointment"]') ||
      document.querySelector('[data-job-section="job-section-appointment"]');

    const overviewTab = document.querySelector('[data-tab="overview"]');
    const appointmentTab = document.querySelector('[data-tab="appointments"]');

    const setTabState = (active) => {
      if (overviewTab) {
        overviewTab.classList.toggle("border-b-2", active === "overview");
        overviewTab.classList.toggle("border-sky-900", active === "overview");
        overviewTab.classList.toggle("text-sky-900", active === "overview");
      }
      if (appointmentTab) {
        appointmentTab.classList.toggle(
          "border-b-2",
          active === "appointments"
        );
        appointmentTab.classList.toggle(
          "border-sky-900",
          active === "appointments"
        );
        appointmentTab.classList.toggle(
          "text-sky-900",
          active === "appointments"
        );
      }
    };

    const showIndividual = () => {
      if (individualSection) individualSection.classList.remove("hidden");
      if (appointmentSection) appointmentSection.classList.add("hidden");
      setTabState("overview");
    };

    const showAppointment = () => {
      if (individualSection) individualSection.classList.add("hidden");
      if (appointmentSection) appointmentSection.classList.remove("hidden");
      setTabState("appointments");
    };

    showIndividual();

    if (overviewTab) overviewTab.addEventListener("click", showIndividual);
    if (appointmentTab)
      appointmentTab.addEventListener("click", showAppointment);
  }

  showSection(sectionId) {
    if (!sectionId) return;
    this.currentSection = sectionId;

    this.sectionOrder.forEach((id) => {
      const el = document.querySelector(`[data-section="${id}"]`);
      if (!el) return;
      if (id === sectionId) {
        el.classList.remove("hidden");
      } else {
        el.classList.add("hidden");
      }
    });

    this.updateSidebarState(sectionId);
    this.updateSectionLabel(sectionId);
  }

  updateSidebarState(sectionId) {
    const items = document.querySelectorAll("[data-section-target]");
    const currentIndex = this.sectionOrder.indexOf(sectionId);
    items.forEach((item) => {
      const target = item.getAttribute("data-section-target");
      const idx = this.sectionOrder.indexOf(target);
      item.classList.remove("text-sky-900", "text-green-600");
      if (target === sectionId) {
        item.classList.add("text-sky-900");
      } else if (idx !== -1 && idx < currentIndex) {
        item.classList.add("text-green-600");
      }
    });
  }

  updateSectionLabel(sectionId) {
    const labelEl =
      document.querySelector("[data-current-section-label]") ||
      document.getElementById("currentSectionLabel");
    if (!labelEl) return;
    const pretty = sectionId
      .replace(/-/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
    labelEl.textContent = pretty;
  }

  goNextSection(e) {
    if (e) e.preventDefault();
    const idx = this.sectionOrder.indexOf(this.currentSection);
    const nextId = this.sectionOrder[idx + 1];
    if (nextId) this.showSection(nextId);
  }

  goPrevSection(e) {
    if (e) e.preventDefault();
    const idx = this.sectionOrder.indexOf(this.currentSection);
    const prevId = this.sectionOrder[idx - 1];
    if (prevId) this.showSection(prevId);
  }

  async setupClientSearch() {
    const input = document.querySelector('[data-contact-search="input"]');
    const list = document.querySelector('[data-contact-search="results"]');
    const hidden = document.querySelector('[data-contact-field="contact_id"]');
    if (!input || !list) return;

    const render = (items = [], query = "") => {
      const lower = (query || "").toLowerCase();
      const filtered = items.filter((c) => {
        if (lower == "") {
          return true;
        } else {
          return (
            c.Email?.toString().includes(lower) ||
            c.First_Name?.toString().includes(lower) ||
            c.Last_Name?.toString().includes(lower) ||
            c.SMS_Number?.toString().includes(lower)
          );
        }
      });
      list.innerHTML = filtered
        .map(
          (c, idx) => `
            <button type="button" data-option-index="${idx}" class="w-full text-left px-3 py-2 hover:bg-sky-50 flex flex-col gap-0.5">
              <span class="text-sm text-neutral-800">${
                c.First_Name + "" + c.Last_Name || "Unknown"
              }</span>
              <span class="text-xs text-neutral-500">${c.Email || ""}</span>
            </button>
          `
        )
        .join("");
      list.dataset.count = filtered.length;
      list.filteredContacts = filtered;
      list.classList.toggle("hidden", filtered.length === 0);
    };

    const contacts = (await this.model?.fetchContacts?.()) || [];

    input.addEventListener("focus", () => {
      render(contacts, input.value || "");
    });
    input.addEventListener("input", (e) => {
      render(contacts, e.target.value || "");
    });
    list.addEventListener("mousedown", (e) => {
      const btn = e.target.closest("button[data-option-index]");
      if (!btn) return;
      e.preventDefault();
      const idx = Number(btn.dataset.optionIndex);
      const opts = list.filteredContacts || [];
      const contact = opts[idx];
      if (!contact) return;
      input.value = contact.label || "";
      if (hidden) hidden.value = contact.id || "";
      list.classList.add("hidden");
    });
    document.addEventListener("click", (e) => {
      if (e.target === input || list.contains(e.target)) return;
      list.classList.add("hidden");
    });

    // prime contacts asynchronously
    if (typeof this.model?.loadContacts === "function") {
      this.model.loadContacts().then((loaded) => {
        render(loaded || contacts, input.value || "");
      });
    }
  }
}
