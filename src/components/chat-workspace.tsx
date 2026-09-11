"use client";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api, type Message } from "@/lib/desktop";
import { useWorkspace } from "./workspace-context";
import { Copy, Send, SlidersHorizontal, Square, Zap } from "./icons";
import { Markdown } from "./markdown";

type DisplayMessage = Pick<Message, "role" | "content">;
export function ChatWorkspace() {
  const { active, models, refresh, newChat } = useWorkspace();
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [requestId, setRequestId] = useState<string>();
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (active) {
      setModelId(active.modelId ?? models[0]?.id ?? "");
      api
        .listMessages(active.id)
        .then(setMessages)
        .catch((e) => toast.error(String(e)));
    } else setMessages([]);
  }, [active, models]);
  useEffect(
    () =>
      bottom.current?.scrollIntoView({
        behavior: streaming ? "auto" : "smooth",
      }),
    [messages, streaming],
  );
  async function send() {
    const content = input.trim();
    if (!content || streaming) return;
    if (!api.isDesktop()) {
      toast.info("Run npm run desktop to use native chat");
      return;
    }
    if (!modelId) {
      toast.error("Add and select a model in Settings");
      return;
    }
    if (!active) {
      await newChat();
      toast.info("Conversation created—send again");
      return;
    }
    const id = crypto.randomUUID();
    setRequestId(id);
    setInput("");
    setMessages((v) => [
      ...v,
      { role: "user", content },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    const unlisten = await api.onGeneration(id, (event) => {
      if (event.type === "delta")
        setMessages((v) =>
          v.map((m, i) =>
            i === v.length - 1 ? { ...m, content: m.content + event.text } : m,
          ),
        );
      if (event.type === "failed") toast.error(event.message);
      if (
        event.type === "completed" ||
        event.type === "failed" ||
        event.type === "cancelled"
      ) {
        setStreaming(false);
        void refresh();
      }
    });
    api
      .startGeneration({
        requestId: id,
        conversationId: active.id,
        modelId,
        message: content,
        systemPrompt: active.systemPrompt,
        temperature: active.temperature,
        topP: active.topP,
        maxOutputTokens: active.maxOutputTokens,
      })
      .catch((e) => {
        toast.error(String(e));
        setStreaming(false);
      })
      .finally(() => unlisten());
  }
  async function stop() {
    if (requestId) await api.cancelGeneration(requestId);
  }
  const selected = models.find((m) => m.id === modelId);
  return (
    <main className="flex min-w-0 flex-1 flex-col bg-[var(--bg)]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-[var(--border)] px-4 md:px-6">
        <div>
          <div className="text-sm font-medium">
            {active?.title ?? "New conversation"}
          </div>
          <div className="mt-0.5 text-xs text-[var(--muted)]">
            Stored locally
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select
            aria-label="Model"
            value={modelId}
            onChange={(e) => setModelId(e.target.value)}
            className="focus-ring h-9 rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 text-sm"
          >
            <option value="">Select a model</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.providerName} · {m.displayName}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAdvanced(!advanced)}
            aria-label="Generation settings"
            className="focus-ring rounded-md border border-[var(--border)] p-2 text-[var(--muted)]"
          >
            <SlidersHorizontal size={17} />
          </button>
        </div>
      </header>
      {advanced && (
        <div className="grid shrink-0 grid-cols-3 gap-5 border-b border-[var(--border)] bg-[var(--panel)] px-6 py-4 text-sm">
          <label>
            Temperature
            <div className="mt-2 text-[var(--muted)]">
              {active?.temperature ?? 0.7}
            </div>
          </label>
          <label>
            Max output tokens
            <div className="mt-2 text-[var(--muted)]">
              {active?.maxOutputTokens ?? 2048}
            </div>
          </label>
          <label>
            Top P
            <div className="mt-2 text-[var(--muted)]">{active?.topP ?? 1}</div>
          </label>
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl px-5 py-8 md:py-12">
          {messages.length === 0 && (
            <div className="grid min-h-[45vh] place-items-center text-center">
              <div>
                <div className="mx-auto grid size-11 place-items-center rounded-lg border border-[var(--border)] bg-[var(--panel)] text-[var(--accent)]">
                  <Zap size={20} />
                </div>
                <h2 className="mt-5 text-lg font-medium">
                  Start a conversation
                </h2>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Choose a configured model and send a message.
                </p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <article
              key={i}
              className={`group mb-9 ${m.role === "user" ? "ml-auto max-w-[85%]" : ""}`}
            >
              {m.role === "assistant" && (
                <div className="mb-3 flex items-center gap-2 text-xs font-medium text-[var(--muted)]">
                  <span className="grid size-6 place-items-center rounded bg-[#20242b] text-[var(--accent)]">
                    <Zap size={13} />
                  </span>
                  Assistant · {selected?.displayName ?? "model"}
                </div>
              )}
              <div
                className={
                  m.role === "user"
                    ? "rounded-lg border border-[#2a2e36] bg-[#171a20] px-4 py-3 leading-7"
                    : ""
                }
              >
                {m.role === "assistant" ? (
                  <Markdown content={m.content} />
                ) : (
                  m.content
                )}
                {streaming && i === messages.length - 1 && (
                  <span className="stream-dot ml-1 inline-block size-1.5 rounded-full bg-[var(--accent)]" />
                )}
              </div>
              {m.role === "assistant" && m.content && (
                <button
                  onClick={() => navigator.clipboard.writeText(m.content)}
                  aria-label="Copy message"
                  className="focus-ring mt-3 rounded p-1.5 text-[var(--muted)] hover:bg-white/5"
                >
                  <Copy size={14} />
                </button>
              )}
            </article>
          ))}
          <div ref={bottom} />
        </div>
      </div>
      <div className="shrink-0 border-t border-[var(--border)] bg-[var(--panel)] p-3 md:p-5">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-[#30343d] bg-[#111318] focus-within:border-[#555b68]">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Ask anything…"
              className="min-h-20 w-full resize-none bg-transparent px-4 pt-4 text-[15px] outline-none"
            />
            <div className="flex items-center px-3 pb-3">
              <span className="text-xs text-[#666c78]">
                ↵ send · ⇧↵ new line
              </span>
              {streaming ? (
                <button
                  onClick={() => void stop()}
                  className="focus-ring ml-auto grid size-9 place-items-center rounded-md bg-white text-black"
                >
                  <Square size={14} fill="currentColor" />
                </button>
              ) : (
                <button
                  onClick={() => void send()}
                  disabled={!input.trim()}
                  className="focus-ring ml-auto grid size-9 place-items-center rounded-md bg-[var(--accent)] text-black disabled:opacity-30"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
