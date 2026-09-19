// Task 4.2: compare the Neon and Supabase schemas by md5 over every column's
// name, type and nullability.
//
// Supabase's side comes from PostgREST's own OpenAPI document, which names
// every column, its Postgres type as `format`, and lists the NOT NULL ones in
// `required`. Neon's comes from information_schema, mapped into the same
// vocabulary: PostgREST writes an enum as `public.<type>` where
// information_schema says USER-DEFINED.
//
// The read-only Supabase token cannot run SQL through the Management API, so
// this is the metadata source available rather than the preferred one.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { neon } from '@neondatabase/serverless'

/** @type {Record<string, string>} */
const env = {}
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
  if (m) env[String(m[1])] = String(m[2]).replace(/^"|"$/g, '')
}

const TABLES = [
  'email_subscribers', 'order_items', 'orders', 'products',
  'promo_codes', 'promo_redemptions', 'store_settings'
]

/** @returns {Promise<string[]>} */
async function supabaseColumns() {
  const key = env.NUXT_SUPABASE_SERVICE_KEY
  const res = await fetch(`${env.NUXT_SUPABASE_URL}/rest/v1/`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/openapi+json' }
  })
  /** @type {unknown} */
  const body = await res.json()
  const doc = /** @type {{ definitions: Record<string, { required?: string[], properties: Record<string, { format: string }> }> }} */ (body)
  /** @type {string[]} */
  const out = []
  for (const table of TABLES) {
    const def = doc.definitions[table]
    const required = new Set(def.required ?? [])
    for (const [column, spec] of Object.entries(def.properties)) {
      out.push(`${table}.${column}:${spec.format}:${required.has(column) ? 'NOT NULL' : 'NULL'}`)
    }
  }
  return out
}

/** @returns {Promise<string[]>} */
async function neonColumns() {
  const sql = neon(env.NUXT_NEON_DATABASE_URL)
  const rows = await sql.query(
    `select table_name, column_name, data_type, udt_name, is_nullable
       from information_schema.columns
      where table_schema = 'public' and table_name = any($1)
      order by table_name, ordinal_position`,
    [TABLES]
  )
  return rows.map(/** @param {Record<string, string>} r */ r => {
    const type = r.data_type === 'USER-DEFINED' ? `public.${r.udt_name}` : r.data_type
    return `${r.table_name}.${r.column_name}:${type}:${r.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`
  })
}

const [supabase, neonSide] = await Promise.all([supabaseColumns(), neonColumns()])
/** @param {string[]} list */
const canon = list => [...list].sort().join('\n')
/** @param {string[]} list */
const digest = list => createHash('md5').update(canon(list)).digest('hex')

console.log(`supabase  ${supabase.length} columns  md5 ${digest(supabase)}`)
console.log(`neon      ${neonSide.length} columns  md5 ${digest(neonSide)}`)

if (digest(supabase) === digest(neonSide)) {
  console.log('\nMATCH')
} else {
  const a = new Set(canon(supabase).split('\n'))
  const b = new Set(canon(neonSide).split('\n'))
  console.log('\nDIFFERS')
  for (const line of a) if (!b.has(line)) console.log(`  supabase only: ${line}`)
  for (const line of b) if (!a.has(line)) console.log(`  neon only:     ${line}`)
  process.exitCode = 1
}
