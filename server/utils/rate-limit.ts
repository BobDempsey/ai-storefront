const hits = new Map<string, number[]>()

/**
 * In-memory fixed-window limiter. Fine for a single low-traffic instance;
 * swap for a shared store if the app is ever scaled horizontally.
 */
export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)

  if (recent.length >= limit) {
    throw createError({ statusCode: 429, statusMessage: 'Too many orders. Please try again later.' })
  }

  recent.push(now)
  hits.set(key, recent)

  // Keep the map from growing without bound on a long-running server.
  if (hits.size > 5000) {
    for (const [k, times] of hits) {
      if (times.every(t => now - t >= windowMs)) hits.delete(k)
    }
  }
}
