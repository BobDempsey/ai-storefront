import baseConfig from './playwright.config'
import { defineConfig } from '@playwright/test'

/**
 * The browser tests that spend money. Both drive the assistant panel, which
 * means the model has to answer, so they are kept out of `npm run test:e2e`
 * and opted into by name.
 *
 * Everything else is inherited, including the reused dev server. One provider
 * call per test: the promo test fills the cart by clicking and asks for the
 * order in a single message, and the unstocked test asks one question.
 */
export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: '**/assistant-{promo,unstocked}.spec.ts',
  // A tool loop plus a completion is slower than any click.
  timeout: 180_000
})
