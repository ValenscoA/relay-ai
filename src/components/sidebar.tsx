"use client";
import {
  BarChart3,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Sparkles,
} from "./icons";
import { useWorkspace } from "./workspace-context";

export function Sidebar({
  collapsed,
  onToggle,
  view,
  onView,
}: {
  collapsed: boolean;
  onToggle: () => void;
  view: string;
  onView: (v: string) => void;
}) {
  const { conversations, active, setActive, newChat } = useWorkspace();
  return (
    <aside
      className={`${collapsed ? "w-[68px]" : "w-[276px]"} fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--border)] bg-[var(--panel)] transition-[width] duration-200 md:flex md:flex-col`}
    >
      <div className="flex h-16 items-center gap-3 border-b border-[var(--border)] px-4">
        <div className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--accent)] text-black">
          <Sparkles size={17} />
        </div>
        {!collapsed && (
          <span className="font-semibold tracking-tight">Relay</span>
        )}
        <button
          aria-label="Toggle sidebar"
          onClick={onToggle}
          className="focus-ring ml-auto rounded-md p-2 text-[var(--muted)] hover:bg-white/5 hover:text-white"
        >
          <Menu size={18} />
        </button>
      </div>
      <div className="p-3">
        <button
          onClick={() => {
            onView("chat");
            void newChat();
          }}
          className="focus-ring flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--accent)] px-3 text-sm font-semibold text-[#15170f] hover:bg-[#d2f58a]"
        >
          <Plus size={17} />
          {!collapsed && "New chat"}
        </button>
      </div>
      <nav className="space-y-1 px-3">
        {(
          [
            ["chat", MessageSquare, "Chat"],
            ["compare", Sparkles, "Compare"],
            ["usage", BarChart3, "Usage"],
            ["settings", Settings, "Settings"],
          ] as const
        ).map(([id, Icon, label]) => (
          <button
            key={String(id)}
            onClick={() => onView(String(id))}
            className={`focus-ring flex h-9 w-full items-center gap-3 rounded-md px-3 text-sm ${view === id ? "bg-white/[.07] text-white" : "text-[var(--muted)] hover:bg-white/[.04] hover:text-white"}`}
          >
            <Icon size={17} />
            {!collapsed && label}
          </button>
        ))}
      </nav>
      {!collapsed && (
        <>
          <div className="mx-3 mt-5 flex items-center gap-2 rounded-md border border-[var(--border)] bg-black/20 px-3">
            <Search size={15} className="text-[var(--muted)]" />
            <input
              aria-label="Search conversations"
              placeholder="Search conversations"
              className="h-9 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#616671]"
            />
          </div>
          <div className="mt-5 px-3 text-xs font-medium uppercase tracking-[.12em] text-[#666c78]">
            Recent
          </div>
          <div className="mt-2 flex-1 overflow-y-auto px-2">
            {conversations.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setActive(c);
                  onView("chat");
                }}
                className={`group mb-1 w-full rounded-md px-3 py-2.5 text-left hover:bg-white/[.04] ${active?.id === c.id ? "bg-white/[.05]" : ""}`}
              >
                <div className="truncate text-sm text-[#d5d8df]">{c.title}</div>
                <div className="mt-1 text-xs text-[#666c78]">
                  {new Date(c.updatedAt).toLocaleDateString()}
                </div>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-auto border-t border-[var(--border)] p-3">
        <div
          className={`flex items-center ${collapsed ? "justify-center" : "gap-3 px-2"}`}
        >
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[#2b303a] text-xs font-semibold">
            DV
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="truncate text-sm">Developer</div>
              <div className="text-xs text-[var(--muted)]">Local workspace</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
