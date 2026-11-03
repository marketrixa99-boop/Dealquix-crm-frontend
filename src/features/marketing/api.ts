import { apiClient } from "@/services/apiClient";
export type Brief = { name: string; objective: "leads" | "traffic" | "engagement"; dailyBudget: number; currency: string; city: string; ageMin: number; ageMax: number; audience: string; idea: string; language: "English" | "Hindi" | "Gujarati"; accountId?: string; pageId?: string; headline: string; primaryText: string; imageUrl?: string };
export type Variant = { headline: string; primaryText: string; imagePrompt: string };
export type Campaign = { _id: string; brief: Brief; status: "draft" | "pending_review" | "approved" | "rejected"; createdAt: string; aiStatus: string; creative?: { variants: Variant[]; audienceIdeas: string[] }; events: { action: string; at: string }[] };
export type Catalog = { configured: boolean; accounts: { id: string; name: string; currency: string; account_status: number }[]; pages: { id: string; name: string }[] };
export type Report = { rows: { _id: string; name?: string; leads: number; assigned: number }[]; revenue: { _id: string; verifiedRevenueINR: number }[]; basis: string; timezone: string };
export type Insight = { campaign_id: string; campaign_name: string; spend: string; clicks: string; impressions: string; account_currency: string; actions?: { action_type: string; value: string }[] };
export type Lead = { _id: string; name: string; phone: string; status: string; assignedTo?: { name: string } };
const get = async <T,>(path: string, params?: object) => (await apiClient.get<{ data: T }>(`/marketing${path}`, { params })).data.data;
const post = async <T,>(path: string, payload: object) => (await apiClient.post<{ data: T }>(`/marketing${path}`, payload)).data.data;
export const marketingApi = {
  status: () => get<{ metaConfigured: boolean; aiConfigured: boolean; publishingEnabled: boolean; leadSyncEnabled: boolean }>("/status"),
  catalog: () => get<Catalog>("/catalog"), campaigns: () => get<Campaign[]>("/campaigns"),
  create: (brief: Brief) => post<Campaign>("/campaigns", brief),
  review: (id: string, action: string) => post<Campaign>(`/campaigns/${id}/review`, { action }),
  generate: (id: string) => post<Campaign>(`/campaigns/${id}/creative`, {}),
  leads: (id: string) => get<Lead[]>(`/campaigns/${id}/leads`),
  link: (id: string, leadIds: string[]) => post<{ matched: number; updated: number }>(`/campaigns/${id}/leads`, { leadIds }),
  report: (since: string, until: string) => get<Report>("/reports", { since, until }),
  insights: (accountId: string, since: string, until: string) => get<{ rows: Insight[]; truncated: boolean; fetchedAt: string }>("/insights", { accountId, since, until }),
};
