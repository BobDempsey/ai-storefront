import type { Database } from '~~/server/types/database'

/** A `products` row exactly as the database has it, from the generated types. */
export type ProductRow = Database['public']['Tables']['products']['Row']

/**
 * The two kinds the shop sells, read off the generated row. `products.kind` is
 * a Postgres enum, so the generator carries the union itself and nothing here
 * has to restate it.
 */
export type ProductKind = ProductRow['kind']

/** The columns whose nullability the database ties to `kind`. */
interface FileFacts {
  kind: ProductKind
  file_name: string | null
  file_format: string | null
  file_size_bytes: number | null
}

/**
 * Splits a row into the two shapes `Product` is a union of. The database has a
 * check constraint tying the three file columns to `kind`: a digital row has
 * all three, a physical row has none. No Postgres type expresses a conditional
 * nullability across columns, so the generated types say `string | null` for
 * both kinds however `kind` itself is typed, and the correlation is read here
 * instead of assumed.
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
  if (row.kind === 'digital' && file_name !== null && file_format !== null && file_size_bytes !== null) {
    return { ...row, kind: 'digital', file_name, file_format, file_size_bytes }
  }
  return { ...row, kind: 'physical', file_name: null, file_format: null, file_size_bytes: null }
}
