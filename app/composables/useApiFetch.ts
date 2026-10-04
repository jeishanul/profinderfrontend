import type { FetchOptions } from 'ofetch'

/**
 * One-off (non-reactive) calls to our own backend — form submits, uploads,
 * toggles — go through this instead of a bare `$fetch`. `security.csrf` is
 * on (see `nuxt.config.ts`), which rejects every POST/PUT/PATCH without a
 * matching `csrf-token` header; `nuxt-csurf`'s own `$csrfFetch` (from its
 * Nuxt plugin) attaches it automatically. Reactive/initial-load fetches
 * still go through `useApi` (see CLAUDE.md's Composables & utils rules).
 */
export function useApiFetch<T = unknown>(request: string, options?: FetchOptions<'json'>): Promise<T> {
  return useNuxtApp().$csrfFetch<T>(request, {
    ...options,
    onResponseError(context) {
      // Mirror `useApi`: an expired session on a button press/save must send
      // the person back to login instead of failing silently. The auth
      // endpoints themselves legitimately return 401 (bad token on logout,
      // etc.) and handle their own errors, so they're excluded.
      if (context.response.status === 401 && !request.startsWith('/api/auth/')) {
        useSession().clearLocal()
        useAuthModal().open('login')
      }
      // @ts-expect-error ofetch's hook type is a union of fn | fn[]; callers here only pass a single fn.
      return options?.onResponseError?.(context)
    },
  })
}
