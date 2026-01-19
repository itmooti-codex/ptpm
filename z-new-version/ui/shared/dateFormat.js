export function formatUnixDate(unixTimestamp) {
  if (!unixTimestamp) return null;
  const date = new Date(unixTimestamp * 1000);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const min = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

export function formatDisplayDate(input) {
  if (!input || typeof input !== "string") return "";

  const [day, month, yearAndTime] = input.split("-");
  if (!day || !month || !yearAndTime) return "";
  const [year] = yearAndTime.split(" ");

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthName = monthNames[parseInt(month, 10) - 1] ?? "";
  return `${day} ${monthName} ${year}`;
}
