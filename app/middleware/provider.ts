/**
 * For the provider-only pages (Services, Clients served). Runs after `auth`;
 * a client who opens one by URL is sent to the "become a provider" page
 * instead of seeing an empty page whose every action fails with a 404.
 */
export default defineNuxtRouteMiddleware(() => {
  const session = useSession()

  if (!session.isAuthenticated.value || session.isProvider.value) return

  const localePath = useLocalePath()
  return navigateTo(localePath('/become-a-provider'))
})
