const loggedInUserId = loggedInUserIdOp;
const loggedInServiceProviderId = SERVICE_PROVIDER_ID;
let pauseNotification = pauseNotificationOp;
let newInquiries = newInquiriesOp;
let newQuotesJobs = newQuotesJobsOp;
let forums = forumsOp;

const bellIcon = document.getElementById("bell-icon");
let previouslyFetchedUnread = new Set();

function formatDate(timestamp) {
  if (!timestamp) return "";

  const date = new Date(timestamp * 1000);
  const options = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return date.toLocaleString("en-US", options);
}

// Dynamically build `andWhereGroup` based on preferences
const buildAndWhereGroup = () => {
  const conditions = [];

  if (newInquiries === "Yes") {
    conditions.push('{ where: { type: "Inquiry" } }');
  }
  if (newQuotesJobs === "Yes") {
    conditions.push('{ orWhere: { type: "Quote/Job" } }');
  }
  if (forums === "Yes") {
    conditions.push('{ orWhere: { type: "Post" } }');
    conditions.push('{ orWhere: { type: "Comment" } }');
  }

  return conditions.join(", ");
};

// Fetch Announcements Query
const FETCH_ANNOUNCEMENTS = (andWhereGroup) => `
    query calcAnnouncements($service_provider_id_all: TextScalar) {
      calcAnnouncements(
		limit: 5000
		offset: 0
        query: [
          {
            where: {
              service_provider_id_all: $service_provider_id_all
            }
          }
          {
            andWhereGroup: [
              ${andWhereGroup}
            ]
          }
        ]
      ) {
        ID: field(arg: ["id"])
        Title: field(arg: ["title"])
        Read_Contacts_Data_Read_Contact_ID: field(arg: ["Read_Contacts_Data", "read_contact_id"])
        Type: field(arg: ["type"])
        Date_Added: field(arg: ["created_at"])
        Quote_Job_Unique_ID: field(arg: ["Quote_Job", "unique_id"])
        Inquiry_Unique_ID: field(arg: ["Inquiry", "unique_id"])
        Comment_Unique_ID: field(arg: ["Comment", "unique_id"])
        Post_Unique_ID: field(arg: ["Post", "unique_id"])
        PeterpmJob_Unique_ID: field(
          arg: ["Post", "Related_Job", "unique_id"]
        )
        PeterpmJob_Unique_ID1: field(
          arg: [
            "Comment"
            "Forum_Post"
            "Related_Job"
            "unique_id"
          ]
        )
      }
    }
  `;

const createOReadContactReadAnnouncement = `
      mutation createOReadContactReadAnnouncement($payload: oReadContactReadAnnouncementCreateInput = null) {
        createOReadContactReadAnnouncement(payload: $payload) {
          read_contact_id
          read_announcement_id
        }
      }
    `;

async function fetchAnnouncements() {
  // Stop if notifications are paused
  if (pauseNotification === "Yes") {
    return;
  }

  // Build the `andWhereGroup` conditions
  const andWhereGroup = buildAndWhereGroup();

  // If no conditions are enabled, fetch will return blank data
  if (!andWhereGroup) {
    console.log("No conditions enabled. Fetching blank data.");
    return;
  }

  const query = FETCH_ANNOUNCEMENTS(andWhereGroup);

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: JSON.stringify({
        query,
        variables: { service_provider_id_all: loggedInServiceProviderId },
      }),
    });

    if (!response.ok) throw new Error("Failed to fetch announcements");

    const data = await response.json();
    const announcements = data.data.calcAnnouncements || [];

    // Filter announcements for the logged-in service provider
    const relevantAnnouncements = announcements.filter(
      (ann) => loggedInServiceProviderId && ann.Type
    );

    // Determine unread announcements
    const unreadAnnouncements = relevantAnnouncements.filter(
      (ann) =>
        ann.Read_Contacts_Data_Read_Contact_ID === null ||
        ann.Read_Contacts_Data_Read_Contact_ID !== loggedInUserId
    );

    // Unique identifier for unread announcements to track notifications
    const unreadAnnouncementIds = new Set(
      unreadAnnouncements.map((ann) => ann.ID)
    );

    renderAnnouncements(relevantAnnouncements);
    updateBellIcon();
  } catch (error) {}
}

async function markAsRead(announcementId) {
  try {
    const payload = {
      read_announcement_id: announcementId,
      read_contact_id: loggedInUserId,
    };

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": API_KEY,
      },
      body: JSON.stringify({
        query: createOReadContactReadAnnouncement,
        variables: { payload },
      }),
    });

    if (!response.ok) throw new Error("Failed to mark announcement as read");
    previouslyFetchedUnread.delete(announcementId);
  } catch (error) {}
}

async function markAllAsRead() {
  console.log("clicked");
  const unreadElements = document.querySelectorAll(
    ".announcement-section .unread"
  );
  const blueDots = document.querySelectorAll(".blueDot");

  blueDots.forEach((blueDot) => {
    blueDot.classList.add("hidden");
  });

  unreadElements.forEach((el) => {
    const announcementId = el.dataset.announcementId;
    el.classList.add("read");
  });

  const promises = [];
  unreadElements.forEach((el) => {
    const announcementId = el.dataset.announcementId;
    if (announcementId) promises.push(markAsRead(announcementId));
  });

  await Promise.all(promises);

  unreadElements.forEach((el) => {
    el.classList.remove("unread");
    el.classList.add("read");
  });

  updateBellIcon();
}

function renderAnnouncements(announcements) {
  const container = document.getElementById("all-announcements");
  const containerPage = document.getElementById("all-announcements-page");

  if (container) {
    container.innerHTML = "";
  }
  if (containerPage) {
    containerPage.innerHTML = "";
  }

  announcements.sort((a, b) => b.ID - a.ID);

  announcements.forEach((ann) => {
    const isRead =
      ann.Read_Contacts_Data_Read_Contact_ID === parseInt(loggedInUserId);

    let link = "";
    switch (ann.Type) {
      case "Inquiry":
        link = `https://my.awesomate.pro/inquiry/${ann.Inquiry_Unique_ID}`;
        break;
      case "Comment":
        link = `https://my.awesomate.pro/edit-quote/${
          ann.PeterpmJob_Unique_ID1 || ""
        }?selectedTab=memo`;
        break;
      case "Post":
        link = `https://my.awesomate.pro/edit-quote/${
          ann.PeterpmJob_Unique_ID || ""
        }?selectedTab=memo`;
        break;
      case "Quote/Job":
        link = `https://my.awesomate.pro/edit-quote/${
          ann.Quote_Job_Unique_ID || ""
        }`;
        break;
      default:
        link = "";
        break;
    }

    const announcementEl = document.createElement("div");

    announcementEl.className = `p-4 cursor-pointer justify-between items-center gap-2 flex w-full ${
      isRead ? "read" : "unread bg-[#dee7f6]"
    }`;
    announcementEl.id = `announcement-${ann.ID}`;
    announcementEl.dataset.announcementId = ann.ID;

    announcementEl.innerHTML = `
              <div class="flex-col justify-start items-start gap-2 flex flex-1">
                  <span class="text-h3 text-dark">${
                    ann.Title || "New Notification"
                  }</span>
                  <div class="text-h3 text-dark">
                      ${formatDate(ann.Date_Added) || ""} ${ann.Reference || ""}
                  </div>
              </div>
              ${
                isRead
                  ? ""
                  : `<div class="blueDot w-2.5 h-2.5 bg-[#0052cc] rounded-full"></div>`
              }
          `;

    if (container) {
      container.appendChild(announcementEl);
      announcementEl.onclick = async () => {
        if (!isRead) {
          await markAsRead(ann.ID);
          announcementEl.classList.add("read");
          announcementEl.classList.remove("unread");
          updateBellIcon();
        }
        if (link) {
          window.location.href = link;
        }
      };
    }

    if (containerPage) {
      const clonedAnnouncementEl = announcementEl.cloneNode(true);
      containerPage.appendChild(clonedAnnouncementEl);

      // Attach the onclick handler to the cloned element
      clonedAnnouncementEl.onclick = async () => {
        if (!isRead) {
          await markAsRead(ann.ID);
          clonedAnnouncementEl.classList.add("read");
          clonedAnnouncementEl.classList.remove("unread");
          updateBellIcon();
        }
        if (link) {
          window.location.href = link;
        }
      };
    }
  });
}

function updateBellIcon() {
  const hasUnread =
    document.querySelectorAll(".announcement-section .unread").length > 0;
  bellIcon.classList.toggle("unread", hasUnread);
}

document.addEventListener("DOMContentLoaded", () => {
  if (pauseNotification == "No") {
    fetchAnnouncements();
    setInterval(fetchAnnouncements, 60000);
  }
  let markAllReadBtn = document.querySelectorAll(".markReadBtn");
  markAllReadBtn.forEach((button) => {
    button.addEventListener("click", markAllAsRead);
  });
});
