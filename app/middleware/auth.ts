/**
 * Guards every logged-in panel page (applied via `definePageMeta({
 * middleware: 'auth' })` on each one — `/dashboard`, `/profile`, etc.). Real
 * session now: hydrates once from `/api/auth/me` (via `useSession`) if it
 * hasn't already this request, then redirects home and opens the login modal
 * if that comes back unauthenticated.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const session = useSession()

  // The global middleware has usually started the check already; this waits for that same request.
  await session.loadUser()

  if (session.isAuthenticated.value) return

  const authModal = useAuthModal()
  // After logging in, land on the page they were trying to reach (not the dashboard).
  authModal.open('login', { redirect: to.fullPath })

  const localePath = useLocalePath()
  return navigateTo(localePath('/'))
})
