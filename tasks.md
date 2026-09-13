# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

Nothing outstanding. The demo is live and current, and level with
what `origin/main` points at (`d6768b4` as this was written).

## Next: fif.bobdempsey83.com from the same repo

Planned as the OpenSpec change `split-into-two-shops`, with four streams that
can run in parallel and a verification gate after them. Run `/opsx:apply` to
start; the change's own tasks.md is the working list.

- [ ] Stream A: second Vercel project, its env vars and the Route 53 CNAME.
      In flight 2026-09-12, and told about NUXT_PUBLIC_OG_IMAGE mid-run
- [x] Stream B: new Supabase project for the demo, and repoint it. Done
      2026-09-12, `qtzwrwstixqgnuixfajp`, verified with a real order
- [ ] Stream B follow-ups: widen the Supabase token so db:types can read either
      project, and decide on the deprecated service_role keys
- [x] Stream C: per-shop share image, and a smoke test that checks either shop.
      Done 2026-09-12 at `ff4fc83`. Added NUXT_PUBLIC_OG_IMAGE, which both
      deployments must set or their previews ship no picture
- [ ] Stream D: custom-order requests from an empty search. In flight
      2026-09-12, uncommitted work in app/, server/ and tests/
- [ ] Gate: drive both shops, place an order on each, confirm they share nothing
- [ ] Update README.md and AGENTS.md, which describe a single-shop template

Decided 2026-09-12, do not reopen without asking: a second Vercel project rather
than a branch, and the real shop keeps the existing database while the demo
moves to the new one.
