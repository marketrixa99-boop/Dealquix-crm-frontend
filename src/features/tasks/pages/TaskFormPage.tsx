import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useAuthStore } from "@/store/auth.store";
import { ROLES } from "@/types/auth";
import { useBranchesQuery } from "@/features/branches";
import { useEmployeesQuery } from "@/features/employees";
import { useCreateTask } from "../hooks/useTasks";
import LeadPicker from "../components/LeadPicker";
import { RevenueTaskCreator } from "../components/BranchRevenueTargets";
import type { Lead } from "@/types/lead";
import {
  TASK_PRIORITY,
  TASK_PRIORITY_LABELS,
  type TaskPriority,
} from "@/types/task";

const EMPTY_FORM = {
  title: "",
  description: "",
  assignedTo: "",
  priority: TASK_PRIORITY.MEDIUM as TaskPriority,
  dueDate: "",
  remarks: "",
};

const PRIORITY_HINT: Record<TaskPriority, string> = {
  low: "No particular urgency",
  medium: "Standard turnaround",
  high: "Needs prompt attention",
  urgent: "Time-critical — flag immediately",
};

const MemberTaskFormPage = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isHead = currentUser?.role === ROLES.HEAD;

  const [selectedBranchId, setBranchId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([]);

  const createTask = useCreateTask();

  const { data: branches } = useBranchesQuery();

  // Non-head roles can only assign within their own branches.
  const assignableBranches = useMemo(() => {
    if (!branches) return [];
    if (isHead) return branches;
    const own = new Set(currentUser?.branches ?? []);
    return branches.filter((b) => own.has(b._id));
  }, [branches, isHead, currentUser?.branches]);

  const branchId =
    assignableBranches.length === 1
      ? assignableBranches[0]._id
      : selectedBranchId;

  const { data: employeeData, isLoading: employeesLoading } = useEmployeesQuery(
    {
      role: ROLES.EMPLOYEE,
      branchId: branchId || undefined,
      isActive: true,
      limit: 100,
    },
  );

  const handleBranchChange = (id: string) => {
    setBranchId(id);
    setForm((prev) => ({ ...prev, assignedTo: "" }));
    setSelectedLeads([]);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!form.assignedTo) return;

    createTask.mutate(
      {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assignedTo: form.assignedTo,
        leads:
          selectedLeads.length > 0
            ? selectedLeads.map((l) => l._id)
            : undefined,
        priority: form.priority,
        dueDate: form.dueDate
          ? new Date(form.dueDate).toISOString()
          : undefined,
        remarks: form.remarks.trim() || undefined,
      },
      {
        onSuccess: (task) => {
          navigate(`/tasks/${task._id}`);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-outline-variant/30 pb-5">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            className="inline-flex items-center gap-1.5 font-label-sm text-xs font-bold text-on-surface-variant hover:text-primary transition-colors"
          >
            <span className="material-symbols-outlined text-base">
              arrow_back
            </span>
            Back to Tasks
          </button>
          <h1 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
            Create New Task
          </h1>
          <p className="font-body-md text-sm text-on-surface-variant">
            Assign a task to a team member and track it through to completion.
          </p>
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="max-w-4xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-6 sm:p-8 shadow-sm space-y-8"
      >
        {/* Section: Task Details */}
        <section className="space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="material-symbols-outlined text-lg">task_alt</span>
            <h2 className="font-label-md text-xs font-bold uppercase tracking-wider">
              Task Details
            </h2>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
              Task Title *
            </label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Follow up with client on proposal"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
              Description
            </label>
            <textarea
              rows={4}
              maxLength={5000}
              placeholder="Add any relevant details or instructions..."
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
            />
          </div>
        </section>

        {/* Section: Assignment */}
        <section className="space-y-4 border-t border-outline-variant/20 pt-6">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="material-symbols-outlined text-lg">
              person_add
            </span>
            <h2 className="font-label-md text-xs font-bold uppercase tracking-wider">
              Assignment
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                Branch *
              </label>
              {assignableBranches.length <= 1 ? (
                <div className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface-variant">
                  {assignableBranches[0]?.name ?? "No branch assigned"}
                </div>
              ) : (
                <select
                  required
                  value={branchId}
                  onChange={(e) => handleBranchChange(e.target.value)}
                  className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
                >
                  <option value="">Select branch</option>
                  {assignableBranches.map((branch) => (
                    <option key={branch._id} value={branch._id}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                Assign To *
              </label>
              <select
                required
                disabled={!branchId || employeesLoading}
                value={form.assignedTo}
                onChange={(e) =>
                  setForm({ ...form, assignedTo: e.target.value })
                }
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary disabled:opacity-50"
              >
                <option value="">
                  {!branchId
                    ? "Select a branch first"
                    : employeesLoading
                      ? "Loading employees..."
                      : "Select employee"}
                </option>
                {employeeData?.employees.map((employee) => (
                  <option key={employee._id} value={employee._id}>
                    {employee.name}
                  </option>
                ))}
              </select>
              {branchId &&
                !employeesLoading &&
                employeeData?.employees.length === 0 && (
                  <p className="mt-1 text-[10px] text-rose-600">
                    No active employees found in this branch.
                  </p>
                )}
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
              Link to Leads (optional)
            </label>
            <LeadPicker
              branchId={branchId}
              selectedLeads={selectedLeads}
              onAdd={(lead) => setSelectedLeads((prev) => [...prev, lead])}
              onRemove={(leadId) =>
                setSelectedLeads((prev) => prev.filter((l) => l._id !== leadId))
              }
            />
            <p className="mt-1 text-[10px] text-on-surface-variant/60">
              Only leads belonging to the selected branch can be linked.
            </p>
          </div>
        </section>

        {/* Section: Scheduling */}
        <section className="space-y-4 border-t border-outline-variant/20 pt-6">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="material-symbols-outlined text-lg">event</span>
            <h2 className="font-label-md text-xs font-bold uppercase tracking-wider">
              Priority &amp; Scheduling
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: e.target.value as TaskPriority })
                }
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
              >
                {Object.values(TASK_PRIORITY).map((priority) => (
                  <option key={priority} value={priority}>
                    {TASK_PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-on-surface-variant/60">
                {PRIORITY_HINT[form.priority]}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-on-surface-variant mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Section: Remarks */}
        <section className="space-y-4 border-t border-outline-variant/20 pt-6">
          <div className="flex items-center gap-2.5 text-primary">
            <span className="material-symbols-outlined text-lg">comment</span>
            <h2 className="font-label-md text-xs font-bold uppercase tracking-wider">
              Remarks
            </h2>
          </div>

          <textarea
            rows={3}
            maxLength={2000}
            placeholder="Add internal remarks..."
            value={form.remarks}
            onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            className="w-full resize-none rounded-xl border border-outline-variant/40 bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface outline-none focus:border-primary"
          />
        </section>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-outline-variant/20 pt-6">
          <button
            type="button"
            onClick={() => navigate("/tasks")}
            disabled={createTask.isPending}
            className="rounded-xl border border-outline-variant/40 px-5 py-2.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createTask.isPending || !form.assignedTo}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createTask.isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default function TaskFormPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const [mode, setMode] = useState<"branch" | "member">("branch");
  if (user?.role !== ROLES.HEAD) return <MemberTaskFormPage />;
  return (
    <div className="space-y-5 p-3 sm:p-6">
      <nav aria-label="Task type" className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-pressed={mode === "branch"}
          className={`min-h-11 rounded-xl px-4 text-sm font-bold ${mode === "branch" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface"}`}
          onClick={() => setMode("branch")}
        >
          Branch revenue task
        </button>
        <button
          type="button"
          aria-pressed={mode === "member"}
          className={`min-h-11 rounded-xl px-4 text-sm font-bold ${mode === "member" ? "bg-primary text-on-primary" : "bg-surface-container-high text-on-surface"}`}
          onClick={() => setMode("member")}
        >
          Member task
        </button>
      </nav>
      {mode === "branch" ? (
        <RevenueTaskCreator
          onClose={() => navigate("/tasks#revenue-targets")}
        />
      ) : (
        <MemberTaskFormPage />
      )}
    </div>
  );
}
