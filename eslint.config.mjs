import { createConfigForNuxt } from '@nuxt/eslint-config/flat'
import tseslint from 'typescript-eslint'

/**
 * Correctness rules, not formatting. The typecheck already says whether a shape
 * is wrong; this is for what a type cannot see, and the rule that earns its keep
 * here is `no-floating-promises`: this shop sends email and writes orders, and
 * an unawaited promise in that path fails silently.
 *
 * Type-aware linting needs the TypeScript program, which is why
 * `projectService` is on. It is what makes the run slower than a plain lint and
 * what makes it worth running at all.
 *
 * Formatting is deliberately absent. No Prettier, no stylistic rules: that is a
 * separate argument with separate trade-offs, and mixing it in here would turn
 * every future lint diff into whitespace.
 */
export default createConfigForNuxt({
  features: { stylistic: false }
})
  .append(
    // Scoped to TypeScript files on purpose. Spreading these across everything
    // puts the TS parser on `.vue` files too, which then fail to parse at the
    // first `<template>`; Nuxt's own config already wires vue-eslint-parser
    // there, and the block after this one gives it type information.
    ...tseslint.configs.recommendedTypeChecked.map(config => ({
      ...config,
      files: ['**/*.ts', '**/*.mts', '**/*.mjs']
    })),
    {
      files: ['**/*.ts', '**/*.mts', '**/*.mjs', '**/*.vue'],
      languageOptions: {
        parserOptions: {
          // The project service finds the right tsconfig per file, including
          // the .vue files an explicit `project` array cannot parse. It needs
          // every file to belong to some project, which is why
          // tsconfig.tests.json had to exist before this could be turned on:
          // the suites and the vitest configs were in none of Nuxt's four.
          projectService: {
            // The root config files belong to no Nuxt project, so they are
            // parsed against tsconfig.tests.json, which already includes them.
            // Only this file needs it: everything else, tests and vitest
            // configs included, is reachable through tsconfig.json's
            // references now.
            allowDefaultProject: ['eslint.config.mjs'],
            defaultProject: 'tsconfig.tests.json'
          },
          tsconfigRootDir: import.meta.dirname
        }
      }
    },
    {
      files: ['**/*.ts', '**/*.mts', '**/*.vue'],
      rules: {
        // The one this is really for.
        '@typescript-eslint/no-floating-promises': 'error',
        // `any` is already absent from app/ and server/, and this keeps it that
        // way in code the typecheck would otherwise accept.
        '@typescript-eslint/no-explicit-any': 'error'
      }
    }
  )
  .append({
    // Tests may assert on a deliberately wrong shape, and a few of them stub
    // globals in ways the type-aware rules read as unsafe. The suites are not
    // shipped, and their own failures are the signal there.
    files: ['tests/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // A stub of an async API has to be async whether or not its body waits
      // for anything, or it is not a stub of that API.
      '@typescript-eslint/require-await': 'off'
    }
  })
  .append({
    // Every one of these comes from the same place: `useSupabase()` returns a
    // bare `SupabaseClient`, so every row it hands back is `any` and every
    // assignment from one is "unsafe". They are warnings rather than errors
    // until the generated `Database` type lands and the client takes it, at
    // which point they should go quiet on their own and become errors again.
    // Raising them now would only mean silencing them file by file.
    files: ['server/**/*.ts', 'app/stores/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn'
    }
  })
  .append({
    rules: {
      // A Vue 3 template may hold several root nodes and comments; this rule is
      // the Vue 2 shape of the world and misreads every page in app/.
      'vue/no-multiple-template-root': 'off'
    }
  })
  .append({
    ignores: ['.nuxt/**', '.output/**', 'node_modules/**', 'dist/**', '.vercel/**']
  })
