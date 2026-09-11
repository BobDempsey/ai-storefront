## Why

The local dev server, a Vercel preview and the live shop are indistinguishable on screen. They render the same header, the same catalogue and the same tab title, and all three talk to the same Supabase project until the two shops are split. An order placed while testing is a real row in the real `orders` table and a real email to staff, and the only signal that a page is not the live shop is the address bar.

This is not a hypothetical. On 2026-09-11 a delivery test placed a genuine order against production and it had to be deleted by hand afterwards.

## What Changes

- A deployment that is not the live shop SHALL say so, on the page and in the browser tab.
- The live shop SHALL show nothing new at all. A marker that appears in production is worse than no marker.
- The marker names which environment it is, because "not production" covers both a laptop and a preview URL and the remedy differs.
- A new public environment variable names the environment. Unset means the live shop, so an adopter who never sets it gets today's behaviour.

## Capabilities

### New Capabilities

- `storefront/deployment-banner`: how a storefront that is not the live shop tells the person looking at it, in the page and in the tab title.

### Modified Capabilities

None.

## Impact

- `nuxt.config.ts`: one public runtime config value.
- `app/layouts/default.vue`: the banner, and the tab title it prefixes.
- `.env`, `.env.example`, and the Vercel Preview environment.
- `README.md`: one line under going live, since an adopter inherits this.
- Unit tests over when the marker shows; an end-to-end test that it is absent when the variable is unset.
