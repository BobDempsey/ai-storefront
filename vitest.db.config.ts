import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * The tests that touch the live Supabase project and a running dev server.
 * Kept out of the default run and given a single worker: these write real rows,
 * and the promo-redemption uniqueness makes parallel runs collide.
 */
export default defineConfig({
  test: {
    include: ['tests/db/**/*.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    // chat-guards.test.ts starts a second dev server in beforeAll, which takes
    // longer than a database round trip.
    hookTimeout: 150_000
  },
  resolve: {
    alias: {
      '~~': fileURLToPath(new URL('./', import.meta.url))
    }
  }
})
