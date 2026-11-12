// Runs the M4.4 measurement probes only. The game's own config (vitest.config.ts at the repo root) includes
// tests/** and never picks these up, so `npm test` does not run them. Run from the repo root:
//   npx vitest run --config scripts/probes/m4-4/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  css: { postcss: { plugins: [] } },
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/probes/m4-4/*.probe.ts'],
  },
  resolve: { alias: { '@': '/src/app' } },
});
