import { dirname } from "path";
import { fileURLToPath } from "url";
import engineGuard from "./eslint.engine.mjs";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".next-e2e/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      ".gate/**",
      // Nathan's art pack and its maintenance script, kept byte-for-byte as supplied (NR-031).
      "public/assets/ink-and-wash/**",
      "scripts/sync-ink-assets.cjs",
    ],
  },
  engineGuard,
];

export default eslintConfig;
