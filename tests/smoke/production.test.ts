import { describe, expect, it } from 'vitest'

/**
 * Checks a deployed shop, not the working tree, and is opted into with
 * `npm run test:smoke`.
 *
 * It exists because of 2026-09-10: production served an error page for hours
 * because its environment variables were set to empty strings, which override
 * the runtimeConfig defaults rather than falling back to them. Nothing in the
 * repository was wrong, so nothing in the repository could have caught it.
 *
 * One build now serves two shops, so the check names the shop it is aimed at:
 *
 *   npm run test:smoke                  the demo, the documented default
 *   SMOKE_SHOP=fif npm run test:smoke   the real shop
 *
 * `SMOKE_BASE_URL` still points it at an address that is in no list, which is
 * how a third shop or someone else's fork gets checked before it has a name
 * here. Give `SMOKE_SHOP` as well and the expected store name comes with it.
 *
 * Every target is a custom domain, which is what a customer actually types.
 * Do not point it at a per-deployment URL: those sit behind Vercel's
 * deployment protection and answer a login page to anything that is not a
 * signed-in browser, so the test would assert on that login page and pass
 * while the store was down.
 */

interface Shop {
  /** What the run calls this shop in its own output. */
  label: string
  baseUrl: string
  /** What `NUXT_PUBLIC_STORE_NAME` is set to on that deployment. */
  storeName: string
}

const SHOPS: Record<string, Shop> = {
  demo: {
    label: 'the demo',
    baseUrl: 'https://ai-storefront.bobdempsey83.com',
    storeName: 'AI Storefront'
  },
  fif: {
    label: 'the Forged in Filament shop',
    baseUrl: 'https://fif.bobdempsey83.com',
    storeName: 'Forged in Filament'
  }
}

/** The placeholder a deployment reports when its store name is not configured. */
const PLACEHOLDER_NAME = 'Store'

const named = process.env.SMOKE_SHOP
if (named && !SHOPS[named]) {
  throw new Error(
    `SMOKE_SHOP=${named} names no shop. Known shops: ${Object.keys(SHOPS).join(', ')}. `
    + 'Use SMOKE_BASE_URL to check an address that is in no list.'
  )
}

const shop = SHOPS[named ?? 'demo']!
const BASE = process.env.SMOKE_BASE_URL ?? shop.baseUrl
// An overridden address is some other deployment, so the shop's expected name
// travels with SMOKE_SHOP rather than with the default.
const expectedName = process.env.SMOKE_BASE_URL && !named ? undefined : shop.storeName
const target = process.env.SMOKE_BASE_URL && !named ? BASE : `${shop.label} (${BASE})`

const get = (path: string) => fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } })

/** The rendered `og:site_name`, which is the store name as a customer sees it. */
const siteNameFrom = (html: string) =>
  html.match(/<meta[^>]+property="og:site_name"[^>]+content="([^"]*)"/)?.[1]
  ?? html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:site_name"/)?.[1]

describe(`the deployed store: ${target}`, () => {
  it('serves the catalogue', async () => {
    const response = await get('/api/products')
    expect(response.status).toBe(200)

    const page = (await response.json()) as {
      items: { id: string; price_cents: number }[]
      total: number
    }
    expect(Array.isArray(page.items)).toBe(true)
    expect(page.items.length).toBeGreaterThan(0)
    // A misconfigured server answers 500 before it gets here, but an empty
    // page would be a quieter version of the same outage.
    expect(page.items[0]!.price_cents).toBeGreaterThan(0)
    // The catalogue is longer than one page, which is why it pages at all.
    expect(page.total).toBeGreaterThanOrEqual(page.items.length)
  })

  it('serves the store settings', async () => {
    const response = await get('/api/store-settings')
    expect(response.status).toBe(200)
  })

  it('renders the storefront', async () => {
    const response = await fetch(BASE)
    expect(response.status).toBe(200)

    const html = await response.text()
    // The Vercel deployment-protection login page also answers 200, so the
    // status alone proves nothing; this asserts the store's own markup.
    expect(html).toContain('Add to cart')
  })

  it('reports its own name rather than the placeholder', async () => {
    // With two shops on one build, a deployment that never got
    // NUXT_PUBLIC_STORE_NAME serves "Store" in its tab title and in every link
    // preview. It sells and it looks fine, so only a check from outside
    // catches it.
    const html = await (await fetch(BASE)).text()
    const siteName = siteNameFrom(html)

    expect(siteName, 'no og:site_name in the markup').toBeTruthy()
    expect(siteName).not.toBe(PLACEHOLDER_NAME)
    if (expectedName) expect(siteName).toBe(expectedName)
  })

  it('carries no non-production marker', async () => {
    // The one failure this cannot be allowed to have: a deployment env named on
    // a live shop puts an amber bar in front of every customer. Unset and
    // "production" both render nothing, so this catches the value being typed
    // in by mistake, or copied across from Preview.
    const html = await (await fetch(BASE)).text()
    expect(html).not.toContain('deploy-env-banner')
    expect(html).not.toContain('This is not the live shop')
  })

  it('reports its own misconfiguration rather than passing quietly', async () => {
    // The failure mode this file was written for: the routes answer 500 with
    // this message when Supabase is not configured. If that ever comes back,
    // the catalogue test above fails, and this states what to look for.
    const response = await get('/api/products')
    const body = await response.text()
    expect(body).not.toContain('Supabase is not configured')
  })
})
