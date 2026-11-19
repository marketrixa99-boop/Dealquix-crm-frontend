import type {
  CallLogEntry,
  GetCallLogsQueryParams,
} from "@/services/dialerApi";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store/auth.store";
import { dialerKeys, useCallLogs } from "../hooks/useCallHistory";
import RefreshButton from "@/components/ui/RefreshButton";
import { getSafeRecordingUrl, pauseOtherAudio } from "@/utils/dialer";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];
const STORAGE_KEY_LIMIT = "call_history_page_limit";
const STORAGE_KEY_PAGE = "call_history_current_page";

const formatDuration = (seconds: number) => {
  if (!seconds || seconds <= 0) return "--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const getStatusBadge = (status: CallLogEntry["callStatus"]) => {
  switch (status) {
    case "answered":
    case "ended":
      return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
    case "missed":
    case "rejected":
      return "bg-rose-500/10 text-rose-700 border-rose-500/20";
    case "started":
      return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    default:
      return "bg-surface-container-high text-on-surface-variant border-outline-variant/30";
  }
};

type DatePreset =
  "custom" | "today" | "yesterday" | "last7" | "last30" | "thisMonth";

interface ExtendedQueryParams extends GetCallLogsQueryParams {
  startDate?: string;
  endDate?: string;
}

const CallHistoryPage: React.FC = () => {
  const user = useAuthStore((s) => s.user);

  const getDefaultRoleParams = useCallback((): Partial<ExtendedQueryParams> => {
    if (!user) return {};
    switch (user.role) {
      case "employee":
        return { userId: user._id };
      case "manager":
      case "admin":
        return { branchId: user.branches?.[0] };
      case "head":
      default:
        return {};
    }
  }, [user]);

  // Read initial pagination state from URL parameters or localStorage
  const getInitialPagination = () => {
    if (typeof window === "undefined") return { page: 1, limit: 25 };

    const searchParams = new URLSearchParams(window.location.search);
    const urlPage = parseInt(searchParams.get("page") || "", 10);
    const urlLimit = parseInt(searchParams.get("limit") || "", 10);

    const storedLimit = parseInt(
      localStorage.getItem(STORAGE_KEY_LIMIT) || "25",
      10,
    );
    const storedPage = parseInt(
      localStorage.getItem(STORAGE_KEY_PAGE) || "1",
      10,
    );

    const page = !isNaN(urlPage) && urlPage > 0 ? urlPage : storedPage || 1;
    const limit =
      !isNaN(urlLimit) && PAGE_SIZE_OPTIONS.includes(urlLimit)
        ? urlLimit
        : storedLimit || 25;

    return { page, limit };
  };

  const initialPagination = getInitialPagination();

  const [datePreset, setDatePreset] = useState<DatePreset>("custom");
  const [searchInput, setSearchInput] = useState("");

  const [queryParams, setQueryParams] = useState<ExtendedQueryParams>({
    page: initialPagination.page,
    limit: initialPagination.limit,
    search: "",
    status: "",
    leadId: "",
    startDate: "",
    endDate: "",
    ...getDefaultRoleParams(),
  });

  // Sync page & limit with URL search parameters and localStorage on change
  useEffect(() => {
    if (typeof window === "undefined") return;

    const page = queryParams.page || 1;
    const limit = queryParams.limit || 25;

    // Save to LocalStorage for persistence across tab closes/refreshes
    localStorage.setItem(STORAGE_KEY_PAGE, page.toString());
    localStorage.setItem(STORAGE_KEY_LIMIT, limit.toString());

    // Sync with browser URL without reloading page
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set("page", page.toString());
    currentUrl.searchParams.set("limit", limit.toString());
    window.history.replaceState({}, "", currentUrl.toString());
  }, [queryParams.page, queryParams.limit]);

  // Debounce search input without touching page state during normal operation
  useEffect(() => {
    const handler = setTimeout(() => {
      setQueryParams((prev) => {
        if (prev.search === searchInput) return prev;
        return {
          ...prev,
          page: 1, // Reset page to 1 on search input change
          search: searchInput,
        };
      });
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Clean empty params before fetching logs
  const cleanedParams = useMemo(() => {
    const params: ExtendedQueryParams = { ...queryParams };
    Object.keys(params).forEach((key) => {
      const k = key as keyof ExtendedQueryParams;
      if (params[k] === "" || params[k] === undefined) {
        delete params[k];
      }
    });
    return params;
  }, [queryParams]);

  const {
    logs,
    stats: metrics,
    pagination,
    loading,
    error,
  } = useCallLogs(cleanedParams);

  // Pagination Change Handlers
  const handlePageChange = (newPage: number) => {
    setQueryParams((prev) => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleLimitChange = (newLimit: number) => {
    setQueryParams((prev) => ({
      ...prev,
      page: 1, // Reset to page 1 when changing total records per page
      limit: newLimit,
    }));
  };

  const handleFilterChange = (
    key: keyof ExtendedQueryParams,
    value: string,
  ) => {
    if (key === "startDate" || key === "endDate") {
      setDatePreset("custom");
    }
    setQueryParams((prev) => ({
      ...prev,
      page: 1, // Reset page on active filter modification
      [key]: value,
    }));
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = "";
    let end = "";

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    switch (preset) {
      case "today": {
        start = formatDate(now);
        end = formatDate(now);
        break;
      }
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        start = formatDate(y);
        end = formatDate(y);
        break;
      }
      case "last7": {
        const d = new Date(now);
        d.setDate(d.getDate() - 6);
        start = formatDate(d);
        end = formatDate(now);
        break;
      }
      case "last30": {
        const d = new Date(now);
        d.setDate(d.getDate() - 29);
        start = formatDate(d);
        end = formatDate(now);
        break;
      }
      case "thisMonth": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        start = formatDate(firstDay);
        end = formatDate(now);
        break;
      }
      case "custom":
      default:
        start = "";
        end = "";
        break;
    }

    setQueryParams((prev) => ({
      ...prev,
      page: 1,
      startDate: start,
      endDate: end,
    }));
  };

  const handleResetFilters = () => {
    setDatePreset("custom");
    setSearchInput("");
    setQueryParams((prev) => ({
      page: 1,
      limit: prev.limit || 25,
      search: "",
      status: "",
      leadId: "",
      startDate: "",
      endDate: "",
      ...getDefaultRoleParams(),
    }));
  };

  // Pagination bounds metadata
  const currentLimit = queryParams.limit || 25;
  const currentPage = queryParams.page || 1;
  const totalRecords = pagination?.total || 0;
  const startItem =
    totalRecords === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const endItem = Math.min(currentPage * currentLimit, totalRecords);

  return (
    <div className="min-h-screen bg-surface p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-outline-variant/20 pb-4">
        <div>
          <h1 className="font-headline-md text-2xl font-black text-on-surface tracking-tight">
            Call Logs & Analytics Audit
          </h1>
          <p className="font-body-sm text-xs text-on-surface-variant mt-0.5">
            Centralized call history, duration analytics, and audio telemetry
            across your organization
          </p>
        </div>

        {/* Refresh button refetches without mutating queryParams state */}
        <RefreshButton
          queryKey={dialerKeys.all}
          label="Refresh Logs"
          className="self-start sm:self-auto"
        />
      </div>

      {/* KPI Cards */}
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
        <span className="material-symbols-outlined text-sm">filter_alt</span>
        <span>
          Totals across all {totalRecords} matching records, not just this page
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">call</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Total Calls
            </p>
            <h3 className="text-xl font-black text-on-surface">
              {metrics.totalCalls}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">timer</span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Total Duration
            </p>
            <h3 className="text-xl font-black text-on-surface">
              {formatDuration(metrics.totalSeconds)}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">
              phone_callback
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Answered / Connected
            </p>
            <h3 className="text-xl font-black text-emerald-700">
              {metrics.answeredCalls}
            </h3>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
            <span className="material-symbols-outlined text-2xl">
              phone_missed
            </span>
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
              Missed / Rejected
            </p>
            <h3 className="text-xl font-black text-rose-700">
              {metrics.missedCalls}
            </h3>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-3">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-sm text-on-surface-variant">
              search
            </span>
            <input
              type="text"
              placeholder="Search leads, agents or phone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low pl-9 pr-4 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={queryParams.status || ""}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all capitalize"
            >
              <option value="">Call Status</option>
              <option value="answered">Answered</option>
              <option value="ended">Ended</option>
              <option value="missed">Missed</option>
              <option value="rejected">Rejected</option>
              <option value="started">Started (legacy)</option>
              <option value="requested">Request sent</option>
              <option value="requesting">Request pending</option>
              <option value="unknown">Outcome unknown</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as DatePreset)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all"
            >
              <option value="custom">Custom Range</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7">Last 7 Days</option>
              <option value="last30">Last 30 Days</option>
              <option value="thisMonth">This Month</option>
            </select>
          </div>

          {/* Date Start */}
          <div>
            <input
              type="date"
              value={queryParams.startDate || ""}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Date End */}
          <div>
            <input
              type="date"
              value={queryParams.endDate || ""}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all"
            />
          </div>

          {/* Records Per Page Filter Selector */}
          <div>
            <select
              value={currentLimit}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all font-semibold"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} Logs / Page
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          {user?.role === "head" && (
            <div>
              <input
                type="text"
                placeholder="Branch ID..."
                value={queryParams.branchId || ""}
                onChange={(e) => handleFilterChange("branchId", e.target.value)}
                className="w-full rounded-xl border border-outline-variant/30 bg-surface-container-low px-3 py-2 text-xs text-on-surface outline-none focus:border-primary transition-all"
              />
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between border-t border-outline-variant/10 pt-3">
          <span className="text-[11px] font-semibold text-on-surface-variant">
            Viewing records as:{" "}
            <strong className="uppercase text-primary">{user?.role}</strong>
          </span>
          <button
            type="button"
            onClick={handleResetFilters}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">
              restart_alt
            </span>
            Reset Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <span className="material-symbols-outlined text-3xl text-primary animate-spin">
              progress_activity
            </span>
            <p className="text-xs font-semibold text-on-surface-variant">
              Fetching call analytics...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
            <span className="material-symbols-outlined text-4xl text-on-surface-variant/40">
              phone_disabled
            </span>
            <p className="font-label-md text-xs font-semibold text-on-surface-variant">
              No call logs found for this filter scope
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/20 bg-surface-container-low text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  <th className="py-3 px-4">Caller</th>
                  <th className="py-3 px-4">Lead Contact</th>
                  <th className="py-3 px-4">Routing</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Recording</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-xs text-on-surface">
                {logs.map((log: CallLogEntry) => (
                  <tr
                    key={log._id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="py-3.5 px-4 font-semibold">
                      {log.caller?.name || "System Agent"}
                      {log.branch?.name && (
                        <span className="block text-[10px] font-normal text-primary">
                          {log.branch.name}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-semibold">
                      {log.lead?.name || "Unlinked Contact"}
                      {log.lead?.email && (
                        <span className="block text-[10px] font-normal text-on-surface-variant">
                          {log.lead.email}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-extrabold uppercase bg-surface-container-high text-on-surface-variant">
                            From
                          </span>
                          <span className="font-semibold text-on-surface">
                            {log.fromNumber || "N/A"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-sans font-extrabold uppercase bg-primary/10 text-primary">
                            To
                          </span>
                          <span className="font-semibold text-on-surface">
                            {log.toNumber || "N/A"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusBadge(
                          log.callStatus,
                        )}`}
                      >
                        {log.callStatus === "requested" ? "Request sent" : log.callStatus === "unknown" ? "Outcome unknown" : log.callStatus === "requesting" ? "Request pending" : log.callStatus}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold">
                      {log.provider === "dialixa" ? "Unavailable" : formatDuration(log.duration)}
                    </td>

                    <td className="py-3.5 px-4">
                      {log.recordingUrl ? (
                        <audio
                          controls
                          preload="metadata"
                          crossOrigin="anonymous"
                          src={getSafeRecordingUrl(log.recordingUrl)}
                          onPlay={pauseOtherAudio}
                          className="h-8 w-48"
                        >
                          Your browser does not support the audio element.
                        </audio>
                      ) : (
                        <span className="text-xs text-slate-400">
                          {log.provider === "dialixa" ? "Unavailable" : "No Recording"}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-on-surface-variant">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Enhanced Bottom Pagination Toolbar */}
        {pagination && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-outline-variant/20 bg-surface-container-low text-xs text-on-surface-variant">
            {/* Range & Page Size Selector */}
            <div className="flex items-center gap-4">
              <span>
                Showing <strong className="text-on-surface">{startItem}</strong>
                –<strong className="text-on-surface">{endItem}</strong> of{" "}
                <strong className="text-on-surface">{totalRecords}</strong> logs
              </span>

              <div className="flex items-center gap-2">
                <label htmlFor="pageSizeSelectBottom" className="font-semibold">
                  Per page:
                </label>
                <select
                  id="pageSizeSelectBottom"
                  value={currentLimit}
                  onChange={(e) => handleLimitChange(Number(e.target.value))}
                  className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest px-2 py-1 text-xs text-on-surface outline-none focus:border-primary transition-all font-semibold"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="flex items-center gap-3">
              <span>
                Page <strong className="text-on-surface">{currentPage}</strong>{" "}
                of{" "}
                <strong className="text-on-surface">
                  {pagination.totalPages || 1}
                </strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="px-3 py-1 text-xs font-bold rounded-lg border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 transition-all"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={currentPage >= (pagination.totalPages || 1)}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="px-3 py-1 text-xs font-bold rounded-lg border border-outline-variant/30 hover:bg-surface-container-high disabled:opacity-40 transition-all"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CallHistoryPage;
