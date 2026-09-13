## Why

This repository is a template that has only ever run one shop. The plan agreed
on 2026-09-11 is for it to run two: the demo at `ai-storefront.bobdempsey83.com`
and the real 3D-printing shop at `fif.bobdempsey83.com`.

Until they are split, every deployment writes to one `orders` table. An order
placed on the demo, by a stranger or by a test, lands in the real shop's
business. That is the reason to do this now rather than later, and it gets worse
with traffic, not better.

Running a second shop is also the first real test of the template's claim to be
one. Anything that has to be edited rather than configured is a defect in the
template, and this change is where those surface.

## What Changes

- **A second Vercel project**, built from `main`, carrying its own environment
  variables. Decided over a long-lived branch: nothing in the code differs
  between the two shops, so a branch would buy divergence and an ongoing merge
  and nothing else.
- **A second Supabase project.** The existing one is named
  `forged in filament` and stays with that shop; the **demo** moves to the new
  one. **This touches Supabase schema and RLS**: the new project is built by
  running `supabase/schema.sql` and `supabase/seed.sql`, which create every
  table, every RLS policy and `create_order`.
- **`fif.bobdempsey83.com` in Route 53**, a CNAME at the per-domain target
  Vercel issues for that project.
- **A share image per shop.** `public/og-image.png` has "AI Storefront" rendered
  into it, so the second shop would advertise the first one's name in every link
  preview.
- **The smoke test checks either deployment**, rather than defaulting to one
  domain and being overridden by hand.
- **A visitor who wants something the catalogue does not stock is pointed at
  the contact form.** The real shop takes custom print requests; today nothing
  on the storefront says so, and the assistant can only report that it found no
  match.

## Capabilities

### New Capabilities

- `storefront/shop-identity`: what makes one deployment a distinct shop, and
  what must be true of a deployment before it faces customers. States the
  per-shop values as requirements so standing up a third shop is a checklist
  rather than an act of memory, and so a misconfigured shop is a failing check
  rather than a customer's discovery.
- `contact/custom-order-request`: a visitor who wants something the catalogue
  does not carry is offered the contact form, and their request arrives with
  enough context for staff to answer it.

### Modified Capabilities

- `ordering/test-order`: today an order is a test when the deployment names
  itself something other than the live shop. With two live shops, "the live
  shop" stops being one thing, and the requirement has to say that each
  deployment judges itself.

## Impact

- **Infrastructure, and most of the work.** Two Vercel projects, two Supabase
  projects, one new DNS record. None of it is code.
- **`tests/smoke/production.test.ts`**, which hardcodes one default domain.
- **`public/og-image.png`**, and whatever generates the second one.
- **The contact page and the assistant's system prompt**, for the custom-order
  route.
- **`README.md` and `AGENTS.md`**, which describe a single-shop template.
- **No change to the order flow, pricing, the cart, or the database schema
  itself.** The second project runs the same `schema.sql` the first did.

## Non-goals

- **No shared database between the shops, and no cross-shop reporting.** Two
  shops, two projects, no join between them. Anyone wanting both shops' orders
  in one place reads two dashboards.
- **No code divergence.** If the two shops ever need different behaviour, that
  is a configuration flag or a new change, never a branch.
- **No migration of existing rows.** The demo's new project starts from
  `seed.sql`, empty of orders. Existing demo orders stay in the old project and
  are the real shop's to clean up.
- **No third shop, and no automation for creating one.** The checklist this
  produces is the tool. Automating it before it has been run twice would be
  guessing at what varies.
- **No custom-order pricing, quoting, or file upload.** A request reaches staff
  by email and they reply. Anything more is a phase 2 feature.
