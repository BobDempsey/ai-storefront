# Remaining tasks

> **You are on `fif`, the Forged in Filament shop.** `main` is the AI Storefront
> template and its demo. Shop work belongs here and never on `main`. Template
> fixes are made on `main` and cherry-picked in when this shop wants them; this
> branch never merges back. See AGENTS.md.

## Now: fif.bobdempsey83.com

The shop is live at `fif.bobdempsey83.com`, on the Neon project
`round-dream-79243828` since 2026-09-19, and this branch is where it diverges
from the template. The Supabase project `wfhhkdmgouyxnrxnbaeo` is the rollback.

- [ ] Rotate this shop's Supabase service key and the Neon password, both seen by an agent
- [ ] Archive move-fif-database-to-neon, 29 of 30, with 4.5 unverifiable
- [ ] Decide when to release the Supabase project, which is now only the rollback
- [ ] Decide what this shop's catalogue actually is, still the seeded 15 demo products
- [ ] Verify a domain in Resend so the buyer confirmation reaches a real customer

## Inherited from the template, still true here

- [ ] Rate-limit `/api/cart/preview`, which today answers promo-code guesses freely
- [ ] Decide what replaces the in-memory rate limiter and draft confirmations on serverless
- [ ] Make the promo preview normalise a code the way `create_order` does
- [ ] Paginate `search_catalogue` and cache the sale and promo reads
- [ ] Consider naming the shop in the email bodies, not just the subjects
- [ ] Widen the Supabase token so `db:types` reads either project, and settle the deprecated `service_role` keys
