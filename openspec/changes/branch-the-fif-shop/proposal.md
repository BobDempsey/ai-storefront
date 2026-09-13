## Why

`split-into-two-shops` put both shops on `main`, and said so as a non-goal: *"No
code divergence. If the two shops ever need different behaviour, that is a
configuration flag or a new change, never a branch."* That rested on one
premise, which the change itself stated: nothing in the code differs between the
two shops.

The premise was right about today and wrong about tomorrow. `ai-storefront` is a
template. Forged in Filament is a shop built from it, and it will diverge
substantially. Sharing a branch means every shop change also ships to the
template and to a public demo, which is the opposite of what a template is for.

## What Changes

- **`fif` becomes a long-lived branch**, and the `forged-in-filament` Vercel
  project builds production from it rather than from `main`. `main` stays the
  template and the demo.
- **Both branches are protected** against deletion and force-push. `fif` has no
  upstream to be recovered from once it diverges, so losing it is losing the
  shop.
- **CI runs on both branches.** A branch that deploys a shop with nothing
  checking it is worse than no branch.
- **Template fixes reach the shop by cherry-pick**, when someone wants them.
  There is no scheduled merge and `fif` never merges back.
- **`.mcp.json` differs per branch**, each pointing at its own shop's Supabase
  project. This is the first deliberate, permanent difference between them.
- **Agent guidance names the branches**, because nothing in the repo previously
  did, and an agent told to "fix the shop" would work on whatever was checked
  out and push to `main` out of habit.

## Capabilities

### Modified Capabilities

- `storefront/shop-identity`: its Purpose and first requirement say a shop's
  identity comes from configuration "so two shops can run the same build". The
  shops no longer run the same build. The requirement still holds and is worth
  keeping; the one-build framing has to go.

## Impact

- **`.github/workflows/check.yml`**, one line.
- **`.mcp.json`**, which now differs between branches and must not be
  reconciled.
- **`AGENTS.md` and `CLAUDE.md`**, which gain the branch rules.
- **`README.md`**, whose multi-shop section told an adopter to use one branch.
- **`handoff.md` and the root `tasks.md`**, which record the reversed decision.
- **GitHub branch protection and one Vercel project setting.** Neither is in the
  repo, and the Vercel one is the load-bearing step.
- **No application code, no schema, no environment variable.** Both shops serve
  exactly what they served before.

## Non-goals

- **No scheduled merge, and no automation to keep the branches in step.** They
  are meant to drift. Adding a merge later is a decision, not a tidy-up.
- **No separate repository.** Considered and declined: one repo keeps the fork
  point and the template's history in reach.
- **`fif` never merges back into `main`.** A template improvement made while
  working on the shop is made again on `main`, deliberately, rather than dragged
  back with shop code attached.
- **No branch for a third shop yet.** A shop that will not diverge should stay
  on `main`, which is what the README now says.
