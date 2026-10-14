/**
 * Adds a `Server-Timing` header to responses when `NUXT_SERVER_TIMING=true`: the whole request, and each backend call
 * made for it (`callApi` records them, see `server/utils/serverTiming.ts`). Off by default, since it tells anyone how
 * the backend is doing; turn it on to find which call makes a page slow.
 */
export default defineNitroPlugin((nitroApp) => {
  if (!useRuntimeConfig().serverTiming) return

  nitroApp.hooks.hook('request', (event) => {
    if (!isInternalRequest(event)) event.context.timingStart = performance.now()
  })

  nitroApp.hooks.hook('beforeResponse', (event) => {
    // Sub-requests report into the page's own header instead.
    if (isInternalRequest(event) || event.context.timingStart === undefined || event.node.res.headersSent) return

    setResponseHeader(event, 'Server-Timing', serverTimingHeader(performance.now() - event.context.timingStart, event.context.apiTimings ?? []))
  })
})
