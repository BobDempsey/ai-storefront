# Remaining tasks

## Now: ai-storefront.bobdempsey83.com

Nothing outstanding. The demo is live and current, and level with
`origin/main` (`0e7aa5c` as this was written). Note that this line answers for
the demo only: `fif` feeds the other shop and has its own currency.

## Next: fif.bobdempsey83.com, on its own branch

The split shipped 2026-09-12 as the OpenSpec change `split-into-two-shops`, then
the same day the one-branch decision behind it was reversed. Two branches now:
`main` is the template and the demo, `fif` is Forged in Filament. Both are
protected against deletion and force-push. Template fixes reach the shop by
cherry-pick, never on a schedule, and `fif` never merges back.

- [ ] Set the fif project's framework preset to Nuxt in the dashboard; the CLI
      cannot, and it reads "Other" today
- [ ] Confirm by inbox that the second shop's staff email and buyer
      confirmation arrive; the agent has no mailbox and cannot check
- [ ] Widen the Supabase token so db:types can read either project, and decide
      on the deprecated service_role keys

Decided 2026-09-12, do not reopen without asking: the real shop keeps the
existing database while the demo moves to the new one, and Forged in Filament
lives on its own long-lived branch because it will diverge from the template.
