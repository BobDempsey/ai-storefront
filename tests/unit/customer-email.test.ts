import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useRuntimeConfigReturning } from './setup'
import {
  renderCustomerHtml,
  sendCustomerEmail,
  type CustomerEmailPayload
} from '~~/server/utils/email'

const send = vi.fn()

// Resend is constructed inside the send function, so the class itself is what
// has to be replaced. Nothing here reaches the network.
vi.mock('resend', () => ({
  Resend: class {
    emails = { send }
  }
}))

const physicalLine = {
  name_snapshot: 'Articulated Dragon',
  file_name_snapshot: null,
  unit_price_cents: 2400,
  quantity: 2
}

const fileLine = {
  name_snapshot: 'Lithophane Lamp STL',
  file_name_snapshot: 'lithophane-lamp.stl',
  unit_price_cents: 900,
  quantity: 1
}

function order(overrides: Partial<CustomerEmailPayload> = {}): CustomerEmailPayload {
  return {
    orderId: '6ea89d95-0625-4128-bf22-7b1ac0a57377',
    customer: { name: 'Ada Lovelace', email: 'ada@example.com' },
    items: [physicalLine],
    totalCents: 4800,
    ...overrides
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  send.mockReset()
})

describe('renderCustomerHtml', () => {
  it('states the order id, each line with its quantity and amount, and the total', () => {
    const html = renderCustomerHtml(order())

    expect(html).toContain('6ea89d95-0625-4128-bf22-7b1ac0a57377')
    expect(html).toContain('Articulated Dragon')
    expect(html).toContain('>2<')
    // The line amount is the unit price times the quantity, not the unit price.
    expect(html).toContain('$48.00')
    expect(html).not.toContain('$24.00')
  })

  it('says no payment has been taken and that staff will make contact', () => {
    const html = renderCustomerHtml(order())

    expect(html).toContain('No payment has been taken')
    expect(html).toMatch(/arrange payment/i)
  })

  // The one sentence a buyer must never be missing, whatever else the order
  // looks like: a total with no such line reads as a receipt for money paid.
  it('says no payment has been taken for every shape of order', () => {
    const shapes = [
      order(),
      order({ items: [fileLine], totalCents: 900 }),
      order({ discount: { source: 'sale', percent: 20, subtotalCents: 6000 } }),
      order({ discount: { source: 'code', percent: 25, code: 'WELCOME25', subtotalCents: 6400 } })
    ]

    for (const shape of shapes) {
      expect(renderCustomerHtml(shape)).toContain('No payment has been taken')
    }
  })

  describe('discounts', () => {
    it('shows the subtotal, the named code and its percentage, and the total', () => {
      const html = renderCustomerHtml(
        order({
          totalCents: 4800,
          discount: { source: 'code', percent: 25, code: 'WELCOME25', subtotalCents: 6400 }
        })
      )

      expect(html).toContain('Subtotal')
      expect(html).toContain('$64.00')
      expect(html).toContain('WELCOME25')
      expect(html).toContain('25% off')
      expect(html).toContain('$16.00') // the discount itself, 6400 - 4800
      expect(html).toContain('$48.00')
      expect(html).not.toContain('Store sale')
    })

    it('names the store sale and its percentage when the sale priced the order', () => {
      const html = renderCustomerHtml(
        order({ totalCents: 4800, discount: { source: 'sale', percent: 20, subtotalCents: 6000 } })
      )

      expect(html).toContain('Store sale')
      expect(html).toContain('20% off')
      expect(html).toContain('$60.00')
      expect(html).toContain('$12.00')
      expect(html).not.toContain('Promo code')
    })

    it('shows no subtotal and no discount row for an undiscounted order', () => {
      const html = renderCustomerHtml(order())

      expect(html).not.toContain('Subtotal')
      expect(html).not.toContain('% off')
      expect(html).not.toContain('Store sale')
      expect(html).not.toContain('Promo code')
      expect(html).toContain('$48.00')
    })

    // The buyer and staff must never be shown two different accounts of one
    // order, and these are the three figures that could drift apart.
    it('agrees with the staff notification on subtotal, discount and total', async () => {
      const payload = order({
        totalCents: 4800,
        discount: { source: 'code', percent: 25, code: 'WELCOME25', subtotalCents: 6400 }
      })

      useRuntimeConfigReturning({
        resendApiKey: 're_test',
        orderFromEmail: 'onboarding@resend.dev',
        orderAdminEmail: 'staff@example.com'
      })
      const { sendOrderEmail } = await import('~~/server/utils/email')
      send.mockResolvedValue({ error: null })
      await sendOrderEmail(payload)
      const staffHtml = send.mock.calls[0]![0].html as string

      for (const figure of ['$64.00', '$16.00', '$48.00']) {
        expect(staffHtml).toContain(figure)
        expect(renderCustomerHtml(payload)).toContain(figure)
      }
    })
  })

  describe('files', () => {
    it('promises the file after payment, with no attachment and no link', () => {
      const html = renderCustomerHtml(order({ items: [fileLine], totalCents: 900 }))

      expect(html).toMatch(/email the file to you once payment is arranged/i)
      expect(html).not.toContain('<a ')
      expect(html).not.toContain('href')
      expect(html).not.toMatch(/https?:\/\//)
    })

    it('says nothing about files for an order of physical goods', () => {
      const html = renderCustomerHtml(order())

      expect(html).not.toMatch(/file/i)
      expect(html).not.toMatch(/download/i)
    })
  })

  // Every value below reaches this template from a public, unauthenticated
  // form or from a row staff typed, and the template is HTML.
  it('escapes the name, the product name and the promo code', () => {
    const html = renderCustomerHtml(
      order({
        customer: { name: '<b>Ada</b> & "Co"', email: 'ada@example.com' },
        items: [{ ...physicalLine, name_snapshot: "Dragon <script>alert('x')</script>" }],
        discount: { source: 'code', percent: 25, code: '<i>WELCOME25</i>', subtotalCents: 6400 }
      })
    )

    expect(html).toContain('&lt;b&gt;Ada&lt;/b&gt; &amp; &quot;Co&quot;')
    expect(html).toContain('&lt;script&gt;')
    expect(html).toContain('&lt;i&gt;WELCOME25&lt;/i&gt;')
    expect(html).not.toContain('<b>Ada')
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<i>WELCOME25')
  })
})

describe('sendCustomerEmail', () => {
  beforeEach(() => {
    send.mockResolvedValue({ error: null })
  })

  it('sends to the buyer with the staff address as reply-to', async () => {
    useRuntimeConfigReturning({
      resendApiKey: 're_test',
      orderFromEmail: 'onboarding@resend.dev',
      orderAdminEmail: 'staff@example.com'
    })

    await sendCustomerEmail(order())

    expect(send).toHaveBeenCalledTimes(1)
    const sent = send.mock.calls[0]![0]
    expect(sent.to).toBe('ada@example.com')
    expect(sent.replyTo).toBe('staff@example.com')
    expect(sent.from).toBe('onboarding@resend.dev')
  })

  it('names the order and its total in the subject, and no store name', async () => {
    useRuntimeConfigReturning({
      resendApiKey: 're_test',
      orderFromEmail: 'onboarding@resend.dev',
      orderAdminEmail: 'staff@example.com',
      public: { storeName: 'Store' }
    })

    await sendCustomerEmail(order())

    const { subject } = send.mock.calls[0]![0]
    expect(subject).toContain('6ea89d95-0625-4128-bf22-7b1ac0a57377')
    expect(subject).toContain('$48.00')
    expect(subject).not.toContain('Store')
  })

  it('sends nothing when no API key is configured', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    useRuntimeConfigReturning({ resendApiKey: '', orderAdminEmail: 'staff@example.com' })

    await sendCustomerEmail(order())

    expect(send).not.toHaveBeenCalled()
  })

  // Without a staff address the buyer's reply goes to the unattended sandbox
  // sender, so a confirmation nobody can answer is worse than none.
  it('sends nothing when no staff address is configured', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    useRuntimeConfigReturning({ resendApiKey: 're_test', orderAdminEmail: '' })

    await sendCustomerEmail(order())

    expect(send).not.toHaveBeenCalled()
  })

  it('logs a rejected send rather than throwing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    useRuntimeConfigReturning({
      resendApiKey: 're_test',
      orderFromEmail: 'onboarding@resend.dev',
      orderAdminEmail: 'staff@example.com'
    })
    send.mockResolvedValue({ error: { message: 'rejected' } })

    await expect(sendCustomerEmail(order())).resolves.toBeUndefined()
    expect(error).toHaveBeenCalled()
  })
})
