## Context

See proposal.md for motivation.

One existing decision has to be answered rather than stepped over. `server/api/orders.post.ts` carries a comment saying a test order is declared by a header "not by the build environment, so the branches below are the ones production runs", and `handoff.md` records the same reasoning: gating on "not production" would mean production ran a branch no test ever exercised.

That reasoning was about `NODE_ENV`, which is implicit, invisible and different in every environment by definition. `NUXT_PUBLIC_DEPLOY_ENV` is none of those: production leaves it unset and therefore takes exactly the code path it takes today, which is the path the suites already exercise. The new branch is the one a dev server and a preview take, and unit tests cover it directly. The original concern does not apply to this mechanism, and the comment is rewritten rather than deleted so the next person sees that it was considered.

## Goals / Non-Goals

**Goals:**

- An order placed by a person clicking through a non-production deployment is marked without them having to know anything.
- Production behaves exactly as it does today.

**Non-Goals:**

- Stopping non-production deployments writing to the production database. That is the database split, already in `tasks.md`, and this change makes the interim safer rather than replacing it.
- Widening the rate-limit exemption. See the decision below.

## Decisions

**The environment is read from server runtime config, never from the request.** `NUXT_PUBLIC_DEPLOY_ENV` is public in the sense that it is sent to the browser, but the route reads the server's own copy. A browser cannot influence it, which is what keeps a request from claiming to be a preview and getting an unbilled, unnotified order. The spec states this as a scenario rather than leaving it to the implementation.

**The same resolver as the banner.** `resolveDeployEnv` in `app/utils/deploy-env.ts` already decides what counts as the live shop, including that `production` and unset both mean the same thing. Reimplementing that test in the order route would give two definitions of "live shop" to keep in step, and the interesting failure is them disagreeing.

**`import.meta.dev` is not consulted here.** The banner falls back to it so a developer who configured nothing still sees the warning; a missing marker on a laptop is a cosmetic failure. Marking an order is not cosmetic, so it follows the configured value alone: a deployment gets the behaviour it was configured for, and `.env` sets `development` for the dev server anyway.

**The rate-limit exemption stays tied to the secret alone.** It exists because a suite shares one address with real traffic and would otherwise fail on its own second run. That does not describe a person clicking through a dev server, and exempting them would mean the limiter is never met outside CI, which is how a broken limiter reaches production unnoticed. So the two conditions stop being the same boolean: one decides the marker, the other decides the exemption.

## Risks / Trade-offs

- **A production deployment that names an environment by mistake silently stops recording real orders**, and stops emailing staff about them. → The same misconfiguration already puts an amber banner on every page, and the smoke test asserts that banner is absent from the live domain. The loud failure arrives before the quiet one.
- **Two booleans where there was one** invites a later edit that conflates them again. → Each is named for what it decides, and both are covered by unit tests over the route.
- **A developer may expect their dev order to behave like a real one**, including the staff email, and find it does not. → That is the point of the change, and the banner above the page says which deployment they are on.

## Migration Plan

No schema change, no new variable. Reverts by restoring one boolean.
