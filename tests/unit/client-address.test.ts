import { afterEach, describe, expect, it, vi } from 'vitest'
import { createError } from 'h3'
import { clientAddress, rateLimitByCaller } from '~~/server/utils/client-address'

/**
 * The limiter is only as good as the answer to "who is calling". These cover
 * the ways that answer can be wrong: a header the deployment never trusted, a
 * client-prepended value winning over the proxy's, and a caller the server
 * cannot identify at all.
 */

type Headers = Record<string, string | undefined>

/** Enough of an H3Event for the resolver: it only reads headers and the IP. */
const eventWith = (headers: Headers, socketIp: string | null = '203.0.113.7') => {
  vi.stubGlobal('getHeader', (_event: unknown, name: string) => headers[name.toLowerCase()])
  vi.stubGlobal('getRequestIP', () => socketIp ?? undefined)
  // Re-stubbed per call, not once per file: the afterEach below calls
  // unstubAllGlobals, which also removes what tests/unit/setup.ts installed.
  vi.stubGlobal('createError', createError)
  // The resolver reads the socket directly as its last resort, so the stub has
  // to carry one. Nuxt's dev server is exactly the case where it is null.
  return { node: { req: { socket: { remoteAddress: socketIp ?? null } } } } as never
}

const withConfig = (trustedIpHeader: string) => {
  vi.stubGlobal('useRuntimeConfig', () => ({ trustedIpHeader }))
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('clientAddress', () => {
  it('reads the configured header', () => {
    withConfig('x-vercel-forwarded-for')
    const event = eventWith({ 'x-vercel-forwarded-for': '198.51.100.4' })
    expect(clientAddress(event)).toBe('198.51.100.4')
  })

  /**
   * A proxy appends, so the last value is the one the trusted hop wrote. h3's
   * own xForwardedFor option takes the first, which is whatever the client
   * sent: exactly the value that must not win.
   */
  it('takes the last value of a multi-value header, not the first', () => {
    withConfig('x-forwarded-for')
    const event = eventWith({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2, 198.51.100.4' })
    expect(clientAddress(event)).toBe('198.51.100.4')
  })

  it('trims whitespace around the value', () => {
    withConfig('x-forwarded-for')
    expect(clientAddress(eventWith({ 'x-forwarded-for': '  198.51.100.4  ' }))).toBe('198.51.100.4')
  })

  // The guarantee the whole change exists for.
  it('ignores x-forwarded-for entirely when it is not the configured header', () => {
    withConfig('x-vercel-forwarded-for')
    const event = eventWith({ 'x-forwarded-for': '9.9.9.9' })
    expect(clientAddress(event)).toBe('203.0.113.7')
  })

  it('gives a spoofing caller the same address however they vary the header', () => {
    withConfig('x-vercel-forwarded-for')
    const first = clientAddress(eventWith({ 'x-forwarded-for': '9.9.9.9' }))
    const second = clientAddress(eventWith({ 'x-forwarded-for': '8.8.8.8' }))
    expect(first).toBe(second)
  })

  it('falls back to the socket address when the configured header is absent', () => {
    withConfig('x-vercel-forwarded-for')
    expect(clientAddress(eventWith({}))).toBe('203.0.113.7')
  })

  it('treats an empty or whitespace-only header value as absent', () => {
    withConfig('x-vercel-forwarded-for')
    expect(clientAddress(eventWith({ 'x-vercel-forwarded-for': '' }))).toBe('203.0.113.7')
    expect(clientAddress(eventWith({ 'x-vercel-forwarded-for': '   ' }))).toBe('203.0.113.7')
    expect(clientAddress(eventWith({ 'x-vercel-forwarded-for': ' , ' }))).toBe('203.0.113.7')
  })

  it('reads no header at all when none is configured', () => {
    withConfig('')
    const event = eventWith({ 'x-vercel-forwarded-for': '9.9.9.9', 'x-forwarded-for': '8.8.8.8' })
    expect(clientAddress(event)).toBe('203.0.113.7')
  })

  it('falls through to the socket object when the h3 helper returns nothing', () => {
    withConfig('x-vercel-forwarded-for')
    vi.stubGlobal('getHeader', () => undefined)
    vi.stubGlobal('getRequestIP', () => undefined)
    vi.stubGlobal('createError', createError)
    const event = { node: { req: { socket: { remoteAddress: '203.0.113.55' } } } } as never
    expect(clientAddress(event)).toBe('203.0.113.55')
  })

  // What the dev server actually does: the socket exists, its address does not.
  it('returns null when neither a trusted header nor any socket address resolves', () => {
    withConfig('x-vercel-forwarded-for')
    expect(clientAddress(eventWith({}, null))).toBeNull()
  })
})

describe('rateLimitByCaller', () => {
  const limit = (event: never, bucket = 'test') =>
    rateLimitByCaller(event, address => `${bucket}:${address}`, 2, 60_000, 'Too many. Try later.')

  it('lets an identified caller through up to the limit', () => {
    withConfig('x-vercel-forwarded-for')
    const bucket = `b${Date.now()}`
    const event = eventWith({ 'x-vercel-forwarded-for': `10.0.0.${Date.now() % 250}` })
    expect(() => limit(event, bucket)).not.toThrow()
    expect(() => limit(event, bucket)).not.toThrow()
    expect(() => limit(event, bucket)).toThrow()
  })

  it('still limits a caller it cannot identify, rather than serving them freely', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    withConfig('x-vercel-forwarded-for')
    const bucket = `pooled${Date.now()}`
    const nobody = () => eventWith({}, null)

    expect(() => limit(nobody(), bucket)).not.toThrow()
    expect(() => limit(nobody(), bucket)).not.toThrow()
    expect(() => limit(nobody(), bucket)).toThrow()
  })

  it('tells the customer nothing about headers or settings when it refuses', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    withConfig('x-vercel-forwarded-for')
    const bucket = `msg${Date.now()}`
    limit(eventWith({}, null), bucket)
    limit(eventWith({}, null), bucket)

    try {
      limit(eventWith({}, null), bucket)
      throw new Error('expected the limiter to refuse')
    } catch (err) {
      const message = (err as { statusMessage?: string }).statusMessage ?? ''
      expect(message).toBe('Too many. Try later.')
      expect(message).not.toMatch(/header|proxy|NUXT_|config/i)
    }
  })

  it('writes the reason to the server log so the operator can find it', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    withConfig('x-vercel-forwarded-for')
    limit(eventWith({}, null), `log${Date.now()}`)
    expect(logged).toHaveBeenCalledWith(expect.stringContaining('NUXT_TRUSTED_IP_HEADER'))
  })

  /**
   * The behaviour the change exists for. Under the old call sites each of these
   * three requests landed in a different bucket and all three were served; the
   * allowance was two.
   */
  it('does not give a caller a fresh allowance for a new forwarded-for value', () => {
    withConfig('x-vercel-forwarded-for')
    const bucket = `spoof${Date.now()}`
    const spoofing = (value: string) => eventWith({ 'x-forwarded-for': value }, '198.51.100.9')

    expect(() => limit(spoofing('1.1.1.1'), bucket)).not.toThrow()
    expect(() => limit(spoofing('2.2.2.2'), bucket)).not.toThrow()
    expect(() => limit(spoofing('3.3.3.3'), bucket)).toThrow()
  })

  it('does not log anything when the caller is identified', () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {})
    withConfig('x-vercel-forwarded-for')
    limit(eventWith({ 'x-vercel-forwarded-for': `10.1.0.${Date.now() % 250}` }), `q${Date.now()}`)
    expect(logged).not.toHaveBeenCalled()
  })
})
