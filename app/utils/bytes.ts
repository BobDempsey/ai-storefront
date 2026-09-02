const UNITS = ['bytes', 'KB', 'MB', 'GB']

/**
 * Sizes are stored in bytes, the same way prices are stored in cents, and
 * formatted here at the edge.
 */
export function formatBytes(bytes: number) {
  let value = bytes
  let unit = 0

  while (value >= 1024 && unit < UNITS.length - 1) {
    value /= 1024
    unit += 1
  }

  // Whole bytes read oddly with a decimal; everything above reads oddly without.
  return unit === 0 ? `${value} ${UNITS[unit]}` : `${value.toFixed(1)} ${UNITS[unit]}`
}
