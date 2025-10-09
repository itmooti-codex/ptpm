const iconButtonGroup = `
  <div class="mt-2 flex items-center gap-2">
    <button class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Call">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2.003 5.884l3.245-.62a1 1 0 011.066.553l1.284 2.568a1 1 0 01-.23 1.149l-1.516 1.513a11.037 11.037 0 005.004 5.004l1.513-1.516a1 1 0 011.149-.23l2.568 1.284a1 1 0 01.553 1.066l-.62 3.245a1 1 0 01-.979.815A14.978 14.978 0 012 5.863a1 1 0 01.003.021z" />
      </svg>
    </button>
    <button class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Email">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M2.94 6.342A2 2 0 014.564 5h10.872a2 2 0 011.624.842l-7.06 5.297-7.06-5.297z" />
        <path d="M18 8.118l-6.76 5.07a1.5 1.5 0 01-1.76 0L2.72 8.118A1.994 1.994 0 002 9.874V14a2 2 0 002 2h12a2 2 0 002-2V9.874c0-.603-.272-1.175-.74-1.756z" />
      </svg>
    </button>
    <button class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-brand-500 shadow-sm transition hover:border-brand-300 hover:text-brand-600" aria-label="Location">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M10 18a.75.75 0 01-.53-.22c-.862-.864-2.392-2.56-3.55-4.383C4.746 11.425 4 9.666 4 8a6 6 0 1112 0c0 1.666-.746 3.425-1.92 5.397-1.158 1.822-2.688 3.519-3.55 4.383A.75.75 0 0110 18zm0-8.25a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5z" clip-rule="evenodd" />
      </svg>
    </button>
  </div>
`;

const actionButtons = `
  <div class="flex items-center justify-center gap-4">
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.6283 7.59794C14.6089 7.55406 14.1383 6.51017 13.0922 5.46405C11.6983 4.07016 9.93776 3.3335 7.99998 3.3335C6.0622 3.3335 4.30164 4.07016 2.90775 5.46405C1.86164 6.51017 1.38886 7.55572 1.37164 7.59794C1.34637 7.65478 1.33331 7.7163 1.33331 7.7785C1.33331 7.8407 1.34637 7.90222 1.37164 7.95905C1.39109 8.00294 1.86164 9.04628 2.90775 10.0924C4.30164 11.4857 6.0622 12.2224 7.99998 12.2224C9.93776 12.2224 11.6983 11.4857 13.0922 10.0924C14.1383 9.04628 14.6089 8.00294 14.6283 7.95905C14.6536 7.90222 14.6666 7.8407 14.6666 7.7785C14.6666 7.7163 14.6536 7.65478 14.6283 7.59794ZM7.99998 10.0002C7.56047 10.0002 7.13082 9.86984 6.76538 9.62566C6.39994 9.38147 6.11511 9.03441 5.94691 8.62835C5.77872 8.22229 5.73471 7.77548 5.82046 7.34441C5.9062 6.91334 6.11785 6.51738 6.42863 6.20659C6.73941 5.89581 7.13538 5.68416 7.56644 5.59842C7.99751 5.51267 8.44433 5.55668 8.85039 5.72488C9.25645 5.89307 9.60351 6.1779 9.84769 6.54334C10.0919 6.90879 10.2222 7.33843 10.2222 7.77794C10.2222 8.36731 9.98808 8.93255 9.57133 9.34929C9.15458 9.76604 8.58935 10.0002 7.99998 10.0002Z" fill="#636D88"/>
    </svg>

    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M8.00001 1.3335C6.68147 1.3335 5.39254 1.72449 4.29621 2.45703C3.19988 3.18957 2.3454 4.23077 1.84082 5.44894C1.33623 6.66711 1.20421 8.00756 1.46144 9.30076C1.71868 10.594 2.35362 11.7819 3.28597 12.7142C4.21832 13.6466 5.4062 14.2815 6.69941 14.5387C7.99262 14.796 9.33306 14.6639 10.5512 14.1594C11.7694 13.6548 12.8106 12.8003 13.5431 11.704C14.2757 10.6076 14.6667 9.3187 14.6667 8.00016C14.6648 6.23263 13.9618 4.53802 12.712 3.28818C11.4622 2.03834 9.76755 1.33536 8.00001 1.3335ZM8.00001 13.6412C6.88432 13.6412 5.79369 13.3103 4.86603 12.6905C3.93836 12.0707 3.21534 11.1897 2.78838 10.1589C2.36143 9.12813 2.24972 7.9939 2.46738 6.89965C2.68504 5.8054 3.22229 4.80027 4.0112 4.01135C4.80012 3.22244 5.80525 2.68519 6.8995 2.46753C7.99375 2.24987 9.12798 2.36158 10.1587 2.78853C11.1895 3.21549 12.0705 3.93851 12.6904 4.86618C13.3102 5.79384 13.641 6.88447 13.641 8.00016C13.6393 9.49573 13.0445 10.9296 11.9869 11.9871C10.9294 13.0446 9.49558 13.6395 8.00001 13.6412ZM11.0769 8.00016C11.0769 8.13617 11.0229 8.26661 10.9267 8.36278C10.8306 8.45895 10.7001 8.51298 10.5641 8.51298H8.51283V10.5643C8.51283 10.7003 8.4588 10.8307 8.36263 10.9269C8.26646 11.0231 8.13602 11.0771 8.00001 11.0771C7.864 11.0771 7.73356 11.0231 7.63739 10.9269C7.54122 10.8307 7.48719 10.7003 7.48719 10.5643V8.51298H5.43591C5.2999 8.51298 5.16946 8.45895 5.07329 8.36278C4.97712 8.26661 4.92309 8.13617 4.92309 8.00016C4.92309 7.86415 4.97712 7.73372 5.07329 7.63754C5.16946 7.54137 5.2999 7.48734 5.43591 7.48734H7.48719V5.43606C7.48719 5.30005 7.54122 5.16961 7.63739 5.07344C7.73356 4.97727 7.864 4.92324 8.00001 4.92324C8.13602 4.92324 8.26646 4.97727 8.36263 5.07344C8.4588 5.16961 8.51283 5.30005 8.51283 5.43606V7.48734H10.5641C10.7001 7.48734 10.8306 7.54137 10.9267 7.63754C11.0229 7.73372 11.0769 7.86415 11.0769 8.00016Z" fill="#636D88"/>
    </svg>

    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.7949 3.38478H11.2308V2.87196C11.2308 2.46393 11.0687 2.07262 10.7802 1.7841C10.4916 1.49558 10.1003 1.3335 9.69231 1.3335H6.61539C6.20736 1.3335 5.81605 1.49558 5.52753 1.7841C5.23901 2.07262 5.07692 2.46393 5.07692 2.87196V3.38478H2.51282C2.37681 3.38478 2.24637 3.43881 2.1502 3.53498C2.05403 3.63115 2 3.76159 2 3.8976C2 4.03361 2.05403 4.16405 2.1502 4.26022C2.24637 4.35639 2.37681 4.41042 2.51282 4.41042H3.02564V13.6412C3.02564 13.9132 3.1337 14.1741 3.32604 14.3664C3.51839 14.5588 3.77927 14.6668 4.05128 14.6668H12.2564C12.5284 14.6668 12.7893 14.5588 12.9816 14.3664C13.174 14.1741 13.2821 13.9132 13.2821 13.6412V4.41042H13.7949C13.9309 4.41042 14.0613 4.35639 14.1575 4.26022C14.2537 4.16405 14.3077 4.03361 14.3077 3.8976C14.3077 3.76159 14.2537 3.63115 14.1575 3.53498C14.0613 3.43881 13.9309 3.38478 13.7949 3.38478ZM7.12821 11.0771C7.12821 11.2131 7.07418 11.3435 6.978 11.4397C6.88183 11.5359 6.75139 11.5899 6.61539 11.5899C6.47938 11.5899 6.34894 11.5359 6.25277 11.4397C6.15659 11.3435 6.10256 11.2131 6.10256 11.0771V6.97452C6.10256 6.83851 6.15659 6.70808 6.25277 6.6119C6.34894 6.51573 6.47938 6.4617 6.61539 6.4617C6.75139 6.4617 6.88183 6.51573 6.978 6.6119C7.07418 6.70808 7.12821 6.83851 7.12821 6.97452V11.0771ZM10.2051 11.0771C10.2051 11.2131 10.1511 11.3435 10.0549 11.4397C9.95876 11.5359 9.82832 11.5899 9.69231 11.5899C9.5563 11.5899 9.42586 11.5359 9.32969 11.4397C9.23352 11.3435 9.17949 11.2131 9.17949 11.0771V6.97452C9.17949 6.83851 9.23352 6.70808 9.32969 6.6119C9.42586 6.51573 9.5563 6.4617 9.69231 6.4617C9.82832 6.4617 9.95876 6.51573 10.0549 6.6119C10.1511 6.70808 10.2051 6.83851 10.2051 6.97452V11.0771ZM10.2051 3.38478H6.10256V2.87196C6.10256 2.73595 6.15659 2.60551 6.25277 2.50934C6.34894 2.41317 6.47938 2.35914 6.61539 2.35914H9.69231C9.82832 2.35914 9.95876 2.41317 10.0549 2.50934C10.1511 2.60551 10.2051 2.73595 10.2051 2.87196V3.38478Z" fill="#636D88"/>
    </svg>

  </div>
`;

export function renderCalendar(
  container,
  calendarDays,
  rowTotals,
  selectedDate
) {
  const daysPerRow = 7;
  const rows = [];

  for (let index = 0; index < calendarDays.length; index += daysPerRow) {
    rows.push(calendarDays.slice(index, index + daysPerRow));
  }

  container.innerHTML = rows
    .map((row, rowIndex) => {
      const rowTotal =
        rowTotals[rowIndex] ?? row.reduce((sum, day) => sum + day.total, 0);

      const dayColumns = row
        .map((day) => {
          const isSelected = day.iso === selectedDate;
          const cellBorder = isSelected
            ? "border-emerald-200"
            : "border-gray-200";
          const headerStateClasses = isSelected
            ? "bg-sky-100  text-neutral-700"
            : "bg-white text-neutral-700";
          const valueStateClasses = isSelected
            ? "bg-sky-100 text-neutral-700"
            : "bg-white text-neutral-700";
          const hoverHeader = isSelected
            ? ""
            : "group-hover:bg-slate-50 group-hover:text-brand-600";
          const hoverValue = isSelected
            ? ""
            : "group-hover:bg-slate-50 group-hover:text-brand-600";

          return `
            <button
              type="button"
              class="group flex flex-1 min-w-0 flex-col border-r ${cellBorder} focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200"
              data-date="${day.iso}"
              aria-pressed="${isSelected}"
            >
              <div class="w-full h-full px-2 py-2 border-b ${cellBorder} ${headerStateClasses} ${hoverHeader} text-center text-sm font-medium leading-tight transition-colors">
                ${day.label}
              </div>
              <div class="w-full h-full px-2 py-2 ${valueStateClasses} ${hoverValue} text-center text-lg font-semibold leading-tight transition-colors">
                ${day.total.toString().padStart(2, "0")}
              </div>
            </button>
          `;
        })
        .join("");

      return `
        <div class="flex-1 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div class="flex items-stretch">
            ${dayColumns}
            <div class="flex w-32 flex-none flex-col items-stretch border-l border-gray-200">
              <div class="flex items-center justify-center border-b border-brand-600 bg-brand-600 px-4 py-3 text-sm font-semibold text-white">Total</div>
              <div class="flex flex-1 items-center justify-center bg-brand-50 px-4 py-3 text-lg font-semibold text-brand-600">${rowTotal
                .toString()
                .padStart(2, "0")}</div>
            </div>
          </div>
        </div>
      `;
    })
    .join("");
}

export function renderTable(
  tableBody,
  rows,
  statusClasses,
  formatDisplayDate,
  dateIso
) {
  if (!rows.length) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="10" class="px-6 py-6 text-center text-sm text-slate-500">
          No inquiries scheduled for ${formatDisplayDate(dateIso)}.
        </td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = rows
    .map((row, index) => {
      const zebraClass = index % 2 === 0 ? "bg-white" : "bg-[#f5f8ff]";

      return `
        <tr class="${zebraClass} transition-colors hover:bg-brand-50/40">
          <td class="px-6 py-4">
            <a href="#" class="font-normal text-[#0052CC] hover:underline">${
              row.id
            }</a>
          </td>
          <td class="px-6 py-4">
            <div class="font-normal text-slate-700">${row.client}</div>
            ${iconButtonGroup}
          </td>
          <td class="px-6 py-4 text-slate-600">${row.created}</td>
          <td class="px-6 py-4 text-slate-600">${row.serviceman}</td>
          <td class="px-6 py-4 text-slate-600">${row.followUp}</td>
          <td class="px-6 py-4 text-slate-600">${row.source}</td>
          <td class="px-6 py-4 text-slate-600">${row.service}</td>
          <td class="px-6 py-4 text-slate-600">${row.type}</td>
          <td class="px-6 py-4 text-center">
            <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              statusClasses[row.status] ?? "bg-slate-100 text-slate-600"
            }">${row.status}</span>
          </td>
          <td class="px-6 py-4 text-center">
            ${actionButtons}
          </td>
        </tr>
      `;
    })
    .join("");
}
