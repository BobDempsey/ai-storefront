import { defineConfig } from 'vitest/config'

/**
 * Checks the deployed site, so it fails for reasons that have nothing to do
 * with the code in the working tree. Opt in with `npm run test:smoke`.
 */
export default defineConfig({
  test: {
    include: ['tests/smoke/**/*.test.ts'],
    environment: 'node',
    testTimeout: 30_000,
    retry: 1
  }
})
