"use client";
import { useState } from "react";
import {
  Activity,
  BarChart3,
  Check,
  Gauge,
  Plus,
  Sparkles,
  Trash2,
  Zap,
} from "./icons";

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
        <h1 className="mt-1 text-xl font-semibold tracking-tight">{title}</h1>
      </header>
      {children}
    </main>
  );
}
export function UsageView() {
  return (
    <Shell title="Usage & cost" eyebrow="Analytics">
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-3 md:grid-cols-4">
          {([
            ["Requests", "142", "+18 this week", Activity],
            ["Total tokens", "1.24M", "73% output", Gauge],
            ["Est. spend", "$6.84", "This month", BarChart3],
            ["Avg. TTFT", "412ms", "−8% vs. prior", Zap],
          ] as const).map(([a, b, c, I]) => (
            <div
              key={String(a)}
              className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5"
            >
              <I size={17} className="text-[var(--accent)]" />
              <div className="mt-5 text-2xl font-semibold tracking-tight">
                {b}
              </div>
              <div className="mt-1 text-sm text-[var(--muted)]">{a}</div>
              <div className="mt-4 text-xs text-[#696f7b]">{c}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <div className="border-b border-[var(--border)] p-5">
              <h2 className="font-medium">Recent requests</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Prices are estimates based on configured model rates.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-[#676d78]">
                  <tr>
                    {["Model", "Tokens", "TTFT", "Duration", "Cost"].map(
                      (h) => (
                        <th key={h} className="px-5 py-3 font-medium">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["qwen3-coder", "4,821", "384ms", "8.2s", "$0.018"],
                    ["gpt-4.1-mini", "1,204", "291ms", "3.4s", "$0.003"],
                    ["deepseek-chat", "8,192", "612ms", "14.1s", "$0.011"],
                  ].map((r) => (
                    <tr key={r[0]} className="border-t border-[var(--border)]">
                      {r.map((c, i) => (
                        <td
                          key={c}
                          className={`px-5 py-4 ${i === 0 ? "font-medium" : "text-[var(--muted)]"}`}
                        >
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5">
            <h2 className="font-medium">By provider</h2>
            <div className="mt-7 space-y-6">
              {[
                ["OpenRouter", 67],
                ["OpenAI", 23],
                ["Local gateway", 10],
              ].map(([n, v]) => (
                <div key={String(n)}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span>{n}</span>
                    <span className="text-[var(--muted)]">{v}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#242832]">
                    <div
                      style={{ width: `${v}%` }}
                      className="h-full rounded-full bg-[var(--accent)]"
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
export function CompareView() {
  return (
    <Shell title="Model comparison" eyebrow="Benchmark">
      <div className="mx-auto max-w-7xl p-6">
        <div className="flex flex-wrap items-center gap-2">
          <button className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">
            OpenRouter · qwen3-coder
          </button>
          <button className="rounded-md border border-[var(--border)] bg-[var(--panel)] px-3 py-2 text-sm">
            OpenAI · gpt-4.1-mini
          </button>
          <button className="rounded-md border border-dashed border-[#3b404b] px-3 py-2 text-sm text-[var(--muted)]">
            <Plus size={15} className="mr-2 inline" />
            Add model
          </button>
        </div>
        <div className="mt-5 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-3">
          <textarea
            className="h-24 w-full resize-none bg-transparent p-2 outline-none"
            placeholder="Send the same prompt to every selected model…"
          />
          <div className="flex justify-end">
            <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
              <Sparkles size={15} className="mr-2 inline" />
              Run comparison
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {["qwen3-coder", "gpt-4.1-mini"].map((m, i) => (
            <section
              key={m}
              className="min-h-80 rounded-lg border border-[var(--border)] bg-[var(--panel)]"
            >
              <div className="flex items-center border-b border-[var(--border)] px-4 py-3">
                <div>
                  <div className="text-sm font-medium">{m}</div>
                  <div className="text-xs text-[var(--muted)]">
                    {i ? "OpenAI" : "OpenRouter"}
                  </div>
                </div>
                <span className="ml-auto flex items-center gap-1.5 text-xs text-[var(--muted)]">
                  <Check size={13} className="text-[var(--accent)]" />
                  Ready
                </span>
              </div>
              <div className="grid grid-cols-4 border-b border-[var(--border)] text-center text-xs">
                <div className="p-3">
                  <b className="block text-sm">—</b>TTFT
                </div>
                <div className="p-3">
                  <b className="block text-sm">—</b>Duration
                </div>
                <div className="p-3">
                  <b className="block text-sm">—</b>Tokens/s
                </div>
                <div className="p-3">
                  <b className="block text-sm">—</b>Est. cost
                </div>
              </div>
              <div className="grid min-h-52 place-items-center p-6 text-sm text-[var(--muted)]">
                Response will stream here independently.
              </div>
            </section>
          ))}
        </div>
      </div>
    </Shell>
  );
}
export function SettingsView() {
  const [saved, setSaved] = useState(false);
  return (
    <Shell title="Settings" eyebrow="Workspace">
      <div className="mx-auto grid max-w-5xl gap-8 p-6 lg:grid-cols-[180px_1fr]">
        <nav className="space-y-1 text-sm">
          {["Providers", "Models", "Appearance", "Data"].map((x, i) => (
            <button
              key={x}
              className={`block w-full rounded-md px-3 py-2 text-left ${i === 0 ? "bg-white/[.07]" : "text-[var(--muted)]"}`}
            >
              {x}
            </button>
          ))}
        </nav>
        <div>
          <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)]">
            <div className="border-b border-[var(--border)] p-5">
              <h2 className="font-medium">OpenAI-compatible provider</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Credentials are encrypted before they are stored.
              </p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setSaved(true);
              }}
              className="grid gap-5 p-5"
            >
              <label className="text-sm">
                Provider name
                <input
                  required
                  defaultValue="OpenRouter"
                  className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none focus:border-[#555b68]"
                />
              </label>
              <label className="text-sm">
                Base URL
                <input
                  required
                  type="url"
                  defaultValue="https://openrouter.ai/api/v1"
                  className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none focus:border-[#555b68]"
                />
                <span className="mt-1.5 block text-xs text-[var(--muted)]">
                  Must use HTTPS and match the server allowlist.
                </span>
              </label>
              <label className="text-sm">
                API key
                <input
                  required
                  type="password"
                  placeholder="sk-or-••••••••••••••••"
                  className="mt-2 h-10 w-full rounded-md border border-[var(--border)] bg-black/20 px-3 outline-none focus:border-[#555b68]"
                />
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border border-[var(--border)] px-4 py-2 text-sm hover:bg-white/5"
                >
                  Test connection
                </button>
                <button className="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black">
                  Save provider
                </button>
                {saved && (
                  <span className="text-sm text-[var(--accent)]">Saved</span>
                )}
              </div>
            </form>
          </section>
          <section className="mt-5 rounded-lg border border-red-950/70 bg-[var(--panel)] p-5">
            <div className="flex items-start">
              <div>
                <h2 className="font-medium">Delete local data</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">
                  Remove conversations, messages, generations, and usage
                  records.
                </p>
              </div>
              <button className="ml-auto rounded-md border border-red-900 px-3 py-2 text-sm text-red-400 hover:bg-red-950/40">
                <Trash2 size={15} className="mr-2 inline" />
                Delete data
              </button>
            </div>
          </section>
        </div>
      </div>
    </Shell>
  );
}
