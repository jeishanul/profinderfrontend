import type { H3Event, H3EventContext } from 'h3'

/**
 * Server-Timing for SSR pages (opt-in: `NUXT_SERVER_TIMING=true`, see `server/plugins/server-timing.ts`). A page's
 * response says how long the render took and how long each backend call inside it took, with Laravel's own split
 * (`SERVER_TIMING=true` in the backend) between PHP and MySQL. Browser devtools show it under Network → Timing, so a
 * slow page can be traced to the call that made it slow, in production, without a profiler.
 */
export interface ApiTiming {
  path: string
  ms: number
  /** Laravel's own `Server-Timing` header for that call, when it sent one. */
  backend: string | null
}

const MAX_LISTED_CALLS = 15

/**
 * Where a call's timing is collected: the page request's context. An SSR sub-request (an in-process `/api/*` call
 * made during the render) has its own event, whose mock request carries the page's context as `__unenv__`.
 */
export function timingContext(event: H3Event): H3EventContext {
  return (event.node.req as { __unenv__?: H3EventContext }).__unenv__ ?? event.context
}

export function recordApiTiming(event: H3Event, timing: ApiTiming): void {
  const context = timingContext(event)
  ;((context.apiTimings ??= []) as ApiTiming[]).push(timing)
}

/** `ssr;dur=…, api;dur=…;desc="N calls", api1;dur=…;desc="/home - db 3.1 ms, 4 queries", …` */
export function serverTimingHeader(totalMs: number, timings: readonly ApiTiming[]): string {
  const entries = [
    `ssr;dur=${totalMs.toFixed(1)}`,
    `api;dur=${timings.reduce((sum, timing) => sum + timing.ms, 0).toFixed(1)};desc="${timings.length} calls"`,
  ]

  timings.slice(0, MAX_LISTED_CALLS).forEach((timing, index) => {
    entries.push(`api${index + 1};dur=${timing.ms.toFixed(1)};desc="${describe(timing)}"`)
  })

  return entries.join(', ')
}

function describe(timing: ApiTiming): string {
  const db = timing.backend?.match(/db;dur=([\d.]+);desc="(\d+) queries"/)
  const label = db ? `${timing.path} - db ${db[1]} ms, ${db[2]} queries` : timing.path
  // A quoted-string in the header: no quotes or backslashes inside, and nothing outside printable ASCII.
  return label.replace(/["\\]/g, '').replace(/[^\x20-\x7E]/g, '?')
}
