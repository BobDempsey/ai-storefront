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
 * The target is the production alias. The per-deployment URLs sit behind
 * Vercel's deployment protection and answer a login page to anything that is
 * not a signed-in browser, so pointing this at one would assert on that login
 * page and pass while the store was down.
 */

const BASE = process.env.SMOKE_BASE_URL ?? 'https://ecommerce-store-theta-sable.vercel.app'

const get = (path: string) => fetch(`${BASE}${path}`, { headers: { accept: 'application/json' } })

describe(`the deployed store at ${BASE}`, () => {
  it('serves the catalogue', async () => {
    const response = await get('/api/products')
    expect(response.status).toBe(200)

    const products = (await response.json()) as { id: string; price_cents: number }[]
    expect(Array.isArray(products)).toBe(true)
    expect(products.length).toBeGreaterThan(0)
    // A misconfigured server answers 500 before it gets here, but an empty
    // array would be a quieter version of the same outage.
    expect(products[0].price_cents).toBeGreaterThan(0)
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

  it('reports its own misconfiguration rather than passing quietly', async () => {
    // The failure mode this file was written for: the routes answer 500 with
    // this message when Supabase is not configured. If that ever comes back,
    // the catalogue test above fails, and this states what to look for.
    const response = await get('/api/products')
    const body = await response.text()
    expect(body).not.toContain('Supabase is not configured')
  })
})
