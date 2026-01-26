const getVitalStatsPlugin = async () => {
  if (typeof window.getVitalStatsPlugin !== "function") {
    throw new Error("SDK not initialized. Ensure sdk.js is loaded first.");
  }
  return window.getVitalStatsPlugin();
};

const normalizeServiceProviderId = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  const numeric = Number(trimmed);
  return Number.isNaN(numeric) ? trimmed : numeric;
};

const updateServiceProvider = async (id, payload) => {
  const providerId = normalizeServiceProviderId(id);
  if (!providerId) {
    throw new Error("Service provider id is missing.");
  }
  const plugin = await getVitalStatsPlugin();
  const model = plugin.switchTo("PeterpmServiceProvider");
  const mutation = model.mutation();
  mutation.update((q) => q.where("id", providerId).set(payload));
  await mutation.execute(true).toPromise();
};

document.addEventListener("DOMContentLoaded", () => {
  const IDServi = SERVICE_PROVIDER_ID;

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

      try {
        await updateServiceProvider(IDServi, {
          workload_capacity: workloadCapacity,
        });
        location.reload();
      } catch (error) {
        console.error("Error updating profile status:", error);
      }
    });
  });
});

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

    try {
      await updateServiceProvider(IDService, {
        workload_capacity: selectedStatus,
        ...(selectedDuration && { remove_status_after: selectedDuration }),
      });
      location.reload();
    } catch (error) {
      console.error("Error updating profile status:", error);
    }
  });
