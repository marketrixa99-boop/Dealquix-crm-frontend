import { revenueApi } from "@/services/revenueApi";
import { getErrorMessage } from "@/utils/getErrorMessage";
import type {
  CreateRevenuePayload,
  RevenueReportParams,
  UpdateRevenuePayload,
  UpdateRevenueStatusPayload,
} from "@/types/revenue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

export const revenueKeys = {
  report: (params: RevenueReportParams) => ["revenue-report", params] as const,
};

export const useRevenueReportQuery = (
  params: RevenueReportParams,
  options?: {
    enabled?: boolean;
  },
) => {
  return useQuery({
    queryKey: revenueKeys.report(params),
    queryFn: () => revenueApi.getReport(params),
    enabled: options?.enabled ?? true,
  });
};

export const useCreateRevenueMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateRevenuePayload) => revenueApi.create(payload),
    onSuccess: () => {
      toast.success("Revenue entry logged successfully");
      queryClient.invalidateQueries({ queryKey: ["revenue-report"] });
      queryClient.invalidateQueries({ queryKey: ["branch-revenue-targets"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to log revenue entry"));
    },
  });
};

export const useUpdateRevenueMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRevenuePayload;
    }) => revenueApi.update(id, payload),
    onSuccess: () => {
      toast.success("Revenue entry updated");
      queryClient.invalidateQueries({ queryKey: ["revenue-report"] });
      queryClient.invalidateQueries({ queryKey: ["branch-revenue-targets"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update revenue entry"));
    },
  });
};

export const useUpdateRevenueStatusMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateRevenueStatusPayload;
    }) => revenueApi.updateStatus(id, payload),
    onSuccess: (record) => {
      toast.success(
        record.status === "VERIFIED" ? "Revenue verified" : "Revenue rejected",
      );
      queryClient.invalidateQueries({ queryKey: ["revenue-report"] });
      queryClient.invalidateQueries({ queryKey: ["branch-revenue-targets"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Failed to update revenue status"));
    },
  });
};
