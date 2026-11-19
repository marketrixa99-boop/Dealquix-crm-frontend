import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { dialixaApi, dialixaError, type DialixaAgent } from "@/services/dialixaApi";
import { useAuthStore } from "@/store/auth.store";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

const field = "w-full rounded-xl border border-outline-variant/40 bg-surface px-3 py-2.5 text-base text-on-surface focus:border-primary outline-none";
const button = "rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-on-primary disabled:opacity-50 disabled:cursor-not-allowed";

function AccountSettings() {
  const queryClient = useQueryClient();
  const config = useQuery({ queryKey: ["dialixa", "settings"], queryFn: dialixaApi.settings, retry: false });
  const [apiBaseUrl, setApiBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    if (config.data) { setApiBaseUrl(config.data.apiBaseUrl); setEnabled(config.data.enabled); }
  }, [config.data]);
  const save = useMutation({
    mutationFn: () => dialixaApi.saveSettings({ apiBaseUrl: apiBaseUrl.trim(), enabled, ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}) }),
    onSuccess: () => {
      setApiKey("");
      queryClient.invalidateQueries({ queryKey: ["dialixa"] });
    },
  });
  return <section className="rounded-2xl border border-outline-variant/30 bg-surface p-6 space-y-5">
    <div><h2 className="text-lg font-bold">Dialixa account</h2>
      <p className="mt-1 text-sm text-on-surface-variant">Copy the production API base URL and key from Dialixa Admin Panel → Settings → Click-to-Call API.</p></div>
    {config.isLoading ? <p>Loading settings…</p> : config.isError ? <p role="alert" className="text-rose-600">{dialixaError(config.error)}</p> :
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <label className="block space-y-1.5 text-sm font-semibold">API base URL
          <input className={field} type="url" placeholder="Paste the API base URL from your Dialixa panel" required value={apiBaseUrl} onChange={(e) => setApiBaseUrl(e.target.value)} disabled={save.isPending} />
        </label>
        <label className="block space-y-1.5 text-sm font-semibold">API key
          <input className={field} type="password" autoComplete="new-password" placeholder={config.data?.keyConfigured ? "Saved securely · enter a new key to replace it" : "Paste the complete API key"} value={apiKey} onChange={(e) => setApiKey(e.target.value)} required={!config.data?.keyConfigured} disabled={save.isPending} />
        </label>
        <p className="text-sm text-on-surface-variant">{config.data?.keyConfigured ? "An encrypted API key is saved. The saved key is never returned to the browser." : "Calling stays unavailable until the account and agent extensions are configured."}</p>
        <label className="flex items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} disabled={save.isPending} className="size-5 accent-primary" />Enable Dialixa calling for configured agents</label>
        {save.isError && <p role="alert" className="text-sm text-rose-600">{dialixaError(save.error)}</p>}
        {save.isSuccess && <p role="status" className="text-sm text-emerald-700">Dialixa account settings saved.</p>}
        <button className={button} disabled={save.isPending}>{save.isPending ? "Saving…" : "Save account settings"}</button>
      </form>}
  </section>;
}

function AgentRow({ agent }: { agent: DialixaAgent }) {
  const queryClient = useQueryClient();
  const [extension, setExtension] = useState(agent.dialixaExtension || "");
  const [enabled, setEnabled] = useState(!!agent.dialerEnabled);
  useEffect(() => { setExtension(agent.dialixaExtension || ""); setEnabled(!!agent.dialerEnabled); }, [agent.dialixaExtension, agent.dialerEnabled]);
  const save = useMutation({
    mutationFn: () => dialixaApi.saveAgent(agent._id, { extension: extension.trim() || null, enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dialixa"] }),
  });
  const changed = extension.trim() !== (agent.dialixaExtension || "") || enabled !== !!agent.dialerEnabled;
  return <tr className="border-t border-outline-variant/20 align-top">
    <td className="p-3"><p className="font-semibold">{agent.name}</p><p className="text-sm text-on-surface-variant break-all">{agent.email}</p><p className="text-sm capitalize text-on-surface-variant">{agent.role}{!agent.isActive && " · Inactive"}</p></td>
    <td className="p-3 text-sm">{agent.branches.map((branch) => branch.name).join(", ") || "Global"}</td>
    <td className="p-3"><input aria-label={`Dialixa extension for ${agent.name}`} inputMode="numeric" pattern="[0-9]{2,20}" maxLength={20} value={extension} onChange={(e) => { setExtension(e.target.value); save.reset(); }} disabled={save.isPending} className={`${field} min-w-32 max-w-48`} placeholder="e.g. 41857" /></td>
    <td className="p-3"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => { setEnabled(e.target.checked); save.reset(); }} disabled={save.isPending || !agent.isActive} className="size-5 accent-primary" />Enabled</label></td>
    <td className="p-3"><button type="button" onClick={() => save.mutate()} disabled={!changed || save.isPending || (enabled && !/^\d{2,20}$/.test(extension.trim())) || (!!extension.trim() && !/^\d{2,20}$/.test(extension.trim()))} className={button}>{save.isPending ? "Saving…" : "Save"}</button>
      {save.isError && <p role="alert" className="mt-2 max-w-64 text-sm text-rose-600">{dialixaError(save.error)}</p>}
      {save.isSuccess && <p role="status" className="mt-2 text-sm text-emerald-700">Saved</p>}
    </td>
  </tr>;
}

export default function DialixaSetupPage() {
  const user = useAuthStore((s) => s.user);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const term = useDebouncedValue(search, 300);
  const agents = useQuery({ queryKey: ["dialixa", "agents", user?._id, page, term], queryFn: () => dialixaApi.agents(page, term), retry: false });
  return <div className="space-y-6 text-on-surface">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Dialixa setup</h1><p className="mt-1 text-sm text-on-surface-variant">Connect your account and assign an extension to each CRM user.</p></div><Link to="/dialer" className="text-sm font-bold text-primary hover:underline">Open dialer</Link></div>
    {user?.role === "head" && <AccountSettings />}
    <section className="rounded-2xl border border-outline-variant/30 bg-surface p-6 space-y-4">
      <div><h2 className="text-lg font-bold">Agent extensions</h2><p className="mt-1 text-sm text-on-surface-variant">Find each extension in Dialixa → Settings → Users &amp; Roles. Calling is off for each user until enabled here.</p></div>
      <label className="block max-w-md text-sm font-semibold">Search users<input className={`${field} mt-1.5`} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Name, email or extension" /></label>
      {agents.isLoading ? <p>Loading agents…</p> : agents.isError ? <p role="alert" className="text-rose-600">{dialixaError(agents.error)}</p> : <>
        <div className="overflow-x-auto"><table className="w-full text-left"><thead><tr className="text-sm text-on-surface-variant"><th className="p-3">User</th><th className="p-3">Branches</th><th className="p-3">Extension</th><th className="p-3">Calling</th><th className="p-3">Action</th></tr></thead><tbody>{agents.data?.data.map((agent) => <AgentRow key={agent._id} agent={agent} />)}</tbody></table></div>
        {!agents.data?.data.length && <p className="text-sm text-on-surface-variant">No users match this search.</p>}
        <div className="flex items-center justify-between gap-3 text-sm"><span>{agents.data?.pagination.total || 0} users · Page {page}</span><div className="flex gap-3"><button disabled={page <= 1} onClick={() => setPage((v) => v - 1)} className="disabled:opacity-40">Previous</button><button disabled={page >= (agents.data?.pagination.totalPages || 1)} onClick={() => setPage((v) => v + 1)} className="disabled:opacity-40">Next</button></div></div>
      </>}
    </section>
  </div>;
}
