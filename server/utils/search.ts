/**
 * The one place the shop decides what a search term matches.
 *
 * Two callers share it: the catalogue route behind the storefront's search
 * field, and the assistant's `search_catalogue` tool. They were always meant to
 * give the same answer for the same words, and two copies of a containment rule
 * drift the first time one of them is tuned.
 *
 * The rule itself is deliberately plain: a case-insensitive substring of the
 * name or the description. No ranking, no stemming, no typo tolerance. At this
 * catalogue's size anything cleverer is unexplainable rather than better, and
 * the visitor can always see why an item matched by reading it.
 */

/** The columns the rule reads. Anything with these two can be matched. */
export interface Searchable {
  name: string
  description?: string | null
}

/**
 * What the visitor typed, reduced to what the rule uses: trimmed, and `null`
 * when there is nothing to search for. An empty box and a box full of spaces
 * are the same thing as no search at all, which is what keeps the whole
 * catalogue on screen rather than nothing.
 */
export function normalizeSearchTerm(term: string | null | undefined): string | null {
  const trimmed = (term ?? '').trim()
  return trimmed.length > 0 ? trimmed : null
}

/**
 * Escape a term for a PostgREST `ilike` pattern.
 *
 * `%` and `_` are wildcards there, so a visitor searching for a literal "50%"
 * would otherwise get every row. The backslash is escaped first, or escaping
 * the wildcards would then be undone by the pass over it.
 *
 * Commas and parentheses are stripped rather than escaped: they are PostgREST's
 * own `or=(...)` delimiters, they carry no meaning in a product name, and
 * quoting them correctly through two layers is more ways to be wrong than a
 * search box is worth.
 */
export function escapeLikePattern(term: string): string {
  return term
    .replace(/\\/g, '\\\\')
    .replace(/[%_]/g, match => `\\${match}`)
    .replace(/[(),]/g, ' ')
    .trim()
}

/**
 * The PostgREST `or` filter for a term: the name or the description contains
 * it. Applied before any ordering or range, so a page of results is a page of
 * matches rather than the matches within one page.
 */
export function searchFilter(term: string): string {
  const pattern = `*${escapeLikePattern(term)}*`
  return `name.ilike.${pattern},description.ilike.${pattern}`
}

/**
 * The same rule in JavaScript, for a caller holding rows rather than a query.
 * Kept beside `searchFilter` so the two cannot answer differently.
 */
export function matchesSearch(row: Searchable, term: string): boolean {
  const needle = term.toLowerCase()
  return `${row.name} ${row.description ?? ''}`.toLowerCase().includes(needle)
}
