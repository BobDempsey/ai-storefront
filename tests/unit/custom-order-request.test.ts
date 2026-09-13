import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfigReturning } from './setup'
import { useCustomOrderStore } from '~/stores/custom-order'
import { contactSchema } from '~~/server/utils/schemas'
import { sendContactEmail } from '~~/server/utils/email'

/**
 * A visitor whose search matched nothing can ask staff for the thing instead of
 * leaving. Three pieces have to hold for that, and they only mean anything
 * together: the term reaches the form without going through the address, the
 * message reaches staff marked as a request for work rather than a question,
 * and the route that carries it writes nothing down on the way.
 *
 * What the page looks like while it happens is covered end to end instead.
 */

const send = vi.fn()

// Resend is constructed inside the send function, so the class is what has to
// be replaced. Nothing here reaches the network.
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  }
}))

const subscribeQuietly = vi.fn()
vi.mock('~~/server/utils/subscribe', () => ({ subscribeQuietly }))

/** The one message Resend was asked to send. */
function sent() {
  expect(send).toHaveBeenCalledTimes(1)
  return send.mock.calls[0]![0] as { subject: string; html: string; to: string; replyTo: string }
}

function emailConfigured() {
  useRuntimeConfigReturning({
    resendApiKey: 'key',
    orderFromEmail: 'shop@example.com',
    orderAdminEmail: 'staff@example.com'
  })
}

beforeEach(() => {
  send.mockReset()
  send.mockResolvedValue({ error: null })
  subscribeQuietly.mockReset()
  emailConfigured()
})

// Deliberately no `unstubAllGlobals`: `tests/unit/setup.ts` supplies
// `createError` and the rest as stubs too, and clearing them here would take
// the route's own auto-imports away from the tests that run after.
afterEach(() => {
  vi.restoreAllMocks()
})

const request = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: "I'm looking for: titanium dragon",
  kind: 'custom-order' as const
}

describe('carrying the term to the form', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('hands the searched term over for the form to take', () => {
    const store = useCustomOrderStore()

    store.askFor('titanium dragon')

    expect(store.term).toBe('titanium dragon')
  })

  it('starts with nothing waiting, so a fresh load opens an empty form', () => {
    expect(useCustomOrderStore().term).toBe('')
  })

  it('empties itself when taken, so coming back to the form does not refill it', () => {
    const store = useCustomOrderStore()
    store.askFor('titanium dragon')

    expect(store.takeTerm()).toBe('titanium dragon')
    expect(store.term).toBe('')
    expect(store.takeTerm()).toBe('')
  })

  it('trims, because the search box keeps whatever spacing was typed', () => {
    const store = useCustomOrderStore()

    store.askFor('  titanium dragon  ')

    expect(store.term).toBe('titanium dragon')
  })
})

describe('what the form is allowed to send', () => {
  const valid = { name: 'Ada', email: 'ada@example.com', message: 'Can you print this?' }

  it('treats a message with no kind as a question, which is what the plain form sends', () => {
    expect(contactSchema.parse(valid).kind).toBe('question')
  })

  it('accepts a custom-order request', () => {
    expect(contactSchema.parse({ ...valid, kind: 'custom-order' }).kind).toBe('custom-order')
  })

  it('refuses a kind it does not know, so the marker is not whatever a caller likes', () => {
    expect(contactSchema.safeParse({ ...valid, kind: 'order' }).success).toBe(false)
  })

  it('holds a request to the same limits an ordinary message has', () => {
    const custom = { ...valid, kind: 'custom-order' as const }

    expect(contactSchema.safeParse({ ...custom, message: '   ' }).success).toBe(false)
    expect(contactSchema.safeParse({ ...custom, message: 'x'.repeat(4001) }).success).toBe(false)
    expect(contactSchema.safeParse({ ...custom, email: 'nope' }).success).toBe(false)
  })
})

describe('what staff receive', () => {
  it('names a request as one in the subject, where staff read it first', async () => {
    await sendContactEmail(request)

    expect(sent().subject).toMatch(/custom order request/i)
    expect(sent().html).toMatch(/custom order request/i)
  })

  it('reaches staff by the same path, reply-to the sender', async () => {
    await sendContactEmail(request)

    expect(sent().to).toBe('staff@example.com')
    expect(sent().replyTo).toBe('ada@example.com')
    expect(sent().html).toContain('titanium dragon')
  })

  it('leaves an ordinary message reading as one', async () => {
    await sendContactEmail({ ...request, kind: 'question' })

    expect(sent().subject).toBe('Contact form: Ada Lovelace')
    expect(sent().html).not.toMatch(/custom order request/i)
  })

  it('quotes no price and promises nothing, because the shop has not answered yet', async () => {
    await sendContactEmail(request)

    expect(sent().html).not.toMatch(/\$\d/)
    expect(sent().html).toMatch(/no price has been quoted/i)
  })

  it('escapes the term, which is public input arriving in a staff inbox', async () => {
    await sendContactEmail({ ...request, message: 'I want <script>alert(1)</script>' })

    expect(sent().html).not.toContain('<script>')
    expect(sent().html).toContain('&lt;script&gt;')
  })

  it('throws when the send fails, because nothing is stored to retry from', async () => {
    send.mockResolvedValue({ error: { message: 'mailbox unavailable' } })

    await expect(sendContactEmail(request)).rejects.toThrow(/mailbox unavailable/)
  })
})

describe('the route a request takes', () => {
  const rateLimit = vi.fn()

  /** Imports the contact route with its Nuxt globals in place. */
  async function loadRoute(body: Record<string, unknown>) {
    rateLimit.mockClear()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('readBody', async () => body)
    vi.stubGlobal('rateLimitByCaller', rateLimit)
    emailConfigured()

    vi.resetModules()
    const module = await import('~~/server/api/contact.post')
    return module.default as (event: unknown) => Promise<{ sent: true }>
  }

  it('delivers the request with its marker intact', async () => {
    const handler = await loadRoute(request)

    await expect(handler({})).resolves.toEqual({ sent: true })
    expect(sent().subject).toMatch(/custom order request/i)
  })

  it('creates no order, no cart line and no redemption', async () => {
    const handler = await loadRoute(request)

    await handler({})

    // `useSupabase` throws unless a test stubs it, so touching the database at
    // all would fail this rather than pass quietly. Delivery is the whole
    // request: one email out, and nothing written down.
    expect(send).toHaveBeenCalledTimes(1)
    expect(subscribeQuietly).not.toHaveBeenCalled()
  })

  it('tells the visitor when delivery failed, rather than confirming a send', async () => {
    send.mockResolvedValue({ error: { message: 'mailbox unavailable' } })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const handler = await loadRoute(request)

    await expect(handler({})).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: expect.stringMatching(/could not be sent/i)
    })
  })

  it('still rate limits a request the way it rate limits a message', async () => {
    const handler = await loadRoute(request)

    await handler({})

    expect(rateLimit).toHaveBeenCalledTimes(1)
  })
})
