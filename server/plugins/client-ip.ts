/**
 * Tags every request with the visitor's address before any middleware runs, so nuxt-security's limiter and
 * `callApi` both see the real visitor, including on SSR sub-requests (see `server/utils/clientIp.ts`).
 */
export default defineNitroPlugin((nitroApp) => {
  const trustedProxies = parseTrustedProxies(useRuntimeConfig().trustedProxies)
  nitroApp.hooks.hook('request', event => tagClientRequest(event, trustedProxies))
})
