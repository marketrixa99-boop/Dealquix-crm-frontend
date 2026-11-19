// src/services/dialerApi.ts
import { apiClient } from "./apiClient";

export interface CallLogEntry {
  _id: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  callStatus: "started" | "answered" | "ended" | "missed" | "rejected" | "failed" | "requesting" | "requested" | "unknown";
  provider?: "stringee" | "dialixa";
  duration: number;
  recordingUrl?: string;
  createdAt: string;
  caller?: {
    _id: string;
    name: string;
    email: string;
    role?: string;
  };
  lead?: {
    _id: string;
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  branch?: {
    _id: string;
    name: string;
  };
}

export interface CallLogsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Aggregated over every log matching the current filter — NOT just the rows on
 * the current page. Computed server-side so the KPI cards can't drift from the
 * filter that produced them.
 */
export interface CallLogsStats {
  totalCalls: number;
  totalSeconds: number;
  answeredCalls: number;
  missedCalls: number;
}

export interface GetCallLogsResponse {
  success: boolean;
  data: CallLogEntry[];
  stats?: CallLogsStats;
  pagination: CallLogsPagination;
}

export interface GetCallLogsQueryParams {
  page?: number;
  limit?: number;
  leadId?: string;
  userId?: string;
  branchId?: string;
  status?: string;
  search?: string;
}

export const dialerApi = {
  /** GET /dialer/logs — General Call History (Widget & Dedicated Page) */
  getCallLogs: async (params?: GetCallLogsQueryParams): Promise<GetCallLogsResponse> => {
    const { data } = await apiClient.get<GetCallLogsResponse>("/dialer/logs", { params });
    return data;
  },

  /** GET /dialer/lead/:leadId — Specific Lead Call History */
  getLeadCallHistory: async (leadId: string): Promise<CallLogEntry[]> => {
    const { data } = await apiClient.get<{ success: boolean; data: CallLogEntry[] }>(
      `/dialer/lead/${leadId}`
    );
    return data.data;
  },
};
