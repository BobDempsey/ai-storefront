import { emailOptinSchema } from '~~/server/utils/schemas'
import { subscribeEmail } from '~~/server/utils/subscribe'

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

  // A duplicate address gets the same response as a new one, so the wording
  // never reveals whether the address was already on the list.
  try {
    await subscribeEmail(parsed.data.email)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Your subscription could not be completed. Please try again in a moment.'
    })
  }

  return { subscribed: true }
})
