# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

Nothing outstanding. The demo is live and current, and level with
what `origin/main` points at (`d6768b4` as this was written).

## Next: fif.bobdempsey83.com from the same repo

Planned as the OpenSpec change `split-into-two-shops`, with four streams that
can run in parallel and a verification gate after them. Run `/opsx:apply` to
start; the change's own tasks.md is the working list.

- [ ] Stream A: second Vercel project, its env vars and the Route 53 CNAME
- [ ] Stream B: new Supabase project for the demo, and repoint it
- [ ] Stream C: per-shop share image, and a smoke test that checks either shop
- [ ] Stream D: custom-order requests from an empty search
- [ ] Gate: drive both shops, place an order on each, confirm they share nothing
- [ ] Update README.md and AGENTS.md, which describe a single-shop template

Decided 2026-09-12, do not reopen without asking: a second Vercel project rather
than a branch, and the real shop keeps the existing database while the demo
moves to the new one.
