import { useState, type ReactNode, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { useAuthStore } from "@/store/auth.store";
import { usePermissions } from "@/hooks/usePermissions";
import { PERMISSIONS } from "@/types/auth";
import { operationsApi, type StaleLead, type Ticket } from "./api";
import { getErrorMessage } from "@/utils/getErrorMessage";

const panel =
  "rounded-2xl border border-outline-variant/25 bg-surface-container-lowest p-4 sm:p-6";
const button =
  "min-h-11 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-on-primary disabled:opacity-50";
const input =
  "min-h-11 w-full rounded-xl border border-outline-variant/50 bg-surface p-3 text-sm text-on-surface";
const date = (value: string) => new Date(value).toLocaleString();
type Tab =
  | "followups"
  | "duplicates"
  | "reactivation"
  | "assignment"
  | "reports"
  | "tickets"
  | "history"
  | "whatsapp";
const labels: Record<Tab, string> = {
  followups: "Follow-ups",
  duplicates: "Duplicates",
  reactivation: "Old leads",
  assignment: "Auto assignment",
  reports: "Calling & team",
  tickets: "Support tickets",
  history: "Lead history",
  whatsapp: "WhatsApp",
};
function Message({ error }: { error: unknown }) {
  return (
    <p
      role="alert"
      className="rounded-xl bg-error-container p-3 text-sm text-on-error-container"
    >
      {getErrorMessage(error, "Could not complete the request. Please retry.")}
    </p>
  );
}
function Empty() {
  return (
    <p className="py-8 text-center text-on-surface-variant">
      No records found.
    </p>
  );
}
function Pager({
  page,
  total,
  onPage,
}: {
  page: number;
  total: number;
  onPage: (n: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
      <button
        type="button"
        className={button}
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page} · {total} records
      </span>
      <button
        type="button"
        className={button}
        disabled={page * 30 >= total}
        onClick={() => onPage(page + 1)}
      >
        Next
      </button>
    </div>
  );
}
function QueryState({
  pending,
  error,
  children,
}: {
  pending: boolean;
  error: unknown;
  children: ReactNode;
}) {
  if (pending)
    return (
      <p role="status" className="py-8">
        Loading…
      </p>
    );
  if (error) return <Message error={error} />;
  return children;
}
function LeadPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [submitted, setSubmitted] = useState("");
  const query = useQuery({
    queryKey: [
      "operations",
      "lead-options",
      useAuthStore.getState().user?._id,
      submitted,
    ],
    queryFn: () => operationsApi.leadOptions(submitted),
    enabled: submitted.length >= 2,
    retry: false,
  });
  return (
    <div className="space-y-2">
      <label className="block text-sm">
        Find lead by name or phone
        <input
          className={input}
          minLength={2}
          maxLength={100}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <button
        type="button"
        className={button}
        disabled={search.trim().length < 2 || query.isFetching}
        onClick={() => {
          onChange("");
          setSubmitted(search.trim());
        }}
      >
        Find leads
      </button>
      <label className="block text-sm">
        Select lead
        <select
          className={input}
          required
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose a lead</option>
          {query.data?.map((lead) => (
            <option key={lead._id} value={lead._id}>
              {lead.name} · {lead.phone}
            </option>
          ))}
        </select>
      </label>
      {query.error ? <Message error={query.error} /> : null}
      {query.data?.length === 0 ? (
        <p className="text-sm">No matching leads.</p>
      ) : null}
    </div>
  );
}
function Followups({ branchId }: { branchId?: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "operations",
      "followups",
      useAuthStore.getState().user?._id,
      page,
      branchId,
    ],
    queryFn: () => operationsApi.followups(page, branchId),
    staleTime: 60000,
    retry: false,
  });
  return (
    <QueryState pending={query.isPending} error={query.error}>
      <p className="mb-4 text-sm text-on-surface-variant">
        Overdue and next 24 hours. Due reminders appear in the notification
        bell; management is notified after 30 minutes overdue.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {query.data?.rows.map((row) => (
          <article key={row._id} className={panel}>
            <Link
              className="font-bold text-primary underline"
              to={`/leads/${row.lead}`}
            >
              {row.name}
            </Link>
            <p className="my-2 text-sm">{date(row.scheduledAt)}</p>
            <p className="text-sm text-on-surface-variant">{row.remark}</p>
            <Link
              className="mt-3 inline-block text-sm font-bold text-primary"
              to={`/leads/${row.lead}`}
            >
              Open lead & update follow-up →
            </Link>
          </article>
        ))}
      </div>
      {query.data?.total === 0 ? <Empty /> : null}
      <Pager page={page} total={query.data?.total || 0} onPage={setPage} />
    </QueryState>
  );
}
function Duplicates({ branchId }: { branchId?: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "operations",
      "duplicates",
      useAuthStore.getState().user?._id,
      page,
      branchId,
    ],
    queryFn: () => operationsApi.duplicates(page, branchId),
    staleTime: 60000,
    retry: false,
  });
  return (
    <QueryState pending={query.isPending} error={query.error}>
      <p className="mb-4 text-sm text-on-surface-variant">
        {query.data?.basis}
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        {query.data?.rows.map((row) => (
          <article
            className={panel}
            key={`${row._id.branch || "none"}:${row._id.country}:${row._id.phone}`}
          >
            <p className="font-bold">
              {row._id.country} {row._id.phone}
            </p>
            <p className="my-2">{row.count} matching leads</p>
            <Link
              className="text-sm font-bold text-primary underline"
              to={`/leads?search=${encodeURIComponent(row._id.phone)}`}
            >
              Review matching leads
            </Link>
          </article>
        ))}
      </div>
      {query.data?.total === 0 ? <Empty /> : null}
      <Pager page={page} total={query.data?.total || 0} onPage={setPage} />
    </QueryState>
  );
}
function ReactivationCard({ row }: { row: StaleLead }) {
  const userId = useAuthStore((s) => s.user?._id);
  const [scheduledAt, setScheduledAt] = useState("");
  const [remark, setRemark] = useState("");
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () =>
      operationsApi.reactivate(
        row._id,
        new Date(scheduledAt).toISOString(),
        remark,
      ),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations"] });
    },
  });
  return (
    <article className={panel}>
      <Link
        className="font-bold text-primary underline"
        to={`/leads/${row._id}`}
      >
        {row.name}
      </Link>
      <p className="my-2 text-sm">
        {row.status} · Last updated {date(row.updatedAt)}
      </p>
      <div className="mb-3 flex gap-4">
        <a
          className="min-h-11 py-2 text-primary underline"
          href={`tel:${row.phoneCountryCode.replace(/[^+\d]/g, "")}${row.phone.replace(/\D/g, "")}`}
        >
          Call on phone
        </a>
        <Link
          className="min-h-11 py-2 text-primary underline"
          to={`/leads/${row._id}#whatsapp`}
        >
          WhatsApp
        </Link>
      </div>
      {row.assignedTo === userId ? (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          <label className="block text-sm">
            Follow-up time
            <input
              type="datetime-local"
              required
              className={`${input} mt-1`}
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            Remark
            <input
              required
              maxLength={2000}
              className={`${input} mt-1`}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </label>
          <button
            disabled={mutation.isPending || mutation.isSuccess}
            className={button}
          >
            {mutation.isSuccess ? "Follow-up scheduled" : "Schedule follow-up"}
          </button>
          {mutation.error ? <Message error={mutation.error} /> : null}
        </form>
      ) : (
        <p className="text-sm text-on-surface-variant">
          Assign the lead first; its assigned caller can schedule the follow-up.
        </p>
      )}
    </article>
  );
}
function Reactivation({ days, branchId }: { days: number; branchId?: string }) {
  const [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "operations",
      "reactivation",
      useAuthStore.getState().user?._id,
      page,
      days,
      branchId,
    ],
    queryFn: () => operationsApi.stale(page, days, branchId),
    staleTime: 60000,
    retry: false,
  });
  return (
    <QueryState pending={query.isPending} error={query.error}>
      <p className="mb-4 text-sm">
        Open leads with no edits or recorded activity for {days} days.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {query.data?.rows.map((row) => (
          <ReactivationCard key={row._id} row={row} />
        ))}
      </div>
      {query.data?.total === 0 ? <Empty /> : null}
      <Pager page={page} total={query.data?.total || 0} onPage={setPage} />
    </QueryState>
  );
}
function Assignment({ branchId }: { branchId?: string }) {
  const [limit, setLimit] = useState(30);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => operationsApi.distribute(branchId!, limit),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["operations"] });
      void client.invalidateQueries({ queryKey: ["leads"] });
    },
  });
  return (
    <section className={panel}>
      <h2 className="font-bold">Distribute unassigned new leads</h2>
      <p className="my-3 max-w-2xl text-sm text-on-surface-variant">
        Select one branch above. Oldest new leads go to active employees with
        the lowest open lead count. Existing assignments stay as they are.
        Active employee profiles are required.
      </p>
      <form
        className="max-w-sm space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
      >
        <label className="block text-sm">
          Maximum leads in this batch
          <input
            type="number"
            min={1}
            max={100}
            required
            className={`${input} mt-1`}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          />
        </label>
        <button className={button} disabled={!branchId || mutation.isPending}>
          {mutation.isPending ? "Assigning…" : "Distribute leads"}
        </button>
      </form>
      {mutation.error ? <Message error={mutation.error} /> : null}
      {mutation.data ? (
        <p role="status" className="mt-4">
          Assigned {mutation.data.assigned} leads. {mutation.data.message}
        </p>
      ) : null}
    </section>
  );
}
function Reports({ days, branchId }: { days: number; branchId?: string }) {
  const query = useQuery({
    queryKey: [
      "operations",
      "reports",
      useAuthStore.getState().user?._id,
      days,
      branchId,
    ],
    queryFn: () => operationsApi.team(days, branchId),
    staleTime: 60000,
    retry: false,
  });
  return (
    <QueryState pending={query.isPending} error={query.error}>
      <p className="mb-4 text-sm text-on-surface-variant">
        {query.data?.basis}
      </p>
      <Link
        className="mb-4 inline-block font-bold text-primary underline"
        to="/performance"
      >
        Open full performance dashboard →
      </Link>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {query.data?.rows.map((row) => (
          <article className={panel} key={row.userId}>
            <h2 className="font-bold">{row.name}</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
              {[
                ["Calls", row.calls],
                ["Connected", row.connected],
                ["Talk minutes", (row.talkSeconds / 60).toFixed(1)],
                ["New leads", row.leads],
                ["Converted", row.converted],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-on-surface-variant">{label}</dt>
                  <dd className="text-xl font-bold">{value}</dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
      </div>
      {query.data?.rows.length === 0 ? <Empty /> : null}
      <p className="mt-4 text-sm">
        Unassigned leads created in this period: {query.data?.unassigned || 0}
      </p>
    </QueryState>
  );
}
function TicketDetails({
  ticketId,
  onClose,
}: {
  ticketId: string;
  onClose: () => void;
}) {
  const role = useAuthStore((s) => s.user?.role);
  const [comment, setComment] = useState("");
  const [assignee, setAssignee] = useState("");
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [
      "operations",
      "ticket",
      useAuthStore.getState().user?._id,
      ticketId,
    ],
    queryFn: () => operationsApi.ticket(ticketId),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (changes: object) =>
      operationsApi.updateTicket(ticketId, {
        ...changes,
        version: query.data!.version,
      }),
    onSuccess: () => {
      setComment("");
      void client.invalidateQueries({ queryKey: ["operations", "ticket"] });
      void client.invalidateQueries({ queryKey: ["operations", "tickets"] });
    },
  });
  const assignees = useQuery({
    queryKey: [
      "operations",
      "assignees",
      useAuthStore.getState().user?._id,
      ticketId,
    ],
    queryFn: () => operationsApi.assignees(ticketId),
    enabled: role !== "employee",
    retry: false,
  });
  const ticket = query.data;
  return (
    <section className={`${panel} mb-5`}>
      <button
        type="button"
        className="min-h-11 font-bold text-primary underline"
        onClick={onClose}
      >
        Close details
      </button>
      <QueryState pending={query.isPending} error={query.error}>
        {ticket ? (
          <>
            <h2 className="my-2 text-xl font-bold">{ticket.subject}</h2>
            <p className="whitespace-pre-wrap break-words text-sm">
              {ticket.description}
            </p>
            <p className="my-3 text-sm">
              Status: {ticket.status} · Assigned:{" "}
              {ticket.assignedTo?.name || "Unassigned"}
            </p>
            {role !== "employee" ? (
              <div className="my-4 flex flex-wrap gap-2">
                {["open", "in_progress", "resolved", "closed"].map((status) => (
                  <button
                    type="button"
                    key={status}
                    disabled={mutation.isPending || status === ticket.status}
                    className={button}
                    onClick={() => mutation.mutate({ status })}
                  >
                    {status.replaceAll("_", " ")}
                  </button>
                ))}
              </div>
            ) : null}
            {role !== "employee" ? (
              <form
                className="mb-4 flex max-w-xl flex-wrap items-end gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutation.mutate({ assignedTo: assignee });
                }}
              >
                <label className="flex-1 text-sm">
                  Assign to
                  <select
                    className={input}
                    required
                    value={assignee}
                    onChange={(e) => setAssignee(e.target.value)}
                  >
                    <option value="">Choose team member</option>
                    {assignees.data?.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button disabled={mutation.isPending} className={button}>
                  Assign
                </button>
              </form>
            ) : null}
            <form
              className="space-y-2"
              onSubmit={(e) => {
                e.preventDefault();
                mutation.mutate({ comment });
              }}
            >
              <label className="block text-sm">
                Add comment
                <textarea
                  className={`${input} mt-1`}
                  maxLength={2000}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
              </label>
              <button disabled={mutation.isPending} className={button}>
                Save comment
              </button>
            </form>
            {mutation.error ? <Message error={mutation.error} /> : null}
            <ol className="mt-5 space-y-3">
              {ticket.events.map((event, i) => (
                <li
                  key={`${event.at}:${i}`}
                  className="rounded-xl bg-surface-container-low p-3 text-sm"
                >
                  <strong>{event.actor?.name || "Former user"}</strong> ·{" "}
                  {event.action} · {date(event.at)}
                  <p className="whitespace-pre-wrap break-words">
                    {event.comment}
                  </p>
                </li>
              ))}
            </ol>
          </>
        ) : null}
      </QueryState>
    </section>
  );
}
function Tickets() {
  const [page, setPage] = useState(1),
    [selected, setSelected] = useState<string>();
  const [form, setForm] = useState({
    leadId: "",
    subject: "",
    description: "",
    category: "technical",
    priority: "normal",
  });
  const client = useQueryClient();
  const query = useQuery({
    queryKey: [
      "operations",
      "tickets",
      useAuthStore.getState().user?._id,
      page,
    ],
    queryFn: () => operationsApi.tickets(page),
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: () => operationsApi.createTicket(form),
    onSuccess: (ticket: Ticket) => {
      setSelected(ticket._id);
      setForm({
        leadId: "",
        subject: "",
        description: "",
        category: "technical",
        priority: "normal",
      });
      void client.invalidateQueries({ queryKey: ["operations", "tickets"] });
    },
  });
  const submit = (e: FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };
  return (
    <>
      <form
        className={`${panel} mb-5 grid gap-3 md:grid-cols-2`}
        onSubmit={submit}
      >
        <h2 className="font-bold md:col-span-2">Open support ticket</h2>
        <LeadPicker
          value={form.leadId}
          onChange={(leadId) => setForm({ ...form, leadId })}
        />
        <label className="text-sm">
          Subject
          <input
            className={input}
            minLength={3}
            maxLength={150}
            required
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
          />
        </label>
        <label className="text-sm">
          Category
          <select
            className={input}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            {["deposit", "withdrawal", "login", "technical", "other"].map(
              (v) => (
                <option key={v}>{v}</option>
              ),
            )}
          </select>
        </label>
        <label className="text-sm">
          Priority
          <select
            className={input}
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
          >
            {["normal", "high", "urgent"].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <label className="text-sm md:col-span-2">
          Description
          <textarea
            className={input}
            required
            minLength={3}
            maxLength={4000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </label>
        <button
          disabled={mutation.isPending}
          className={`${button} justify-self-start`}
        >
          Create ticket
        </button>
        {mutation.error ? <Message error={mutation.error} /> : null}
      </form>
      {selected ? (
        <TicketDetails
          key={selected}
          ticketId={selected}
          onClose={() => setSelected(undefined)}
        />
      ) : null}
      <QueryState pending={query.isPending} error={query.error}>
        <div className="grid gap-3 md:grid-cols-2">
          {query.data?.rows.map((ticket) => (
            <article key={ticket._id} className={panel}>
              <button
                className="min-h-11 text-left font-bold text-primary underline"
                onClick={() => setSelected(ticket._id)}
              >
                {ticket.subject}
              </button>
              <p className="text-sm">
                {ticket.lead?.name || "Lead unavailable"} · {ticket.category} ·{" "}
                {ticket.priority} · {ticket.status}
              </p>
            </article>
          ))}
        </div>
        {query.data?.total === 0 ? <Empty /> : null}
        <Pager page={page} total={query.data?.total || 0} onPage={setPage} />
      </QueryState>
    </>
  );
}
function History() {
  const [value, setValue] = useState(""),
    [leadId, setLeadId] = useState(""),
    [page, setPage] = useState(1);
  const query = useQuery({
    queryKey: [
      "operations",
      "history",
      useAuthStore.getState().user?._id,
      leadId,
      page,
    ],
    queryFn: () => operationsApi.history(leadId, page),
    enabled: !!leadId,
    retry: false,
  });
  return (
    <>
      <form
        className="mb-5 flex max-w-xl flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setLeadId(value);
        }}
      >
        <LeadPicker value={value} onChange={setValue} />
        <button className={button}>Show history</button>
      </form>
      {leadId ? (
        <QueryState pending={query.isPending} error={query.error}>
          <ol className="space-y-3">
            {query.data?.rows.map((row) => (
              <li key={row._id} className={panel}>
                <p className="font-bold">
                  {row.activityType.replaceAll("_", " ")}
                </p>
                <p className="my-2 text-sm">
                  {row.performedBy?.name || "Former user"} ·{" "}
                  {date(row.createdAt)}
                </p>
                {row.newStatus ? (
                  <p className="text-sm">
                    {row.previousStatus} → {row.newStatus}
                  </p>
                ) : null}
                <p className="whitespace-pre-wrap break-words text-sm">
                  {row.remark}
                </p>
              </li>
            ))}
          </ol>
          {query.data?.total === 0 ? <Empty /> : null}
          <Pager page={page} total={query.data?.total || 0} onPage={setPage} />
        </QueryState>
      ) : null}
    </>
  );
}
export default function OperationsPage() {
  const [tab, setTab] = useState<Tab>("followups"),
    [branchId, setBranchId] = useState(""),
    [days, setDays] = useState(14);
  const { hasPermission } = usePermissions();
  const userId = useAuthStore((s) => s.user?._id);
  const branches = useQuery({
    queryKey: ["operations", userId, "branches"],
    queryFn: operationsApi.branches,
    staleTime: 60000,
    retry: false,
  });
  const visible = (Object.keys(labels) as Tab[]).filter((t) =>
    t === "assignment"
      ? hasPermission(PERMISSIONS.LEAD_BULK_ASSIGN)
      : t === "reports"
        ? hasPermission(PERMISSIONS.REPORT_VIEW) &&
          hasPermission(PERMISSIONS.CALL_LOG_VIEW)
        : t === "history"
          ? hasPermission(PERMISSIONS.LEAD_ACTIVITY_VIEW)
          : t === "followups"
            ? hasPermission(PERMISSIONS.LEAD_FOLLOWUP_VIEW)
            : true,
  );
  const selectedTab = visible.includes(tab) ? tab : visible[0];
  const contentKey = `${userId}:${branchId}:${days}`;
  return (
    <main className="mx-auto w-full max-w-7xl space-y-5 p-3 text-on-surface sm:p-6">
      <header>
        <p className="text-xs font-bold uppercase tracking-widest text-primary">
          Dealqix CRM
        </p>
        <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Team workspace</h1>
        <p className="mt-2 text-sm text-on-surface-variant">
          Daily follow-ups, lead quality and customer support.
        </p>
      </header>
      <nav aria-label="Workspace sections" className="flex flex-wrap gap-2">
        {visible.map((t) => (
          <button
            key={t}
            type="button"
            aria-current={selectedTab === t ? "page" : undefined}
            onClick={() => setTab(t)}
            className={`${button} ${selectedTab === t ? "" : "!bg-surface-container-high !text-on-surface"}`}
          >
            {labels[t]}
          </button>
        ))}
      </nav>
      {!["tickets", "history", "whatsapp"].includes(selectedTab) ? (
        <div className="flex flex-wrap gap-4">
          <label className="min-w-48 text-sm">
            Branch
            <select
              className={`${input} mt-1`}
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
            >
              <option value="">All accessible branches</option>
              {branches.data?.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          {["reports", "reactivation"].includes(selectedTab) ? (
            <label className="text-sm">
              Period
              <select
                className={`${input} mt-1`}
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                {[7, 14, 30, 60, 90].map((n) => (
                  <option key={n} value={n}>
                    {n} days
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {branches.error ? <Message error={branches.error} /> : null}
        </div>
      ) : null}
      <div key={contentKey}>
        {selectedTab === "followups" ? (
          <Followups branchId={branchId || undefined} />
        ) : selectedTab === "duplicates" ? (
          <Duplicates branchId={branchId || undefined} />
        ) : selectedTab === "reactivation" ? (
          <Reactivation days={days} branchId={branchId || undefined} />
        ) : selectedTab === "assignment" ? (
          <Assignment branchId={branchId || undefined} />
        ) : selectedTab === "reports" ? (
          <Reports days={days} branchId={branchId || undefined} />
        ) : selectedTab === "tickets" ? (
          <Tickets />
        ) : selectedTab === "history" ? (
          <History />
        ) : (
          <section className={panel}>
            <h2 className="font-bold">WhatsApp conversations</h2>
            <p className="my-3 text-sm">
              Open a lead and use its WhatsApp card for conversation history and
              approved WATI templates. Sending needs an active WATI connection
              and the correct permissions.
            </p>
            <Link
              className="inline-block min-h-11 py-2 font-bold text-primary underline"
              to="/leads"
            >
              Open leads →
            </Link>
            <p className="mt-2 text-sm">
              Head users can manage the provider under Settings → Integrations.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
