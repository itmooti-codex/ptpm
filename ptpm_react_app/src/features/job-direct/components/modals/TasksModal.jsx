import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import assigneesJson from "../../../../../assignees.json";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { InputField } from "../../../../shared/components/ui/InputField.jsx";
import { Modal } from "../../../../shared/components/ui/Modal.jsx";
import { TextareaField } from "../../../../shared/components/ui/TextareaField.jsx";
import { useToast } from "../../../../shared/providers/ToastProvider.jsx";
import {
  createTaskRecord,
  fetchTasksByJobId,
  updateTaskRecord,
} from "../../sdk/jobDirectSdk.js";

function toString(value) {
  return String(value ?? "").trim();
}

function normalizeAssignees(rawAssignees) {
  const source = Array.isArray(rawAssignees)
    ? rawAssignees
    : Array.isArray(rawAssignees?.assignees)
      ? rawAssignees.assignees
      : [];

  return source
    .map((item) => {
      const id = toString(item?.id ?? item?.ID ?? item?.assignee_id);
      const fullName = toString(item?.name);
      const fallbackName = [toString(item?.first_name), toString(item?.last_name)]
        .filter(Boolean)
        .join(" ");

      return {
        id,
        label: fullName || fallbackName || `Assignee ${id}`,
      };
    })
    .filter((item) => Boolean(item.id));
}

function formatDateForInput(value) {
  const text = toString(value);
  if (!text) return "";

  const normalizedNumericText = text.replace(/,/g, "");
  const hasOnlyNumericChars = /^-?\d+(\.\d+)?$/.test(normalizedNumericText);
  if (hasOnlyNumericChars) {
    const numeric = Number(normalizedNumericText);
    if (Number.isFinite(numeric)) {
      const rounded = Math.trunc(numeric);
      const length = String(Math.abs(rounded)).length;
      const asMs = length <= 10 ? rounded * 1000 : rounded;
      const fromUnix = new Date(asMs);
      if (!Number.isNaN(fromUnix.getTime())) {
        const year = fromUnix.getFullYear();
        const month = String(fromUnix.getMonth() + 1).padStart(2, "0");
        const day = String(fromUnix.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      }
    }
  }

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  const ausMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ausMatch) {
    const day = ausMatch[1].padStart(2, "0");
    const month = ausMatch[2].padStart(2, "0");
    return `${ausMatch[3]}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return "";

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value) {
  const iso = formatDateForInput(value);
  if (!iso) return "-";

  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = String(parsed.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

function statusBadgeClass(status) {
  const normalized = toString(status).toLowerCase();
  if (normalized === "completed") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized === "in progress") {
    return "bg-sky-100 text-sky-700";
  }
  if (normalized === "cancelled") {
    return "bg-slate-200 text-slate-700";
  }
  return "bg-amber-100 text-amber-700";
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 20H8L19 9C19.5304 8.46957 19.8284 7.75035 19.8284 7C19.8284 6.24965 19.5304 5.53043 19 5C18.4696 4.46957 17.7504 4.17157 17 4.17157C16.2496 4.17157 15.5304 4.46957 15 5L4 16V20Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M13.5 6.5L17.5 10.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 7L9 18L4 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AssigneeSearchField({
  label,
  options,
  selectedId,
  onSelect,
  disabled = false,
}) {
  const rootRef = useRef(null);
  const selectedOption = useMemo(
    () => options.find((item) => item.id === selectedId) || null,
    [options, selectedId]
  );
  const [query, setQuery] = useState(selectedOption?.label || "");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(selectedOption?.label || "");
  }, [selectedOption?.id, selectedOption?.label]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!rootRef.current) return;
      if (rootRef.current.contains(event.target)) return;
      setOpen(false);
    }

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = toString(query).toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <div ref={rootRef} className="relative block">
      <span className="type-label text-slate-600">{label}</span>
      <input
        type="text"
        value={query}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onChange={(event) => {
          const nextQuery = event.target.value;
          setQuery(nextQuery);
          setOpen(true);
          const normalizedNext = toString(nextQuery).toLowerCase();
          const normalizedSelected = toString(selectedOption?.label).toLowerCase();
          if (selectedId && normalizedNext !== normalizedSelected) {
            onSelect("");
          }
        }}
        disabled={disabled}
        placeholder="Search assignee"
        className="mt-2 w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-400 disabled:bg-slate-100"
      />

      {open && !disabled ? (
        <div className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded border border-slate-200 bg-white shadow-lg">
          {filteredOptions.length ? (
            <ul className="py-1">
              {filteredOptions.map((option) => (
                <li key={option.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(option.id);
                      setQuery(option.label);
                      setOpen(false);
                    }}
                    className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100"
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-2 text-sm text-slate-500">No assignees found.</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function emptyFormState() {
  return {
    id: "",
    subject: "",
    dueDate: "",
    assigneeId: "",
    details: "",
  };
}

function hasMeaningfulTaskData(task) {
  if (!task || typeof task !== "object") return false;
  return Boolean(
    toString(task.id) ||
      toString(task.subject) ||
      toString(task.assignee_id) ||
      toString(task.details) ||
      toString(task.date_due) ||
      toString(task.status)
  );
}

export function TasksModal({ open, onClose, plugin, jobData }) {
  const jobId = toString(jobData?.id || jobData?.ID);
  const assignees = useMemo(() => normalizeAssignees(assigneesJson), []);
  const assigneeById = useMemo(() => {
    const map = new Map();
    assignees.forEach((item) => {
      map.set(item.id, item.label);
    });
    return map;
  }, [assignees]);

  const { success, error } = useToast();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState("");
  const [taskFilter, setTaskFilter] = useState("all");
  const [form, setForm] = useState(emptyFormState);

  const isEditing = Boolean(form.id);

  const resetForm = useCallback(() => {
    setForm(emptyFormState());
  }, []);

  const loadTasks = useCallback(async () => {
    if (!plugin || !jobId) {
      setTasks([]);
      return;
    }

    setIsLoading(true);
    try {
      const records = await fetchTasksByJobId({ plugin, jobId });
      const nextTasks = Array.isArray(records) ? records.filter(hasMeaningfulTaskData) : [];
      setTasks(nextTasks);
    } catch (loadError) {
      console.error("[JobDirect] Failed to load tasks", loadError);
      error("Unable to load tasks", loadError?.message || "Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [plugin, jobId, error]);

  useEffect(() => {
    if (!open) return;
    loadTasks();
  }, [open, loadTasks]);

  useEffect(() => {
    if (!open) {
      resetForm();
      setActiveTaskId("");
      setIsLoading(false);
      setIsSubmitting(false);
      setTaskFilter("all");
    }
  }, [open, resetForm]);

  const getAssigneeName = useCallback(
    (task) => {
      const fullName = [toString(task?.assignee_first_name), toString(task?.assignee_last_name)]
        .filter(Boolean)
        .join(" ");
      if (fullName) return fullName;
      const selected = assigneeById.get(toString(task?.assignee_id));
      if (selected) return selected;
      return "-";
    },
    [assigneeById]
  );

  const handleEditTask = useCallback((task) => {
    const isCompleted = toString(task?.status).toLowerCase() === "completed";
    if (isCompleted) return;
    setForm({
      id: toString(task?.id),
      subject: toString(task?.subject),
      dueDate: formatDateForInput(task?.date_due),
      assigneeId: toString(task?.assignee_id),
      details: toString(task?.details),
    });
  }, []);

  const handleSubmit = useCallback(
    async (event) => {
      event.preventDefault();
      if (!plugin) {
        error("SDK unavailable", "Please wait for SDK initialization.");
        return;
      }
      if (!jobId) {
        error("Missing job", "Job ID is required to save task.");
        return;
      }

      const subject = toString(form.subject);
      const assigneeId = toString(form.assigneeId);
      if (!subject) {
        error("Subject required", "Please enter a task subject.");
        return;
      }
      if (!form.dueDate) {
        error("Due date required", "Please select a due date.");
        return;
      }
      if (!assigneeId) {
        error("Assignee required", "Please select an assignee.");
        return;
      }

      const payload = {
        subject,
        date_due: form.dueDate,
        assignee_id: assigneeId,
        details: toString(form.details),
        job_id: jobId,
      };

      setIsSubmitting(true);
      try {
        if (isEditing) {
          await updateTaskRecord({ plugin, id: form.id, payload });
          success("Task updated", "Task changes have been saved.");
        } else {
          await createTaskRecord({ plugin, payload });
          success("Task added", "New task created successfully.");
        }
        resetForm();
        await loadTasks();
      } catch (submitError) {
        console.error("[JobDirect] Task save failed", submitError);
        error(
          isEditing ? "Update failed" : "Create failed",
          submitError?.message || "Unable to save task."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [plugin, jobId, form, isEditing, loadTasks, resetForm, success, error]
  );

  const handleMarkComplete = useCallback(
    async (task) => {
      const id = toString(task?.id);
      if (!id || !plugin) return;

      setActiveTaskId(id);
      try {
        await updateTaskRecord({
          plugin,
          id,
          payload: {
            status: "Completed",
          },
        });
        success("Task completed", "Task status set to Completed.");
        await loadTasks();
      } catch (completeError) {
        console.error("[JobDirect] Mark complete failed", completeError);
        error("Update failed", completeError?.message || "Unable to mark task complete.");
      } finally {
        setActiveTaskId("");
      }
    },
    [plugin, success, error, loadTasks]
  );

  const filteredTasks = useMemo(() => {
    if (taskFilter === "all") return tasks;
    return tasks.filter((task) => {
      const status = toString(task?.status).toLowerCase();
      if (taskFilter === "completed") return status === "completed";
      if (taskFilter === "open") return status === "open";
      return true;
    });
  }, [tasks, taskFilter]);

  const emptyMessage =
    taskFilter === "completed"
      ? "No completed tasks found."
      : taskFilter === "open"
        ? "No open tasks found."
        : "No tasks found for this job.";

  return (
    <Modal open={open} onClose={onClose} title="Tasks" widthClass="max-w-6xl">
      <div className="space-y-6">
        <form
          onSubmit={handleSubmit}
          className="rounded border border-slate-200 bg-slate-50 p-4"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <InputField
              label="Subject"
              value={form.subject}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  subject: event.target.value,
                }))
              }
              placeholder="Task subject"
              disabled={isSubmitting}
            />

            <InputField
              label="Due Date"
              type="date"
              value={form.dueDate}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  dueDate: event.target.value,
                }))
              }
              disabled={isSubmitting}
            />

            <AssigneeSearchField
              label="Assignee"
              options={assignees}
              selectedId={form.assigneeId}
              onSelect={(assigneeId) =>
                setForm((prev) => ({
                  ...prev,
                  assigneeId,
                }))
              }
              disabled={isSubmitting}
            />

            <TextareaField
              label="Details"
              rows={3}
              value={form.details}
              onChange={(event) =>
                setForm((prev) => ({
                  ...prev,
                  details: event.target.value,
                }))
              }
              placeholder="Task details"
              disabled={isSubmitting}
            />
          </div>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <Button type="button" variant="ghost" onClick={resetForm} disabled={isSubmitting}>
              Clear
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting || !jobId}>
              {isSubmitting ? "Saving..." : isEditing ? "Update Task" : "Add Task"}
            </Button>
          </div>
        </form>

        <div className="rounded border border-slate-200 bg-white p-3">
          <div className="mb-3 flex items-center gap-2 border-b border-slate-200 pb-3">
            {[
              { id: "all", label: "All" },
              { id: "open", label: "Open" },
              { id: "completed", label: "Completed" },
            ].map((tab) => {
              const isActive = taskFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTaskFilter(tab.id)}
                  className={`rounded px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? "bg-[#003882] text-white"
                      : "border border-slate-300 bg-white text-slate-600 hover:border-slate-400"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[700px] text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-2 py-2">Subject</th>
                  <th className="px-2 py-2">Due Date</th>
                  <th className="px-2 py-2">Assignee</th>
                  <th className="px-2 py-2">Details</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-slate-400">
                      Loading tasks...
                    </td>
                  </tr>
                ) : filteredTasks.length ? (
                  filteredTasks.map((task) => {
                    const taskId = toString(task?.id);
                    const isBusy = Boolean(taskId) && activeTaskId === taskId;
                    const isCompleted = toString(task?.status).toLowerCase() === "completed";

                    return (
                      <tr key={taskId || `${task.subject}-${task.date_due}`} className="border-b border-slate-100">
                        <td className="px-2 py-3 align-middle text-slate-700">{toString(task?.subject) || "-"}</td>
                        <td className="px-2 py-3 align-middle">{formatDateForDisplay(task?.date_due)}</td>
                        <td className="px-2 py-3 align-middle">{getAssigneeName(task)}</td>
                        <td className="px-2 py-3 align-middle">{toString(task?.details) || "-"}</td>
                        <td className="px-2 py-3 align-middle">
                          <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(task?.status)}`}>
                            {toString(task?.status) || "Pending"}
                          </span>
                        </td>
                        <td className="px-2 py-3 align-middle">
                          <div className="flex flex-wrap justify-end gap-1">
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => handleEditTask(task)}
                              disabled={isSubmitting || isBusy || !taskId || isCompleted}
                              aria-label="Edit task"
                              title="Edit Task"
                            >
                              <EditIcon />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-7 w-7 items-center justify-center rounded border border-slate-300 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                              onClick={() => handleMarkComplete(task)}
                              disabled={isSubmitting || isBusy || isCompleted || !taskId}
                              aria-label="Mark task complete"
                              title={isCompleted ? "Already completed" : "Mark Complete"}
                            >
                              {isBusy ? (
                                <span className="inline-flex h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                              ) : (
                                <CheckIcon />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-2 py-3 text-slate-400">
                      {emptyMessage}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Modal>
  );
}
