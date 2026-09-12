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

interface Row {
  slug: string
  name: string
  description: string | null
}
interface CataloguePage {
  items: Row[]
  total: number
  page: number
  perPage: number
}

/** One catalogue page. `perPage` is raised past the catalogue's size wherever a
 *  test is about matching rather than paging, so the two concerns stay apart. */
const request = async (params: Record<string, string | number> = {}) => {
  const query = new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)])
  ).toString()
  const res = await fetch(`${BASE_URL}/api/products${query ? `?${query}` : ''}`)
  expect(res.status).toBe(200)
  return (await res.json()) as CataloguePage
}

const catalogue = async (q?: string) =>
  (await request(q === undefined ? { perPage: 48 } : { q, perPage: 48 })).items

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

describe('GET /api/products paging', () => {
  it('answers with one page and the total for the whole catalogue', async () => {
    const first = await request()
    expect(first.items.length).toBeLessThanOrEqual(first.perPage)
    expect(first.total).toBeGreaterThan(first.items.length)
    expect(first.page).toBe(1)
  })

  it('does not repeat an item across two pages', async () => {
    const [one, two] = [await request({ page: 1 }), await request({ page: 2 })]
    const slugs = new Set(one.items.map(i => i.slug))
    for (const item of two.items) expect(slugs.has(item.slug)).toBe(false)
    expect(two.total).toBe(one.total)
  })

  it('pages each kind on its own count', async () => {
    const physical = await request({ kind: 'physical' })
    const digital = await request({ kind: 'digital' })
    const all = await request()

    expect(physical.total + digital.total).toBe(all.total)
    expect(physical.items.every(i => !digital.items.some(d => d.slug === i.slug))).toBe(true)
  })

  it('answers a page past the end with an empty page and the true total', async () => {
    const end = await request({ page: 999 })
    expect(end.items).toEqual([])
    expect(end.total).toBe((await request()).total)
  })

  it('counts the matches for a search, not the rows on the page', async () => {
    const page = await request({ q: 'p', perPage: 1 })
    expect(page.items).toHaveLength(1)
    expect(page.total).toBeGreaterThan(1)
  })

  it('refuses a page size past the maximum rather than serving it', async () => {
    const res = await fetch(`${BASE_URL}/api/products?perPage=500`)
    expect(res.status).toBe(400)
  })
})
