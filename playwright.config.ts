import { defineConfig, devices } from '@playwright/test';

// Several worktrees may each run a dev server, so the port comes from PORT (default 3000) and
// Playwright starts this checkout's server instead of testing whatever already answers there.
// Set PW_REUSE_SERVER=1 to test a server you started yourself on that port.
const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120000,
  },
});
