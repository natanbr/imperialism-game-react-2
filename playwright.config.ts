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
    // FR-430: every spec starts in a browser that has seen "How to play", so it does not cover the map on the first
    // new game; a spec about that dialog clears it (test.use({ storageState: { cookies: [], origins: [] } }))
    storageState: {
      cookies: [],
      origins: [{ origin: BASE_URL, localStorage: [{ name: 'imperialism-remake.howto-seen', value: '1' }] }],
    },
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    // FR-444: its own build folder (next.config.ts), so the production build in .next survives the e2e run
    env: { NEXT_DIST_DIR: '.next-e2e' },
    url: BASE_URL,
    reuseExistingServer: process.env.PW_REUSE_SERVER === '1',
    timeout: 120000,
  },
});
