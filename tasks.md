# Remaining tasks

> **You are on `fif`, the Forged in Filament shop.** `main` is the AI Storefront
> template and its demo. Shop work belongs here and never on `main`. Template
> fixes are made on `main` and cherry-picked in when this shop wants them; this
> branch never merges back. See AGENTS.md.

## Now: fif.bobdempsey83.com

The shop is live at `fif.bobdempsey83.com`, on the Supabase project
`wfhhkdmgouyxnrxnbaeo`, and this branch is where it diverges from the template.

- [ ] Decide what this shop's catalogue actually is, still the seeded 15 demo products
- [ ] Watch the next real order's staff email for the "[Forged in Filament]" subject
- [ ] Verify a domain in Resend so the buyer confirmation reaches a real customer

## Inherited from the template, still true here

- [ ] Rate-limit `/api/cart/preview`, which today answers promo-code guesses freely
- [ ] Decide what replaces the in-memory rate limiter and draft confirmations on serverless
- [ ] Make the promo preview normalise a code the way `create_order` does
- [ ] Paginate `search_catalogue` and cache the sale and promo reads
- [ ] Consider naming the shop in the email bodies, not just the subjects
- [ ] Widen the Supabase token so `db:types` reads either project, and settle the deprecated `service_role` keys
