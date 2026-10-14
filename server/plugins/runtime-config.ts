import type { H3Event } from 'h3'

/** The one part of Nitro's hooks (hookable) this needs. */
interface HookCalls {
  beforeEach: (listener: (call: { name: string, args: unknown[] }) => void) => unknown
}

/**
 * Gives every request its runtime config from the copy Nitro already built at start-up.
 *
 * `useRuntimeConfig(event)` builds a fresh per-request copy the first time it is called for an event: a deep clone
 * of the whole config, then a pass that looks up an environment variable for every key. @nuxtjs/i18n calls it from
 * its `request` hook on every request, including each in-process `/api/*` call a page render makes (~10 per page).
 * Profiling the SSR server put that at ~37% of its CPU. Environment variables do not change after a Node server
 * starts, so a clone of the start-up config is the same result for a fraction of the cost.
 *
 * Runs in `beforeEach`, ahead of every `request` hook whatever order the plugins registered them in.
 */
export function primeRuntimeConfig(hooks: HookCalls, sharedConfig: Record<string, unknown>): void {
  hooks.beforeEach((call) => {
    if (call.name !== 'request') return

    // Found by shape, not position: hookable versions differ on whether the hook name is in `args` too.
    const event = call.args.find((arg): arg is H3Event => typeof arg === 'object' && arg !== null && 'context' in arg)
    if (!event) return

    event.context.nitro ??= { errors: [] }
    // A mutable copy per request, as Nitro's own would be (the shared one is frozen).
    event.context.nitro.runtimeConfig ??= clonePlain(sharedConfig)
  })
}

/**
 * Deep copy of plain data (objects, arrays, scalars), which is all runtime config holds. `structuredClone` is a
 * general serializer and cost ~8% of the server's CPU here, per request; this is what Nitro's own copy (klona) does.
 */
export function clonePlain<T>(value: T): T {
  if (Array.isArray(value)) return value.map(item => clonePlain(item)) as T
  if (value === null || typeof value !== 'object') return value

  const copy: Record<string, unknown> = {}
  for (const key of Object.keys(value)) {
    copy[key] = clonePlain((value as Record<string, unknown>)[key])
  }
  return copy as T
}

export default defineNitroPlugin(nitroApp => primeRuntimeConfig(nitroApp.hooks as never, useRuntimeConfig() as never))
