## Context

Two shops, one build, two databases. Most of this change is account
configuration rather than code, which is unusual here and shapes everything
below: the risky steps are the ones no test can catch, and the code steps are
small enough to be almost incidental.

The decisions that were already settled before this change are in the proposal.
This document covers how the work is sequenced, what can run in parallel, and
the three things that will bite.

## Why the demo moves and the real shop stays

The existing Supabase project is `wfhhkdmgouyxnrxnbaeo`, named
`forged in filament`. It holds the real shop's rows, and its name already says
whose it is.

Repointing a deployment at a different database is the risky half of this work,
so it should be done to the shop where a mistake costs least. That is the demo.
It sells nothing, its orders are test rows and delivery checks, and it can be
broken for an hour without anyone losing money.

The cost of this choice is that the demo's existing rows stay behind in the real
shop's database. They are the real shop's to clean up, and that is a deliberate
non-goal rather than an oversight: moving them would mean matching orders to
shops after the fact, with no column recording which shop took them.

## Parallel work, and what makes it safe

The work splits into four streams. Three of them can run at once; the fourth
cannot start until the first finishes.

```
  A. The second shop's infrastructure      (Vercel project, DNS, env)
  B. The demo's new database                (Supabase project, repoint)
  C. Per-shop assets and checks             (share image, smoke test)
  D. Custom-order requests                  (code, tests, spec)

  A ──┐
  B ──┼──> E. Verify both shops end to end
  C ──┤
  D ──┘
```

**A, B, C and D touch disjoint files and disjoint accounts.** D is the only one
that writes application code. C writes `tests/smoke/production.test.ts` and a
new image. A and B write nothing in the repo except environment documentation.
That is what makes them safe to run at once, and an agent on any of them should
be told to touch nothing outside its own list.

**E is the gate.** Nothing is finished until both shops have been driven in a
browser and had an order placed on each, because every failure mode this change
introduces is a configuration one that a build and a test suite both pass.

Two rules for whoever runs these in parallel:

- **One agent per stream, and no stream without its verification step.** A
  stream that reports "configured" without having loaded the page proves
  nothing; production built cleanly with empty variables once already and served
  an error page.
- **B is the only stream that can take the demo offline.** If two streams have
  to be serialised, serialise around B.

## What will bite

**A variable set to an empty string beats its default.** This cost an afternoon
on 2026-09-10: `vercel env ls` shows the variable present, hides its value, and
the app reports itself unconfigured. When the new project looks misconfigured,
check for empty values before checking anything else.

**Adding a variable does not rebuild what is deployed.** Every environment
change needs a redeploy behind it, or the running build never sees it.

**Vercel issues a per-domain CNAME target**, not `cname.vercel-dns.com`. Read it
off the new project's Domains tab. `vercel domains inspect` will refuse the
subdomain with "you don't have access", because it is a domain attached to a
project rather than a domain on the account, so the console is the only place
that shows it. The zone is Route 53, `Z071721280HQ6W3TJD8O`, and the
`route53-dns` credentials can write it directly.

**A TXT value in Route 53 must be double-quoted**, and anything over 255
characters is stored as two quoted strings concatenated. This matters only if
the Resend records ever need rewriting; they do not for this change, because
`bobdempsey83.com` is already verified and both shops send as an address on it.

## The custom-order route

The only stream with real code in it, and it is deliberately small.

**It reuses the contact path rather than adding one.** A custom-order request is
a contact message with a subject: same validation, same rate limiter, same
delivery, same reporting of a failed send. Building a second path would mean a
second set of all four, and the difference between the two messages is one line
of text.

**The assistant gains nothing, again.** No tool, no argument, no ability to
send. This is the fourth change in a row to take that shape, and the reason has
not changed: the assistant's permissions are its tool list, so the way to be
sure it cannot commit the shop to making something is that no tool does. One
sentence of the system prompt names where to ask.

**The empty-search offer carries the term.** It travels as store state rather
than a route query, the same way the product-page prefill does, because a query
changes a shareable URL and refills the box on reload.

## Alternatives considered

**A long-lived `fif` branch.** Rejected. Nothing in the code differs between the
shops, so a branch buys an ongoing merge and the possibility of drift, and pays
for neither. If the shops ever must differ, a configuration flag is the smaller
answer and a branch is still available.

**One database with a `shop` column on every table.** Rejected. It puts the two
shops' orders one forgotten `where` clause apart, and RLS would have to enforce
the separation that two projects give for free. It would also make one shop's
schema change the other's outage.

**Automating the second deployment.** Rejected for now, as a non-goal. The
checklist has been run once. Automating it before it has been run twice is
guessing at what varies between shops, and the checklist is the artifact that
tells us.
