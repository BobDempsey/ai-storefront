# Design

## Context

See proposal.md for motivation. The relevant shape of the current code: `app/pages/contact.vue` posts to `POST /api/contact`, which validates with `contactSchema`, sends through `sendContactEmail`, and then calls `subscribeQuietly` when the sender ticked the newsletter box. The custom-order request is not a second form. It is the same page and the same route with `kind: 'custom-order'` set, fed by `useCustomOrderStore`, which `app/pages/index.vue` fills from an empty search. The assistant's system prompt names the contact page in prose.

Three things are shared with code that stays: `subscribeQuietly` (checkout uses it), the HTML escaping helper, and the shop-name helper that stamps subjects. None of them are contact-specific.

## Goals / Non-Goals

**Goals:**

- Leave no route that delivers visitor-supplied text to the staff inbox.
- Leave no control, link, or assistant sentence pointing at a page that no longer exists.
- Keep the newsletter and checkout paths behaviourally unchanged.

**Non-Goals:**

- A flag, an env var, or any other switch that could turn the form back on. See the Decisions below.
- Preserving `useCustomOrderStore` for a future request form.

## Decisions

**Delete the page and the route rather than gate them behind a flag.** A flag leaves the handler compiled into the bundle and leaves a spam hole one misconfiguration away. It would be the right call if `fif` and `main` shared a deployment, but they do not: they are separate branches with separate deploys and no scheduled merge, so there is no shared build to parameterise. `fif` keeps its own `contact.post.ts` on its own branch, untouched.

**Let `/contact` 404 rather than redirect to the home page.** A redirect tells a visitor the page moved, which is not what happened. A 404 is the honest answer, and Nuxt gives it for free once the page file is gone. Considered and rejected: a 410 Gone route, which is more correct still but costs a server route to express a fact nothing is reading.

**Move the address-privacy requirement to `storefront/shop-identity` instead of dropping it with the rest of `contact/contact-message`.** The guarantee is about the shop's address, not about the form, and it still binds every page the storefront serves. Dropping it with its old neighbours would quietly delete a security property while removing a feature, which is exactly the kind of thing a spec exists to prevent.

**Remove `useCustomOrderStore` outright rather than leave it unused.** It exists only to carry a search term to the contact form. With no form, it is dead state that a later reader would mistake for a live path.

**Edit the assistant's system prompt to a negative instruction, not just a deletion.** Cutting the sentence that names the contact page leaves the model free to invent one, because "tell them to get in touch" is the obvious continuation of "we do not stock that". The prompt says explicitly that there is no request form to point at.

**Remove `contactSchema` and `sendContactEmail`, keep the escaping and shop-name helpers.** The first two have no caller left. The last two serve order, customer and welcome mail.

## Risks / Trade-offs

The demo storefront has no inbound channel at all once this lands, and the address-privacy requirement keeps the staff address off the page. → Accepted deliberately. This is a demo, and the proposal's non-goals record it.

The assistant may still invent a contact route from its general priors, despite the prompt. → The prompt carries an explicit prohibition and a scenario in the spec delta covers it. Prompt behaviour is not provable by a unit test, so the e2e assistant test asserts the reply names no contact page.

`fif` keeps the same spam exposure on its own branch. → Out of scope by the user's decision. Worth revisiting separately; this change does not touch it.

Removing the `contact:` rate-limit bucket touches a test that asserts every POST route declares one. → That test enumerates routes by filename, so it needs the entry dropped rather than the assertion weakened.

## Migration Plan

One commit on `main`. Nothing is stored by the contact path, so there is no data to migrate and no in-flight state to drain. Deploy is an ordinary push. Rollback is `git revert` of the single commit, which restores the route, the page and the spam exposure together.

No Supabase schema or RLS change, so no database step in either direction.
