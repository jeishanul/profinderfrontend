/**
 * Starts the shop cart in the browser once the app has mounted: reads a guest's cart from storage, loads a signed-in
 * shopper's cart for the header badge, and merges the guest cart into the account on login (see `useShopCart`).
 * After mount, so the badge never changes the markup during hydration.
 */
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.hook('app:mounted', () => {
    nuxtApp.runWithContext(() => useShopCart().init())
  })
})
