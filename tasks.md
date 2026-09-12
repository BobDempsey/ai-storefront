# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [ ] use/using nuxt img module?
- [ ] fix any console warnings and errors
- [ ] Decide whether two approximate product photos can stay: cable-clip-set
      shows a cable with an obsolete 30-pin connector and no clips, and
      monitor-riser-shelf shows a laptop on a riser rather than a monitor
- [ ] Archive add-catalogue-search, add-catalogue-pagination and enforce-typescript
- [ ] Push the unpushed commits and redeploy (ask first)

## Getting more out of TypeScript

- [ ] Run `npm run test:db` and `npm run test:e2e` against the typed client,
      which is all that is left of deepen-typescript task 8.1
- [ ] Run `npm run test:llm` once, to confirm the typed chat loop still works
- [ ] Try `noUncheckedIndexedAccess` and see how much it costs to satisfy
- [ ] Run the typecheck in CI, once there is a CI to run it in
- [ ] Revisit TypeScript 7 when vue-tsc supports it (pinned to 5.x today)
- [ ] Consider making products.kind a real enum, which would delete
      server/utils/rows.ts. Schema change, so ask first

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide between a second Vercel project and a branch
- [ ] Create the second deployment with its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project from schema.sql and seed.sql
- [ ] Point each deployment at its own database and verify the split
- [ ] Render a share image carrying the second shop's name
- [ ] Make the smoke test able to check either deployment
- [ ] Direct a custom-order request to the contact form
