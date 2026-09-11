import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/postcss";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  css: { postcss: { plugins: [tailwindcss()] } },
  clearScreen: false,
  server: { port: 1420, strictPort: true },
});
