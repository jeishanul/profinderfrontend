import { describe, expect, it } from 'vitest'
import type { H3Event } from 'h3'
import { recordApiTiming, serverTimingHeader } from './serverTiming'

type Event = H3Event

describe('serverTimingHeader', () => {
  it('reports the whole request, the total of the backend calls, and each call with Laravel\'s database share', () => {
    const header = serverTimingHeader(152.34, [
      { path: '/home', ms: 40.2, backend: 'app;dur=30.0, db;dur=3.1;desc="4 queries"' },
      { path: '/settings', ms: 9.8, backend: null },
    ])

    expect(header).toBe('ssr;dur=152.3, api;dur=50.0;desc="2 calls", api1;dur=40.2;desc="/home - db 3.1 ms, 4 queries", api2;dur=9.8;desc="/settings"')
  })

  it('keeps a call\'s description a valid quoted string', () => {
    expect(serverTimingHeader(1, [{ path: '/pages/"x\\', ms: 1, backend: null }])).toContain('desc="/pages/x"')
  })
})

describe('timingContext', () => {
  it('collects an SSR sub-request\'s calls on the page request that made it', () => {
    const page = { node: { req: {} }, context: {} } as unknown as Event
    const subRequest = { node: { req: { __unenv__: page.context } }, context: {} } as unknown as Event

    recordApiTiming(subRequest, { path: '/home', ms: 5, backend: null })
    recordApiTiming(page, { path: '/settings', ms: 2, backend: null })

    expect(page.context.apiTimings).toHaveLength(2)
    expect(subRequest.context.apiTimings).toBeUndefined()
  })
})
