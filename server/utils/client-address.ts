import type { H3Event } from 'h3'
import { rateLimit } from '~~/server/utils/rate-limit'

/**
 * Who is calling, for the purpose of rate limiting.
 *
 * The rule is that a value the client controls is not an identity. A limiter
 * keyed on `X-Forwarded-For` can be reset by sending a different value, which
 * is why that header is read only when the deployment names it in
 * `NUXT_TRUSTED_IP_HEADER`. Vercel is the default because it overwrites
 * `X-Forwarded-For` itself and sets `x-vercel-forwarded-for`, which a proxy
 * placed on top of Vercel cannot overwrite.
 *
 * Not used for anything but a bucket key: no address is logged, stored, or
 * geolocated, and the value is never validated as an IP because nothing here
 * treats it as one.
 */
export function clientAddress(event: H3Event): string | null {
  const { trustedIpHeader } = useRuntimeConfig()

  if (trustedIpHeader) {
    const raw = getHeader(event, trustedIpHeader)
    // A proxy appends, so the last value is the one the trusted hop wrote.
    // Everything before it arrived with the request and is as untrustworthy as
    // the client. h3's own `xForwardedFor` option takes the first, which is
    // exactly the spoofable end of the list.
    const last = raw?.split(',').pop()?.trim()
    if (last) return last
  }

  // No trusted header, or it was absent. The connection's own address cannot
  // be forged by the party making the connection.
  //
  // Both of these read the same field, so the second rarely adds anything. It
  // is here because the failure it guards against was invisible until it
  // happened: under `npm run dev` the socket object exists and its
  // `remoteAddress` is null, so nothing resolves at all.
  return getRequestIP(event) ?? event.node?.req?.socket?.remoteAddress ?? null
}

/**
 * Where requests go when the platform exposes no address whatsoever. One
 * bucket for all of them, which is weak, and deliberately so: see
 * `rateLimitByCaller`.
 */
const POOLED = 'unidentified'

/**
 * Rate limits a request by its caller.
 *
 * When nothing identifies the caller, the request is still limited, in a bucket
 * shared with every other unidentifiable request. That is the weakest of the
 * three possible outcomes and it is chosen on purpose. Refusing them outright
 * takes the shop offline wherever the platform exposes no address, which is
 * what happens in local development. Serving them unlimited is a documented way
 * around every limit. Pooling at least keeps a limit in force, and the log line
 * is what stops it going unnoticed.
 */
export function rateLimitByCaller(
  event: H3Event,
  bucket: (address: string) => string,
  limit: number,
  windowMs: number,
  message: string
) {
  const address = clientAddress(event)

  if (!address) {
    // The operator needs to know, because everyone here shares one allowance.
    // The customer is told nothing about headers or settings: those are facts
    // about the server.
    console.error(
      '[rate-limit] no client address resolved; these callers share one bucket. ' +
        'Set NUXT_TRUSTED_IP_HEADER to the header your host sets.'
    )
  }

  rateLimit(bucket(address ?? POOLED), limit, windowMs, message)
}
