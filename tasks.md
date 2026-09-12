# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [ ] use/using nuxt img module?
- [ ] fix any console warnings and errors
- [ ] Decide whether two approximate product photos can stay: cable-clip-set
      shows a cable with an obsolete 30-pin connector and no clips, and
      monitor-riser-shelf shows a laptop on a riser rather than a monitor
- [ ] Push the unpushed commits and redeploy (ask first)

## Getting more out of TypeScript

- [ ] Watch the CI's first run. .github/workflows/check.yml is written and
      committed and npm ci resolves, but GitHub has never seen it: it only runs
      once main is pushed
- [x] Make products.kind a real Postgres enum. Done, 2026-09-12. The generated
      row now says 'physical' | 'digital' and productKind()/withProductKind()
      are gone. server/utils/rows.ts stays: withProductFiles() still narrows the
      three file columns, because no Postgres type expresses "non-null exactly
      when kind is 'digital'" and the generator keeps saying string | null

## Next: fif.bobdempsey83.com from the same repo

- [ ] Decide between a second Vercel project and a branch
- [ ] Create the second deployment with its own environment variables
- [ ] Add fif.bobdempsey83.com and its Route 53 CNAME
- [ ] Create a second Supabase project from schema.sql and seed.sql
- [ ] Point each deployment at its own database and verify the split
- [ ] Render a share image carrying the second shop's name
- [ ] Make the smoke test able to check either deployment
- [ ] Direct a custom-order request to the contact form
