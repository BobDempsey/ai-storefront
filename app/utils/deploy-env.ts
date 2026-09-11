/**
 * Which deployment the storefront is running as, and whether that is worth
 * telling the person looking at it.
 *
 * The rule is deliberately one-sided: silence means the live shop. An unset
 * value renders nothing, so a deployment that was never configured behaves as
 * it always has, and the only way to put a banner in front of a customer is to
 * actively name an environment. A boolean meaning "not production" would have
 * failed the other way, showing the banner to anyone who forgot to set it.
 *
 * `isDev` is passed in rather than read here so this is testable without a
 * build. It comes from `import.meta.dev`, which is decided when the bundle is
 * built: true under `npm run dev`, false in every deployment. A Vercel preview
 * therefore looks exactly like production and has to be told what it is.
 */
export function resolveDeployEnv(configured: string | undefined, isDev: boolean): string {
  const named = (configured ?? '').trim()
  if (named) return named.toLowerCase() === 'production' ? '' : named
  return isDev ? 'development' : ''
}

/** How the environment reads on screen and in the tab: "Development", "Preview". */
export function deployEnvLabel(env: string): string {
  if (!env) return ''
  return env.charAt(0).toUpperCase() + env.slice(1)
}
