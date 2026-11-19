// src/features/dialer/components/LeadCallHistory.tsx
import React from "react";
import { useLeadCallHistory } from "../hooks/useCallHistory";
import { getSafeRecordingUrl, pauseOtherAudio } from "@/utils/dialer";

interface LeadCallHistoryProps {
  leadId: string;
}

export const LeadCallHistory: React.FC<LeadCallHistoryProps> = ({ leadId }) => {
  const { calls, loading, error, refetch } = useLeadCallHistory(leadId);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ended":
      case "answered":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800">
            Answered
          </span>
        );
      case "missed":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">
            Missed
          </span>
        );
      case "rejected":
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  if (loading)
    return (
      <div className="p-4 text-xs text-gray-500">Loading call history...</div>
    );
  if (error)
    return <div className="p-4 text-xs text-rose-500">Error: {error}</div>;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
      <div className="flex justify-between items-center border-b pb-2">
        <h3 className="font-bold text-sm text-gray-800">Call Logs</h3>
        <button
          onClick={refetch}
          className="text-xs text-blue-600 hover:underline"
        >
          Refresh
        </button>
      </div>

      {calls.length === 0 ? (
        <p className="text-xs text-gray-400 py-2">
          No calls logged yet for this lead.
        </p>
      ) : (
        <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
          {calls.map((call) => (
            <div key={call._id} className="py-3 text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="font-medium text-gray-700">
                  {call.caller?.name || "Agent"} ➔ {call.toNumber}
                </span>
                {getStatusBadge(call.callStatus === "requested" ? "Request sent" : call.callStatus === "unknown" ? "Outcome unknown" : call.callStatus === "requesting" ? "Request pending" : call.callStatus)}
              </div>

              <div className="flex justify-between text-gray-400 text-[11px]">
                <span>{new Date(call.createdAt).toLocaleString()}</span>
                <span>Duration: {call.provider === "dialixa" ? "Unavailable" : formatDuration(call.duration)}</span>
              </div>

              {call.recordingUrl && (
                <div className="pt-1">
                  <audio
                    controls
                    preload="metadata"
                    crossOrigin="anonymous"
                    src={getSafeRecordingUrl(call.recordingUrl)}
                    onPlay={pauseOtherAudio}
                    className="w-full h-8 rounded"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
