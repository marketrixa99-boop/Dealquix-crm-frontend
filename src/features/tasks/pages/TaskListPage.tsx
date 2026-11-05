import { useMemo, useState } from "react";
import BranchRevenueTargets from "../components/BranchRevenueTargets";
import { useNavigate } from "react-router";
import { taskQueryKeys, useTasks, useUpdateTask } from "../hooks/useTasks";
import RefreshButton from "@/components/ui/RefreshButton";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { Can } from "@/components/Auth/Can";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuthStore } from "@/store/auth.store";
import { ROLES } from "@/types/auth";
import { useBranchesQuery } from "@/features/branches";
import { useEmployeesQuery } from "@/features/employees";
import {
  TASK_PRIORITY,
  TASK_PRIORITY_LABELS,
  TASK_STATUS,
  TASK_STATUS_LABELS,
  type TaskListQuery,
  type TaskPriority,
  type TaskStatus,
} from "@/types/task";
import TaskDetailModal from "../components/TaskDetailModal";
import TaskBoard from "../components/TaskBoard";
import {
  PRIORITY_BADGE_CLASSES,
  STATUS_BADGE_CLASSES,
  STATUS_DOT_CLASSES,
  isDueSoon,
  isOverdue,
} from "../taskDisplay";

const STATUS_FILTERS: { label: string; value: TaskStatus | "" }[] = [
  { label: "All Statuses", value: "" },
  ...Object.values(TASK_STATUS).map((status) => ({
    label: TASK_STATUS_LABELS[status],
    value: status,
  })),
];

const PRIORITY_FILTERS: { label: string; value: TaskPriority | "" }[] = [
  { label: "All Priorities", value: "" },
  ...Object.values(TASK_PRIORITY).map((priority) => ({
    label: TASK_PRIORITY_LABELS[priority],
    value: priority,
  })),
];

const TaskListPage = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const isEmployee = currentUser?.role === ROLES.EMPLOYEE;
  const isHead = currentUser?.role === ROLES.HEAD;
  const { hasPermission } = usePermissions();
  const canUpdateStatus = hasPermission("task:update");
  const updateTask = useUpdateTask();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | "">("");
  const [selectedPriority, setSelectedPriority] = useState<TaskPriority | "">("");
  const [selectedBranch, setSelectedBranch] = useState("");
  const [selectedAssignee, setSelectedAssignee] = useState("");
  const [dueFrom, setDueFrom] = useState("");
  const [dueTo, setDueTo] = useState("");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [taskView, setTaskView] = useState<"list" | "board">("list");

  const [detailTaskId, setDetailTaskId] = useState<string | null>(null);

  // Branch/assignee filters only make sense for roles with cross-employee
  // visibility — matches task.service.ts getTasks, which scopes Employee to
  // assignedTo=self and rejects a non-Employee-only `assignedTo` query param.
  const { data: branches } = useBranchesQuery();
  const assignableBranches = useMemo(() => {
    if (!branches) return [];
    if (isHead) return branches;
    const own = new Set(currentUser?.branches ?? []);
    return branches.filter((b) => own.has(b._id));
  }, [branches, isHead, currentUser?.branches]);

  const { data: employeeData } = useEmployeesQuery({
    role: ROLES.EMPLOYEE,
    branchId: selectedBranch || undefined,
    isActive: true,
    limit: 100,
  });

  const serverQuery: TaskListQuery = useMemo(
    () => ({
      search: debouncedSearch.trim() || undefined,
      status: selectedStatus || undefined,
      priority: selectedPriority || undefined,
      branch: !isEmployee ? selectedBranch || undefined : undefined,
      assignedTo: !isEmployee ? selectedAssignee || undefined : undefined,
      startDate: dueFrom ? new Date(dueFrom).toISOString() : undefined,
      endDate: dueTo ? new Date(dueTo).toISOString() : undefined,
    }),
    [debouncedSearch, selectedStatus, selectedPriority, selectedBranch, selectedAssignee, dueFrom, dueTo, isEmployee]
  );

  const { data: tasks, isLoading, isFetching, isError, error } = useTasks(serverQuery);

  const scopedTasks = useMemo(() => tasks ?? [], [tasks]);

  const displayedTasks = useMemo(
    () => (showOverdueOnly ? scopedTasks.filter(isOverdue) : scopedTasks),
    [scopedTasks, showOverdueOnly]
  );

  const stats = useMemo(() => {
    return {
      total: scopedTasks.length,
      todo: scopedTasks.filter((t) => t.status === "todo").length,
      inProgress: scopedTasks.filter((t) => t.status === "in_progress").length,
      completed: scopedTasks.filter((t) => t.status === "completed").length,
      overdue: scopedTasks.filter(isOverdue).length,
    };
  }, [scopedTasks]);

  const hasActiveFilters =
    searchQuery ||
    selectedStatus ||
    selectedPriority ||
    selectedBranch ||
    selectedAssignee ||
    dueFrom ||
    dueTo ||
    showOverdueOnly;

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedStatus("");
    setSelectedPriority("");
    setSelectedBranch("");
    setSelectedAssignee("");
    setDueFrom("");
    setDueTo("");
    setShowOverdueOnly(false);
  };

  return (
    <div className="min-h-screen bg-surface p-2 sm:p-2 lg:p-4 space-y-6">
      {/* --- TOP BANNER / HEADER --- */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary font-bold text-xs tracking-wider uppercase mb-1">
            <span className="h-0.5 w-4 bg-primary rounded-full" />
            <span>CRM Core Module</span>
          </div>
          <h1 className="font-headline-md text-2xl sm:text-3xl font-extrabold text-on-surface">
            {isEmployee ? "My Tasks" : "Task Management"}
          </h1>
          <p className="font-body-md text-xs sm:text-sm text-on-surface-variant mt-1 max-w-2xl">
            {isEmployee
              ? "Track and update the tasks assigned to you."
              : "Assign, track, and manage tasks across your team."}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
          <RefreshButton queryKey={taskQueryKeys.all} />

          <Can permission="task:create">
            <button
              onClick={() => navigate("/tasks/new")}
              className="flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 font-label-md text-xs font-bold text-on-primary shadow-sm hover:bg-primary/90 transition-all shrink-0"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              <span>Create New Task</span>
            </button>
          </Can>
        </div>
      </div>

      <BranchRevenueTargets />
      {/* --- STATS STRIP + LIST/BOARD TOGGLE (one row, to keep the list/board itself above the fold) --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-4 py-2.5 shadow-sm">
        <div className="flex flex-wrap items-center divide-x divide-outline-variant/20">
          {[
            { label: "Total", value: stats.total, icon: "list_alt", color: "text-on-surface" },
            { label: "To Do", value: stats.todo, icon: "radio_button_unchecked", color: "text-indigo-600" },
            { label: "In Progress", value: stats.inProgress, icon: "autorenew", color: "text-sky-600" },
            { label: "Completed", value: stats.completed, icon: "check_circle", color: "text-emerald-600" },
            { label: "Overdue", value: stats.overdue, icon: "warning", color: "text-rose-600" },
          ].map((card) => (
            <div key={card.label} className="flex items-center gap-1.5 px-3.5 first:pl-0 last:pr-0">
              <span className={`material-symbols-outlined text-base ${card.color}`}>
                {card.icon}
              </span>
              <span className="text-sm font-extrabold text-on-surface">{card.value}</span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70">
                {card.label}
              </span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-outline-variant/30 bg-surface-container-low p-1 w-fit shrink-0">
          <button
            type="button"
            onClick={() => setTaskView("list")}
            title="List view"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              taskView === "list"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">view_list</span>
          </button>
          <button
            type="button"
            onClick={() => setTaskView("board")}
            title="Board view"
            className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
              taskView === "board"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-lg">view_kanban</span>
          </button>
        </div>
      </div>

      {/* --- CONTROL BAR: SEARCH & FILTERS --- */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/30 shadow-sm">
        <div className="relative flex-1 min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-xl text-on-surface-variant/70">
            search
          </span>
          <input
            type="text"
            placeholder="Search by title, description, or assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low pl-10 pr-4 py-2 text-xs font-medium text-on-surface outline-none focus:border-primary focus:bg-surface-container-lowest transition-all"
          />
        </div>

        <div className="relative">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as TaskStatus | "")}
            className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            expand_more
          </span>
        </div>

        <div className="relative">
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value as TaskPriority | "")}
            className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
          >
            {PRIORITY_FILTERS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
            expand_more
          </span>
        </div>

        {/* Branch & Assignee filters — only roles with cross-employee
            visibility can use these (backend rejects assignedTo for Employee). */}
        {!isEmployee && assignableBranches.length > 1 && (
          <div className="relative">
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedAssignee("");
              }}
              className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
            >
              <option value="">All Branches</option>
              {assignableBranches.map((branch) => (
                <option key={branch._id} value={branch._id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              expand_more
            </span>
          </div>
        )}

        {!isEmployee && (
          <div className="relative">
            <select
              value={selectedAssignee}
              onChange={(e) => setSelectedAssignee(e.target.value)}
              className="appearance-none rounded-xl border border-outline-variant/30 bg-surface-container-low px-3.5 py-2 pr-9 text-xs font-semibold text-on-surface outline-none focus:border-primary cursor-pointer transition-all"
            >
              <option value="">All Assignees</option>
              {employeeData?.employees.map((employee) => (
                <option key={employee._id} value={employee._id}>
                  {employee.name}
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-lg text-on-surface-variant">
              expand_more
            </span>
          </div>
        )}

        {/* Due date range */}
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            value={dueFrom}
            onChange={(e) => setDueFrom(e.target.value)}
            title="Due date from"
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-2.5 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
          <span className="text-xs text-on-surface-variant/60">to</span>
          <input
            type="date"
            value={dueTo}
            onChange={(e) => setDueTo(e.target.value)}
            title="Due date to"
            className="rounded-xl border border-outline-variant/30 bg-surface-container-low px-2.5 py-2 text-xs font-semibold text-on-surface outline-none focus:border-primary"
          />
        </div>

        <button
          onClick={() => setShowOverdueOnly((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all ${
            showOverdueOnly
              ? "border-rose-300 bg-rose-500/10 text-rose-700"
              : "border-outline-variant/30 bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
          }`}
        >
          <span className="material-symbols-outlined text-sm">warning</span>
          Overdue Only
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-xs font-bold text-rose-600 hover:underline px-2 py-1"
          >
            <span className="material-symbols-outlined text-sm">filter_alt_off</span>
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* --- MAIN DATA TABLE (List view) --- */}
      {taskView === "list" && (
      <div className="relative overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container-low/50">
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Task
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Priority
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Status
                </th>
                {!isEmployee && (
                  <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Assigned To
                  </th>
                )}
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Due Date
                </th>
                <th className="px-6 py-3.5 text-[11px] font-bold uppercase tracking-wider text-on-surface-variant flex justify-end align-middle">View</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {isLoading || isFetching ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        <div className="h-4 w-40 rounded bg-surface-container-high" />
                        <div className="h-3 w-56 rounded bg-surface-container-high" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-16 rounded-full bg-surface-container-high" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 w-20 rounded-full bg-surface-container-high" />
                    </td>
                    {!isEmployee && (
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-surface-container-high" />
                          <div className="h-4 w-20 rounded bg-surface-container-high" />
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="h-4 w-20 rounded bg-surface-container-high" />
                    </td>
                    <td className="px-4 py-4">
                      <div className="ml-auto h-7 w-7 rounded-lg bg-surface-container-high" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={isEmployee ? 5 : 6} className="px-6 py-14 text-center">
                    <div className="flex flex-col items-center justify-center">
                      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10">
                        <span className="material-symbols-outlined text-2xl text-rose-500">
                          error
                        </span>
                      </div>
                      <p className="font-bold text-sm text-on-surface">Failed to load tasks</p>
                      <p className="mt-1 max-w-sm text-xs text-on-surface-variant/70">
                        {getErrorMessage(error, "Something went wrong while fetching tasks.")}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : displayedTasks.length > 0 ? (
                displayedTasks.map((task) => {
                  const assignee =
                    typeof task.assignedTo === "object" ? task.assignedTo : null;
                  const overdue = isOverdue(task);
                  const dueSoon = isDueSoon(task);

                  // Jira-style urgency cue: a tinted row + left accent bar
                  // for tasks that are overdue or due within the next 24h,
                  // so the list draws the eye to what's approaching without
                  // needing to open anything.
                  const urgencyClasses = overdue
                    ? "border-l-[3px] border-l-rose-500 bg-rose-500/5 hover:bg-rose-500/10"
                    : dueSoon
                      ? "border-l-[3px] border-l-amber-500 bg-amber-500/5 hover:bg-amber-500/10"
                      : "border-l-[3px] border-l-transparent hover:bg-surface-container-low/40";

                  return (
                    <tr
                      key={task._id}
                      className={`group transition-colors cursor-pointer ${urgencyClasses}`}
                      onClick={() => setDetailTaskId(task._id)}
                    >
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-bold text-sm text-on-surface group-hover:text-primary transition-colors truncate">
                          {task.title}
                        </p>
                        {task.description && (
                          <p className="text-[11px] text-on-surface-variant/70 truncate mt-0.5">
                            {task.description}
                          </p>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${PRIORITY_BADGE_CLASSES[task.priority]}`}
                        >
                          {TASK_PRIORITY_LABELS[task.priority]}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${STATUS_BADGE_CLASSES[task.status]}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT_CLASSES[task.status]}`} />
                          {TASK_STATUS_LABELS[task.status]}
                        </span>
                      </td>

                      {!isEmployee && (
                        <td className="px-6 py-4">
                          {assignee ? (
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                                {assignee.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .slice(0, 2)
                                  .join("")
                                  .toUpperCase()}
                              </span>
                              <span className="font-semibold text-on-surface">
                                {assignee.name}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold text-on-surface-variant">
                              Unassigned
                            </span>
                          )}
                        </td>
                      )}

                      <td className="px-6 py-4">
                        {task.dueDate ? (
                          <span
                            className={`font-semibold ${overdue ? "text-rose-600" : "text-on-surface"}`}
                          >
                            {new Date(task.dueDate).toLocaleDateString()}
                            {overdue && (
                              <span className="ml-1.5 material-symbols-outlined text-xs align-middle">
                                warning
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="text-on-surface-variant/60">—</span>
                        )}
                      </td>

                      <td className="px-4 py-4 text-right">
                        <button
                          type="button"
                          title="View & manage task"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDetailTaskId(task._id);
                          }}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-primary transition-colors ml-auto"
                        >
                          <span className="material-symbols-outlined text-lg">visibility</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={isEmployee ? 5 : 6}
                    className="px-6 py-12 text-center text-on-surface-variant"
                  >
                    <span className="material-symbols-outlined text-4xl mb-2 text-outline">
                      task_alt
                    </span>
                    <p className="font-bold text-sm">No matching tasks found</p>
                    <p className="text-xs text-on-surface-variant/70 mt-1">
                      {!hasActiveFilters && scopedTasks.length === 0
                        ? "No tasks have been created yet."
                        : "Try adjusting your search terms or filter configurations."}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {scopedTasks.length > 0 && (
          <div className="border-t border-outline-variant/30 px-6 py-3 bg-surface-container-lowest">
            <p className="text-xs text-on-surface-variant font-medium">
              Showing <span className="font-bold text-on-surface">{displayedTasks.length}</span> of{" "}
              <span className="font-bold text-on-surface">{scopedTasks.length}</span> tasks
              {isFetching && " · refreshing…"}
            </p>
          </div>
        )}
      </div>
      )}

      {/* --- BOARD (Kanban) view --- */}
      {taskView === "board" && !isLoading && !isError && (
        <TaskBoard
          tasks={scopedTasks}
          isEmployee={isEmployee}
          canDrag={canUpdateStatus}
          onOpenTask={setDetailTaskId}
          onStatusChange={(task, nextStatus) =>
            updateTask.mutate({ id: task._id, payload: { status: nextStatus }, silent: true })
          }
        />
      )}

      <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} />
    </div>
  );
};

export default TaskListPage;
