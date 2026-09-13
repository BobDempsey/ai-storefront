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
  /**
   * What priced this order, as recorded on the order row at the time it was
   * placed. Omitted entirely when the order carries no recorded discount (a
   * catalogue-price order, or one written before this was tracked) rather than
   * passed as a zero, so renderHtml has one condition to test.
   */
  discount?: {
    source: 'sale' | 'code'
    percent: number
    /** Set only when source is 'code'. */
    code?: string | null
    subtotalCents: number
  }
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

/**
 * The shop's own name, or null when it does not really have one.
 *
 * `Store` is the placeholder the template ships with, so it is treated as
 * unconfigured rather than as a name: "Your order from Store" reads as a bug,
 * which is why the buyer's confirmation used to carry no name at all. Naming
 * the shop matters once more than one of them writes to the same inbox, and a
 * shop that has not been named yet is better served by the older, plainer
 * subject than by an empty bracket.
 */
function shopName(): string | null {
  // `public?.` rather than `public.`: this runs in tests that stub only the
  // keys they care about, and a missing name must read as unconfigured rather
  // than throw inside a send that an order is depending on.
  const configured = useRuntimeConfig().public?.storeName?.trim()
  return !configured || configured === 'Store' ? null : configured
}

/** Files a staff inbox that may carry more than one shop's mail. */
const forStaff = (subject: string) => {
  const name = shopName()
  return name ? `[${name}] ${subject}` : subject
}

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
        ${
          order.discount
            ? `<tr>
          <td colspan="2" style="padding:6px 12px;text-align:right">Subtotal</td>
          <td style="padding:6px 12px;text-align:right">${money(order.discount.subtotalCents)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:6px 12px;text-align:right">${
            order.discount.source === 'code'
              ? `Promo code ${esc(order.discount.code ?? '')} (${order.discount.percent}% off, applied to this order)`
              : `Store sale (${order.discount.percent}% off, applied to this order)`
          }</td>
          <td style="padding:6px 12px;text-align:right">&minus;${money(order.discount.subtotalCents - order.totalCents)}</td>
        </tr>`
            : ''
        }
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
    subject: forStaff(
      `New order from ${order.customer.name.replace(/\s+/g, ' ').trim()} (${money(order.totalCents)})`
    ),
    html: renderHtml(order)
  })

  if (error) console.error(`[orders] email failed for ${order.orderId}:`, error)
}

/**
 * What the buyer is told. The same figures as the staff notification, minus
 * `incomplete`: staff get a warning banner and a dashboard to go and check,
 * where a buyer sent a $0.00 order with no lines has neither. The route sends
 * them nothing at all in that case, so this payload cannot express it.
 */
export type CustomerEmailPayload = Omit<OrderEmailPayload, 'incomplete'>

/**
 * The buyer's copy. Deliberately a second renderer rather than `renderHtml`
 * with flags: that one is written for someone who can act on the order — it
 * names the file staff owe, quotes the buyer's notes back and says to reply to
 * the customer. This one answers "what did I ask for, and what happens now".
 * They share the escaping and the money format, which is all that has to agree.
 */
export function renderCustomerHtml(order: CustomerEmailPayload) {
  const owesFile = order.items.some(i => i.file_name_snapshot)

  const rows = order.items
    .map(
      i => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${esc(i.name_snapshot)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${money(i.unit_price_cents * i.quantity)}</td>
      </tr>`
    )
    .join('')

  return `
    <h2>Thanks — we have your order</h2>
    <p>Hi ${esc(order.customer.name)}, this confirms the order you just placed. Your reference is <strong>${esc(order.orderId)}</strong>.</p>
    <p style="padding:8px 12px;background:#eff6ff;border-left:3px solid #2563eb"><strong>No payment has been taken.</strong> This is an order request. We will reply to this email to arrange payment, and nothing is charged until you have heard from us.</p>
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
        ${
          order.discount
            ? `<tr>
          <td colspan="2" style="padding:6px 12px;text-align:right">Subtotal</td>
          <td style="padding:6px 12px;text-align:right">${money(order.discount.subtotalCents)}</td>
        </tr>
        <tr>
          <td colspan="2" style="padding:6px 12px;text-align:right">${
            order.discount.source === 'code'
              ? `Promo code ${esc(order.discount.code ?? '')} (${order.discount.percent}% off)`
              : `Store sale (${order.discount.percent}% off)`
          }</td>
          <td style="padding:6px 12px;text-align:right">&minus;${money(order.discount.subtotalCents - order.totalCents)}</td>
        </tr>`
            : ''
        }
        <tr>
          <td colspan="2" style="padding:8px 12px;text-align:right"><strong>Total</strong></td>
          <td style="padding:8px 12px;text-align:right"><strong>${money(order.totalCents)}</strong></td>
        </tr>
      </tfoot>
    </table>
    ${owesFile ? '<p>Your order includes a download. We will email the file to you once payment is arranged — there is nothing to download from this message.</p>' : ''}
    <p style="color:#666;font-size:12px">Reply to this email if anything above is wrong, or if you have a question about your order.</p>
  `
}

/**
 * Confirms the order to the buyer. Like the staff notification, the order row
 * is already committed, so a failure here is logged and goes no further.
 *
 * `replyTo` is the staff address — the mirror of the staff notification's
 * reply-to being the buyer — so a buyer answering this reaches the shop rather
 * than the unattended sandbox sender.
 */
export async function sendCustomerEmail(order: CustomerEmailPayload) {
  const { resendApiKey, orderFromEmail, orderAdminEmail } = useRuntimeConfig()

  // orderAdminEmail is required even though it is not the recipient: without it
  // a reply from the buyer would go nowhere, and a confirmation you cannot
  // answer is worse than none.
  if (!resendApiKey || !orderAdminEmail) {
    console.warn(`[orders] email not configured; order ${order.orderId} saved without a customer confirmation`)
    return
  }

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: order.customer.email,
    replyTo: orderAdminEmail,
    // A phrase rather than the staff mail's bracketed tag: a buyer knows which
    // shop they bought from and wants a sentence, not a filing aid. Falls back
    // to the older, nameless subject when the shop is still the `Store`
    // placeholder, because "Your Store order" reads as a bug.
    subject: (() => {
      const name = shopName()
      const tail = `order ${order.orderId} (${money(order.totalCents)})`
      return name ? `Your ${name} ${tail}` : `Your ${tail}`
    })(),
    html: renderCustomerHtml(order)
  })

  if (error) console.error(`[orders] customer confirmation failed for ${order.orderId}:`, error)
}

export interface ContactEmailPayload {
  name: string
  email: string
  message: string
  /**
   * 'custom-order' when the sender is asking the shop to make something the
   * catalogue does not carry. Absent on an ordinary message, and absent is a
   * question.
   */
  kind?: 'question' | 'custom-order'
}

/**
 * Sends a contact message to staff. Unlike an order, nothing is stored before
 * this runs, so a failure is thrown rather than logged: the sender has to be
 * told, or the message is simply gone.
 *
 * A custom-order request goes out on this same path, changing the subject line
 * and one paragraph of the body. Staff have to be able to tell a request for
 * work from a question about an existing order at a glance in the inbox, which
 * is what the subject is for, and the body says plainly that nothing has been
 * ordered and no price has been quoted, because the shop has not answered yet.
 */
export async function sendContactEmail(contact: ContactEmailPayload) {
  const { resendApiKey, orderFromEmail, orderAdminEmail } = useRuntimeConfig()

  if (!resendApiKey || !orderAdminEmail) {
    throw new Error('email is not configured')
  }

  const custom = contact.kind === 'custom-order'
  const sender = contact.name.replace(/\s+/g, ' ').trim()

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: orderAdminEmail,
    replyTo: contact.email,
    subject: forStaff(custom ? `Custom order request: ${sender}` : `Contact form: ${sender}`),
    html: `
      <h2>${custom ? 'Custom order request' : 'Message from the contact form'}</h2>
      <p>
        <strong>${esc(contact.name)}</strong><br>
        ${esc(contact.email)}
      </p>
      <p style="white-space:normal">${escMultiline(contact.message)}</p>
      ${custom ? '<p style="padding:8px 12px;background:#eff6ff;border-left:3px solid #2563eb">This is a request for something the catalogue does not carry. No order exists, no price has been quoted, and the shop has agreed to nothing. Reply to the sender to say whether it can be made and what it would cost.</p>' : ''}
      <p style="color:#666;font-size:12px">Reply to this email to reach the sender.</p>
    `
  })

  if (error) throw new Error(error.message ?? 'the message could not be sent')
}

/**
 * Welcomes a new subscriber with the shop's active promo code, read at send
 * time from the same table the checkout reads, so a subscriber is never given
 * a code checkout would refuse. It is the same code for every subscriber, not
 * one generated per address. With no code active the welcome still goes, minus
 * the code block. Thrown on failure, like sendContactEmail: nothing else
 * confirms the subscription to the visitor, so the caller must know.
 */
export async function sendWelcomeEmail(email: string) {
  const { resendApiKey, orderFromEmail } = useRuntimeConfig()

  if (!resendApiKey) {
    throw new Error('newsletter email is not configured')
  }

  const promo = await getActivePromo()

  const resend = new Resend(resendApiKey)
  const { error } = await resend.emails.send({
    from: orderFromEmail,
    to: email,
    subject: (() => {
      const name = shopName()
      const to = name ? ` to ${name}` : ''
      return promo ? `You're subscribed${to}, here's your promo code` : `You're subscribed${to}`
    })(),
    html: `
      <h2>Thanks for subscribing</h2>
      <p>We'll email you when there's something new.</p>
      ${
        promo
          ? `<p style="padding:12px 16px;background:#eff6ff;border-left:3px solid #2563eb;font-size:16px">
        Your promo code: <strong>${esc(promo.code)}</strong> for
        ${esc(String(promo.percent))}% off your first order.
      </p>`
          : ''
      }
    `
  })

  if (error) throw new Error(error.message ?? 'the welcome email could not be sent')
}
