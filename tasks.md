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

- [ ] Run `npm run test:llm` once, to confirm the typed chat loop still works
- [ ] Generate Supabase types and pass them to `createClient<Database>`: the client
      in `server/utils/supabase.ts` is a bare `SupabaseClient` today, so every row
      it returns is loosely typed and a renamed column is a runtime bug
- [ ] Type the API routes' responses so the browser and the server share one shape
- [ ] Replace the `as any` casts in the assistant tests with the tools' real types
- [ ] Add ESLint with the TypeScript rules, since the checker catches no smells
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
