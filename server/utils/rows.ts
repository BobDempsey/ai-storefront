import type { Database } from '~~/server/types/database'

/** A `products` row exactly as the database has it, from the generated types. */
export type ProductRow = Database['public']['Tables']['products']['Row']

/** The two kinds the shop sells. */
export type ProductKind = 'physical' | 'digital'

/** The columns whose nullability the database ties to `kind`. */
interface FileFacts {
  kind: string
  file_name: string | null
  file_format: string | null
  file_size_bytes: number | null
}

/**
 * `products.kind` is `text` with a check constraint, not a Postgres enum, so
 * `supabase gen types` can only say `string`. This restates the constraint at
 * the point a row leaves a query, by reading the value rather than casting it,
 * so a third kind added to the database without being added here lands as
 * 'physical' instead of breaking the page. Drop this when the column becomes a
 * real enum and the generated types carry the union themselves.
 */
export function productKind(kind: string): ProductKind {
  return kind === 'digital' ? 'digital' : 'physical'
}

/** The same narrowing, applied to a whole row. */
export function withProductKind<T extends { kind: string }>(row: T): Omit<T, 'kind'> & { kind: ProductKind } {
  return { ...row, kind: productKind(row.kind) }
}

/**
 * Splits a row into the two shapes `Product` is a union of. The database has a
 * second check constraint tying the three file columns to `kind`: a digital row
 * has all three, a physical row has none. The generated types say
 * `string | null` for both kinds, because a check constraint is invisible to
 * them, so the correlation is read here instead of assumed.
 *
 * A digital row missing its file facts cannot exist while that constraint
 * holds. If one ever does, it is described as physical rather than shipped as a
 * digital item with no file to send.
 */
export function withProductFiles<T extends FileFacts>(
  row: T
): (Omit<T, keyof FileFacts> & { kind: 'digital', file_name: string, file_format: string, file_size_bytes: number })
  | (Omit<T, keyof FileFacts> & { kind: 'physical', file_name: null, file_format: null, file_size_bytes: null }) {
  const { file_name, file_format, file_size_bytes } = row
  if (productKind(row.kind) === 'digital' && file_name !== null && file_format !== null && file_size_bytes !== null) {
    return { ...row, kind: 'digital', file_name, file_format, file_size_bytes }
  }
  return { ...row, kind: 'physical', file_name: null, file_format: null, file_size_bytes: null }
}
