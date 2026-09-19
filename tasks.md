# Remaining tasks

> **You are on `main`: the AI Storefront template and its demo.** Forged in
> Filament lives on `fif` and is a different project. Shop work never lands
> here; template fixes are made here and cherry-picked into `fif` when that shop
> wants them. Run `git branch --show-current` before you edit anything.

- [ ] Rotate the demo's Neon password, which was exposed to an agent transcript
- [ ] Archive move-demo-database-to-neon, 26 of 28 with both open tasks now moot
- [ ] Rate-limit `/api/cart/preview`, which today answers promo-code guesses freely
- [ ] Decide what replaces the in-memory rate limiter and draft confirmations on serverless
- [ ] Make the promo preview normalise a code the way `create_order` does
- [ ] Paginate `search_catalogue` and cache the sale and promo reads
- [ ] Decide where the removed launch checklist and second-shop guide now live
- [ ] Widen the Supabase token so `db:types` reads either project
