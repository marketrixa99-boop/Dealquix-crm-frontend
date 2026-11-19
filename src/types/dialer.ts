// src/types/dialer.ts
export interface CallLogUserRef {
  _id: string;
  name: string;
  email: string;
  role: string;
}

export interface CallLogEntry {
  _id: string;
  lead: string;
  caller: CallLogUserRef | string;
  branch: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  callStatus: "started" | "answered" | "ended" | "missed" | "rejected" | "failed" | "requesting" | "requested" | "unknown";
  duration: number;
  recordingUrl?: string;
  createdAt: string;
}

export type DialerCallState =
  | "idle"
  | "connecting"
  | "calling"
  | "ringing"
  | "active"
  | "ended"
  | "failed";
