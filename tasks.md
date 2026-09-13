# Remaining tasks

> **You are on `main`: the AI Storefront template and its demo.** Forged in
> Filament lives on `fif` and is a different project. Shop work never lands
> here; template fixes are made here and cherry-picked into `fif` when that shop
> wants them. Run `git branch --show-current` before you edit anything.

## Now: ai-storefront.bobdempsey83.com

Nothing outstanding. The demo is live and current, level with `origin/main`
(`677e787` as this was written). That answers for the demo only: `fif` feeds the
other shop and has its own currency and its own task list.

## Template work, when there is any

- [ ] Watch the next real order's staff email on either shop: it should carry
      the shop's name in brackets now. That subject could not be verified before
      shipping, because a dev order is a test order and a test order sends no
      email at all

- [ ] Widen the Supabase token so `npm run db:types` can read either project,
      and decide on the deprecated `service_role` keys
- [ ] Consider an Ignored Build Step on the fif Vercel project, which builds a
      preview on every `main` push and spends Hobby build minutes doing it

## Keeping the branches level

`fif` is level with `main` as of 2026-09-12, by cherry-pick. One `main` commit
is deliberately never taken, the one naming which branch each document belongs
to, so those two files always differ. Check for content rather than commits:
`git cherry fif main` compares patch ids and reports a resolved conflict as
missing.

## Living on the other branch

Recorded here because it is easy to forget which side a thing belongs to. These
are Forged in Filament's and are listed in that branch's own `tasks.md`:
confirming its emails actually arrive, and deciding what its catalogue is, since
it still carries the template's 15 seeded demo products.

Decided 2026-09-12, do not reopen without asking: the real shop keeps the
existing Supabase project while the demo has its own, and Forged in Filament
lives on its own long-lived branch because it will diverge from the template.
Both branches are protected against deletion and force-push.
