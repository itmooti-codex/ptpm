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
      `.announcement-section[data-container="${container}"]`
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
  "openProfileStatusButton"
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
  })
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
