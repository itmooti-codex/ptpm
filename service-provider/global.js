const apiUrl = "https://peterpm.vitalstats.app/api/v1/graphql";
const apiKey = "1rBR-jpR3yE3HE1VhFD0j";
const removeStatusAfterOpValue =
  "[Visitor//Contact as Service Provider//Remove Status After]";
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
  const removeStatusAfter =removeStatusAfterOpValue;
  const durationSelect = document.getElementById("durationSelect");
  for (let option of durationSelect.options) {
    if (option.value === removeStatusAfter) {
      option.selected = true;
      break;
    }
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const myUrlProfile = "https://peterpm.vitalstats.app/api/v1/graphql";
  const IDServi = "[Visitor//Service Provider ID]";

  // Listen for clicks on buttons with class 'setStatus'
  document.querySelectorAll(".setStatus").forEach((button) => {
    button.addEventListener("click", async () => {
      // Get the desired workload capacity from the button's data attribute
      document.getElementById("optonSelect").textContent = "Updating Status...";
      document.getElementById("statusChangeBottom").textContent =
        "Updating Status...";
      const workloadCapacity = button.dataset.status;

      // Update UI immediately
      const optonSelect = document.getElementById("optonSelect");
      optonSelect.style.display = "hidden";

      const mutation = `
mutation updateServiceProvider($payload: ServiceProviderUpdateInput = null) {
updateServiceProvider(
query: [{ where: { id: ${IDServi} } }]
payload: $payload
) {
workload_capacity   
}
}`;

      const variables = {
        payload: {
          workload_capacity: workloadCapacity,
        },
      };

      try {
        const response = await fetch(myUrlProfile, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-key": "1rBR-jpR3yE3HE1VhFD0j",
          },
          body: JSON.stringify({
            query: mutation,
            variables: variables,
          }),
        });

        const result = await response.json();

        if (!response.ok || result.errors) {
          throw new Error(
            result.errors?.[0]?.message || "Failed to update status."
          );
        }
        location.reload();
      } catch (error) {
        console.error("Error updating profile status:", error);
      }
    });
  });
});

const updateProfileURL = "https://peterpm.vitalstats.app/api/v1/graphql";

document.getElementById("profileStatus").addEventListener("change", () => {
  const status = document.getElementById("profileStatus").value;
  const durationWrapper = document.getElementById("durationWrapper");
  if (status === "LOOKING") {
    durationWrapper.classList.add("hidden");
    durationSelect.value = "";
  } else {
    durationWrapper.classList.remove("hidden");
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const status = document.getElementById("profileStatus").value;
  const durationWrapper = document.getElementById("durationWrapper");
  if (status === "LOOKING") {
    durationWrapper.classList.add("hidden");
    const durationSelect = document.getElementById("durationSelect");
    durationSelect.value = "";
  } else {
    durationWrapper.classList.remove("hidden");
  }
});

document
  .getElementById("saveProfileStatusButton")
  .addEventListener("click", async () => {
    document.getElementById("optonSelect").textContent = "Updating Status...";
    document.getElementById("statusChangeBottom").textContent =
      "Updating Status...";
    const selectStatus = document.getElementById("profileStatus");
    const selectedStatus = selectStatus.value;
    const durationWrapper = document.getElementById("durationWrapper");
    const selectDuration = document.getElementById("durationSelect");
    const IDService = "[Visitor//Service Provider ID]";

    if (!selectedStatus || selectedStatus === "") {
      alert("Please select a valid status!");
      return;
    }

    let selectedDuration = null;
    if (!durationWrapper.classList.contains("hidden")) {
      selectedDuration = selectDuration.value;
      if (!selectedDuration || selectedDuration === "Select Duration") {
        alert("Please select a valid duration!");
        return;
      }
    }

    const mutation = `
mutation updateServiceProvider($payload: ServiceProviderUpdateInput = null) {
updateServiceProvider(
query: [{ where: { id: ${IDService} } }]
payload: $payload
) {
remove_status_after  
workload_capacity   
}
}
`;

    const variables = {
      payload: {
        workload_capacity: selectedStatus,
        ...(selectedDuration && { remove_status_after: selectedDuration }),
      },
    };

    try {
      const response = await fetch(updateProfileURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Api-key": "1rBR-jpR3yE3HE1VhFD0j",
        },
        body: JSON.stringify({
          query: mutation,
          variables: variables,
        }),
      });

      const result = await response.json();

      if (!response.ok || result.errors) {
        throw new Error(
          result.errors?.[0]?.message || "Failed to update status."
        );
      }
      location.reload();
    } catch (error) {
      console.error("Error updating profile status:", error);
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
