/**
 * Whether this browser has already been shown the assistant panel once.
 *
 * This lives outside the assistant store on purpose. That store persists
 * nothing, and the conversation is the thing that must never be persisted, so
 * giving it a `persist` block with a `pick` list would put the "a conversation
 * is not kept" guarantee one careless edit away from breaking. A key of its own
 * cannot drift into that.
 *
 * localStorage rather than a cookie, for the reason the colour-mode store opts
 * out of the module default: the server has no use for this, and a cookie would
 * ride along on every request.
 */
const STORAGE_KEY = 'assistant-greeted'

/**
 * True when the panel has already introduced itself, and also true when we
 * cannot tell. A browser that blocks storage cannot record the flag either, so
 * treating a failed read as "not yet greeted" would open the panel again on
 * every page the visitor opened. Failing toward silence is the kinder of the
 * two wrong answers.
 */
export function hasBeenGreeted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null
  } catch {
    return true
  }
}

/** Records that the panel opened. A browser that refuses is not an error. */
export function markGreeted(): void {
  try {
    localStorage.setItem(STORAGE_KEY, '1')
  } catch {
    // Nothing to do: the visitor sees the panel this once and not again only
    // if the write took. See hasBeenGreeted for why that direction is safe.
  }
}
