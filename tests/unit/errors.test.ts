import { describe, expect, it } from 'vitest'
import { errorData, errorStatus, isFetchError, messageFor } from '~/utils/errors'

/**
 * The narrowing five catch handlers now share. What matters is that a value
 * which is not an H3 error at all - a thrown string, a plain Error, null -
 * falls back rather than throwing a second time inside the handler that was
 * meant to recover from the first.
 */

// What $fetch throws: the route's text arrives under `data`, and the same text
// is on the error itself when the failure never crossed the wire.
const wireError = {
  statusCode: 409,
  data: {
    statusCode: 409,
    statusMessage: 'Two of those are no longer available.',
    data: { unavailableProductIds: ['abc'] }
  }
}
const localError = { statusCode: 429, statusMessage: 'Slow down.' }

describe('isFetchError', () => {
  it('accepts an object', () => {
    expect(isFetchError(wireError)).toBe(true)
  })

  it('rejects the values a catch block can genuinely receive', () => {
    expect(isFetchError(null)).toBe(false)
    expect(isFetchError(undefined)).toBe(false)
    expect(isFetchError('boom')).toBe(false)
    expect(isFetchError(404)).toBe(false)
  })
})

describe('errorStatus', () => {
  it('reads the status off the error', () => {
    expect(errorStatus(localError)).toBe(429)
  })

  it('falls back to the status inside data', () => {
    expect(errorStatus({ data: { statusCode: 503 } })).toBe(503)
  })

  it('is undefined for anything without one', () => {
    expect(errorStatus('boom')).toBeUndefined()
    expect(errorStatus(new Error('boom'))).toBeUndefined()
  })
})

describe('messageFor', () => {
  it('prefers the message that crossed the wire', () => {
    expect(messageFor(wireError, 'fallback')).toBe('Two of those are no longer available.')
  })

  it('reads the message off the error when there is no wire copy', () => {
    expect(messageFor(localError, 'fallback')).toBe('Slow down.')
  })

  it('falls back for a thrown string, a plain Error and null', () => {
    expect(messageFor('boom', 'fallback')).toBe('fallback')
    expect(messageFor(new Error('boom'), 'fallback')).toBe('fallback')
    expect(messageFor(null, 'fallback')).toBe('fallback')
  })

  it('falls back for an error carrying no message at all', () => {
    expect(messageFor({ statusCode: 500 }, 'fallback')).toBe('fallback')
  })
})

describe('errorData', () => {
  it('returns the route payload', () => {
    expect(errorData<{ unavailableProductIds: string[] }>(wireError)).toEqual({
      unavailableProductIds: ['abc']
    })
  })

  it('is undefined when the error carries none', () => {
    expect(errorData(localError)).toBeUndefined()
    expect(errorData('boom')).toBeUndefined()
  })
})
