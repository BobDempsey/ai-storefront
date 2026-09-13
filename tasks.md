# Remaining tasks

> **You are on `fif`, the Forged in Filament shop.** `main` is the AI Storefront
> template and its demo. Shop work belongs here and never on `main`. Template
> fixes are made on `main` and cherry-picked in when this shop wants them; this
> branch never merges back. See AGENTS.md.

## Now: fif.bobdempsey83.com

The shop is live at `fif.bobdempsey83.com`, on the Supabase project
`wfhhkdmgouyxnrxnbaeo`, and this branch is where it diverges from the template.

- [x] Confirm by inbox that the staff email and buyer confirmation arrive for a
      real order here. Done 2026-09-12: Resend shows both delivered for the gate
      order, though under the old nameless subjects
- [ ] Watch the next real order's staff email: it should now read
      "[Forged in Filament] New order from ...". The contact path was confirmed
      by inbox screenshot on 2026-09-13 and the order path uses the same helper,
      but this shop's own order email has not been seen. It could not be checked
      before shipping, because a dev order is a test order and a test order
      sends no email at all
- [ ] Decide what this shop's catalogue actually is. It carries the template's
      15 seeded demo products today, which is the first thing a real customer
      would notice

## Inherited from the template, still true here

- [ ] Consider naming the shop in the email bodies too, not just the subjects.
      Raised 2026-09-13 and left alone on purpose: the subject is what an inbox
      sorts on. It matters if staff ever forward or print these

- [ ] Widen the Supabase token so `npm run db:types` can read either project,
      and decide on the deprecated `service_role` keys
