import type { H3Event } from 'h3'

/**
 * Nitro-as-BFF: every server/api/* route proxies to the real Laravel API
 * (server-to-server, no CORS) instead of the browser calling Laravel
 * directly. The Sanctum bearer token lives only in this httpOnly cookie —
 * client JS never sees it — see the wiring plan's "Nitro-as-BFF" section.
 */
const TOKEN_COOKIE = 'fp_token'

export function getAuthToken(event: H3Event): string | undefined {
  return getCookie(event, TOKEN_COOKIE)
}

/**
 * `remember` (the "Remember me" box) keeps the login for 30 days; without it
 * the cookie lasts only for the browser session. The server-side token
 * expires after 30 days either way (see config/sanctum.php).
 */
export function setAuthToken(event: H3Event, token: string, remember = true): void {
  setCookie(event, TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: !import.meta.dev,
    path: '/',
    ...(remember ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  })
}

export function clearAuthToken(event: H3Event): void {
  deleteCookie(event, TOKEN_COOKIE, { path: '/' })
}

interface ApiCallOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  query?: Record<string, unknown>
  /** Set false for routes that must never send the caller's token (there are none today, but keeps intent explicit). */
  auth?: boolean
}

/** What `callApi` needs from the server runtime. Injected so the proxy's rules can be tested without a running Nitro. */
export interface ApiProxyDeps {
  apiBaseUrl: () => string
  fetch: (path: string, options: Record<string, unknown>) => Promise<unknown>
  getAuthToken: (event: H3Event) => string | undefined
  clearAuthToken: (event: H3Event) => void
  getClientIp: (event: H3Event) => string | undefined
  createError: (input: { statusCode: number, statusMessage: string, data?: unknown }) => Error
}

export function createCallApi(deps: ApiProxyDeps) {
  return async function callApi<T>(event: H3Event, path: string, options: ApiCallOptions = {}): Promise<T> {
    const token = options.auth !== false ? deps.getAuthToken(event) : undefined
    const clientIp = deps.getClientIp(event)

    try {
      const response = await deps.fetch(path, {
        baseURL: `${deps.apiBaseUrl()}/api/v1`,
        method: options.method ?? 'GET',
        body: options.body,
        query: options.query,
        headers: {
          Accept: 'application/json',
          // Laravel only sees this server as the client; hand it the real address so IP-keyed
          // rate limits (login, register, OTP) apply per visitor instead of per Nuxt host.
          ...(clientIp ? { 'X-Forwarded-For': clientIp } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      })
      return response as T
    }
    catch (error) {
      const fetchError = error as { response?: { status?: number, _data?: { message?: string } } }

      // The token we just sent is no good: drop the cookie so the browser stops presenting it.
      if (token && fetchError.response?.status === 401) deps.clearAuthToken(event)

      throw deps.createError({
        statusCode: fetchError.response?.status ?? 500,
        statusMessage: fetchError.response?._data?.message ?? 'Something went wrong.',
        data: fetchError.response?._data,
      })
    }
  }
}

/**
 * Calls the Laravel API from server-side code. Laravel's own error shape
 * (`{message, errors}`) is preserved on `data` so a catch block can surface
 * field-level validation errors exactly as Laravel sent them.
 */
export const callApi = createCallApi({
  apiBaseUrl: () => useRuntimeConfig().apiBaseUrl,
  // `$fetch`'s route-typed overloads are far too heavy for the type checker here; this call is untyped on purpose.
  fetch: (path, options) => ($fetch as unknown as (path: string, options: unknown) => Promise<unknown>)(path, options),
  getAuthToken,
  clearAuthToken,
  // The socket address, never the browser-supplied X-Forwarded-For: a visitor could put anything in that header
  // and rotate it to dodge Laravel's per-IP limits. Behind nginx, have nginx set the real address on the socket
  // peer (or terminate here) rather than trusting a client-controlled chain.
  getClientIp: event => getRequestIP(event),
  createError: input => createError(input),
})

const LIST_QUERY_KEYS = ['page', 'perPage', 'q', 'status', 'archived', 'sort'] as const

const SEEK_JOB_QUERY_KEYS = ['scope', 'category', 'province', 'city', 'budgetMin', 'q', 'sort', 'page', 'perPage'] as const

/** The filters the Seek Job feed understands — nothing else is forwarded. */
export function pickSeekJobQuery(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(SEEK_JOB_QUERY_KEYS.filter(key => query[key] !== undefined && query[key] !== '').map(key => [key, query[key]]))
}

/** The paging/filter/sort params the account-area list endpoints understand — nothing else is forwarded. */
export function pickListQuery(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(LIST_QUERY_KEYS.filter(key => query[key] !== undefined && query[key] !== '').map(key => [key, query[key]]))
}
