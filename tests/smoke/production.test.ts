import { describe, expect, it } from 'vitest'

/**
 * Checks the deployed site, not the working tree, and is opted into with
 * `npm run test:smoke`.
 *
 * It exists because of 2026-09-10: production served an error page for hours
 * because its environment variables were set to empty strings, which override
 * the runtimeConfig defaults rather than falling back to them. Nothing in the
 * repository was wrong, so nothing in the repository could have caught it.
 *
 * The target is the custom domain, which is what a customer actually types.
 * Do not point it at a per-deployment URL: those sit behind Vercel's
 * deployment protection and answer a login page to anything that is not a
 * signed-in browser, so the test would assert on that login page and pass
 * while the store was down. `SMOKE_BASE_URL` overrides it, which is how the
 * second shop gets checked by the same suite.
 */

const BASE = process.env.SMOKE_BASE_URL ?? 'https://ai-storefront.bobdempsey83.com'

const get = (path: string) => fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } })

describe(`the deployed store at ${BASE}`, () => {
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
    expect(page.items[0].price_cents).toBeGreaterThan(0)
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

  it('carries no non-production marker', async () => {
    // The one failure this cannot be allowed to have: a deployment env named on
    // the live shop puts an amber bar in front of every customer. Unset and
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
