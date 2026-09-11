import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * The only tests that spend money. Two real gpt-5-mini calls through the
 * running dev server, checking that the tool loop still works end to end.
 *
 * Kept out of `npm test` for two reasons: it costs a fraction of a cent per
 * run, and it can fail because a provider had a bad minute rather than because
 * anything here is wrong. Opt in with `npm run test:llm`.
 */
export default defineConfig({
  test: {
    include: ['tests/llm/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    // A tool round trip plus a completion is slower than any other test here.
    testTimeout: 120_000,
    hookTimeout: 60_000
  },
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url))
    }
  }
})
