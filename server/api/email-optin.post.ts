import { emailOptinSchema } from '~~/server/utils/schemas'
import { sendWelcomeEmail } from '~~/server/utils/email'

export default defineEventHandler(async event => {
  // A bucket of its own, like contact's: opt-in spam must not spend the
  // allowance another route needs.
  rateLimit(
    `email-optin:${getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'}`,
    5,
    10 * 60_000,
    'Too many attempts. Please try again later.'
  )

  const parsed = emailOptinSchema.safeParse(await readBody(event))
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Please enter a valid email address.' })
  }

  const supabase = useSupabase()

  // ON CONFLICT DO NOTHING: a row comes back only for an address that was not
  // already subscribed. Zero rows means it was a duplicate, not a failure.
  const { data, error } = await supabase
    .from('email_subscribers')
    .upsert({ email: parsed.data.email }, { onConflict: 'email', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('[email-optin] could not record subscription:', error)
    throw createError({
      statusCode: 502,
      statusMessage: 'Could not complete your subscription. Please try again in a moment.'
    })
  }

  const isNewSubscriber = (data?.length ?? 0) > 0

  // A duplicate address gets the same response as a new one below, so the
  // wording never reveals whether the address was already on the list. Only
  // a genuinely new subscription sends mail.
  if (isNewSubscriber) {
    try {
      await sendWelcomeEmail(parsed.data.email)
    } catch (err) {
      console.error('[email-optin] welcome email failed:', err)
      throw createError({
        statusCode: 502,
        statusMessage: 'Your subscription could not be completed. Please try again in a moment.'
      })
    }
  }

  return { subscribed: true }
})
