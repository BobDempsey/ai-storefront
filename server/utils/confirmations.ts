import { randomUUID } from 'node:crypto'

/**
 * One-time confirmations for assistant order drafts.
 *
 * The model never sees one of these. A confirmation is minted beside a draft,
 * returned to the browser next to the tool result rather than inside it, and
 * spent when the visitor's Confirm click sends it back. That is what stops a
 * future tool that submits on the visitor's behalf from being able to submit
 * anything: the one value submission requires is the one value the model was
 * never given.
 *
 * In memory, like the rate limiter, with the same weakness: a restart forgets
 * every outstanding draft. The window is minutes, so the worst case is a
 * visitor asked to draft again.
 */
const TTL_MS = 15 * 60_000

interface Confirmation {
  expiresAt: number
}

const issued = new Map<string, Confirmation>()

/** Drop anything expired. Cheap at this size, and keeps the map from growing. */
function sweep() {
  const now = Date.now()
  for (const [token, entry] of issued) {
    if (entry.expiresAt <= now) issued.delete(token)
  }
}

export function mintConfirmation() {
  sweep()
  const token = randomUUID()
  issued.set(token, { expiresAt: Date.now() + TTL_MS })
  return token
}

/**
 * Spends a confirmation. Returns false for one that is unknown, expired or
 * already used, so a replay is refused as firmly as a forgery.
 */
export function spendConfirmation(token: unknown) {
  if (typeof token !== 'string') return false

  const entry = issued.get(token)
  if (!entry) return false

  issued.delete(token)
  return entry.expiresAt > Date.now()
}

/** Test seam: lets a check assert the store is empty after a spend. */
export function outstandingConfirmations() {
  sweep()
  return issued.size
}
