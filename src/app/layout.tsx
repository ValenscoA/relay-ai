import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "sonner";

export const metadata: Metadata = { title: "Relay — Multi-model AI workspace", description: "A secure multi-provider AI chat and model comparison workspace.", icons: { icon: "/favicon.svg" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" className="dark"><body>{children}<Toaster theme="dark" richColors /></body></html>; }
