# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

- [ ] use/using nuxt img module?
- [ ] fix any console warnings and errors
- [ ] Decide whether two approximate product photos can stay: cable-clip-set
      shows a cable with an obsolete 30-pin connector and no clips, and
      monitor-riser-shelf shows a laptop on a riser rather than a monitor
- [ ] Push the unpushed commits and redeploy (ask first)

## Getting more out of TypeScript

- [ ] Commit .github/workflows/check.yml and watch its first run. The workflow
      is written and npm ci resolves, but nothing has run it: GitHub only sees
      it once main is pushed
- [ ] Revisit TypeScript 7 when vue-tsc supports it (pinned to 5.x today)
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
