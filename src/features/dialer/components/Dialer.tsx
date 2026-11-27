import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth.store";
import { useCallStore } from "@/store/call.store";
import { useLead } from "@/features/leads/hooks/useLeads";
import { dialixaApi, dialixaError } from "@/services/dialixaApi";
import { dialerKeys } from "../hooks/useCallHistory";
import { LeadContextCard } from "./LeadContextCard";
import { RecentCallLogsTable } from "./RecentCallLogsTable";

export const Dialer = () => {
  const user = useAuthStore((s) => s.user);
  const [params, setParams] = useSearchParams();
  const leadId = params.get("leadId") || "";
  const directLead = useLead(leadId || undefined);
  const activeLead = useCallStore((s) => s.activeLead);
  const setActiveLead = useCallStore((s) => s.setActiveLead);
  const selectedLead = leadId ? directLead.data : activeLead;
  const isEmployee = user?.role === "employee";
  const canManage = user?.role === "head" || user?.role === "admin";
  const queryClient = useQueryClient();
  const session = useQuery({ queryKey: ["dialixa", "session", user?._id], queryFn: dialixaApi.session, retry: false });
  const [number, setNumber] = useState(params.get("phone") || "");
  const [cooldown, setCooldown] = useState(0);
  const [notice, setNotice] = useState("");
  const requestId = useRef(crypto.randomUUID());
  const inFlight = useRef(false);
  const call = useMutation({ mutationFn: dialixaApi.call, retry: false });

  useEffect(() => {
    if (selectedLead) setNumber(`${selectedLead.phoneCountryCode}${selectedLead.phone}`);
  }, [selectedLead]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((v) => Math.max(0, v - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  const startNewRequest = () => {
    requestId.current = crypto.randomUUID();
    call.reset();
    setNotice("");
  };
  const handleCall = async () => {
    if (inFlight.current || cooldown > 0 || call.isSuccess || call.isError) return;
    inFlight.current = true;
    setNotice("");
    try {
      const response = await call.mutateAsync({ requestId: requestId.current, ...(selectedLead ? { leadId: selectedLead._id } : { number }) });
      setCooldown(response.cooldownSeconds);
      await queryClient.invalidateQueries({ queryKey: dialerKeys.all });
    } catch {
      // Retain the request ID on all failures; never auto-retry an ambiguous call.
      await queryClient.invalidateQueries({ queryKey: dialerKeys.all });
    } finally { inFlight.current = false; }
  };

  return <div className="space-y-6 text-on-surface">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/20 pb-4">
      <div><h1 className="text-2xl font-bold">Dialixa dialer</h1><p className="mt-1 text-sm text-on-surface-variant">Request a call from your assigned agent extension.</p></div>
      {canManage && <Link to="/dialer/numbers" className="text-sm font-bold text-primary hover:underline">Dialer setup</Link>}
    </div>
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 items-start">
      <section className="rounded-2xl border border-outline-variant/30 bg-surface p-6 space-y-5">
        <h2 className="text-lg font-bold">Click to call</h2>
        {session.isLoading ? <p>Checking dialer access…</p> : session.isError ? <div role="alert" className="space-y-2 text-sm text-rose-600"><p>{dialixaError(session.error)}</p><button type="button" onClick={() => session.refetch()} className="font-bold underline">Check again</button></div> : <>
          <div className="rounded-xl bg-surface-container-low p-4 text-sm space-y-1">
            <p className="font-semibold">Agent extension: {session.data?.extension || "Not assigned"}</p>
            <p className="text-on-surface-variant">{session.data?.canCall ? "Extension enabled in CRM" : !session.data?.configured || !session.data?.enabled ? "Head must complete and enable Dialixa account setup." : "Ask Head or Admin to assign and enable your extension."}</p>
          </div>
          <label className="block space-y-2 text-sm font-semibold">{selectedLead ? `Customer · ${selectedLead.name}` : "Customer phone number"}
            <input aria-label="Customer phone number" type="tel" inputMode="tel" value={number} readOnly={isEmployee || !!selectedLead} disabled={call.isPending || cooldown > 0} onChange={(e) => { setNumber(e.target.value); if (!call.isError && !call.isSuccess) requestId.current = crypto.randomUUID(); }} placeholder={isEmployee ? "Choose an assigned lead" : "Country code and phone number"} className="w-full rounded-xl border border-outline-variant/40 bg-surface-container-low px-4 py-3 text-lg font-mono outline-none focus:border-primary read-only:opacity-75" />
          </label>
          {isEmployee && <p className="text-sm text-on-surface-variant">Choose one of your assigned leads to place a call.</p>}
          <div className="flex items-center gap-3 rounded-xl border border-outline-variant/30 bg-surface-container-low px-4 py-3">
            <span className="material-symbols-outlined text-primary" aria-hidden="true">headset_mic</span>
            <p className="text-sm text-on-surface-variant">Keep Dialixa open. Answer your extension to connect the customer.</p>
          </div>
          <button type="button" onClick={handleCall} disabled={!session.data?.canCall || !number.trim() || (isEmployee && !selectedLead) || !!(leadId && !directLead.data) || call.isPending || call.isSuccess || call.isError || cooldown > 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-base font-bold text-on-primary disabled:opacity-50 disabled:cursor-not-allowed"><span className="material-symbols-outlined" aria-hidden="true">call</span>{call.isPending ? "Calling…" : "Call now"}</button>
        </>}
        {call.isSuccess && <div role="status" className="rounded-xl bg-emerald-500/10 p-4 text-sm text-emerald-800">{call.data.message}</div>}
        {call.isError && <div role="alert" className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-700">{dialixaError(call.error)}</div>}
        {(call.isSuccess || call.isError) && <button type="button" disabled={cooldown > 0 || call.isPending} onClick={startNewRequest} className="text-sm font-semibold text-primary underline disabled:opacity-50">{cooldown > 0 ? `New request available in ${cooldown}s` : call.isError ? "I checked my softphone · start a new request" : "Start a new call request"}</button>}
        {notice && <p role="alert" className="text-sm text-rose-600">{notice}</p>}
        <p className="border-t border-outline-variant/20 pt-4 text-sm text-on-surface-variant">Call controls stay in Dialixa. CRM records request acceptance; connected status, talk time and recordings require a separate Dialixa integration.</p>
      </section>
      <div className={call.isPending || cooldown > 0 ? "pointer-events-none opacity-60" : ""} inert={call.isPending || cooldown > 0}>
        <LeadContextCard phoneNumber={number} onSelectLeadPhone={() => { startNewRequest(); }} />
      </div>
    </div>
    <RecentCallLogsTable limit={10} onRedial={(phone, redialLeadId) => {
      if (call.isPending || cooldown > 0) return;
      if (isEmployee && !redialLeadId) { setNotice("Choose an assigned CRM lead before redialling this number."); return; }
      setActiveLead(null);
      setNumber(phone);
      startNewRequest();
      setParams(redialLeadId ? { leadId: redialLeadId } : { phone }, { replace: true });
    }} />
  </div>;
};

export default Dialer;
