// src/features/dialer/components/RecentCallLogsTable.tsx
import { useNavigate } from "react-router";
import { useCallLogs } from "../hooks/useCallHistory";
import { useAuthStore } from "@/store/auth.store";
import { getSafeRecordingUrl, pauseOtherAudio } from "@/utils/dialer";

interface RecentCallLogsTableProps {
  limit?: number;
  onRedial?: (phone: string, leadId?: string) => void;
}

export const RecentCallLogsTable = ({
  limit = 10,
  onRedial,
}: RecentCallLogsTableProps) => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // 1. Fetch data directly inside the table component
  const {
    logs,
    loading: isLoading,
    refetch,
  } = useCallLogs({ userId: user?._id, limit, page: 1 });

  // console.log(logs);

  const formatDuration = (sec: number) => {
    if (!sec) return "0s";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ended":
      case "answered":
        return "bg-emerald-500/10 text-emerald-700 border-emerald-500/20";
      case "missed":
      case "rejected":
        return "bg-rose-500/10 text-rose-700 border-rose-500/20";
      default:
        return "bg-amber-500/10 text-amber-700 border-amber-500/20";
    }
  };

  return (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-outline-variant/10">
        <div>
          <h2 className="text-lg font-bold text-on-surface">
            Recent Call Logs
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Last {limit} call sessions made from this workspace
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => refetch()}
            className="text-xs font-medium text-on-surface-variant hover:text-on-surface cursor-pointer"
            title="Refresh logs"
          >
            ↻ Refresh
          </button>
          <button
            onClick={() => navigate("/dialer/history")}
            className="text-xs font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
          >
            View All History →
          </button>
        </div>
      </div>

      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-xs">
          <thead className="text-on-surface-variant uppercase bg-surface-variant/30 font-semibold">
            <tr>
              <th className="py-2.5 px-3 rounded-l-lg">Target / Lead</th>
              <th className="py-2.5 px-3">Caller</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Duration</th>
              <th className="py-2.5 px-3">Time</th>
              <th className="py-2.5 px-3">Recording</th>
              <th className="py-2.5 px-3 text-right rounded-r-lg">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/10">
            {isLoading ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-on-surface-variant"
                >
                  Loading recent activity...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-on-surface-variant"
                >
                  No call logs recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log._id}
                  className="hover:bg-surface-variant/10 transition-colors"
                >
                  <td className="py-3 px-3 font-medium text-on-surface">
                    <div>
                      {log.lead?.name || log.toNumber}
                      {log.lead?.name && (
                        <div className="text-[10px] text-on-surface-variant">
                          {log.toNumber}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {log.caller?.name || "System / Auto"}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${getStatusBadge(
                        log.callStatus,
                      )}`}
                    >
                      {log.callStatus === "requested" ? "Request sent" : log.callStatus === "unknown" ? "Outcome unknown" : log.callStatus === "requesting" ? "Request pending" : log.callStatus}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-mono">
                    {log.provider === "dialixa" ? "Unavailable" : formatDuration(log.duration)}
                  </td>
                  <td className="py-3 px-3 text-on-surface-variant">
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>

                  <td className="py-3 px-3">
                    {log.recordingUrl ? (
                      <audio
                        controls
                        preload="metadata"
                        crossOrigin="anonymous"
                        src={getSafeRecordingUrl(log.recordingUrl)}
                        onPlay={pauseOtherAudio}
                        className="h-8 w-48 rounded"
                      />
                    ) : (
                      <span className="text-gray-400">{log.provider === "dialixa" ? "Unavailable" : "No Recording"}</span>
                    )}
                  </td>

                  <td className="py-3 px-3 text-right">
                    {onRedial && (
                      <button
                        onClick={() => onRedial(log.toNumber, log.lead?._id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-primary border border-primary/20 rounded-md hover:bg-primary/5 transition-colors cursor-pointer"
                      >
                        Redial
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
