# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

Nothing outstanding. The demo is live and current, and level with
what `origin/main` points at (`d6768b4` as this was written).

## Next: fif.bobdempsey83.com from the same repo

Planned as the OpenSpec change `split-into-two-shops`, with four streams that
can run in parallel and a verification gate after them. Run `/opsx:apply` to
start; the change's own tasks.md is the working list.

- [x] Stream A: second Vercel project, its env vars and the Route 53 CNAME.
      Done 2026-09-12. fif.bobdempsey83.com is live on the real shop's
      database, and test:smoke is 6/6 against each shop
- [ ] Set the fif project's framework preset to Nuxt in the dashboard; the CLI
      cannot, and it reads "Other" today
- [x] Stream B: new Supabase project for the demo, and repoint it. Done
      2026-09-12, `qtzwrwstixqgnuixfajp`, verified with a real order
- [ ] Stream B follow-ups: widen the Supabase token so db:types can read either
      project, and decide on the deprecated service_role keys
- [x] Stream C: per-shop share image, and a smoke test that checks either shop.
      Done 2026-09-12 at `ff4fc83`. Added NUXT_PUBLIC_OG_IMAGE, which both
      deployments must set or their previews ship no picture
- [x] Stream D: custom-order requests from an empty search. Done 2026-09-12 at
      `379b280`, reusing the contact path, and the assistant gained no tool
- [x] Gate: both shops serve their own identity, share no rate-limit state, and
      an order on one is absent from the other's database. Done 2026-09-12
- [ ] Confirm by inbox that the second shop's staff email and buyer
      confirmation arrive; the agent has no mailbox and cannot check
- [ ] Push, which is what puts the custom-order feature and the per-shop share
      images on both live shops (ask first)
- [x] Update README.md and AGENTS.md. Done 2026-09-12: the README has a
      "Running more than one shop" checklist and AGENTS.md names both projects

Decided 2026-09-12, do not reopen without asking: a second Vercel project rather
than a branch, and the real shop keeps the existing database while the demo
moves to the new one.
