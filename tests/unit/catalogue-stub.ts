import { vi } from 'vitest'
import { salePriceCents, type SaleState } from '~~/server/utils/pricing'
import { mergeItems } from '~~/server/utils/schemas'

/**
 * A Supabase stub for the assistant's tools.
 *
 * `promo.ts` only ever ends a chain with `maybeSingle()`, which is all
 * `useSupabaseReturning` in setup.ts handles. The assistant's tools also await
 * the builder directly for a list (`search_catalogue`, `priceCart`), so this
 * one resolves both ways: `maybeSingle()` yields a single row, and awaiting
 * the builder yields the filtered array.
 *
 * The filtering is done here rather than canned per test, so a test that
 * expects `.eq('slug', ...)` to find nothing is exercising the same code path
 * as one that expects it to find something.
 */

export interface StubProduct {
  id: string
  slug: string
  name: string
  description: string | null
  price_cents: number
  in_stock: boolean
  kind: 'physical' | 'digital'
  file_name?: string | null
  file_format?: string | null
  file_size_bytes?: number | null
}

/** Two physical products and one file, shaped like real `products` rows. */
export const CATALOGUE: StubProduct[] = [
  {
    id: 'aaaaaaaa-1111-4aaa-8aaa-aaaaaaaaaaaa',
    slug: 'articulated-dragon',
    name: 'Articulated Dragon',
    description: 'Print-in-place PLA, 92 links.',
    price_cents: 1920,
    in_stock: true,
    kind: 'physical',
    file_name: null,
    file_format: null,
    file_size_bytes: null
  },
  {
    id: 'bbbbbbbb-2222-4bbb-8bbb-bbbbbbbbbbbb',
    slug: 'desk-tidy',
    name: 'Desk Tidy',
    description: 'Sold out at the moment.',
    price_cents: 1200,
    in_stock: false,
    kind: 'physical',
    file_name: null,
    file_format: null,
    file_size_bytes: null
  },
  {
    id: 'cccccccc-3333-4ccc-8ccc-cccccccccccc',
    slug: 'dragon-stl',
    name: 'Dragon STL',
    description: 'The model file.',
    price_cents: 800,
    in_stock: true,
    kind: 'digital',
    file_name: 'dragon.stl',
    file_format: 'STL',
    file_size_bytes: 4_200_000
  }
]

/*
 * Indexed once, here, with the assertion that the row is there. Every test file
 * reads these, and an index into an array is optional to TypeScript, so without
 * this each of the thirty-odd uses would carry its own `!`.
 */
export const dragon = CATALOGUE[0]!
export const outOfStock = CATALOGUE[1]!
export const file = CATALOGUE[2]!

type Filter = { column: string; value: unknown; kind: 'eq' | 'in' }

/**
 * Installs the globals the assistant's module expects. Nuxt auto-imports all
 * of these into server code, so Vitest, which runs the file directly, has to
 * supply them.
 *
 * `salePriceCents` and `mergeItems` are the real implementations, not
 * stand-ins: a test asserting on a displayed price should be asserting on the
 * arithmetic the shop actually performs.
 */
export function stubCatalogue(
  options: { products?: StubProduct[]; sale?: SaleState; error?: { message: string } } = {}
) {
  const products = options.products ?? CATALOGUE
  const sale = options.sale ?? { saleActive: false, salePercent: 0 }

  vi.stubGlobal('salePriceCents', salePriceCents)
  vi.stubGlobal('mergeItems', mergeItems)
  vi.stubGlobal('getSaleState', async () => sale)

  vi.stubGlobal('useSupabase', () => ({
    from(table: string) {
      const filters: Filter[] = []

      const matching = () =>
        products.filter(product =>
          filters.every(f =>
            f.kind === 'in'
              ? (f.value as unknown[]).includes((product as never)[f.column])
              : (product as never)[f.column] === f.value
          )
        )

      const result = () =>
        options.error ? { data: null, error: options.error } : { data: matching(), error: null }

      const builder: Record<string, unknown> = {
        select: () => builder,
        order: () => builder,
        limit: () => builder,
        eq(column: string, value: unknown) {
          filters.push({ column, value, kind: 'eq' })
          return builder
        },
        in(column: string, value: unknown[]) {
          filters.push({ column, value, kind: 'in' })
          return builder
        },
        maybeSingle: async () =>
          options.error
            ? { data: null, error: options.error }
            : { data: matching()[0] ?? null, error: null },
        // Awaiting the builder resolves it, which is how search_catalogue and
        // priceCart read a list.
        then: (resolve: (value: unknown) => unknown) => Promise.resolve(result()).then(resolve)
      }

      if (table !== 'products') {
        throw new Error(`catalogue stub asked for an unexpected table: ${table}`)
      }
      return builder
    }
  }))

  return { products, sale }
}
