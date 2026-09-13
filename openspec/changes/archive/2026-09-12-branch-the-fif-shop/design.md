## Context

Almost none of this is code. It is one git branch, one Vercel setting, two
GitHub protection rules and a lot of documentation that currently says the
opposite. The risk is concentrated in the parts that are not in the repo.

## The order, and why it is not arbitrary

**Push `main` first.** Both shops built from it, so that push is the last one
that updates both, and it makes the fork point identical to what is live. Branch
from anything earlier and the two shops start out differing by commits nobody
chose.

**Then branch, then repoint Vercel.** The repoint is the load-bearing step:
until the `forged-in-filament` project's Production Branch is `fif`, a push to
`fif` deploys nowhere and a push to `main` still redeploys the real shop. Both
failure modes are silent.

**Protection before the first real divergence**, because a branch with no
upstream cannot be recovered once it holds work the template never had.

## Why protect against deletion and force-push, and nothing else

Direct pushes stay allowed. This is a one-person workflow; requiring a pull
request into your own branch adds a step without adding a reader.

Required status checks are deliberately not turned on either. CI only starts
running on `fif` with this change, and a required check that has never reported
blocks every push to the branch it was meant to protect.

## Why cherry-pick rather than merge

A scheduled merge costs more every time it runs, because the cost is
proportional to how far the branches have drifted, and drifting is the plan. It
also concentrates conflicts in exactly the files that should differ:
`.mcp.json`, the generated `server/types/database.ts`, and the per-shop
expectations in `tests/smoke/production.test.ts`.

Cherry-picking inverts the default. Nothing arrives unless someone decided it
should. The cost is that a fix can be forgotten, which is a real cost and the
one accepted here.

`fif` never merges back. A template improvement noticed while working on the
shop is made again on `main` on purpose, because a merge back would bring shop
code with it.

## The failure this makes possible

An agent told to "fix the shop" works on whatever branch is checked out and
pushes to `main` out of habit, shipping shop code to the template and to a
public demo. Nothing in the repo guarded against that, because until now there
was nothing to guard.

The guard is instruction rather than mechanism: `AGENTS.md` and `CLAUDE.md` both
say to run `git branch --show-current` before writing code. A mechanism would be
better and none is cheap here. Branch protection does not help, since the danger
is a legitimate push to the wrong branch.

## Alternatives considered

**A separate repository.** Declined by the user after being offered. It removes
the wrong-branch mistake entirely and matches "pull fixes deliberately" more
closely, but it puts the template's history out of reach and turns one checkout
into two.

**A configuration flag per difference.** This is what `split-into-two-shops`
proposed instead of a branch, and it holds only while the differences are
small enough to name. "Drastically different" is not a flag.

**Keeping one branch and accepting the demo shows shop code.** Rejected: the
demo is what the template is judged by.
