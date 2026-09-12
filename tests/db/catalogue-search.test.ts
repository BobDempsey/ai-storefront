import { describe, expect, it } from 'vitest'
import { BASE_URL } from './client'

/**
 * The storefront's search and the assistant's `search_catalogue` are meant to
 * be one rule, shared through `server/utils/search.ts`. This checks that
 * against the live catalogue rather than against a fixture: the route filters
 * in SQL with `ilike`, the tool filters rows in JavaScript, and only a real
 * query proves those two agree about the same words.
 *
 * Needs `npm run dev` already running. It reads only, so it writes no rows and
 * has nothing to clean up.
 */

const catalogue = async (q?: string) => {
  const url = q === undefined ? '/api/products' : `/api/products?q=${encodeURIComponent(q)}`
  const res = await fetch(`${BASE_URL}${url}`)
  expect(res.status).toBe(200)
  return (await res.json()) as { slug: string; name: string; description: string | null }[]
}

/** The tool's rule, run here over the unfiltered catalogue. */
const matches = (
  rows: { name: string; description: string | null }[],
  term: string
) => rows.filter(r => `${r.name} ${r.description ?? ''}`.toLowerCase().includes(term.toLowerCase()))

describe('GET /api/products?q=', () => {
  it('returns the whole catalogue with no term', async () => {
    expect((await catalogue()).length).toBeGreaterThan(1)
  })

  it('treats an empty term as no search', async () => {
    expect(await catalogue('')).toEqual(await catalogue())
    expect(await catalogue('   ')).toEqual(await catalogue())
  })

  for (const term of ['dragon', 'DRAGON', 'planter', 'parametric', 'print']) {
    it(`agrees with the assistant's rule for "${term}"`, async () => {
      const all = await catalogue()
      const filtered = await catalogue(term)

      expect(filtered.map(p => p.slug).sort()).toEqual(matches(all, term).map(p => p.slug).sort())
    })
  }

  it('matches a word that appears only in a description', async () => {
    const all = await catalogue()

    // A plain alphabetic word from a description that the same item's name does
    // not carry, so a hit can only have come from the description.
    let row: (typeof all)[number] | undefined
    let word: string | undefined
    for (const candidate of all) {
      word = (candidate.description?.match(/\b[a-z]{7,}\b/gi) ?? []).find(
        w => !candidate.name.toLowerCase().includes(w.toLowerCase())
      )
      if (word) {
        row = candidate
        break
      }
    }
    expect(word, 'no description-only word to search for').toBeTruthy()

    const filtered = await catalogue(word!)
    expect(filtered.map(p => p.slug)).toContain(row!.slug)
  })

  it('returns nothing for a term the catalogue does not carry', async () => {
    expect(await catalogue('zzzznothinghere')).toEqual([])
  })

  it('treats a percent sign as a character, not a wildcard', async () => {
    // Left as a wildcard this would match the whole catalogue.
    const filtered = await catalogue('%')
    const all = await catalogue()
    expect(filtered.length).toBeLessThan(all.length)
  })

  it('prices a filtered row exactly as the unfiltered catalogue does', async () => {
    const all = await catalogue()
    for (const row of await catalogue('dragon')) {
      expect(row).toEqual(all.find(p => p.slug === row.slug))
    }
  })

  it('rejects an over-long term rather than running it', async () => {
    const res = await fetch(`${BASE_URL}/api/products?q=${'x'.repeat(201)}`)
    expect(res.status).toBe(400)
  })
})
