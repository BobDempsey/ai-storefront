/**
 * Tells the drawer whether the assistant can answer at all, without shipping
 * the key that decides it. A false here is what the drawer renders as
 * "unavailable" instead of offering a text box that cannot work.
 */
export default defineEventHandler(() => ({
  available: Boolean(useRuntimeConfig().openaiApiKey)
}))
