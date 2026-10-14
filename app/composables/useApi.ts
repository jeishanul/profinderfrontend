/**
 * Centralized `useFetch` factory: every feature composable that talks to our
 * own API should build on this instead of calling `useFetch`/`$fetch` directly,
 * so base URL, auth headers and error handling stay in one place.
 */
export const useApi = createUseFetch({
  baseURL: '/api',
  // Longer than the proxy's own Laravel timeout (API_TIMEOUT_MS.read in server/utils/apiProxy.ts), so a slow API
  // comes back as the proxy's clean 504 rather than an aborted request. Either way a render never hangs.
  timeout: 8000,
  // During SSR the call is in-process and the proxy behind it does not retry either, so a slow API delays the
  // page once rather than twice. In the browser, keep ofetch's single retry for flaky connections.
  retry: import.meta.server ? 0 : 1,
  onResponseError({ response }) {
    if (response.status === 401) {
      // The Nitro proxy layer (server/utils/apiProxy.ts) already cleared the
      // stale cookie server-side — mirror that locally so `isAuthenticated`
      // flips immediately, and prompt the person to log back in.
      useSession().clearLocal()
      useAuthModal().open('login')
    }
  },
})
