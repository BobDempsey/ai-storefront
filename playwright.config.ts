import { defineConfig, devices } from '@playwright/test'

/**
 * Drives a real browser against `npm run dev`. The orders it places carry the
 * test-order token, so they are marked in the database and never email staff;
 * see openspec/specs/ordering/test-order.
 */
export default defineConfig({
  testDir: './tests/e2e',
  // Loads every route once so Vite finishes discovering PrimeVue components
  // before a test is mid-click; see tests/e2e/global-setup.ts.
  globalSetup: './tests/e2e/global-setup.ts',
  // Traces and reports go under node_modules, which Vite's watcher already
  // ignores. Writing them into the project root instead makes every artifact a
  // file change, and the resulting HMR reload detaches whatever the test is
  // clicking. Overriding Vite's `watch.ignored` is not the fix: that option
  // replaces the default ignore list rather than adding to it, so it puts
  // node_modules back under watch and the reloads get worse.
  outputDir: 'node_modules/.cache/playwright/results',
  // These share one cart, one promo code and one database. Running them at once
  // makes them fight over all three.
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  reporter: process.env.CI
    ? 'line'
    : [['list'], ['html', { outputFolder: 'node_modules/.cache/playwright/report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Reuses a dev server that is already up, which is the normal case here, and
  // starts one otherwise.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000
  }
})
