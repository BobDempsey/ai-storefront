import { Resend } from 'resend'

export interface OrderEmailPayload {
  orderId: string
  customer: { name: string; email: string; phone?: string; notes?: string }
  items: Array<{ name_snapshot: string; unit_price_cents: number; quantity: number }>
  totalCents: number
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`

function renderHtml(order: OrderEmailPayload) {
  const rows = order.items
    .map(
      i => `<tr>
        <td style="padding:6px 12px;border-bottom:1px solid #eee">${i.name_snapshot}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:center">${i.quantity}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${money(i.unit_price_cents * i.quantity)}</td>
      </tr>`
    )
    .join('')

  return `
    <h2>New order ${order.orderId}</h2>
    <p>
      <strong>${order.customer.name}</strong><br>
      ${order.customer.email}${order.customer.phone ? `<br>${order.customer.phone}` : ''}
    </p>
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
    ${order.customer.notes ? `<p><strong>Notes:</strong><br>${order.customer.notes}</p>` : ''}
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
    subject: `New order from ${order.customer.name} — ${money(order.totalCents)}`,
    html: renderHtml(order)
  })

  if (error) console.error(`[orders] email failed for ${order.orderId}:`, error)
}
