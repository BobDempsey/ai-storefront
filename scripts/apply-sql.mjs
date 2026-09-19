/**
 * Applies a .sql file to a Postgres database, one statement at a time.
 *
 * The Supabase path for these files is the dashboard's SQL editor, which takes
 * a whole file. Neon's HTTP driver takes a single statement per request, so the
 * file has to be split, and splitting SQL on semicolons is only safe if the
 * splitter knows about the things a semicolon can sit inside. `create_order` is
 * a dollar-quoted function body full of them.
 *
 * Usage:
 *   node scripts/apply-sql.mjs supabase/schema.sql
 *   node scripts/apply-sql.mjs supabase/seed.sql --url "postgresql://..."
 *
 * With no --url it reads NUXT_NEON_DATABASE_URL, then DATABASE_URL, from .env.
 * npm does not load .env, which is why this reads it rather than trusting the
 * environment; scripts/db-types.mjs does the same and for the same reason.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { neon } from '@neondatabase/serverless'

/** @returns {Record<string, string>} */
function envFile() {
  /** @type {Record<string, string>} */
  const values = {}
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split(/\r?\n/)) {
      const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (match) values[String(match[1])] = String(match[2]).replace(/^"|"$/g, '')
    }
  } catch {
    // No .env is fine when --url was passed.
  }
  return values
}

/**
 * Splits a script into statements, ignoring semicolons inside single-quoted
 * strings, dollar-quoted bodies and `--` comments.
 *
 * @param {string} sql
 * @returns {string[]}
 */
export function splitStatements(sql) {
  /** @type {string[]} */
  const statements = []
  let current = ''
  let index = 0

  while (index < sql.length) {
    const rest = sql.slice(index)

    if (rest.startsWith('--')) {
      const end = sql.indexOf('\n', index)
      const stop = end === -1 ? sql.length : end
      current += sql.slice(index, stop)
      index = stop
      continue
    }

    if (sql[index] === "'") {
      const end = sql.indexOf("'", index + 1)
      const stop = end === -1 ? sql.length : end + 1
      current += sql.slice(index, stop)
      index = stop
      continue
    }

    const dollar = /^\$[a-zA-Z_]*\$/.exec(rest)
    if (dollar) {
      const tag = dollar[0]
      const end = sql.indexOf(tag, index + tag.length)
      const stop = end === -1 ? sql.length : end + tag.length
      current += sql.slice(index, stop)
      index = stop
      continue
    }

    if (sql[index] === ';') {
      if (current.trim()) statements.push(current.trim())
      current = ''
      index += 1
      continue
    }

    current += sql[index]
    index += 1
  }

  if (current.trim()) statements.push(current.trim())
  return statements
}

async function main() {
  const args = process.argv.slice(2)
  const file = args.find(arg => !arg.startsWith('--'))
  if (!file) {
    console.error('Usage: node scripts/apply-sql.mjs <file.sql> [--url <connection string>]')
    process.exit(1)
  }

  const urlFlag = args.indexOf('--url')
  const values = envFile()
  const url =
    (urlFlag !== -1 ? args[urlFlag + 1] : null) ??
    values.NUXT_NEON_DATABASE_URL ??
    values.DATABASE_URL

  if (!url) {
    console.error('No connection string. Pass --url or set NUXT_NEON_DATABASE_URL in .env.')
    process.exit(1)
  }

  const statements = splitStatements(readFileSync(file, 'utf8'))
  const sql = neon(url)

  console.log(`${file}: ${statements.length} statements`)
  for (const [position, statement] of statements.entries()) {
    try {
      await sql.query(statement)
    } catch (error) {
      console.error(`\nStatement ${position + 1} failed:\n${statement}\n\n${error.message}`)
      process.exit(1)
    }
  }
  console.log('applied')
}

// Importable for the tests, runnable from the command line.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
