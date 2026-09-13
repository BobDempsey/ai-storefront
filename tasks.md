# Remaining tasks

> **You are on `fif`, the Forged in Filament shop.** `main` is the AI Storefront
> template and its demo. Shop work belongs here and never on `main`. Template
> fixes are made on `main` and cherry-picked in when this shop wants them; this
> branch never merges back. See AGENTS.md.

## Now: fif.bobdempsey83.com

The shop is live at `fif.bobdempsey83.com`, on the Supabase project
`wfhhkdmgouyxnrxnbaeo`, and this branch is where it diverges from the template.

- [ ] Set this project's framework preset to Nuxt in the Vercel dashboard; the
      CLI cannot, and it reads "Other" today
- [ ] Confirm by inbox that the staff email and buyer confirmation arrive for a
      real order here; the agent has no mailbox and cannot check
- [ ] Decide what this shop's catalogue actually is. It carries the template's
      15 seeded demo products today, which is the first thing a real customer
      would notice

## Inherited from the template, still true here

- [ ] Widen the Supabase token so `npm run db:types` can read either project,
      and decide on the deprecated `service_role` keys
