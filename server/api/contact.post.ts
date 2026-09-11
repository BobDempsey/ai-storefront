import { contactSchema } from '~~/server/utils/schemas'
import { sendContactEmail } from '~~/server/utils/email'
import { subscribeQuietly } from '~~/server/utils/subscribe'

export default defineEventHandler(async event => {
  // A bucket of its own: contact spam from one origin must not spend the
  // allowance that origin needs to place an order.
  rateLimitByCaller(
    event,
    address => `contact:${address}`,
    3,
    10 * 60_000,
    'Too many messages. Please try again later.'
  )

  const parsed = contactSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please check the form and try again.' })
  }

  // Nothing is stored, so the send is the whole request: if it fails, the
  // sender has to hear about it rather than see a false confirmation.
  try {
    await sendContactEmail(parsed.data)
  } catch (err) {
    console.error('[contact] could not send the message:', err)
    throw createError({
      statusCode: 502,
      statusMessage: 'Your message could not be sent. Please try again in a moment.'
    })
  }

  // Only after the message is away, and never allowed to fail it: the sender
  // came here to reach staff, not to join a mailing list.
  if (parsed.data.subscribe) await subscribeQuietly(parsed.data.email)

  return { sent: true }
})
