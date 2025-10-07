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
  <div class="flex items-center justify-center gap-2">
    <button aria-label="View" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-brand-300 hover:text-brand-600">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 3c-4.5 0-8 4.5-8 7s3.5 7 8 7 8-4.5 8-7-3.5-7-8-7zm0 12a3 3 0 110-6 3 3 0 010 6z" />
      </svg>
    </button>
    <button aria-label="Delete" class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-rose-300 hover:text-rose-500">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M6 8a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0V8zm3.75 0a.75.75 0 011.5 0v6a.75.75 0 01-1.5 0V8zM16.25 5h-12.5a.75.75 0 010-1.5h3.5l.447-.894A1.5 1.5 0 018.06 2h3.88a1.5 1.5 0 011.363.606L13.75 3.5h3.5a.75.75 0 010 1.5zm-1.3 1.5a.45.45 0 01.45.476l-.7 8.4A1.75 1.75 0 0112.96 17H7.04a1.75 1.75 0 01-1.74-1.624l-.7-8.4a.45.45 0 01.45-.476h9.9z" clip-rule="evenodd" />
      </svg>
    </button>
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
            ? "bg-emerald-100 text-emerald-700"
            : "bg-white text-slate-600";
          const valueStateClasses = isSelected
            ? "bg-emerald-50 text-emerald-700"
            : "bg-white text-slate-600";
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
              <div class="w-full px-4 py-3 border-b ${cellBorder} ${headerStateClasses} ${hoverHeader} text-center text-sm font-medium leading-tight transition-colors">
                ${day.label}
              </div>
              <div class="w-full px-4 py-3 ${valueStateClasses} ${hoverValue} text-center text-lg font-semibold leading-tight transition-colors">
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
            <a href="#" class="font-semibold text-[#0052CC] hover:underline">${
              row.id
            }</a>
          </td>
          <td class="px-6 py-4">
            <div class="font-semibold text-slate-700">${row.client}</div>
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
