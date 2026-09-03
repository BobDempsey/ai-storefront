import { sendWelcomeEmail } from '~~/server/utils/email'

/**
 * Adds an address to the mailing list and welcomes it. Shared by the opt-in
 * form, the contact form and checkout, so all three behave identically: one
 * row per address, one welcome email, and a response that never reveals
 * whether the address was already on the list.
 *
 * Throws when the subscription could not be completed. The opt-in route
 * surfaces that to the visitor, because nothing else confirms the subscription
 * to them; the contact and order routes swallow it, because a failed
 * subscription must not fail the message or the order it rode in on.
 */
export async function subscribeEmail(email: string): Promise<{ isNew: boolean }> {
  // ON CONFLICT DO NOTHING: a row comes back only for an address that was not
  // already subscribed. Zero rows means it was a duplicate, not a failure.
  const { data, error } = await useSupabase()
    .from('email_subscribers')
    .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })
    .select('id')

  if (error) {
    console.error('[subscribe] could not record subscription:', error)
    throw new Error('subscription could not be recorded')
  }

  const isNew = (data?.length ?? 0) > 0

  // Only a genuinely new subscription sends mail, so a repeat submission never
  // delivers a second welcome.
  if (isNew) {
    try {
      await sendWelcomeEmail(email)
    } catch (err) {
      console.error('[subscribe] welcome email failed:', err)
      throw new Error('welcome email could not be sent')
    }
  }

  return { isNew }
}

/**
 * Subscribes without letting a failure reach the caller's own outcome. Used by
 * the contact and order routes, where opting in is secondary to the thing the
 * visitor actually came to do.
 */
export async function subscribeQuietly(email: string) {
  try {
    await subscribeEmail(email)
  } catch (err) {
    console.error('[subscribe] secondary opt-in failed:', err)
  }
}
