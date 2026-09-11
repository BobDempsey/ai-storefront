import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

/**
 * The default run is the unit tests only. Everything that reaches the network
 * lives under tests/db, tests/e2e or tests/smoke and is opted into by name
 * (`npm run test:db`, `npm run test:smoke`), because those write rows to the
 * live Supabase project or depend on the deployed site being up, and neither
 * belongs in a run you expect to pass on a plane.
 */
export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // Supplies the Nuxt auto-imports (createError, useSupabase) that server
    // utilities reference as globals but Vitest does not provide.
    setupFiles: ['tests/unit/setup.ts']
  },
  resolve: {
    alias: {
      // Matches the `~~/server/...` specifier Nuxt gives server code, so the
      // utilities under test import exactly as they do at runtime.
      '~~': fileURLToPath(new URL('./', import.meta.url)),
      // And `~/...` for app code, which resolves to app/ under Nuxt 4.
      '~': fileURLToPath(new URL('./app/', import.meta.url))
    }
  }
})
