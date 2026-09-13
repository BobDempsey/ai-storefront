import { defineConfig } from 'vitest/config'

/**
 * Checks the deployed site, so it fails for reasons that have nothing to do
 * with the code in the working tree. Opt in with `npm run test:smoke`.
 */
export default defineConfig({
  test: {
    include: ['tests/smoke/**/*.test.ts'],
    // Verbose so a passing run still prints the suite name, which is where the
    // shop being checked is written. The default reporter shows it only on a
    // failure, and "which shop did that just check?" is the question a green
    // run has to answer too.
    reporters: ['verbose'],
    environment: 'node',
    testTimeout: 30_000,
    retry: 1
  }
})
