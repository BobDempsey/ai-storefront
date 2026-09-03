import { Resend } from 'resend'

export interface OrderEmailPayload {
  orderId: string
  customer: { name: string; email: string; phone?: string; notes?: string }
  items: Array<{
    name_snapshot: string
    /** Set on a file line, null on a physical one: the file staff owe the buyer. */
    file_name_snapshot?: string | null
    unit_price_cents: number
    quantity: number
  }>
  totalCents: number
  /** Set when the order could not be re-read, so the figures below are unreliable. */
  incomplete?: boolean
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

/**
 * Everything interpolated below is attacker-controlled: the customer fields come
 * straight from a public, unauthenticated form. Escape before interpolating so a
 * submission cannot inject markup into a staff inbox.
 */
const esc = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

/** Escaped, with newlines preserved as line breaks. */
const escMultiline = (value: string) => esc(value).replace(/\r?\n/g, '<br>')

function renderHtml(order: OrderEmailPayload) {
  // An order of physical goods says nothing about files.
  const files = order.items.map(i => i.file_name_snapshot).filter((f): f is string => Boolean(f))

  const rows = order.items
    .map(
      i => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(i.name_snapshot)}${
          i.file_name_snapshot
            ? `<br><span style="color:#666;font-size:12px">File to send: ${esc(i.file_name_snapshot)}</span>`
            : ''
        }</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${money(i.unit_price_cents * i.quantity)}</td>
      </tr>`
    )
    .join('')

  return `
    <h2>New order ${order.orderId}</h2>
    <p>
      <strong>${esc(order.customer.name)}</strong><br>
      ${esc(order.customer.email)}${order.customer.phone ? `<br>${esc(order.customer.phone)}` : ''}
    </p>
    ${order.incomplete ? '<p style="padding:8px 12px;background:#fff4e5;border-left:3px solid #d97706"><strong>Heads up:</strong> the order could not be read back after saving, so the items and total below may be incomplete. Check the Supabase dashboard for the authoritative record.</p>' : ''}
    <table style="border-collapse:collapse;font-family:system-ui,sans-serif;font-size:14px">
      <thead>
        <tr>
          <th style="padding:6px 12px;text-align:left">Item</th>
          <th style="padding:6px 12px">Qty</th>
          <th style="padding:6px 12px;text-align:right">Amount</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding:8px 12px;text-align:right"><strong>Total</strong></td>
          <td style="padding:8px 12px;text-align:right"><strong>${money(order.totalCents)}</strong></td>
        </tr>
      </tfoot>
    </table>
    ${files.length ? `<p style="padding:8px 12px;background:#eff6ff;border-left:3px solid #2563eb"><strong>This order owes ${files.length === 1 ? 'a file' : 'files'}.</strong> Email ${files.map(esc).join(', ')} to the customer once payment is arranged.</p>` : ''}
    ${order.customer.notes ? `<p><strong>Notes:</strong><br>${escMultiline(order.customer.notes)}</p>` : ''}
    <p style="color:#666;font-size:12px">Payment is handled off-app. Reply to this email to reach the customer.</p>
  `
}

/**
 * Notifies staff. The order row is already committed, so a failure here is
 * logged rather than surfaced to the customer.
 */
export async function sendOrderEmail(order: OrderEmailPayload) {
  const { resendApiKey, orderFromEmail, orderAdminEmail } = useRuntimeConfig()

  if (!resendApiKey || !orderAdminEmail) {
    console.warn(`[orders] email not configured; order ${order.orderId} saved without notification`)
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: orderAdminEmail,
    replyTo: order.customer.email,
    subject: `New order from ${order.customer.name.replace(/\s+/g, ' ').trim()} (${money(order.totalCents)})`,
    html: renderHtml(order)
  })

  if (error) console.error(`[orders] email failed for ${order.orderId}:`, error)
}

export interface ContactEmailPayload {
  name: string
  email: string
  message: string
}

/**
 * Sends a contact message to staff. Unlike an order, nothing is stored before
 * this runs, so a failure is thrown rather than logged: the sender has to be
 * told, or the message is simply gone.
 */
export async function sendContactEmail(contact: ContactEmailPayload) {
  const { resendApiKey, orderFromEmail, orderAdminEmail } = useRuntimeConfig()

  if (!resendApiKey || !orderAdminEmail) {
    throw new Error('email is not configured')
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: orderAdminEmail,
    replyTo: contact.email,
    subject: `Contact form: ${contact.name.replace(/\s+/g, ' ').trim()}`,
    html: `
      <h2>Message from the contact form</h2>
      <p>
        <strong>${esc(contact.name)}</strong><br>
        ${esc(contact.email)}
      </p>
      <p style="white-space:normal">${escMultiline(contact.message)}</p>
      <p style="color:#666;font-size:12px">Reply to this email to reach the sender.</p>
    `
  })

  if (error) throw new Error(error.message ?? 'the message could not be sent')
}

/**
 * Welcomes a new subscriber with the shop's single configured promo code —
 * the same code for every subscriber, not one generated per address. Thrown
 * on failure, like sendContactEmail: nothing else confirms the subscription
 * to the visitor, so the caller must know the send failed.
 */
export async function sendWelcomeEmail(email: string) {
  const { resendApiKey, orderFromEmail, newsletterPromoCode } = useRuntimeConfig()

  if (!resendApiKey || !newsletterPromoCode) {
    throw new Error('newsletter email is not configured')
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: email,
    subject: "You're subscribed — here's your promo code",
    html: `
      <h2>Thanks for subscribing</h2>
      <p>We'll email you when there's something new.</p>
      <p style="padding:12px 16px;background:#eff6ff;border-left:3px solid #2563eb;font-size:16px">
        Your promo code: <strong>${esc(newsletterPromoCode)}</strong>
      </p>
    `
  })

  if (error) throw new Error(error.message ?? 'the welcome email could not be sent')
}
