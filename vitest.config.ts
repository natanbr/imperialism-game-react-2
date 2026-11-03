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
