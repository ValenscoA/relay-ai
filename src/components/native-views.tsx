"use client";
import { FormEvent, useEffect, useState } from "react";
import { toast } from "sonner";
import { open, save } from "@tauri-apps/plugin-dialog";
import { api, type GenerationEvent, type UsageSummary } from "@/lib/desktop";
import { useWorkspace } from "./workspace-context";
import {
  Activity,
  BarChart3,
  Gauge,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "./icons";
import { Markdown } from "./markdown";

function Shell({
  title,
  eyebrow,
  children,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-w-0 flex-1 overflow-y-auto">
      <header className="border-b border-[var(--border)] px-6 py-5">
        <div className="text-xs font-medium uppercase tracking-[.14em] text-[var(--muted)]">
          {eyebrow}
        </div>
        <h1 className="mt-1 text-xl font-semibold">{title}</h1>
      </header>
      {children}
    </main>
  );
}
export function UsageView() {
  const [summary, setSummary] = useState<UsageSummary>();
  useEffect(() => {
    api
      .usageSummary()
      .then(setSummary)
      .catch((e) => toast.error(String(e)));
  }, []);
  const stats = [
    ["Requests", String(summary?.totalRequests ?? 0), Activity],
    ["Total tokens", (summary?.totalTokens ?? 0).toLocaleString(), Gauge],
    [
      "Estimated spend",
      `$${(summary?.estimatedSpend ?? 0).toFixed(4)}`,
      BarChart3,
    ],
    ["Average TTFT", `${Math.round(summary?.averageTtftMs ?? 0)}ms`, Zap],
  ] as const;
  return (
    <Shell title="Usage & cost" eyebrow="Analytics">
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {stats.map(([label, value, Icon]) => (
            <div
              key={label}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
            >
              <Icon size={17} className="text-[var(--accent)]" />
              <div className="mt-5 text-2xl font-semibold">{value}</div>
              <div className="mt-1 text-sm text-[var(--muted)]">{label}</div>
            </div>
          ))}
        </div>
        <p className="mt-5 text-sm text-[var(--muted)]">
          Costs are estimates calculated from the pricing configured for each
          model.
        </p>
      </div>
    </Shell>
  );
}

type Result = {
  model: string;
  provider: string;
  content: string;
  event?: GenerationEvent;
  status: string;
};
export function CompareView() {
  const { models } = useWorkspace();
  const [selected, setSelected] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  async function run() {
    if (selected.length < 2 || !prompt.trim()) return;
    const initial = selected.map((id) => {
      const m = models.find((x) => x.id === id)!;
      return {
        model: m.displayName,
        provider: m.providerName,
        content: "",
        status: "Streaming",
      };
    });
    setResults(initial);
    await Promise.allSettled(
      selected.map(async (modelId, index) => {
        const conversation = await api.createConversation(modelId);
        const requestId = crypto.randomUUID();
        const unlisten = await api.onGeneration(requestId, (event) => {
          setResults((v) =>
            v.map((r, i) =>
              i === index
                ? {
                    ...r,
                    content:
                      event.type === "delta"
                        ? r.content + event.text
                        : r.content,
                    event,
                    status:
                      event.type === "completed"
                        ? "Complete"
                        : event.type === "failed"
                          ? "Failed"
                          : r.status,
                  }
                : r,
            ),
          );
        });
        try {
          await api.startGeneration({
            requestId,
            conversationId: conversation.id,
            modelId,
            message: prompt,
            temperature: 0.7,
            topP: 1,
            maxOutputTokens: 2048,
          });
        } finally {
          unlisten();
        }
      }),
    );
  }
  return (
    <Shell title="Model comparison" eyebrow="Benchmark">
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex flex-wrap gap-2">
          {models.map((m) => (
            <label
              key={m.id}
              className={`rounded-md border px-3 py-2 text-sm ${selected.includes(m.id) ? "border-[var(--accent)]" : "border-[var(--border)]"}`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={selected.includes(m.id)}
                onChange={() =>
                  setSelected((v) =>
                    v.includes(m.id)
                      ? v.filter((x) => x !== m.id)
                      : [...v, m.id],
                  )
                }
              />
              {m.providerName} · {m.displayName}
            </label>
          ))}
        </div>
        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="h-24 w-full resize-none bg-transparent p-2 outline-none"
            placeholder="Send the same prompt to two or more models…"
          />
          <div className="flex justify-end">
            <button
              disabled={selected.length < 2 || !prompt.trim()}
              onClick={() => void run()}
              className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-30"
            >
              <Sparkles size={15} className="mr-2 inline" />
              Run comparison
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {results.map((r, i) => (
            <section
              key={`${r.model}-${i}`}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)]"
            >
              <div className="flex items-center border-b border-[var(--border)] px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{r.model}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {r.provider}
                  </div>
                </div>
                <span className="ml-auto text-xs text-[var(--muted)]">
                  {r.status}
                </span>
              </div>
              {r.event?.type === "completed" && (
                <div className="grid grid-cols-3 border-b border-[var(--border)] p-3 text-center text-xs">
                  <div>
                    {r.event.ttftMs ?? "—"}ms
                    <br />
                    TTFT
                  </div>
                  <div>
                    {r.event.durationMs}ms
                    <br />
                    Duration
                  </div>
                  <div>
                    ${(r.event.estimatedCost ?? 0).toFixed(4)}
                    <br />
                    Estimate
                  </div>
                </div>
              )}
              <div className="min-h-52 p-5">
                <Markdown content={r.content} />
              </div>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}

export function SettingsView() {
  const { providers, models, refresh } = useWorkspace();
  const [saving, setSaving] = useState(false);
  async function providerSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setSaving(true);
    try {
      await api.saveProvider({
        name: String(data.get("name")),
        baseUrl: String(data.get("baseUrl")),
        apiKey: String(data.get("apiKey")),
        customHeaders: String(data.get("customHeaders") || "") || undefined,
      });
      await refresh();
      e.currentTarget.reset();
      toast.success("Provider saved securely");
    } catch (error) {
      toast.error(String(error));
    } finally {
      setSaving(false);
    }
  }
  async function modelSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    try {
      await api.saveModel({
        providerId: String(data.get("providerId")),
        name: String(data.get("name")),
        displayName: String(data.get("displayName")),
        inputPricePerMillion: Number(data.get("inputPrice")),
        outputPricePerMillion: Number(data.get("outputPrice")),
      });
      await refresh();
      e.currentTarget.reset();
      toast.success("Model saved");
    } catch (error) {
      toast.error(String(error));
    }
  }
  async function exportData() {
    const path = await save({
      defaultPath: "relay-backup.sqlite3",
      filters: [{ name: "Relay backup", extensions: ["sqlite3"] }],
    });
    if (path) {
      await api.exportData(path);
      toast.success("Local data exported");
    }
  }
  async function importData() {
    const path = await open({
      multiple: false,
      filters: [{ name: "Relay backup", extensions: ["sqlite3"] }],
    });
    if (typeof path === "string") {
      await api.importData(path);
      await refresh();
      toast.success("Local data imported; re-enter provider API keys");
    }
  }
  async function deleteProvider(id: string) {
    try {
      await api.deleteProvider(id);
      await refresh();
      toast.success("Provider deleted; conversation history was preserved");
    } catch (error) {
      toast.error(String(error));
    }
  }
  return (
    <Shell title="Settings" eyebrow="Workspace">
      <div className="mx-auto max-w-4xl space-y-5 p-6">
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="font-medium">Providers</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              API keys are kept in Windows Credential Manager, never SQLite.
            </p>
          </div>
          <form
            onSubmit={providerSubmit}
            className="grid gap-4 p-5 md:grid-cols-2"
          >
            <input
              name="name"
              required
              placeholder="Provider name"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none"
            />
            <input
              name="baseUrl"
              required
              type="url"
              placeholder="https://api.example.com/v1"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none"
            />
            <input
              name="apiKey"
              required
              type="password"
              placeholder="API key"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none"
            />
            <input
              name="customHeaders"
              placeholder="Custom headers JSON (optional)"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none"
            />
            <button
              disabled={saving}
              className="w-fit rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black"
            >
              {saving ? "Saving…" : "Add provider"}
            </button>
          </form>
          <div className="border-t border-[var(--border)]">
            {providers.map((p) => (
              <div key={p.id} className="flex items-center px-5 py-3 text-sm">
                <div>
                  <div>{p.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {p.baseUrl} · {p.maskedKey}
                  </div>
                </div>
                <button
                  aria-label={`Delete ${p.name}`}
                  onClick={() => void deleteProvider(p.id)}
                  className="ml-auto p-2 text-red-400"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
          <div className="border-b border-[var(--border)] p-5">
            <h2 className="font-medium">Models</h2>
          </div>
          <form
            onSubmit={modelSubmit}
            className="grid gap-4 p-5 md:grid-cols-2"
          >
            <select
              name="providerId"
              required
              className="h-10 rounded-md border border-[var(--border)] bg-[#090a0d] px-3"
            >
              <option value="">Provider</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <input
              name="name"
              required
              placeholder="API model identifier"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3"
            />
            <input
              name="displayName"
              required
              placeholder="Display name"
              className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="inputPrice"
                type="number"
                min="0"
                step=".000001"
                defaultValue="0"
                aria-label="Input price per million"
                className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3"
              />
              <input
                name="outputPrice"
                type="number"
                min="0"
                step=".000001"
                defaultValue="0"
                aria-label="Output price per million"
                className="h-10 rounded-md border border-[var(--border)] bg-black/20 px-3"
              />
            </div>
            <button className="w-fit rounded-md border border-[var(--border)] px-4 py-2 text-sm">
              <Plus size={15} className="mr-2 inline" />
              Add model
            </button>
          </form>
          <div className="border-t border-[var(--border)] px-5 py-3 text-sm text-[var(--muted)]">
            {models.length} configured model{models.length === 1 ? "" : "s"}
          </div>
        </section>
        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
          <h2 className="font-medium">Data</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Backups contain conversations and configuration, but never
            operating-system credentials.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => void exportData()}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
            >
              Export backup
            </button>
            <button
              onClick={() => void importData()}
              className="rounded-md border border-[var(--border)] px-4 py-2 text-sm"
            >
              Import backup
            </button>
          </div>
        </section>
      </div>
    </Shell>
  );
}
