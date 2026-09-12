/**
 * What `$fetch` throws, and the only questions the storefront asks of it.
 *
 * Five handlers used to type their caught value as `any` and read
 * `statusMessage`, `statusCode` and `data.data` straight off it. A caught value
 * is genuinely unknown, so that is what the handlers now catch; this is where
 * the knowledge about its shape is added, once, rather than five times in five
 * casts that nothing checks.
 *
 * Two places carry a message, and they are not the same place: `statusMessage`
 * on the error itself, which is what a thrown `createError` puts there on the
 * server, and `data.statusMessage`, which is where the same text ends up after
 * it has crossed the wire and been parsed by `$fetch`. A handler that reads only
 * one of them shows "Something went wrong" for half the failures it could have
 * explained, so `messageFor` reads both.
 */

/** The shape of an H3 error as it reaches the browser. Every field optional:
 *  what arrives depends on where the failure happened. */
export interface FetchErrorLike {
  statusCode?: number
  statusMessage?: string
  data?: {
    statusCode?: number
    statusMessage?: string
    /** The route's own payload, typed by the caller that knows what it sent. */
    data?: unknown
  }
}

/** True for anything object-shaped enough to read those fields off. Not a
 *  guarantee any of them are present. */
export function isFetchError(error: unknown): error is FetchErrorLike {
  return typeof error === 'object' && error !== null
}

/** The status a route answered with, where there was one. */
export function errorStatus(error: unknown): number | undefined {
  if (!isFetchError(error)) return undefined
  return error.statusCode ?? error.data?.statusCode
}

/**
 * The visitor-facing sentence a route sent, or the fallback. Routes in this repo
 * put customer-readable text in `statusMessage` and log anything internal on the
 * server, so this never surfaces a stack or a database message.
 */
export function messageFor(error: unknown, fallback: string): string {
  if (!isFetchError(error)) return fallback
  return error.data?.statusMessage ?? error.statusMessage ?? fallback
}

/**
 * The route's own payload, cast to what the caller knows it asked for. The cast
 * is here rather than at each call site so there is one place to look when a
 * route's payload changes, and it is the only unchecked step left in the path.
 */
export function errorData<T>(error: unknown): T | undefined {
  if (!isFetchError(error)) return undefined
  return error.data?.data as T | undefined
}
