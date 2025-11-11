function fetchServicesCatalog() {
  return Promise.resolve(SERVICES_DATA);
}

function openTemplateLink(messageId) {
  if (!messageId) return;
  const url = `https://app.ontraport.com/#!/message/edit&id=${messageId}`;
  window.open(url, "_blank");
}

function pageActions() {
  return {
    // ...other methods/state
    currentJobId: JOB_ID, // reuse the constant you already set
    isDuplicating: false,

    async printJobSheet() {
      const target = document.getElementById("job-sheet") || document.body;

      const opt = {
        margin: 0,
        filename: "job-sheet.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 1, useCORS: true },
        jsPDF: { unit: "pt", format: "a1", orientation: "landscape" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      // Generate PDF and open in a new tab without forcing download
      await html2pdf()
        .from(target)
        .set(opt)
        .toPdf()
        .get("pdf")
        .then((pdf) => {
          const blob = pdf.output("blob");
          const url = URL.createObjectURL(blob);
          window.open(url, "_blank");
        })
        .catch((e) => {
          console.error(e);
          window.dispatchEvent(
            new CustomEvent("toast:show", {
              detail: {
                type: "error",
                message: "Could not generate PDF.",
              },
            })
          );
        });
    },

    async duplicateJob(jobId) {
      if (!jobId || this.isDuplicating) return;
      this.isDuplicating = true;

      try {
        // 1) fetch the source job using your existing FULL_JOB_QUERY
        const data = await graphqlRequest(FULL_JOB_QUERY, { id: jobId });
        const src = (data?.calcJobs && data.calcJobs[0]) || null;
        if (!src) throw new Error("Could not load job to duplicate.");

        // 2) transform aliased fields like Accepted_Quote_Activity_Price -> accepted_quote_activity_price
        const toCreatePayload = (jobObj) => {
          const payload = {};
          for (const [key, val] of Object.entries(jobObj)) {
            // ignore purely display/helper aliases if any sneak in
            if (key === "ID") continue; // server will set a new id
            const snake = key.toLowerCase(); // aliases are already snake-like with underscores
            payload[snake] = val;
          }
          return payload;
        };

        const payload = toCreatePayload(src);

        // 3) create the duplicate
        await graphqlRequest(DUPLICATE_JOB_QUERY, { payload });

        // 4) toast + close the menu popover (if any)
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "success",
              message: "Job duplicated successfully.",
            },
          })
        );
      } catch (err) {
        console.error(err);
        window.dispatchEvent(
          new CustomEvent("toast:show", {
            detail: {
              type: "error",
              message: err?.message || "Failed to duplicate job.",
            },
          })
        );
      } finally {
        this.isDuplicating = false;
      }
    },
  };
}

async function updateJobEmailCheckbox(fieldId) {
  if (!fieldId) return;

  const mutation = `
        mutation updateJob($id: PeterpmJobID!, $payload: JobUpdateInput = null) {
          updateJob(
            query: [{ where: { id: $id } }]
            payload: $payload
          ) {
            ${fieldId}
          }
        }
      `;

  const variables = {
    id: JOB_ID,
    payload: {
      [fieldId]: true, // checkbox field set to true
    },
  };

  try {
    await graphqlRequest(mutation, variables);
    // optional: toast or console log
    // console.log(\`Updated job field \${fieldId} to true\`);
  } catch (error) {
    console.error("Failed to update job email checkbox:", error);
  }
}

async function createCallback(jobId) {
  if (!jobId) return;
  //for this job id, need to send true to create_a_callback checkbox field and show proper toast message
  try {
    await graphqlRequest(UPDATE_JOB_MUTATION, {
      id: jobId,
      payload: { create_a_callback: true },
    });
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "success",
          message: "Callback request created successfully.",
        },
      })
    );
  } catch (error) {
    console.error("Failed to create callback request", error);
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "error",
          message: "Failed to create callback request.",
        },
      })
    );
  }
}

async function deleteJob(jobId) {
  if (!jobId) return;
  //for this job id, need to send true to create_a_callback checkbox field and show proper toast message
  try {
    await graphqlRequest(DELETE_JOB_QUERY, {
      id: jobId,
    });
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "success",
          message: "Job Delete Successfully.",
        },
      })
    );
  } catch (error) {
    console.error("Failed to delete job", error);
    window.dispatchEvent(
      new CustomEvent("toast:show", {
        detail: {
          type: "error",
          message: "Failed to delete job.",
        },
      })
    );
  }
}
