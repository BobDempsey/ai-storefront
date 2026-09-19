// Copies Forged in Filament's rows out of Supabase and into its own Neon
// project. One-off: it belongs to this change and is archived with it rather
// than living in scripts/, which is the template's.
//
// Reads go through supabase-js with the service key, because nobody has the
// Supabase database password and the service key is already configured. That
// means PostgREST, which caps a read at 1000 rows, so every table is read in
// explicit ranges rather than in one request.
//
// Writes go through @neondatabase/serverless, one transaction per table, with
// every column named and ids and timestamps written as they were read. An
// order id printed on a staff email has to still find its order afterwards.
//
// schema.sql inserts the store_settings singleton and the WELCOME25 promo code
// when it is applied, so those two tables already hold a row on a fresh Neon
// project. Every target table is emptied before it is filled, in reverse
// foreign-key order, so the copy is the whole story rather than a merge.
//
// Usage: node openspec/changes/move-fif-database-to-neon/migrate-rows.mjs [--dry-run]
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { neon } from '@neondatabase/serverless'

const DRY_RUN = process.argv.includes('--dry-run')

/** @type {Record<string, string>} */
const env = {}
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m) env[String(m[1])] = String(m[2]).replace(/^"|"$/g, '')
}

for (const name of ['FIF_SUPABASE_URL', 'FIF_SUPABASE_SERVICE_KEY', 'FIF_NEON_DATABASE_URL']) {
  if (!env[name]) throw new Error(`.env is missing ${name}`)
}

// Parents before children. The copy walks this order; the emptying walks it
// backwards, so nothing is deleted while a row still references it.
const TABLES = [
  'products',
  'promo_codes',
  'store_settings',
  'orders',
  'order_items',
  'promo_redemptions',
  'email_subscribers'
]

const PAGE = 1000

const supabase = createClient(env.FIF_SUPABASE_URL, env.FIF_SUPABASE_SERVICE_KEY)
const sql = neon(env.FIF_NEON_DATABASE_URL)

/**
 * Reads a whole table through PostgREST, a page at a time.
 * @param {string} table
 * @returns {Promise<Record<string, unknown>[]>}
 */
async function readAll(table) {
  /** @type {Record<string, unknown>[]} */
  const rows = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + PAGE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

/**
 * The column names Neon holds for a table, so a column that exists on only one
 * side is reported rather than silently dropped into an insert that fails.
 * @param {string} table
 * @returns {Promise<string[]>}
 */
async function neonColumns(table) {
  const rows = await sql.query(
    `select column_name from information_schema.columns
      where table_schema = 'public' and table_name = $1
      order by ordinal_position`,
    [table]
  )
  return rows.map(r => String(r.column_name))
}

/** @param {Record<string, unknown>[]} rows @returns {string} */
function digest(rows) {
  const canon = rows
    .map(r => JSON.stringify(Object.fromEntries(Object.entries(r).sort(([a], [b]) => a.localeCompare(b)))))
    .sort()
    .join('\n')
  return createHash('md5').update(canon).digest('hex')
}

/** @param {unknown} value */
const bind = value => (value !== null && typeof value === 'object' ? JSON.stringify(value) : value)

const summary = []

for (const table of [...TABLES].reverse()) {
  if (DRY_RUN) break
  await sql.query(`delete from public.${table}`)
}

for (const table of TABLES) {
  const rows = await readAll(table)
  const columns = await neonColumns(table)

  const seen = new Set(rows.flatMap(r => Object.keys(r)))
  const onlySupabase = [...seen].filter(c => !columns.includes(c))
  const onlyNeon = columns.filter(c => !seen.has(c) && rows.length > 0)
  if (onlySupabase.length) throw new Error(`${table}: columns on Supabase only: ${onlySupabase.join(', ')}`)
  if (onlyNeon.length) console.log(`  note: ${table} has columns Supabase did not return: ${onlyNeon.join(', ')}`)

  if (rows.length && !DRY_RUN) {
    const used = columns.filter(c => seen.has(c))
    const list = used.map(c => `"${c}"`).join(', ')
    const statements = rows.map(row => {
      const placeholders = used.map((_, i) => `$${i + 1}`).join(', ')
      return sql.query(
        `insert into public.${table} (${list}) values (${placeholders})`,
        used.map(c => bind(row[c]))
      )
    })
    await sql.transaction(statements)
  }

  const after = DRY_RUN ? [] : await sql.query(`select count(*)::int as n from public.${table}`)
  const written = DRY_RUN ? 0 : Number(after[0].n)
  summary.push({ table, read: rows.length, written })
  console.log(`${table.padEnd(20)} read ${String(rows.length).padStart(5)}  wrote ${String(written).padStart(5)}`)
}

console.log('')
let failed = false
for (const { table, read, written } of summary) {
  if (DRY_RUN) continue
  if (read !== written) {
    console.log(`MISMATCH ${table}: read ${read}, wrote ${written}`)
    failed = true
  }
  if (read === PAGE) {
    console.log(`SUSPECT ${table}: read exactly ${PAGE} rows, which is the page size`)
    failed = true
  }
}

if (!DRY_RUN) {
  for (const { table } of summary) {
    const source = await readAll(table)
    // to_jsonb rather than a plain select: the driver hands back a JS Date for
    // a timestamptz, which has milliseconds and drops the microseconds the
    // column actually holds, so two identical rows would digest differently.
    // Postgres renders the same ISO string PostgREST does.
    const target = await sql.query(`select to_jsonb(t) as row from public.${table} t`)
    const a = digest(source)
    const b = digest(target.map(r => /** @type {Record<string, unknown>} */ (r.row)))
    console.log(`${table.padEnd(20)} supabase ${a}  neon ${b}  ${a === b ? 'MATCH' : 'DIFFERS'}`)
    if (a !== b) failed = true
  }
}

process.exitCode = failed ? 1 : 0
console.log(failed ? '\nFAILED' : '\nOK')
