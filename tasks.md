# Remaining tasks

> **You are on `main`: the AI Storefront template and its demo.** Forged in
> Filament lives on `fif` and is a different project. Shop work never lands
> here; template fixes are made here and cherry-picked into `fif` when that shop
> wants them. Run `git branch --show-current` before you edit anything.

- [ ] Move the demo's database to Neon: `/opsx:apply move-demo-database-to-neon`
- [ ] Decide whether Forged in Filament follows the demo onto Neon
- [ ] Rate-limit `/api/cart/preview`, which today answers promo-code guesses freely
- [ ] Decide what replaces the in-memory rate limiter and draft confirmations on serverless
- [ ] Make the promo preview normalise a code the way `create_order` does
- [ ] Paginate `search_catalogue` and cache the sale and promo reads
- [ ] Decide where the removed launch checklist and second-shop guide now live
- [ ] Consider naming the shop in the email bodies, not just the subjects
- [ ] Widen the Supabase token so `db:types` reads either project, and settle the deprecated `service_role` keys
- [ ] Consider an Ignored Build Step on the fif Vercel project
