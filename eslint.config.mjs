import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
const baseDirectory = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory });
const config = [...compat.extends("next/core-web-vitals", "next/typescript"), { ignores: [".next/**", "dist/**", "drizzle/**", "next-env.d.ts", "src-tauri/target/**"] }];
export default config;
