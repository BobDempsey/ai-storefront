import { describe, expect, it } from 'vitest'
import {
  escapeLikePattern,
  matchesSearch,
  normalizeSearchTerm,
  searchFilter
} from '~~/server/utils/search'

const dragon = {
  name: 'Articulated Dragon',
  description: 'A printed dragon whose every segment moves. Keep it out of direct sun.'
}
const planter = { name: 'Self-Watering Planter', description: null }

describe('normalizeSearchTerm', () => {
  it('trims a term', () => {
    expect(normalizeSearchTerm('  dragon  ')).toBe('dragon')
  })

  it('treats an empty term as no search', () => {
    expect(normalizeSearchTerm('')).toBeNull()
  })

  it('treats whitespace alone as no search', () => {
    expect(normalizeSearchTerm('   ')).toBeNull()
  })

  it('treats a missing term as no search', () => {
    expect(normalizeSearchTerm(undefined)).toBeNull()
    expect(normalizeSearchTerm(null)).toBeNull()
  })
})

describe('matchesSearch', () => {
  it('matches a word in the name', () => {
    expect(matchesSearch(dragon, 'dragon')).toBe(true)
  })

  it('ignores case on both sides', () => {
    expect(matchesSearch(dragon, 'DRAGON')).toBe(true)
    expect(matchesSearch(dragon, 'articulated')).toBe(true)
  })

  it('matches a word that appears only in the description', () => {
    expect(matchesSearch(dragon, 'segment')).toBe(true)
  })

  it('does not match a word the item does not carry', () => {
    expect(matchesSearch(dragon, 'planter')).toBe(false)
  })

  it('handles an item with no description', () => {
    expect(matchesSearch(planter, 'planter')).toBe(true)
    expect(matchesSearch(planter, 'dragon')).toBe(false)
  })
})

describe('escapeLikePattern', () => {
  it('escapes a literal percent so it is not a wildcard', () => {
    expect(escapeLikePattern('50%')).toBe('50\\%')
  })

  it('escapes a literal underscore', () => {
    expect(escapeLikePattern('night_lamp')).toBe('night\\_lamp')
  })

  it('escapes a backslash before the wildcards, not after', () => {
    expect(escapeLikePattern('a\\b')).toBe('a\\\\b')
  })

  it('strips the delimiters PostgREST reads in an or filter', () => {
    expect(escapeLikePattern('dragon, large (red)')).toBe('dragon  large  red')
  })
})

describe('searchFilter', () => {
  it('matches the term in either field', () => {
    expect(searchFilter('dragon')).toBe('name.ilike.*dragon*,description.ilike.*dragon*')
  })

  it('carries the escaped term rather than the raw one', () => {
    expect(searchFilter('50%')).toBe('name.ilike.*50\\%*,description.ilike.*50\\%*')
  })
})
