document.addEventListener("DOMContentLoaded", () => {
  const myUrlProfile = API_URL;
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
            "Api-key": API_KEY,
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

const updateProfileURL = API_URL;

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
          "Api-key": API_KEY,
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
