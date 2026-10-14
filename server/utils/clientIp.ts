import type { H3Event } from 'h3'

/**
 * Who is really on the other end of a request, worked out once per page view and carried to every SSR
 * sub-request (see `server/plugins/client-ip.ts`).
 *
 * - `CLIENT_IP_HEADER`: the visitor's address. `callApi` forwards it to Laravel as `X-Forwarded-For`, and
 *   nuxt-security's limiter would key on it if it were not for the internal case below.
 * - `RATE_LIMIT_KEY_HEADER`: what the nuxt-security limiter keys on (`security.rateLimiter.ipHeader`). The same
 *   address for a visitor's own request, and `INTERNAL_RATE_LIMIT_KEY` (white-listed) for the in-process
 *   sub-requests a page render makes, so one page view costs one token instead of ten.
 *
 * Both headers are overwritten on every request from outside, so a browser cannot set either of them.
 */
export const CLIENT_IP_HEADER = 'x-profinder-client-ip'
export const RATE_LIMIT_KEY_HEADER = 'x-profinder-rate-limit-key'
export const INTERNAL_RATE_LIMIT_KEY = 'internal-ssr-subrequest'

/** Loopback: nginx on the same machine, which is how production reaches Node (`NITRO_HOST=127.0.0.1`). */
export const DEFAULT_TRUSTED_PROXIES = ['127.0.0.1', '::1', '::ffff:127.0.0.1']

/**
 * SSR sub-requests (`useFetch`/`$fetch` to our own `/api` during a render) never touch the network: Nitro runs
 * them in-process on a mock request (node-mock-http), which carries an `__unenv__` marker no real request has.
 */
export function isInternalRequest(event: H3Event): boolean {
  return '__unenv__' in event.node.req
}

/**
 * The visitor's address for a request that came from outside. `X-Forwarded-For` is only believed when the socket
 * peer is a trusted proxy (nginx), and then read from the right: each proxy appends the address it saw, so the
 * right-most entry that is not itself a trusted proxy is the visitor. A browser can put anything in the header,
 * but only at its left end, which this never reaches past a trusted hop.
 */
export function resolveClientIp(peer: string | undefined, forwardedFor: string | undefined, trustedProxies: readonly string[]): string | undefined {
  if (!peer || !trustedProxies.includes(peer) || !forwardedFor) return peer || undefined

  const hops = forwardedFor.split(',').map(hop => hop.trim()).filter(Boolean)
  for (let index = hops.length - 1; index >= 0; index--) {
    if (!trustedProxies.includes(hops[index]!)) return hops[index]
  }
  return peer
}

/**
 * Sets both headers before any handler or middleware runs (Nitro's `request` hook). A request from outside gets
 * them from its own connection, replacing anything the browser sent. An SSR sub-request keeps the visitor
 * address it inherited from the page request, since Nitro copies the parent's headers onto it, and is marked
 * internal for the limiter.
 */
export function tagClientRequest(event: H3Event, trustedProxies: readonly string[]): void {
  const headers = event.node.req.headers

  if (isInternalRequest(event)) {
    headers[RATE_LIMIT_KEY_HEADER] = INTERNAL_RATE_LIMIT_KEY
    return
  }

  const forwardedFor = headers['x-forwarded-for']
  const ip = resolveClientIp(event.node.req.socket?.remoteAddress, Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor, trustedProxies)
  if (ip) {
    headers[CLIENT_IP_HEADER] = ip
    headers[RATE_LIMIT_KEY_HEADER] = ip
  }
  else {
    // Removed rather than set to undefined: Nitro copies these headers onto sub-requests.
    Reflect.deleteProperty(headers, CLIENT_IP_HEADER)
    Reflect.deleteProperty(headers, RATE_LIMIT_KEY_HEADER)
  }
}

/** The visitor's address as tagged by `tagClientRequest`, for forwarding to Laravel. */
export function getVisitorIp(event: H3Event): string | undefined {
  const value = event.node.req.headers[CLIENT_IP_HEADER]
  return (Array.isArray(value) ? value[0] : value) || undefined
}

/** `NUXT_TRUSTED_PROXIES` is a comma-separated list; empty means the loopback defaults. */
export function parseTrustedProxies(value: string | undefined): string[] {
  const list = (value ?? '').split(',').map(entry => entry.trim()).filter(Boolean)
  return list.length ? list : DEFAULT_TRUSTED_PROXIES
}
