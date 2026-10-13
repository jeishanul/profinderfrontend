/** Only same-site paths: anything else (`//evil.example`, `https://…`, `/\evil`) falls back to the home page. */
export function safeReturnTo(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || value.includes('\\') || [...value].some(char => char.charCodeAt(0) < 32)) return '/'
  // The result flags from an earlier round trip must not stack up.
  const url = new URL(value, 'http://local')
  for (const key of ['social', 'reason', 'provider']) url.searchParams.delete(key)
  return `${url.pathname}${url.search}`
}

export function withSocialResult(returnTo: string, params: Record<string, string>): string {
  const url = new URL(returnTo, 'http://local')
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return `${url.pathname}${url.search}`
}
