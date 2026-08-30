# AGENTS.md

Instructions for any AI coding agent working in this repository.

## This project uses OpenSpec

Spec-driven development is the default workflow here. **Do not jump straight to
code for anything beyond a trivial fix.** Write the spec first, get it agreed,
then implement against it.

Specs and in-flight changes live in `openspec/`. Agent-facing skills are in
`.claude/skills/openspec-*/` (Claude Code) and `.agents/skills/openspec-*/`
(shared, for other tools).

### Workflow

1. **Explore** — think through options without committing to one.
2. **Propose** — create a change folder with proposal, specs, design and tasks.
3. **Apply** — implement the tasks from the agreed plan.
4. **Archive** — move the completed change out of the active set.

### Invoking it

| Tool | Syntax |
| --- | --- |
| Claude Code | `/opsx:propose`, `/opsx:explore`, `/opsx:apply`, `/opsx:archive`, `/opsx:update`, `/opsx:sync` |
| Cursor, GitHub Copilot | `/openspec-propose`, `/openspec-explore`, … |
| Amazon Q | `@openspec-propose`, … |
| Other tools | read `.agents/skills/openspec-*/SKILL.md` directly |

If your tool has no adapter, follow the skill files in `.agents/skills/` by hand.

### When to skip it

Typo fixes, dependency bumps, formatting, and one-line copy changes do not need
a proposal. Anything that adds a feature, changes the data model, alters the
order flow, or touches Supabase schema or RLS **does**.

## Project context

Nuxt 4 (SSR) storefront with a request-an-order checkout — customers submit a
cart, staff receive it by email and arrange payment off-app. Payment processing
is deliberately out of scope.

- Framework: Nuxt 4 + Vue 3 + TypeScript (Nitro server routes in `server/`)
- UI: PrimeVue 5 (Aura) + Tailwind CSS 4
- State: Pinia, cart persisted to `localStorage`
- Data: Supabase (Postgres + RLS), schema in `supabase/schema.sql`
- Email: Resend
- Validation: Zod

Read `handoff.md` for full background and current status, and `README.md` for
setup. Install with `npm install --legacy-peer-deps` on this Nuxt version.

Never commit secrets — configuration comes from `.env` (template in
`.env.example`).
