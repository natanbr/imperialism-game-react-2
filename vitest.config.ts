import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Component tests (*.test.tsx) render React; they pick jsdom with a `@vitest-environment` comment.
  esbuild: { jsx: 'automatic' },
  // CSS modules load as class-name maps; the app's PostCSS (Tailwind) config is for Next only.
  css: { postcss: { plugins: [] } },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx}'],
    // UI tests that render the whole map take about 5 s alone and timed out at the 5 s default under a
    // loaded full run (M4.1 gate); one limit here instead of per-test overrides.
    testTimeout: 20_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': '/src/app',
    },
  },
});
