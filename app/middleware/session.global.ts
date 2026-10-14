/**
 * Runs on every route (the `.global.ts` suffix, not just pages with
 * `middleware: 'auth'`) — hydrates the session from `/api/auth/me` once per
 * request/app-load so a logged-in person shows as logged in everywhere
 * (header, "Save"/"Message" affordances on public pages), not just inside
 * the dashboard. `auth.ts` still does its own redirect-if-unauthenticated
 * check for dashboard routes; this only does the hydration part, which was
 * previously only reachable through that middleware, so any public page a
 * logged-in person opened first (a shared provider link, a fresh tab on the
 * homepage) rendered the header as if they were signed out.
 *
 * It only *starts* the check: `app.vue` awaits it together with settings and navigation, so on a public page the
 * session no longer holds up everything else. It is still settled before any page renders, and `auth.ts` awaits
 * it before deciding whether to redirect.
 */
export default defineNuxtRouteMiddleware(() => {
  const session = useSession()

  if (session.status.value !== 'ready') {
    // Errors surface where it is awaited (app.vue, auth.ts). This copy only must not become an unhandled
    // rejection, e.g. when an error page renders instead of app.vue.
    session.loadUser().catch(() => {})
  }
})
