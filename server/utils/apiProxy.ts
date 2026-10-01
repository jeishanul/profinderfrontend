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

/**
 * Calls the Laravel API from server-side code. Laravel's own error shape
 * (`{message, errors}`) is preserved on `data` so a catch block can surface
 * field-level validation errors exactly as Laravel sent them.
 */
export async function callApi<T>(event: H3Event, path: string, options: ApiCallOptions = {}): Promise<T> {
  const config = useRuntimeConfig()
  const token = options.auth !== false ? getAuthToken(event) : undefined
  const clientIp = getRequestIP(event, { xForwardedFor: true })

  try {
    const response = await $fetch(path, {
      baseURL: `${config.apiBaseUrl}/api/v1`,
      method: options.method ?? 'GET',
      body: options.body as BodyInit | Record<string, unknown> | null | undefined,
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
    if (token && fetchError.response?.status === 401) clearAuthToken(event)

    throw createError({
      statusCode: fetchError.response?.status ?? 500,
      statusMessage: fetchError.response?._data?.message ?? 'Something went wrong.',
      data: fetchError.response?._data,
    })
  }
}

const LIST_QUERY_KEYS = ['page', 'perPage', 'q', 'status', 'archived'] as const

/** The paging/filter params the account-area list endpoints understand — nothing else is forwarded. */
export function pickListQuery(query: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(LIST_QUERY_KEYS.filter(key => query[key] !== undefined && query[key] !== '').map(key => [key, query[key]]))
}
