## Context

See proposal.md for motivation.

Two constraints come from how this project deploys. `import.meta.dev` is decided at build time, so it is true under `npm run dev` and false in every Vercel deployment, preview included: it cannot tell a preview from the live shop on its own. And the tab title is composed by a `titleTemplate` in `app/layouts/default.vue`, put there rather than in `nuxt.config.ts` because `storeName` is a runtime value. Whatever names the environment has to be a runtime value for the same reason, and has to reach that same template.

## Goals / Non-Goals

**Goals:**

- Local and preview are obvious at a glance, in the page and in the tab.
- The live shop renders exactly what it renders today.
- An adopter who configures nothing inherits the second of those, not the first.

**Non-Goals:**

- Changing what a non-production deployment can do. The marker is a label, not a guard: it does not disable ordering or point the app at a different database. Splitting the databases is separate work already in `tasks.md`.
- Detecting the environment from the hostname. It would be one fewer variable to set, and it would break the moment a domain moved.

## Decisions

**One public runtime value, `NUXT_PUBLIC_DEPLOY_ENV`, naming the environment, with unset meaning the live shop.** The alternative is a boolean meaning "this is not production", and it is worse twice over. A variable that has to be set to false on the live shop fails open, so a deployment that forgets it shows a banner to customers. And a boolean cannot tell a laptop from a preview URL, which is the distinction that decides what you do about it.

**`import.meta.dev` seeds the value rather than replacing it.** A dev server with nothing configured still shows the marker, because a developer who never set the variable is exactly the person who needs it. Vercel Preview has to be told, since nothing in its build distinguishes it from production. That is one variable on one environment, recorded in the README.

**A bar across the top of the page, plus a prefix on the tab title.** A corner badge was considered and rejected: it is easy to stop seeing, and it appears in no screenshot cropped to the content. A bar is harder to ignore. It sits above the header rather than fixed over it, so it cannot cover a control, which is the third requirement in the spec.

**The title prefix goes in the existing `titleTemplate`.** One function already composes the tab title from a runtime value. A second mechanism would give two places to look when a title comes out wrong.

## Risks / Trade-offs

- **A variable set wrongly on the live shop puts a banner in front of customers.** → Unset and `production` both render nothing, so breaking it takes actively typing something else. The smoke test runs against the live domain and asserts the marker is absent.
- **Preview stays unmarked until someone sets the variable there.** → Accepted, and it is the one manual step. It goes in the README and in `handoff.md`, beside the note that Preview now carries the rest of the environment.
- **The banner changes the layout, so a marked deployment does not match the live shop pixel for pixel.** → No screenshot test exists, and the e2e suite runs against a dev server where the marker is expected.

## Migration Plan

Additive. No schema change. Reverts by deleting the variable and the banner.
