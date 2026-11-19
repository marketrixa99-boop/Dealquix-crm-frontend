import axios from "axios";
import { apiClient } from "./apiClient";
import type { ApiEnvelope } from "./apiEnvelope";

export interface DialixaSession {
  provider: "dialixa";
  configured: boolean;
  enabled: boolean;
  extension: string | null;
  canCall: boolean;
  cooldownSeconds: number;
}
export interface DialixaSettings { enabled: boolean; apiBaseUrl: string; keyConfigured: boolean }
export interface DialixaAgent {
  _id: string; name: string; email: string; role: string; isActive: boolean;
  dialixaExtension?: string; dialerEnabled?: boolean;
  branches: { _id: string; name: string }[];
}
export interface DialixaCallResult {
  accepted: boolean; status: "requested"; number: string;
  message: string; cooldownSeconds: number;
}
export function dialixaError(error: unknown) {
  return axios.isAxiosError<{ message?: string }>(error)
    ? error.response?.data?.message || "Could not reach the CRM. Check your connection and your Dialixa softphone before trying again."
    : error instanceof Error ? error.message : "Unable to complete this request.";
}

export const dialixaApi = {
  session: async () => (await apiClient.get<ApiEnvelope<DialixaSession>>("/dialer/session")).data.data,
  settings: async () => (await apiClient.get<ApiEnvelope<DialixaSettings>>("/dialer/settings")).data.data,
  saveSettings: async (input: { enabled: boolean; apiBaseUrl: string; apiKey?: string }) =>
    (await apiClient.put<ApiEnvelope<DialixaSettings>>("/dialer/settings", input)).data.data,
  agents: async (page: number, search: string) => (await apiClient.get<{
    success: boolean; data: DialixaAgent[]; pagination: { page: number; total: number; totalPages: number };
  }>("/dialer/agents", { params: { page, search } })).data,
  saveAgent: async (id: string, input: { extension: string | null; enabled: boolean }) =>
    (await apiClient.patch(`/dialer/agents/${id}`, input)).data,
  call: async (input: { requestId: string; leadId?: string; number?: string }) =>
    (await apiClient.post<ApiEnvelope<DialixaCallResult>>("/dialer/click-to-call", input, { timeout: 25000 })).data.data,
};
