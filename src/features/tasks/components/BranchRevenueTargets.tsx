import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { getErrorMessage } from "@/utils/getErrorMessage";
import toast from "react-hot-toast";

type Target = {
  _id: string;
  title: string;
  description?: string;
  branch: string;
  branchName: string;
  targetAmount: number;
  achievedAmount: number;
  remainingAmount: number;
  percent: number;
  barPercent: number;
  verifiedEntries: number;
  startDate: string;
  endDate: string;
  phase: "active" | "completed" | "upcoming" | "ended" | "archived";
  version: number;
  archived: boolean;
};
type TargetPage = {
  rows: Target[];
  total: number;
  computedAt: string;
  timezone: string;
};
const field =
  "mt-1 min-h-11 w-full rounded-xl border border-outline-variant/40 bg-surface p-3 text-sm text-on-surface";
const button =
  "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-40";
const money = (n: number) =>
  n.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
const dateLabel = (v: string) =>
  new Date(`${v}T00:00:00+05:30`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
const indiaToday = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const weekEnd = (date: string) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 6 * 86400000)
    .toISOString()
    .slice(0, 10);
const get = async <T,>(path: string, params?: object) =>
  (await apiClient.get<{ data: T }>(`/revenue-targets${path}`, { params })).data
    .data;

function TargetForm({
  branches,
  target,
  onClose,
}: {
  branches: { _id: string; name: string }[];
  target?: Target;
  onClose: () => void;
}) {
  const [form, setForm] = useState(() => ({
    title: target?.title || "Branch revenue target",
    branchIds: target ? [target.branch] : [],
    description: target?.description || "",
    targetAmount: String(target?.targetAmount || ""),
    startDate: target?.startDate || indiaToday(),
    endDate: target?.endDate || weekEnd(indiaToday()),
    archived: target?.archived || false,
  }));
  const [requestId] = useState(() => crypto.randomUUID());
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: async () => {
      const data = {
        title: form.title.trim(),
        description: form.description.trim(),
        targetAmount: Number(form.targetAmount),
        startDate: form.startDate,
        endDate: form.endDate,
      };
      return target
        ? apiClient.patch(`/revenue-targets/${target._id}`, {
            ...data,
            archived: form.archived,
            version: target.version,
          })
        : apiClient.post("/revenue-targets/batch", {
            ...data,
            branchIds: form.branchIds,
            requestId,
          });
    },
    onSuccess: () => {
      toast.success(
        target
          ? "Branch task updated"
          : `${form.branchIds.length} branch tasks created`,
      );
      void client.invalidateQueries({ queryKey: ["branch-revenue-targets"] });
      onClose();
    },
  });
  return (
    <form
      className="mt-4 grid gap-4 rounded-2xl border border-primary/20 bg-surface-container-low p-4 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <label className="text-sm font-bold">
        Target name
        <input
          className={field}
          minLength={2}
          maxLength={150}
          required
          value={form.title}
          disabled={save.isPending}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
        />
      </label>
      {target ? (
        <div className="text-sm">
          <span className="font-bold">Branch</span>
          <p className="mt-2">{target.branchName}</p>
        </div>
      ) : (
        <fieldset className="rounded-xl border border-outline-variant/30 p-3 sm:row-span-2">
          <legend className="px-1 text-sm font-bold">
            Branches · select one or more *
          </legend>
          <div className="mb-2 flex flex-wrap items-center gap-3 text-xs">
            <button
              type="button"
              disabled={save.isPending}
              className="min-h-9 font-bold text-primary underline"
              onClick={() =>
                setForm({
                  ...form,
                  branchIds: branches.slice(0, 50).map((b) => b._id),
                })
              }
            >
              Select all (up to 50)
            </button>
            <button
              type="button"
              disabled={save.isPending}
              className="min-h-9 text-on-surface-variant underline"
              onClick={() => setForm({ ...form, branchIds: [] })}
            >
              Clear
            </button>
            <span>{form.branchIds.length} selected</span>
          </div>
          <div className="max-h-56 overflow-y-auto">
            {branches.map((b) => (
              <label
                key={b._id}
                className="flex min-h-11 items-center gap-3 rounded-lg px-2 text-sm hover:bg-surface"
              >
                <input
                  type="checkbox"
                  checked={form.branchIds.includes(b._id)}
                  disabled={
                    save.isPending ||
                    (!form.branchIds.includes(b._id) &&
                      form.branchIds.length >= 50)
                  }
                  onChange={(e) =>
                    setForm({
                      ...form,
                      branchIds: e.target.checked
                        ? [...form.branchIds, b._id]
                        : form.branchIds.filter((id) => id !== b._id),
                    })
                  }
                />
                {b.name}
              </label>
            ))}
          </div>
          {branches.length === 0 ? (
            <p className="text-xs">No active branches available.</p>
          ) : null}
        </fieldset>
      )}
      <label className="text-sm font-bold">
        {target ? "Revenue target (₹)" : "Revenue target per branch (₹)"}
        <input
          type="number"
          className={field}
          min="0.01"
          max="1000000000000"
          step="0.01"
          required
          disabled={save.isPending}
          value={form.targetAmount}
          onChange={(e) => setForm({ ...form, targetAmount: e.target.value })}
        />
        <span className="mt-1 block text-xs font-normal">
          {Number(form.targetAmount) > 0
            ? money(Number(form.targetAmount))
            : "Example: 2500000 = ₹25 lakh"}
        </span>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-bold">
          From
          <input
            type="date"
            className={field}
            min="2000-01-01"
            max={form.endDate || "2100-12-31"}
            required
            disabled={save.isPending}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </label>
        <label className="text-sm font-bold">
          Through
          <input
            type="date"
            className={field}
            min={form.startDate}
            max="2100-12-31"
            required
            disabled={save.isPending}
            value={form.endDate}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
          />
        </label>
      </div>
      <label className="text-sm font-bold sm:col-span-2">
        Description / instructions
        <textarea
          rows={3}
          maxLength={5000}
          className={field}
          value={form.description}
          disabled={save.isPending}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Add instructions for the selected branches…"
        />
      </label>
      {!target && form.branchIds.length > 0 ? (
        <p className="rounded-xl bg-primary/10 p-3 text-sm font-bold text-primary sm:col-span-2">
          {form.branchIds.length} separate branch tasks ·{" "}
          {Number(form.targetAmount) > 0
            ? `${money(Number(form.targetAmount))} target for each branch`
            : "set the revenue target per branch"}
          . Each branch sees only its own card; Head sees all selected branches.
        </p>
      ) : null}
      <p className="text-xs text-on-surface-variant sm:col-span-2">
        Both dates included, India time. Only verified revenue is counted, using
        the revenue entry date. Late approvals update this target too. Maximum
        period: one year.
      </p>
      {target ? (
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.archived}
            disabled={save.isPending}
            onChange={(e) => setForm({ ...form, archived: e.target.checked })}
          />
          Archive this target
        </label>
      ) : null}
      {save.error ? (
        <p role="alert" className="text-sm text-error sm:col-span-2">
          {getErrorMessage(save.error, "Could not save target")}
        </p>
      ) : null}
      <div className="flex gap-3 sm:col-span-2">
        <button
          type="submit"
          className={button}
          disabled={save.isPending || form.branchIds.length === 0}
        >
          {save.isPending
            ? "Saving…"
            : target
              ? "Save changes"
              : "Create branch tasks"}
        </button>
        <button
          type="button"
          className="min-h-11 px-3 text-sm font-bold text-on-surface-variant"
          disabled={save.isPending}
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function TargetCards({ compact }: { compact: boolean }) {
  const user = useAuthStore((state) => state.user)!;
  const isHead = user.role === "head";
  const [branchId, setBranchId] = useState("");
  const [page, setPage] = useState(1);
  const [archived, setArchived] = useState(false);
  const [editing, setEditing] = useState<Target | "new">();
  const limit = compact ? 6 : 12;
  const branches = useQuery({
    queryKey: ["branch-revenue-targets", user._id, "branches"],
    queryFn: () => get<{ _id: string; name: string }[]>("/branches"),
    staleTime: 60000,
    retry: false,
  });
  const targets = useQuery({
    queryKey: [
      "branch-revenue-targets",
      user._id,
      "list",
      branchId,
      page,
      limit,
      archived,
    ],
    queryFn: () =>
      get<TargetPage>("/", {
        branchId: branchId || undefined,
        page,
        limit,
        archived: String(archived),
      }),
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    staleTime: 10000,
    retry: false,
  });
  return (
    <section
      id="revenue-targets"
      aria-label="Branch revenue targets"
      className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-on-surface shadow-sm sm:p-6"
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Branch revenue targets</h2>
          <p className="mt-1 text-xs text-on-surface-variant">
            Verified revenue only · date range includes both days · India time
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={targets.isFetching}
            className="min-h-11 px-3 text-sm font-bold text-primary disabled:opacity-40"
            onClick={() => {
              void targets.refetch();
            }}
          >
            Refresh
          </button>
          {compact ? (
            <Link
              to="/tasks#revenue-targets"
              className="min-h-11 rounded-xl bg-primary/10 px-3 py-3 text-sm font-bold text-primary"
            >
              View all in Tasks →
            </Link>
          ) : isHead ? (
            <button
              type="button"
              className={button}
              onClick={() => setEditing("new")}
            >
              Set branch target
            </button>
          ) : null}
        </div>
      </header>
      {!compact ? (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <label className="min-w-48 text-xs font-bold">
            Branch
            <select
              className={field}
              value={branchId}
              onChange={(e) => {
                setBranchId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All accessible branches</option>
              {branches.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={archived}
              onChange={(e) => {
                setArchived(e.target.checked);
                setPage(1);
              }}
            />
            Archived targets
          </label>
        </div>
      ) : null}
      {editing && !compact && isHead ? (
        <TargetForm
          key={editing === "new" ? "new" : `${editing._id}:${editing.version}`}
          branches={branches.data || []}
          target={editing === "new" ? undefined : editing}
          onClose={() => setEditing(undefined)}
        />
      ) : null}
      {targets.isPending ? (
        <p role="status" className="py-6 text-sm">
          Loading branch targets…
        </p>
      ) : targets.isError ? (
        <p role="alert" className="py-4 text-sm text-error">
          {getErrorMessage(targets.error, "Revenue targets could not load")}
        </p>
      ) : (
        <>
          {targets.data.rows.length === 0 ? (
            <p className="py-6 text-sm text-on-surface-variant">
              No {archived ? "archived" : "branch revenue"} targets yet.
              {isHead
                ? " Set one from Tasks to start tracking."
                : " Your Head can assign a branch target."}
            </p>
          ) : null}
          <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {targets.data.rows.map((target) => (
              <article
                key={target._id}
                className="rounded-2xl border border-outline-variant/25 bg-surface-container-low p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-primary">
                      {target.branchName}
                    </p>
                    <h3 className="mt-1 break-words font-bold">
                      {target.title}
                    </h3>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${target.phase === "completed" ? "bg-emerald-100 text-emerald-800" : "bg-primary/10 text-primary"}`}
                  >
                    {target.phase}
                  </span>
                </div>
                {target.description ? (
                  <p className="mt-2 whitespace-pre-wrap break-words text-xs text-on-surface-variant">
                    {target.description}
                  </p>
                ) : null}
                <p className="mt-2 text-xs text-on-surface-variant">
                  {dateLabel(target.startDate)} – {dateLabel(target.endDate)}
                </p>
                <p className="mt-4 text-xl font-extrabold">
                  {money(target.achievedAmount)}
                </p>
                <p className="text-xs text-on-surface-variant">
                  verified of {money(target.targetAmount)}
                </p>
                <div
                  role="progressbar"
                  aria-label={`${target.branchName} revenue target progress`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={target.barPercent}
                  aria-valuetext={`${target.percent}% complete; ${money(target.achievedAmount)} verified`}
                  className="mt-3 h-3 overflow-hidden rounded-full bg-outline-variant/30"
                >
                  <div
                    className={`h-full rounded-full ${target.phase === "completed" ? "bg-emerald-500" : "bg-primary"}`}
                    style={{ width: `${target.barPercent}%` }}
                  />
                </div>
                <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs">
                  <strong>{target.percent}% complete</strong>
                  <span>{money(target.remainingAmount)} remaining</span>
                </div>
                <p className="mt-3 text-[11px] text-on-surface-variant">
                  {target.verifiedEntries} verified entries · pending/rejected
                  excluded
                </p>
                {!compact && isHead ? (
                  <button
                    type="button"
                    className="mt-2 min-h-11 text-xs font-bold text-primary underline"
                    onClick={() => setEditing(target)}
                  >
                    Edit target
                  </button>
                ) : null}
              </article>
            ))}
          </div>
          {!compact && targets.data.total > limit ? (
            <div className="mt-4 flex items-center gap-3 text-sm">
              <button
                className={button}
                type="button"
                disabled={page === 1}
                onClick={() => setPage((value) => value - 1)}
              >
                Previous
              </button>
              <span>
                Page {page} · {targets.data.total} targets
              </span>
              <button
                type="button"
                className={button}
                disabled={page * limit >= targets.data.total}
                onClick={() => setPage((value) => value + 1)}
              >
                Next
              </button>
            </div>
          ) : null}
          <p className="mt-4 text-[10px] text-on-surface-variant">
            Updated{" "}
            {new Date(targets.data.computedAt).toLocaleTimeString("en-IN", {
              timeZone: "Asia/Kolkata",
            })}{" "}
            IST · refreshes every 30 seconds while visible. Each verified entry
            counts once within this target; overlapping targets track the same
            qualifying revenue independently.
          </p>
        </>
      )}
      {branches.error && !compact ? (
        <p role="alert" className="mt-3 text-sm text-error">
          {getErrorMessage(branches.error, "Could not load branches")}
        </p>
      ) : null}
    </section>
  );
}
export default function BranchRevenueTargets({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { hasPermission } = usePermissions();
  const userId = useAuthStore((state) => state.user?._id);
  return userId && hasPermission("task:view") ? (
    <TargetCards key={userId} compact={compact} />
  ) : null;
}

export function RevenueTaskCreator({ onClose }: { onClose: () => void }) {
  const userId = useAuthStore((state) => state.user?._id);
  const branches = useQuery({
    queryKey: ["branch-revenue-targets", userId, "branches"],
    queryFn: () => get<{ _id: string; name: string }[]>("/branches"),
    retry: false,
  });
  return (
    <section className="mx-auto max-w-5xl rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 text-on-surface sm:p-6">
      <h1 className="text-2xl font-bold">Create branch revenue task</h1>
      <p className="mt-2 text-sm text-on-surface-variant">
        Select branches once. Each selected branch gets its own task and
        verified revenue progress for the chosen dates.
      </p>
      {branches.isPending ? (
        <p role="status" className="py-6">
          Loading branches…
        </p>
      ) : branches.isError ? (
        <p role="alert" className="mt-4 text-error">
          {getErrorMessage(branches.error, "Could not load branches")}
        </p>
      ) : (
        <TargetForm branches={branches.data} onClose={onClose} />
      )}
    </section>
  );
}
