import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { AppShell } from "./components/app-shell";
import { WorkspaceProvider } from "./components/workspace-context";
import "./app/globals.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

createRoot(root).render(
  <StrictMode>
    <WorkspaceProvider>
      <AppShell />
    </WorkspaceProvider>
    <Toaster theme="dark" richColors />
  </StrictMode>,
);
