import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const ENGINE_IS_HEADLESS =
  "src/app/engine is the headless game core: no React, Zustand, Next, store or component imports (FR-001).";

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    files: ["src/app/engine/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "react", message: ENGINE_IS_HEADLESS },
            { name: "react-dom", message: ENGINE_IS_HEADLESS },
            { name: "zustand", message: ENGINE_IS_HEADLESS },
            { name: "next", message: ENGINE_IS_HEADLESS },
          ],
          patterns: [
            {
              group: [
                "react/*",
                "react-dom/*",
                "zustand/*",
                "next/*",
                "@/store",
                "@/store/*",
                "@/components",
                "@/components/*",
                "@/hooks/*",
                "**/store",
                "**/store/**",
                "**/components",
                "**/components/**",
                "**/hooks/**",
              ],
              message: ENGINE_IS_HEADLESS,
            },
          ],
        },
      ],
      "no-restricted-globals": [
        "error",
        { name: "window", message: ENGINE_IS_HEADLESS },
        { name: "document", message: ENGINE_IS_HEADLESS },
        { name: "localStorage", message: ENGINE_IS_HEADLESS },
        { name: "navigator", message: ENGINE_IS_HEADLESS },
      ],
      "no-restricted-properties": [
        "error",
        { object: "Math", property: "random", message: "Use the seeded RNG from the turn context (FR-002)." },
        { object: "Date", property: "now", message: "The engine must not read the clock (FR-002)." },
      ],
    },
  },
];

export default eslintConfig;
