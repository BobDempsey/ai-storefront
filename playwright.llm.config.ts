import baseConfig from './playwright.config'
import { defineConfig } from '@playwright/test'

/**
 * The one browser test that spends money. It drives the assistant panel, which
 * means the model has to answer before a draft card exists to type a promo code
 * into, so it is kept out of `npm run test:e2e` and opted into by name.
 *
 * Everything else is inherited, including the reused dev server. One provider
 * call per run: the test fills the cart by clicking and asks for the order in a
 * single message.
 */
export default defineConfig({
  ...baseConfig,
  testIgnore: undefined,
  testMatch: '**/assistant-promo.spec.ts',
  // A tool loop plus a completion is slower than any click.
  timeout: 180_000
})
