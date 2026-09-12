# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- fix any console warnings and errors
- [x] Add search: a quick search panel in the navbar and a field beside Shop
- [x] Seed enough products to need pagination - develop pagination (discuss options)
- [x] Decide on the name - no rename, the project and the assistant keep theirs
- [x] Check everything is typed and tested - vue-tsc runs inside npm test, no any left
- [x] Explore a faster provider, or streaming - dropped, six seconds is accepted
- [ ] Replace the six placeholder product images (needs a Pexels API key)
- [x] Archive the four completed OpenSpec changes
- [x] Push main and redeploy (ask first)

## Getting more out of TypeScript

- [x] Type the API routes' responses - shapes live in shared/types/api.ts now
- [x] Replace the `as any` casts in the assistant tests with the tools' real types
- [x] Typecheck the test suites, which nuxt typecheck never covered (43 errors, fixed)
- [x] Add ESLint with the TypeScript rules - npm run lint, and npm run check for all
- [ ] Decide the database types: supply a Supabase token, or hand-write Database
      from schema.sql. The CLI cannot read a schema file, so nothing generates
      until this is settled, and 23 lint warnings are waiting on it
- [ ] Pass Database to createClient in server/utils/supabase.ts, then put the
      no-unsafe-* rules back to error
- [ ] Run `npm run test:llm` once, to confirm the typed chat loop still works
- [ ] Try `noUncheckedIndexedAccess` and see how much it costs to satisfy
- [ ] Run the typecheck in CI, once there is a CI to run it in
- [ ] Revisit TypeScript 7 when vue-tsc supports it (pinned to 5.x today)

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide between a second Vercel project and a branch
- [ ] Create the second deployment with its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project from schema.sql and seed.sql
- [ ] Point each deployment at its own database and verify the split
- [ ] Render a share image carrying the second shop's name
- [ ] Make the smoke test able to check either deployment
- [ ] Direct a custom-order request to the contact form
