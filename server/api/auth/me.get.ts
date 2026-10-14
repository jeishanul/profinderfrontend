/**
 * Used to hydrate `useSession` on every load — returns `null` for "not
 * logged in" instead of a 401, since that's an expected, common state here
 * (unlike every other authenticated route, where a 401 really is an error).
 */
export default defineEventHandler(async (event) => {
  if (!getAuthToken(event)) {
    return null
  }

  try {
    return await callApi(event, '/auth/me')
  }
  catch {
    // Render this page as logged out. The cookie is kept: a stale/expired/revoked token comes back as a 401, and
    // `callApi` has already cleared it for that. Any other failure (a timeout, a 5xx) says nothing about the token,
    // so clearing it here would log the person out over a passing backend hiccup.
    return null
  }
})
