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
- UI: PrimeVue 4.5.5 (Aura) + Tailwind CSS 4, pinned to 4.x because 5.x is
  commercially licensed
- State: Pinia. The cart persists to a cookie (the persistedstate module's
  default); the colour-mode store opts into `localStorage` explicitly
- Data: Supabase (Postgres + RLS), schema in `supabase/schema.sql`
- Email: Resend
- Validation: Zod

Read `handoff.md` for full background and current status, and `README.md` for
setup. Install with `npm install --legacy-peer-deps` on this Nuxt version.

Never commit secrets — configuration comes from `.env` (template in
`.env.example`).

## Writing style

Applies to everything with words in it: UI copy, emails, docs, specs, comments,
commit messages, and what you say in chat. The point is that a reader should not
be able to tell a machine drafted it.

**Punctuation.** Do not use em dashes. A comma, colon, semicolon, or set of
parentheses does the same work without the tell. Do not use en dashes as a
substitute either.

**Words to drop.** delve, realm, underscore (as a verb), meticulous,
commendable, robust, seamless, leverage, utilize, navigate (figuratively),
landscape, tapestry, testament, crucial, vital, elevate, unlock, harness,
foster, embark, journey. Prefer the plain word: use "use", not "utilize"; "is"
or "has" unless a sharper verb genuinely earns its place.

**Phrases to drop.** "It's important to note", "In conclusion", "To sum up",
"At the end of the day", "In today's fast-paced world", "Let's dive in",
"That said" as filler, "not only ... but also", "It's not X, it's Y" as a
rhetorical move. Hedge only where the uncertainty is real: cut "arguably",
"perhaps", "it could be said", "some may argue".

**Rhythm.** Vary sentence length. Vary paragraph length. Uniform three-sentence
paragraphs and lists where every item reads "**Bold term**: explanation" are the
clearest sign of generated text. Some sentences should be short.

**Voice.** Contractions are fine. Say what happened and who it affects rather
than reaching for abstraction. Do not open a paragraph by restating the heading
above it, and do not close a section by summarising what the reader just read.

**Structure.** Do not add headings, bullets, or bold to text that reads fine as
prose. Bullets are for genuine lists.

Existing documents in the repo were not retrofitted, so `handoff.md` and the
archived specs still contain plenty of em dashes. Follow this section for new
writing, and clean the old text only when you are already editing it for another
reason.
