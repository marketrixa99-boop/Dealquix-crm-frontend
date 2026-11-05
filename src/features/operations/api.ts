import { apiClient } from "@/services/apiClient";
export type Page<T> = { rows: T[]; total: number; page: number };
export type Followup = {
  _id: string;
  lead: string;
  name: string;
  phone: string;
  scheduledAt: string;
  remark?: string;
};
export type StaleLead = {
  _id: string;
  name: string;
  phone: string;
  phoneCountryCode: string;
  status: string;
  updatedAt: string;
  assignedTo?: string;
};
export type Duplicate = {
  _id: { branch?: string; country: string; phone: string };
  count: number;
  firstCreated: string;
};
export type Ticket = {
  _id: string;
  lead: { _id: string; name: string } | null;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  version: number;
  assignedTo?: { _id: string; name: string };
  events: {
    actor: { name: string } | null;
    action: string;
    comment?: string;
    at: string;
  }[];
};
export type TeamRow = {
  userId: string;
  name: string;
  calls: number;
  connected: number;
  talkSeconds: number;
  leads: number;
  converted: number;
};
export type History = {
  _id: string;
  activityType: string;
  performedBy?: { name: string };
  remark?: string;
  previousStatus?: string;
  newStatus?: string;
  createdAt: string;
};
const get = async <T>(path: string, params?: object) =>
  (await apiClient.get<{ data: T }>(`/operations${path}`, { params })).data
    .data;
const post = async <T>(path: string, body: object) =>
  (await apiClient.post<{ data: T }>(`/operations${path}`, body)).data.data;
export const operationsApi = {
  branches: () => get<{ _id: string; name: string }[]>("/branches"),
  leadOptions: (search: string) =>
    get<{ _id: string; name: string; phone: string }[]>("/lead-options", {
      search,
    }),
  assignees: (ticketId: string) =>
    get<{ _id: string; name: string }[]>(`/tickets/${ticketId}/assignees`),
  followups: (page: number, branchId?: string) =>
    get<Page<Followup>>("/followups", { page, branchId }),
  duplicates: (page: number, branchId?: string) =>
    get<Page<Duplicate> & { basis: string }>("/duplicates", { page, branchId }),
  stale: (page: number, days: number, branchId?: string) =>
    get<Page<StaleLead>>("/reactivation", { page, days, branchId }),
  reactivate: (id: string, scheduledAt: string, remark: string) =>
    post(`/reactivation/${id}`, { scheduledAt, remark }),
  distribute: (branchId: string, limit: number) =>
    post<{ assigned: number; partial: boolean; message?: string }>(
      "/auto-assign",
      { branchId, limit },
    ),
  team: (days: number, branchId?: string) =>
    get<{ rows: TeamRow[]; unassigned: number; basis: string }>(
      "/team-report",
      { days, branchId },
    ),
  history: (leadId: string, page: number) =>
    get<Page<History>>(`/leads/${leadId}/history`, { page }),
  tickets: (page: number) => get<Page<Ticket>>("/tickets", { page }),
  ticket: (id: string) => get<Ticket>(`/tickets/${id}`),
  createTicket: (body: object) => post<Ticket>("/tickets", body),
  updateTicket: async (id: string, body: object) =>
    (await apiClient.patch<{ data: Ticket }>(`/operations/tickets/${id}`, body))
      .data.data,
};
