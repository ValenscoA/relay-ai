"use client";
import { useState } from "react";
import { ChatWorkspace } from "./chat-workspace";
import { Sidebar } from "./sidebar";
import { CompareView, SettingsView, UsageView } from "./secondary-views";
import { Menu } from "./icons";

export function AppShell(){const [collapsed,setCollapsed]=useState(false);const [view,setView]=useState("chat");return <div className="flex h-dvh overflow-hidden"><Sidebar collapsed={collapsed} onToggle={()=>setCollapsed(!collapsed)} view={view} onView={setView}/><button aria-label="Open navigation" className="fixed left-3 top-3 z-40 rounded-md border border-[var(--border)] bg-[var(--panel)] p-2 md:hidden"><Menu size={18}/></button><div className={`${collapsed?"md:ml-[68px]":"md:ml-[276px]"} flex min-w-0 flex-1 transition-[margin] duration-200`}>{view==="chat"?<ChatWorkspace/>:view==="compare"?<CompareView/>:view==="usage"?<UsageView/>:<SettingsView/>}</div></div>}
