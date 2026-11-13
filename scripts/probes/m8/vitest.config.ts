// Runs the M8 measurement probe only. The game's own config (vitest.config.ts at the repo root) includes
// tests/** and never picks it up, so `npm test` does not run it. Run from the repo root:
//   npx vitest run --config scripts/probes/m8/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  css: { postcss: { plugins: [] } },
  test: {
    globals: true,
    environment: 'node',
    include: ['scripts/probes/m8/*.probe.ts'],
    testTimeout: 600_000,
  },
  resolve: { alias: { '@': '/src/app' } },
});
