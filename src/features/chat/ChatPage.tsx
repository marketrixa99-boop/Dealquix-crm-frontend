import { useEffect, useRef, useState, type FormEvent } from "react";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { MessageCircle, Plus, Send, Settings, ShieldCheck, Users, X } from "lucide-react";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import type { AuthUser } from "@/types/auth";
import "./chat.css";

interface Group { _id: string; name: string; version: number; canManage: boolean; memberCount: number; memberIds?: string[] }
interface Person { _id: string; name: string; role: string }
interface Message { _id: string; senderId: string; senderName: string; text: string; createdAt: string }
interface MessagePage { data: Message[]; hasMore: boolean }
const errorText = (error: unknown) => isAxiosError(error)
  ? error.response?.status === 404 ? "Chat unavailable. Access may have been removed, or the chat backend is not deployed yet."
    : error.response?.data?.message || "Unable to reach chat. Please try again."
  : "Something went wrong. Please try again.";
const get = async <T,>(path: string, signal?: AbortSignal) => (await apiClient.get<T>(`/chat${path}`, { signal })).data;

export default function ChatPage() {
  const user = useAuthStore(state => state.user);
  if (!user) return null;
  // A separate keyed subtree isolates all draft/selection state across logins.
  return <ChatWorkspace key={user._id} user={user} />;
}

function ChatWorkspace({ user }: { user: AuthUser }) {
  const [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<Group | "new" | null>(null);
  const groups = useQuery({ queryKey: ["chat", user._id, "groups"],
    queryFn: ({ signal }) => get<{ data: Group[] }>("/groups", signal),
    refetchInterval: 15_000, retry: false, staleTime: 0, gcTime: 0,
  });
  const active = groups.isError ? undefined : groups.data?.data.find(group => group._id === selected);
  const canCreate = user.role === "admin" || user.role === "head";
  return <section className="crm-chat">
    <header className="chat-title"><div><span className="chat-eyebrow">DEALQIX WORKSPACE</span><h1>Team chat</h1><p>One team. The right conversations.</p></div>
      {canCreate && <button className="chat-primary" onClick={() => setEditor("new")}><Plus size={18} /> New group</button>}</header>
    <div className="chat-scope"><ShieldCheck size={18} /><span>Admin controls group access. Employees see only their assigned groups.</span></div>
    <div className="chat-shell">
      <aside className="chat-groups" aria-label="Your chat groups"><div className="chat-list-heading"><h2>Your groups</h2><span>{groups.data?.data.length ?? "—"}</span></div>
        {groups.isPending ? <p className="chat-hint">Loading groups…</p> : groups.isError ? <div role="alert" className="chat-error">{errorText(groups.error)}<button onClick={() => void groups.refetch()}>Try again</button></div>
          : groups.data?.data.length ? groups.data.data.map(group => <button key={group._id} className={`chat-group ${active?._id === group._id ? "chat-group-active" : ""}`} aria-pressed={active?._id === group._id} onClick={() => setSelected(group._id)}>
            <span className="chat-avatar"><Users size={20} /></span><span><strong>{group.name}</strong><small>{group.memberCount} members{group.canManage ? " · You manage" : ""}</small></span></button>)
            : <div className="chat-hint"><p>No groups assigned yet.</p><p>{canCreate ? "Create a group and choose its members." : "Ask your Admin to add you to a group."}</p></div>}
      </aside>
      {active ? <ChatThread key={active._id} group={active} user={user} onManage={() => setEditor(active)} />
        : <div className="chat-empty"><div className="chat-empty-icon"><MessageCircle size={36} /></div><h2>Your conversations, together</h2><p>Select a group to start chatting.</p><small>Private to assigned members and the group’s Admin.</small></div>}
    </div>
    {editor && <GroupEditor key={editor === "new" ? "new" : editor._id} user={user} group={editor === "new" ? undefined : editor} onClose={() => setEditor(null)} />}
  </section>;
}

function ChatThread({ group, user, onManage }: { group: Group; user: AuthUser; onManage: () => void }) {
  const cache = useQueryClient();
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<{ text: string; clientId: string } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const key = ["chat", user._id, "messages", group._id];
  const messages = useInfiniteQuery({ queryKey: key, initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => get<MessagePage>(`/groups/${group._id}/messages${pageParam ? `?before=${pageParam}` : ""}`, signal),
    getNextPageParam: page => page.hasMore ? page.data[0]?._id : undefined,
    // Pause polling while reading history; one current page costs one request.
    refetchInterval: query => (query.state.data?.pages.length ?? 1) === 1 ? 10_000 : false,
    retry: false, staleTime: 0, gcTime: 0,
  });
  const latestId = messages.data?.pages[0]?.data.at(-1)?._id;
  const readingHistory = (messages.data?.pages.length ?? 0) > 1;
  useEffect(() => { if (!readingHistory) bottom.current?.scrollIntoView({ block: "nearest" }); }, [latestId, readingHistory]);
  const send = useMutation({
    mutationFn: (input: { text: string; clientId: string }) => apiClient.post(`/chat/groups/${group._id}/messages`, input),
    retry: false,
    onSuccess: () => { setDraft(""); setPending(null); void cache.resetQueries({ queryKey: key }); },
    onError: () => { void cache.invalidateQueries({ queryKey: ["chat", user._id, "groups"] }); },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.trim() || send.isPending || messages.isError) return;
    const input = pending?.text === draft.trim() ? pending : { text: draft.trim(), clientId: crypto.randomUUID() };
    setPending(input); send.mutate(input);
  };
  const rows = [...(messages.data?.pages ?? [])].reverse().flatMap(page => page.data);
  return <div className="chat-thread"><header className="chat-thread-header"><div className="chat-avatar"><Users size={20} /></div><div><h2>{group.name}</h2><p>{group.memberCount} members · {readingHistory ? "Reading history · updates paused" : "Updates every 10 seconds"}</p></div>
    {group.canManage && <button className="chat-icon" aria-label="Manage group members" onClick={onManage}><Settings size={19} /></button>}</header>
    {readingHistory && <button className="chat-history" onClick={() => void cache.resetQueries({ queryKey: key })}>Back to latest messages</button>}
    <div className="chat-messages" role="log" aria-label={`${group.name} messages`} aria-live={readingHistory ? "off" : "polite"}>
      {messages.isError ? <div role="alert" className="chat-error">{errorText(messages.error)}<button onClick={() => void messages.refetch()}>Retry</button></div>
        : messages.isPending ? <p className="chat-hint">Loading messages…</p> : <>
          {messages.hasNextPage && <button className="chat-history" disabled={messages.isFetchingNextPage} onClick={() => void messages.fetchNextPage()}>{messages.isFetchingNextPage ? "Loading…" : "Load earlier messages"}</button>}
          {!rows.length && <p className="chat-hint">No messages yet. Say hello to your team.</p>}
          {rows.map(message => <article key={message._id} className={`chat-message ${message.senderId === user._id ? "chat-mine" : ""}`}><div><strong>{message.senderId === user._id ? "You" : message.senderName}</strong><p>{message.text}</p><time dateTime={message.createdAt}>{new Date(message.createdAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}</time></div></article>)}
          <div ref={bottom} />
        </>}
    </div>
    <form className="chat-compose" onSubmit={submit}>{send.isError && <p className="chat-error" role="alert">{errorText(send.error)} Your message was kept; retry sending.</p>}
      <label className="sr-only" htmlFor="chat-message">Message</label><div><textarea id="chat-message" value={draft} onChange={event => setDraft(event.target.value)} placeholder="Write a message…" maxLength={4000} rows={2} disabled={send.isPending || messages.isError} />
        <button className="chat-primary" type="submit" aria-label="Send message" disabled={!draft.trim() || send.isPending || messages.isError}><Send size={18} /><span>{send.isPending ? "Sending…" : "Send"}</span></button></div><small>{draft.length}/4000 · Only this group can read your message</small></form>
  </div>;
}

function GroupEditor({ user, group, onClose }: { user: AuthUser; group?: Group; onClose: () => void }) {
  const cache = useQueryClient();
  const [name, setName] = useState(group?.name ?? "");
  const [ids, setIds] = useState<string[]>(group?.memberIds ?? []);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const titleInput = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); titleInput.current?.focus(); }, []);
  const candidates = useQuery({ queryKey: ["chat", user._id, "candidates", filter],
    queryFn: ({ signal }) => get<{ data: Person[]; hasMore: boolean }>(`/candidates?search=${encodeURIComponent(filter)}`, signal), retry: false,
  });
  const existing = useQuery({ queryKey: ["chat", user._id, "members", group?._id], enabled: !!group,
    queryFn: ({ signal }) => get<{ data: Person[] }>(`/groups/${group!._id}/members`, signal), retry: false,
  });
  const people = new Map([...(existing.data?.data ?? []), ...(candidates.data?.data ?? [])].map(person => [person._id, person]));
  const save = useMutation({ retry: false, mutationFn: async () => {
    if (group) await apiClient.put(`/chat/groups/${group._id}`, { name, memberIds: ids, version: group.version });
    else await apiClient.post("/chat/groups", { name, memberIds: ids });
  },
    onSuccess: async () => { await cache.invalidateQueries({ queryKey: ["chat", user._id] }); onClose(); },
  });
  const toggle = (id: string) => setIds(previous => previous.includes(id) ? previous.filter(value => value !== id) : [...previous, id]);
  return <dialog className="chat-dialog crm-chat" ref={dialog} onCancel={event => { event.preventDefault(); if (!save.isPending) onClose(); }} aria-labelledby="chat-editor-title"><div className="chat-editor">
    <header><div><span className="chat-eyebrow">ADMIN CONTROLS</span><h2 id="chat-editor-title">{group ? "Manage group" : "Create a group"}</h2></div><button className="chat-icon" aria-label="Close group editor" disabled={save.isPending} onClick={onClose}><X size={20} /></button></header>
    <p>Choose who can see and chat in this group. You are included automatically.</p>
    <label htmlFor="chat-group-name">Group name</label><input ref={titleInput} id="chat-group-name" value={name} onChange={event => setName(event.target.value)} maxLength={80} disabled={save.isPending} placeholder="e.g. Account opening team" />
    <form className="chat-member-search" onSubmit={event => { event.preventDefault(); setFilter(search); }}><label className="sr-only" htmlFor="chat-member-search">Search employees and managers</label><input id="chat-member-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search employees and managers" maxLength={80} /><button type="submit">Search</button></form>
    <h3>Selected members · {ids.length}/300</h3><div className="chat-selected">{ids.map(id => <button key={id} disabled={save.isPending} onClick={() => toggle(id)} aria-label={`Remove ${people.get(id)?.name ?? "member"}`}>{people.get(id)?.name ?? "Member"}<X size={12} /></button>)}</div>
    <div className="chat-people">{candidates.isPending ? <p>Loading team…</p> : candidates.isError ? <p role="alert">{errorText(candidates.error)}</p> : !candidates.data?.data.length ? <p>No eligible people found in your branches.</p> : candidates.data.data.map(person => <label key={person._id}><input type="checkbox" checked={ids.includes(person._id)} disabled={save.isPending || (!ids.includes(person._id) && ids.length >= 300)} onChange={() => toggle(person._id)} /><span>{person.name}<small>{person.role}</small></span></label>)}</div>
    {candidates.data?.hasMore && <p>Showing 200 matches. Search by name to find more people.</p>}
    <p className="chat-hint">Removing a member blocks future API access immediately. An open screen refreshes within 15 seconds. Messages already read cannot be recalled.</p>
    {save.isError && <p role="alert" className="chat-error">{errorText(save.error)}</p>}
    <footer><button onClick={onClose} disabled={save.isPending}>Cancel</button><button className="chat-primary" onClick={() => save.mutate()} disabled={!name.trim() || save.isPending || candidates.isError}>{save.isPending ? "Saving…" : group ? "Save access" : "Create group"}</button></footer>
  </div></dialog>;
}
