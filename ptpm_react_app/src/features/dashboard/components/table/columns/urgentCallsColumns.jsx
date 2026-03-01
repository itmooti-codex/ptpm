import { JobDirectIconActionButton } from "../../../../job-direct/components/primitives/JobDirectTable.jsx";
import { ClientCell } from "../ClientCell.jsx";

function EyeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12Z" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  );
}

function TaskIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function getUrgentCallsColumns({ onView, onAddTask }) {
  return [
    {
      key: "id",
      header: "#",
      thClass: "w-16",
      render: (row) => <span className="text-slate-400">{row.id ?? "—"}</span>,
    },
    {
      key: "time",
      header: "Time",
      thClass: "w-28",
      render: (row) => <span>{row.time ?? "—"}</span>,
    },
    {
      key: "client",
      header: "Client",
      render: (row) => (
        <ClientCell
          name={row.clientName}
          phone={row.phone}
          email={row.email}
          address={row.address}
        />
      ),
    },
    {
      key: "address",
      header: "Address",
      render: (row) => <span className="text-slate-600">{row.address ?? "—"}</span>,
    },
    {
      key: "notes",
      header: "Notes",
      render: (row) => (
        <span className="line-clamp-2 text-slate-600">{row.notes ?? "—"}</span>
      ),
    },
    {
      key: "_actions",
      header: "",
      thClass: "w-20",
      render: (row) => (
        <div className="flex items-center gap-1">
          <JobDirectIconActionButton title="View" onClick={() => onView?.(row)}>
            <EyeIcon />
          </JobDirectIconActionButton>
          <JobDirectIconActionButton title="Add Task" onClick={() => onAddTask?.(row)}>
            <TaskIcon />
          </JobDirectIconActionButton>
        </div>
      ),
    },
  ];
}
