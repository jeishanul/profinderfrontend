// @vitest-environment node
import { createHooks } from 'hookable'
import { beforeAll, describe, expect, it, vi } from 'vitest'

let primeRuntimeConfig: typeof import('./runtime-config').primeRuntimeConfig
let clonePlain: typeof import('./runtime-config').clonePlain

beforeAll(async () => {
  vi.stubGlobal('defineNitroPlugin', (plugin: unknown) => plugin)
  ;({ primeRuntimeConfig, clonePlain } = await import('./runtime-config'))
  vi.unstubAllGlobals()
})

function request() {
  return { context: { nitro: { errors: [] } as { errors: unknown[], runtimeConfig?: Record<string, unknown> } } }
}

describe('primeRuntimeConfig', () => {
  const shared = Object.freeze({ public: Object.freeze({ i18n: { defaultLocale: 'en' } }), apiBaseUrl: 'http://api' })

  it('has the config in place before any request hook runs, even one registered earlier', async () => {
    const hooks = createHooks<Record<string, (event: ReturnType<typeof request>) => void>>()
    let seenByEarlierHook: unknown
    hooks.hook('request', (event) => {
      seenByEarlierHook = event.context.nitro.runtimeConfig
    })
    primeRuntimeConfig(hooks as never, shared)

    await hooks.callHook('request', request())

    expect(seenByEarlierHook).toEqual(shared)
  })

  it('gives each request its own mutable copy, never the frozen shared one', async () => {
    const hooks = createHooks()
    primeRuntimeConfig(hooks as never, shared)
    const first = request()
    const second = request()

    await hooks.callHook('request', first)
    await hooks.callHook('request', second)

    expect(first.context.nitro.runtimeConfig).not.toBe(shared)
    expect(first.context.nitro.runtimeConfig).not.toBe(second.context.nitro.runtimeConfig)
    expect(Object.isFrozen(first.context.nitro.runtimeConfig)).toBe(false)
  })

  it('finds the request when the hook name is passed along first (the hookable version Nitro bundles does)', () => {
    const before: ((call: { name: string, args: unknown[] }) => void)[] = []
    const hooks = { beforeEach: (fn: (call: { name: string, args: unknown[] }) => void) => before.push(fn) }
    primeRuntimeConfig(hooks as never, shared)
    const event = request()

    before.forEach(fn => fn({ name: 'request', args: ['request', event] }))

    expect(event.context.nitro.runtimeConfig).toEqual(shared)
  })

  it('copies config deeply, so changing the copy never reaches the shared config', () => {
    const source = { a: { b: [1, { c: 'x' }], d: null, e: true } }

    const copy = clonePlain(source)
    ;(copy.a.b[1] as { c: string }).c = 'changed'

    expect(copy).not.toBe(source)
    expect(source.a.b[1]).toEqual({ c: 'x' })
    expect(clonePlain(source)).toEqual(source)
  })

  it('leaves other hooks alone', async () => {
    const hooks = createHooks()
    primeRuntimeConfig(hooks as never, shared)
    const event = request()

    await hooks.callHook('render:before', event)

    expect(event.context.nitro.runtimeConfig).toBeUndefined()
  })
})
