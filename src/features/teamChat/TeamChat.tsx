import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { useAuthStore } from "@/store/auth.store";
import { getErrorMessage } from "@/utils/getErrorMessage";

type Message = {
  _id: string;
  text: string;
  sender: { _id: string; name: string; role: string } | null;
  createdAt: string;
  clientMessageId: string;
};
type MessagePage = { rows: Message[]; nextBefore: string | null };
const inputClass =
  "w-full rounded-xl border border-outline-variant/40 bg-surface p-3 text-sm text-on-surface focus-visible:outline-2 focus-visible:outline-primary";
const get = async <T,>(path: string, params?: object) =>
  (await apiClient.get<{ data: T }>(`/team-chat${path}`, { params })).data.data;

function BranchChat({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState("");
  const [before, setBefore] = useState<string>();
  const [draft, setDraft] = useState("");
  const [retry, setRetry] = useState<{
    branchId: string;
    text: string;
    clientMessageId: string;
  }>();
  const queryClient = useQueryClient();
  const end = useRef<HTMLDivElement>(null),
    textarea = useRef<HTMLTextAreaElement>(null),
    trigger = useRef<HTMLButtonElement>(null);
  const branches = useQuery({
    queryKey: ["team-chat", userId, "branches"],
    queryFn: () => get<{ _id: string; name: string }[]>("/branches"),
    enabled: open,
    staleTime: 60000,
    retry: false,
  });
  const branchId = selectedBranch || branches.data?.[0]?._id || "";
  const messages = useQuery({
    queryKey: ["team-chat", userId, branchId, before || "latest"],
    queryFn: () => get<MessagePage>(`/${branchId}/messages`, { before }),
    enabled: open && !!branchId,
    refetchInterval: before ? false : 10000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const send = useMutation({
    mutationFn: async (payload: {
      branchId: string;
      text: string;
      clientMessageId: string;
    }) =>
      (
        await apiClient.post<{ data: Message }>(
          `/team-chat/${payload.branchId}/messages`,
          { text: payload.text, clientMessageId: payload.clientMessageId },
        )
      ).data.data,
    onSuccess: (_result, payload) => {
      setDraft("");
      setRetry(undefined);
      setBefore(undefined);
      void queryClient.invalidateQueries({
        queryKey: ["team-chat", userId, payload.branchId],
      });
    },
  });
  const visibleMessages = messages.isError ? undefined : messages.data;
  const lastMessageId = visibleMessages?.rows.at(-1)?._id;
  useEffect(() => {
    if (open && !before) end.current?.scrollIntoView({ block: "nearest" });
  }, [open, before, lastMessageId]);
  useEffect(() => {
    if (open && branchId) textarea.current?.focus();
  }, [open, branchId]);
  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };
  const changeBranch = (value: string) => {
    setSelectedBranch(value);
    setBefore(undefined);
    setDraft("");
    setRetry(undefined);
    send.reset();
  };
  const error = branches.error || messages.error || send.error;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={open ? "Close team chat" : "Open team chat"}
        aria-expanded={open}
        aria-controls="team-chat-panel"
        className="fixed bottom-44 right-4 z-[60] flex min-h-12 items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-bold text-on-primary shadow-xl sm:right-6"
      >
        <span className="material-symbols-outlined" aria-hidden="true">
          chat
        </span>
        Team chat
      </button>
      {open ? (
        <section
          id="team-chat-panel"
          role="dialog"
          aria-label="Branch team chat"
          onKeyDown={(e) => {
            if (e.key === "Escape") close();
          }}
          className="fixed bottom-[14.5rem] right-3 z-[60] flex max-h-[65dvh] w-[calc(100vw-1.5rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-outline-variant/40 bg-surface-container-lowest text-on-surface shadow-2xl sm:right-6"
        >
          <header className="flex items-center justify-between border-b border-outline-variant/20 px-4 py-2">
            <div>
              <h2 className="font-bold">Team chat</h2>
              <p className="text-xs text-on-surface-variant">
                Branch conversation · updates every 10 seconds
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close chat panel"
              className="min-h-11 min-w-11 rounded-xl text-xl"
            >
              ×
            </button>
          </header>
          <div className="border-b border-outline-variant/20 p-3">
            <label className="text-xs font-bold">
              Branch
              <select
                disabled={send.isPending || !!retry}
                className={`${inputClass} mt-1`}
                value={branchId}
                onChange={(e) => changeBranch(e.target.value)}
              >
                <option value="" disabled>
                  Choose a branch
                </option>
                {branches.data?.map((branch) => (
                  <option key={branch._id} value={branch._id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="min-h-28 flex-1 overflow-y-auto overscroll-contain p-3">
            {branches.isPending ? (
              <p role="status" className="text-sm">
                Loading branches…
              </p>
            ) : null}
            {branches.data?.length === 0 ? (
              <p className="text-sm">
                No active branch assigned. Ask your administrator to assign a
                branch.
              </p>
            ) : null}
            {messages.isFetching && !messages.data && branchId ? (
              <p role="status" className="text-sm">
                Loading messages…
              </p>
            ) : null}
            {visibleMessages ? (
              <div className="mb-3 flex flex-wrap gap-3 text-xs">
                <button
                  type="button"
                  className="min-h-9 font-bold text-primary underline disabled:opacity-40"
                  disabled={!visibleMessages.nextBefore || messages.isFetching}
                  onClick={() => setBefore(visibleMessages.nextBefore!)}
                >
                  Older messages
                </button>
                {before ? (
                  <button
                    type="button"
                    className="min-h-9 font-bold text-primary underline"
                    onClick={() => setBefore(undefined)}
                  >
                    Back to latest
                  </button>
                ) : (
                  <span className="self-center text-on-surface-variant">
                    Latest 50 messages
                  </span>
                )}
              </div>
            ) : null}
            {visibleMessages?.rows.length === 0 ? (
              <p className="py-5 text-center text-sm text-on-surface-variant">
                No messages yet.
              </p>
            ) : null}
            <ol
              className="space-y-3"
              aria-label="Chat messages"
              aria-live="polite"
              aria-relevant="additions"
            >
              {visibleMessages?.rows.map((message) => (
                <li
                  key={message._id}
                  className={`max-w-[92%] rounded-2xl p-3 ${message.sender?._id === userId ? "ml-auto bg-primary/10" : "bg-surface-container-high"}`}
                >
                  <p className="mb-1 text-xs font-bold">
                    {message.sender?.name || "Former member"}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-sm [overflow-wrap:anywhere]">
                    {message.text}
                  </p>
                  <time
                    dateTime={message.createdAt}
                    className="mt-1 block text-[10px] text-on-surface-variant"
                  >
                    {new Date(message.createdAt).toLocaleString()}
                  </time>
                </li>
              ))}
            </ol>
            <div ref={end} />
          </div>
          {error ? (
            <div
              role="alert"
              className="border-t border-outline-variant/20 p-3 text-xs text-error"
            >
              <p>
                {getErrorMessage(error, "Chat could not load. Please retry.")}
              </p>
              {retry ? (
                <>
                  <p className="mt-1">
                    Delivery is unconfirmed. Retry safely before writing another
                    message.
                  </p>
                  <button
                    type="button"
                    className="mt-2 min-h-9 font-bold underline"
                    disabled={send.isPending}
                    onClick={() => send.mutate(retry)}
                  >
                    Retry sending
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className="mt-2 min-h-9 font-bold underline"
                  onClick={() => {
                    void branches.refetch();
                    if (branchId) void messages.refetch();
                  }}
                >
                  Retry loading
                </button>
              )}
            </div>
          ) : null}
          <form
            className="border-t border-outline-variant/20 p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim() || !branchId || send.isPending || retry) return;
              const payload = {
                branchId,
                text: draft.trim(),
                clientMessageId: crypto.randomUUID(),
              };
              setRetry(payload);
              send.mutate(payload);
            }}
          >
            <label htmlFor="team-chat-message" className="sr-only">
              Message to branch
            </label>
            <textarea
              ref={textarea}
              id="team-chat-message"
              rows={2}
              maxLength={2000}
              required
              disabled={!branchId || send.isPending || !!retry}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write to your branch team…"
              className={`${inputClass} resize-none disabled:opacity-50`}
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="text-[10px] text-on-surface-variant">
                {draft.length}/2000 · visible to branch and Head
              </span>
              <button
                type="submit"
                disabled={
                  !draft.trim() || !branchId || send.isPending || !!retry
                }
                className="min-h-11 rounded-xl bg-primary px-4 text-sm font-bold text-on-primary disabled:opacity-40"
              >
                {send.isPending ? "Sending…" : "Send"}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </>
  );
}
export default function TeamChat() {
  const userId = useAuthStore((state) => state.user?._id);
  return userId ? <BranchChat key={userId} userId={userId} /> : null;
}
