window.addEventListener("load", function () {
  const loader = document.getElementById("loader");
  setTimeout(() => {
    loader.classList.add("fade-out");
  }, 500);
});
function toggleModal() {
  const modal = document.getElementById("announcements-modal");
  modal.style.display = modal.style.display === "block" ? "none" : "block";
}

const body = document.body;
const sliders = document.querySelectorAll(".side");
body.setAttribute(
  "x-data",
  JSON.stringify({
    deleteQuoteId: {},
    deleting: false,
    isSidebarExpanded: true,
    deleteQuoteModal: false,
    createQuoteModal: false,
    paymentsData: {
      PeterpmService_Service_Name: [],
      activityData: [],
      Xero_Bill_Status: [],
    },
    modalIsOpen: false,
    isChecked: false,
    isExpandedClientSection: false,
    isExpandedMaterialsSection: false,
    accordianPropertyAndOwnerInformationExpoanded: window.innerWidth >= 1100,
    accordianHelpExpoanded: window.innerWidth >= 1100,
    accordianPropertyDescriptionExpoanded: window.innerWidth >= 1100,
    accordianPropertyInformationExpoanded: window.innerWidth >= 1100,
    accordianResidentExpoanded: window.innerWidth >= 1100,
    accordianExpanded: window.innerWidth >= 1100,
    appointmentData: {},
    scheduledData: {},
    openScheduledInquiryModal: false,
    returnInquiryModal: false,
    scheduleSiteVisitModal: false,
    scheduledRreturnInquiryModal: false,
    rescheduleVisitOpenModal: false,
    selectedTab: "overview",
  }),
);
window.addEventListener("resize", () => {
  const xData = JSON.parse(document.body.getAttribute("x-data"));
  xData.accordianExpanded = window.innerWidth >= 1100;
  document.body.setAttribute("x-data", JSON.stringify(xData));
});

window.addEventListener("resize", () => {
  const xDatas = JSON.parse(document.body.getAttribute("x-data"));
  xDatas.accordianResidentExpoanded = window.innerWidth >= 1100;
  document.body.setAttribute("x-data", JSON.stringify(xDatas));
});
sliders.forEach((slider) => {
  slider.setAttribute(":class", "isSidebarExpanded ? 'pl-64px' : 'pl-20px'");
});
const urlClassMap = {
  "https://my.awesomate.pro/components": ".bgDashboard",
  "https://my.awesomate.pro/inquire": ".bgInquiries",
  "https://my.awesomate.pro/quotes": ".bgQuotes",
  "https://my.awesomate.pro/jobs": ".bgJob",
  "https://my.awesomate.pro/payments": ".bgPayments",
  "https://my.awesomate.pro/calender": ".bgCalendar",
  "https://my.awesomate.pro/appointments": ".bgAppointments",
};
const currentUrl = window.location.href;
if (urlClassMap[currentUrl]) {
  const targetElement = document.querySelector(urlClassMap[currentUrl]);
  if (targetElement) {
    targetElement.style.backgroundColor = "#0052CC";
  }
}

//Hide sandbox banner
window.addEventListener("load", function () {
  setTimeout(function () {
    document.querySelector("body > div:nth-child(1)").style.display = "none";
  }, 2000);
});

function addSidebarOverlay() {
  const sidebarOverlay = document.querySelector(".sidebarOverlay");
  if (sidebarOverlay) {
    if (window.innerWidth < 1100) {
      if (sidebarOverlay.classList.contains("block")) {
        document.body.style.overflow = "hidden";
      } else {
        document.body.style.overflow = "auto";
      }
    } else {
      document.body.style.overflow = "auto";
    }
  }
}
setInterval(addSidebarOverlay, 100);

document.addEventListener("DOMContentLoaded", () => {
  const tabContainers = document.querySelectorAll(".tab-container");

  function filterAnnouncements(container, filter) {
    const announcementSection = document.querySelector(
      `.announcement-section[data-container="${container}"]`,
    );

    if (!announcementSection) return;

    const unreadDivs = announcementSection.querySelectorAll(".unread");
    const readDivs = announcementSection.querySelectorAll(".read");

    if (filter === "all") {
      unreadDivs.forEach((div) => div.classList.remove("hidden"));
      readDivs.forEach((div) => div.classList.remove("hidden"));
    } else if (filter === "unread") {
      unreadDivs.forEach((div) => div.classList.remove("hidden"));
      readDivs.forEach((div) => div.classList.add("hidden"));
    }
  }

  tabContainers.forEach((tabContainer) => {
    const tabs = tabContainer.querySelectorAll(".selectorTab");
    const containerType = tabContainer.dataset.container;

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        // Update selected tab UI
        tabs.forEach((t) => t.classList.remove("selectedTab"));
        tab.classList.add("selectedTab");

        // Filter announcements
        const filter = tab.dataset.filter;
        filterAnnouncements(containerType, filter);
      });
    });
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const statusDiv = document.querySelector("#optonSelect");
  const statusValue = statusDiv.getAttribute("value");
  const profileStatusSelect = document.getElementById("profileStatus");

  Array.from(profileStatusSelect.options).forEach((option) => {
    if (option.value === statusValue) {
      option.selected = true;
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const removeStatusAfter = REMOVE_STATUS_AFTER_OP_VALUE;
  const durationSelect = document.getElementById("durationSelect");
  for (let option of durationSelect.options) {
    if (option.value === removeStatusAfter) {
      option.selected = true;
      break;
    }
  }
});

// Select Elements
const profileModal = document.getElementById("profileStatusModal");
const openProfileModalButton = document.getElementById(
  "openProfileStatusButton",
);
const closeProfileModalButtons = [
  document.getElementById("closeProfileStatusModal"),
  document.getElementById("cancelProfileStatus"),
];
const saveStatusButton = document.getElementById("saveProfileStatusButton");

// Open Modal
openProfileModalButton.addEventListener("click", () => {
  profileModal.classList.remove("hidden");
  profileModal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
});

// Close Modal
closeProfileModalButtons.forEach((button) =>
  button.addEventListener("click", () => {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }),
);

// Close Modal on Outside Click
profileModal.addEventListener("click", (e) => {
  if (e.target === profileModal) {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }
});

// Close Modal on Escape Key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    profileModal.classList.add("hidden");
    profileModal.classList.remove("flex");
    document.body.classList.remove("overflow-hidden");
  }
});

// Save Status Button Action
saveStatusButton.addEventListener("click", () => {
  // alert('Profile status updated successfully!');
  var stat = document.getElementById("profileStatus").value;
  var optonSelect = document.getElementById("optonSelect");
  optonSelect.textContent = stat;
  profileModal.classList.add("hidden");
  profileModal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
});

tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: "var(--primary-color)",
        secondary: "var(--secondary-color)",
        accent: "var(--accent-color)",
        complementary: "var(--complementary-color)",
        dark: "var(--dark-color)",
        light: "var(--light-color)",
        white: "var(--white-color)",
        line: "var(--line-color)",
        danger: "var(--danger-color)",
        warning: "var(--warning-color)",
        cool: "var(--cool-color)",
        success: "var(--success-color)",
      },
      screens: {
        xlg: "1100px",
      },
      fontSize: {
        h1: [
          "var(--headline-fs)",
          {
            lineHeight: "var(--headline-lh)",
            fontWeight: "var(--headline-fw)",
          },
        ],
        h2: [
          "var(--subheadline-fs)",
          {
            lineHeight: "var(--subheadline-lh)",
            fontWeight: "var(--subheadline-fw)",
          },
        ],
        h3: [
          "var(--subheadline2-fs)",
          {
            lineHeight: "var(--subheadline2-lh)",
            fontWeight: "var(--subheadline2-fw)",
          },
        ],
        largeBodyText: [
          "var(--largebodytext-fs)",
          {
            lineHeight: "var(--largebodytext-lh)",
            fontWeight: "var(--largebodytext-fw)",
          },
        ],
        bodyText: [
          "var(--bodytext-fs)",
          {
            lineHeight: "var(--bodytext-lh)",
            fontWeight: "var(--bodytext-fw)",
          },
        ],
        button: [
          "var(--button-fs)",
          { lineHeight: "var(--button-lh)", fontWeight: "var(--button-fw)" },
        ],
        label: [
          "var(--label-fs)",
          { lineHeight: "var(--label-lh)", fontWeight: "var(--label-fw)" },
        ],
        blockquote: [
          "var(--blockquote-fs)",
          {
            lineHeight: "var(--blockquote-lh)",
            fontWeight: "var(--blockquote-fw)",
          },
        ],
      },
    },
  },
};
