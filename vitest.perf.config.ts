import { defineConfig } from 'vitest/config';
import unitConfig from './vitest.config';

export default defineConfig({
  ...unitConfig,
  test: {
    ...unitConfig.test,
    include: ['tests/**/*.perf.{ts,tsx}'],
    fileParallelism: false,
    maxWorkers: 1,
  },
});
