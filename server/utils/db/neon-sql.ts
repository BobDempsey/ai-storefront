/**
 * The Neon backend's query builder: enough of `supabase-js`'s surface to serve
 * this storefront, and a loud failure for everything else.
 *
 * Why a builder at all rather than SQL at each call site is in design.md under
 * "Keep the `supabase-js` surface rather than rewrite the call sites". The
 * short version: a rewrite of fifteen call sites in the same change that moves
 * the data is two variables and one failure to explain.
 *
 * The rule this file follows everywhere: a form it does not understand throws.
 * A query that quietly matches nothing looks exactly like an empty catalogue,
 * and nobody reports an empty catalogue as a bug.
 */

/** Runs one statement. Injected so the builder can be tested without a database. */
export type SqlRunner = (text: string, params: unknown[]) => Promise<Record<string, unknown>[]>

/** The error shape every call site already unwraps, and the fields they read. */
export interface QueryError {
  message: string
  code: string
  details: string
  hint: string
}

export interface QueryResult<T> {
  data: T
  error: QueryError | null
  count: number | null
  status: number
  statusText: string
}

/** Thrown for a method or filter form this shim does not implement. */
export class UnsupportedQueryError extends Error {
  constructor(what: string) {
    super(
      `The neon backend does not implement ${what}. ` +
        'Add it to server/utils/db/neon-sql.ts rather than working around it at the call site.'
    )
    this.name = 'UnsupportedQueryError'
  }
}

/** Postgres identifiers this repo actually uses: lower snake case, nothing else. */
const IDENTIFIER = /^[a-z_][a-z0-9_]*$/

function quoteIdentifier(name: string): string {
  const trimmed = name.trim()
  if (!IDENTIFIER.test(trimmed)) throw new UnsupportedQueryError(`the identifier ${JSON.stringify(name)}`)
  return `"${trimmed}"`
}

/** `'id, slug, name'` as supabase-js takes it, into a quoted column list. */
function columnList(columns: string): string {
  const names = columns.split(',').map(c => c.trim()).filter(Boolean)
  if (!names.length) throw new UnsupportedQueryError('an empty column list')
  if (names.includes('*')) return '*'
  return names.map(quoteIdentifier).join(', ')
}

interface Condition {
  sql: string
  params: unknown[]
}

type Operation =
  | { kind: 'select', columns: string }
  | { kind: 'insert', rows: Record<string, unknown>[] }
  | { kind: 'upsert', rows: Record<string, unknown>[], onConflict: string, ignoreDuplicates: boolean }
  | { kind: 'update', values: Record<string, unknown> }
  | { kind: 'delete' }

/**
 * Turns the PostgREST `or` filter string `searchFilter()` produces into ILIKE
 * predicates. Only the `col.ilike.*pattern*` form is accepted, and only joined
 * by commas, because that is the only form this repo builds.
 *
 * `escapeLikePattern` already escapes `%` and `_` and strips commas and
 * parentheses from the visitor's term, so splitting on a comma cannot cut a
 * pattern in half. Postgres treats a backslash as ILIKE's escape character by
 * default, which is what makes the escaping PostgREST expects work here too.
 */
export function parseOrFilter(filter: string, nextParam: () => number): Condition {
  const parts = filter.split(',').map(part => part.trim()).filter(Boolean)
  if (!parts.length) throw new UnsupportedQueryError(`the or() filter ${JSON.stringify(filter)}`)

  const params: unknown[] = []
  const predicates = parts.map(part => {
    const match = /^([a-z_][a-z0-9_]*)\.ilike\.(.*)$/.exec(part)
    if (!match) throw new UnsupportedQueryError(`the or() filter term ${JSON.stringify(part)}`)
    const column = quoteIdentifier(match[1]!)
    // PostgREST spells its wildcard `*`; Postgres spells it `%`.
    params.push(match[2]!.replace(/\*/g, '%'))
    return `${column} ILIKE $${nextParam()}`
  })

  return { sql: `(${predicates.join(' OR ')})`, params }
}

function asQueryError(cause: unknown): QueryError {
  const error = cause as { message?: unknown, code?: unknown, detail?: unknown, hint?: unknown }
  return {
    // The raised message reaches the caller intact: orders.post.ts matches
    // substrings of what create_order raises to tell a sold-out item from an
    // empty cart, and a wrapped message would make every one of them a 502.
    message: typeof error?.message === 'string' ? error.message : String(cause),
    code: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
    details: typeof error?.detail === 'string' ? error.detail : '',
    hint: typeof error?.hint === 'string' ? error.hint : ''
  }
}

function ok<T>(data: T, count: number | null): QueryResult<T> {
  return { data, error: null, count, status: 200, statusText: 'OK' }
}

function failed(error: QueryError): QueryResult<never> {
  return { data: null as never, error, count: null, status: 500, statusText: 'Internal Server Error' }
}

/**
 * One query, built up by the same chain the call sites already write and run
 * when it is awaited.
 *
 * Methods mutate and return `this`, which is what `supabase-js` does and what
 * `catalogue = catalogue.eq(...)` in products.get.ts relies on.
 */
export class NeonQuery<Row = Record<string, unknown>> implements PromiseLike<QueryResult<Row[]>> {
  private operation: Operation = { kind: 'select', columns: '*' }
  private readonly conditions: Condition[] = []
  private orderings: string[] = []
  private limitRows: number | null = null
  private offsetRows = 0
  private rangeStart: number | null = null
  private wantsCount = false
  private headOnly = false
  private returning: string | null = null
  private rowMode: 'many' | 'single' | 'maybeSingle' = 'many'

  constructor(private readonly run: SqlRunner, private readonly table: string) {}

  private nextParam = () => this.paramCount() + 1

  private paramCount(): number {
    return this.conditions.reduce((total, condition) => total + condition.params.length, 0)
  }

  select(columns = '*', options?: { count?: 'exact' | 'planned' | 'estimated', head?: boolean }): this {
    if (options?.count && options.count !== 'exact') {
      throw new UnsupportedQueryError(`the ${options.count} count mode`)
    }
    if (this.operation.kind === 'select') {
      this.operation = { kind: 'select', columns }
    } else {
      // `.delete().select('id')` and `.upsert(...).select('id')`: the columns
      // are what comes back, not what is read.
      this.returning = columns
    }
    this.wantsCount = options?.count === 'exact'
    this.headOnly = options?.head === true
    return this
  }

  eq(column: string, value: unknown): this {
    this.conditions.push({ sql: `${quoteIdentifier(column)} = $${this.nextParam()}`, params: [value] })
    return this
  }

  neq(column: string, value: unknown): this {
    this.conditions.push({ sql: `${quoteIdentifier(column)} <> $${this.nextParam()}`, params: [value] })
    return this
  }

  lt(column: string, value: unknown): this {
    this.conditions.push({ sql: `${quoteIdentifier(column)} < $${this.nextParam()}`, params: [value] })
    return this
  }

  gt(column: string, value: unknown): this {
    this.conditions.push({ sql: `${quoteIdentifier(column)} > $${this.nextParam()}`, params: [value] })
    return this
  }

  in(column: string, values: readonly unknown[]): this {
    // An expanded IN list rather than `= ANY($n)` with an array parameter:
    // Postgres infers each placeholder's type from the column it is compared
    // to, and an array parameter against a uuid column has nothing to infer
    // from and fails with "could not determine data type".
    if (!values.length) {
      // `IN ()` is a syntax error, and an empty list matches nothing.
      this.conditions.push({ sql: 'false', params: [] })
      return this
    }
    const start = this.paramCount()
    const placeholders = values.map((_, index) => `$${start + index + 1}`)
    this.conditions.push({
      sql: `${quoteIdentifier(column)} IN (${placeholders.join(', ')})`,
      params: [...values]
    })
    return this
  }

  or(filter: string): this {
    const start = this.paramCount()
    let seen = 0
    const condition = parseOrFilter(filter, () => start + ++seen)
    this.conditions.push(condition)
    return this
  }

  order(column: string, options?: { ascending?: boolean }): this {
    const direction = options?.ascending === false ? 'DESC' : 'ASC'
    this.orderings.push(`${quoteIdentifier(column)} ${direction}`)
    return this
  }

  limit(count: number): this {
    this.limitRows = count
    return this
  }

  range(from: number, to: number): this {
    this.rangeStart = from
    this.offsetRows = from
    this.limitRows = to - from + 1
    return this
  }

  insert(values: Record<string, unknown> | Record<string, unknown>[]): this {
    this.operation = { kind: 'insert', rows: Array.isArray(values) ? values : [values] }
    return this
  }

  upsert(
    values: Record<string, unknown> | Record<string, unknown>[],
    options?: { onConflict?: string, ignoreDuplicates?: boolean }
  ): this {
    if (!options?.onConflict) throw new UnsupportedQueryError('upsert() without onConflict')
    if (options.ignoreDuplicates !== true) {
      // The one caller, subscribe.ts, wants DO NOTHING. A real DO UPDATE would
      // need the merge rules written down, and guessing them is how a repeat
      // sign-up silently overwrites a row.
      throw new UnsupportedQueryError('upsert() with ignoreDuplicates false')
    }
    this.operation = {
      kind: 'upsert',
      rows: Array.isArray(values) ? values : [values],
      onConflict: options.onConflict,
      ignoreDuplicates: true
    }
    return this
  }

  update(values: Record<string, unknown>): this {
    this.operation = { kind: 'update', values }
    return this
  }

  delete(): this {
    this.operation = { kind: 'delete' }
    return this
  }

  single(): PromiseLike<QueryResult<Row>> {
    this.rowMode = 'single'
    return this as unknown as PromiseLike<QueryResult<Row>>
  }

  maybeSingle(): PromiseLike<QueryResult<Row | null>> {
    this.rowMode = 'maybeSingle'
    return this as unknown as PromiseLike<QueryResult<Row | null>>
  }

  private whereClause(): { sql: string, params: unknown[] } {
    if (!this.conditions.length) return { sql: '', params: [] }
    return {
      sql: ` WHERE ${this.conditions.map(c => c.sql).join(' AND ')}`,
      params: this.conditions.flatMap(c => c.params)
    }
  }

  /** The statement and parameters this chain would run. Exposed for the tests. */
  build(): { text: string, params: unknown[] } {
    const table = `public.${quoteIdentifier(this.table)}`
    const where = this.whereClause()

    if (this.operation.kind === 'delete') {
      const returning = this.returning ? ` RETURNING ${columnList(this.returning)}` : ''
      return { text: `DELETE FROM ${table}${where.sql}${returning}`, params: where.params }
    }

    if (this.operation.kind === 'update') {
      // The WHERE placeholders were numbered as the filters were added, so the
      // SET values take the numbers after them. Postgres reads placeholders by
      // number, not by where they appear, so $3 sitting before $1 is fine.
      const params = [...where.params]
      const assignments = Object.entries(this.operation.values).map(([column, value]) => {
        params.push(value)
        return `${quoteIdentifier(column)} = $${params.length}`
      })
      if (!assignments.length) throw new UnsupportedQueryError('an update with no columns')
      const returning = this.returning ? ` RETURNING ${columnList(this.returning)}` : ''
      return { text: `UPDATE ${table} SET ${assignments.join(', ')}${where.sql}${returning}`, params }
    }

    if (this.operation.kind === 'insert' || this.operation.kind === 'upsert') {
      const rows = this.operation.rows
      const columns = Object.keys(rows[0] ?? {})
      if (!columns.length) throw new UnsupportedQueryError('an insert with no columns')

      const params: unknown[] = []
      const tuples = rows.map(row => {
        const placeholders = columns.map(column => {
          params.push(row[column])
          return `$${params.length}`
        })
        return `(${placeholders.join(', ')})`
      })

      const conflict =
        this.operation.kind === 'upsert'
          ? ` ON CONFLICT (${columnList(this.operation.onConflict)}) DO NOTHING`
          : ''
      const returning = this.returning ? ` RETURNING ${columnList(this.returning)}` : ''

      return {
        text:
          `INSERT INTO ${table} (${columns.map(quoteIdentifier).join(', ')}) ` +
          `VALUES ${tuples.join(', ')}${conflict}${returning}`,
        params
      }
    }

    const order = this.orderings.length ? ` ORDER BY ${this.orderings.join(', ')}` : ''
    const limit = this.limitRows === null ? '' : ` LIMIT ${this.limitRows}`
    const offset = this.offsetRows ? ` OFFSET ${this.offsetRows}` : ''

    return {
      text: `SELECT ${columnList(this.operation.columns)} FROM ${table}${where.sql}${order}${limit}${offset}`,
      params: where.params
    }
  }

  /** The COUNT(*) this chain's filters describe, without its ordering or page. */
  buildCount(): { text: string, params: unknown[] } {
    const where = this.whereClause()
    return {
      text: `SELECT count(*)::int AS count FROM public.${quoteIdentifier(this.table)}${where.sql}`,
      params: where.params
    }
  }

  private async execute(): Promise<QueryResult<unknown>> {
    try {
      // A count and a page are two statements rather than one windowed query.
      // The HTTP driver sends single statements anyway, and the count has to be
      // known before the page to decide the past-the-end case below.
      let count: number | null = null
      if (this.wantsCount) {
        const built = this.buildCount()
        const rows = await this.run(built.text, built.params)
        count = Number(rows[0]?.count ?? 0)
      }

      if (this.headOnly) return ok([], count)

      // PostgREST answers a range starting past the end with 416 and the code
      // below rather than an empty page, and products.get.ts turns that into an
      // empty catalogue showing the true total. Emulated rather than fixed at
      // the call site so the cutover changes no route; see design.md.
      if (this.rangeStart !== null && count !== null && this.rangeStart >= count) {
        return {
          data: null as never,
          error: {
            message: `Requested range not satisfiable`,
            code: 'PGRST103',
            details: `An offset of ${this.rangeStart} was requested, but there are only ${count} rows.`,
            hint: ''
          },
          count,
          status: 416,
          statusText: 'Requested Range Not Satisfiable'
        }
      }

      const built = this.build()
      const rows = await this.run(built.text, built.params)

      if (this.rowMode === 'single') {
        if (rows.length !== 1) {
          return failed({
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
            details: `Results contain ${rows.length} rows`,
            hint: ''
          })
        }
        return ok(rows[0]!, count)
      }

      if (this.rowMode === 'maybeSingle') {
        if (rows.length > 1) {
          return failed({
            message: 'JSON object requested, multiple (or no) rows returned',
            code: 'PGRST116',
            details: `Results contain ${rows.length} rows`,
            hint: ''
          })
        }
        return ok(rows[0] ?? null, count)
      }

      return ok(rows, count)
    } catch (cause) {
      // An unsupported form is a programming error, not a database error: it
      // must reach the developer as a throw rather than become a logged 502
      // that looks like the database is down.
      if (cause instanceof UnsupportedQueryError) throw cause
      return failed(asQueryError(cause))
    }
  }

  then<TResult1 = QueryResult<Row[]>, TResult2 = never>(
    onfulfilled?: ((value: QueryResult<Row[]>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): PromiseLike<TResult1 | TResult2> {
    return this.execute().then(onfulfilled as never, onrejected)
  }
}
