"use client";
import { useEffect, useState } from "react";
import { ChatWorkspace } from "./chat-workspace";
import { Menu } from "./icons";
import { CompareView, SettingsView, UsageView } from "./native-views";
import { Sidebar } from "./sidebar";
import { useWorkspace } from "./workspace-context";

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false);
  const [view, setView] = useState("chat");
  const { newChat } = useWorkspace();
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        setCollapsed((value) => !value);
      }
      if (event.key.toLowerCase() === "n") {
        event.preventDefault();
        setView("chat");
        void newChat();
      }
      if (event.key === ",") {
        event.preventDefault();
        setView("settings");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [newChat]);
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        view={view}
        onView={setView}
      />
      <button
        aria-label="Open navigation"
        className="fixed left-3 top-3 z-40 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 md:hidden"
      >
        <Menu size={18} />
      </button>
      <div
        className={`${collapsed ? "md:ml-[68px]" : "md:ml-[276px]"} flex min-w-0 flex-1 transition-[margin] duration-200`}
      >
        {view === "chat" ? (
          <ChatWorkspace />
        ) : view === "compare" ? (
          <CompareView />
        ) : view === "usage" ? (
          <UsageView />
        ) : (
          <SettingsView />
        )}
      </div>
    </div>
  );
}
