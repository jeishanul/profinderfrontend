import { describe, expect, it } from 'vitest'
import {
  CLIENT_IP_HEADER,
  DEFAULT_TRUSTED_PROXIES,
  INTERNAL_RATE_LIMIT_KEY,
  RATE_LIMIT_KEY_HEADER,
  getVisitorIp,
  parseTrustedProxies,
  resolveClientIp,
  tagClientRequest,
} from './clientIp'

type FakeHeaders = Record<string, string | string[] | undefined>

/** A request as Node delivers it from a socket. */
function externalRequest(peer: string | undefined, headers: FakeHeaders = {}) {
  return { node: { req: { headers: { ...headers }, socket: { remoteAddress: peer } } } } as never as Parameters<typeof tagClientRequest>[0]
}

/** An SSR sub-request as Nitro runs it in-process: a node-mock-http request (marked `__unenv__`, no real peer). */
function internalRequest(headers: FakeHeaders) {
  return { node: { req: { __unenv__: {}, headers: { ...headers }, socket: { remoteAddress: '' } } } } as never as Parameters<typeof tagClientRequest>[0]
}

describe('resolveClientIp', () => {
  it('uses the address nginx forwards when the connection comes from nginx', () => {
    expect(resolveClientIp('127.0.0.1', '203.0.113.9', DEFAULT_TRUSTED_PROXIES)).toBe('203.0.113.9')
  })

  it('ignores X-Forwarded-For from anyone who is not a trusted proxy', () => {
    expect(resolveClientIp('198.51.100.7', '1.2.3.4', DEFAULT_TRUSTED_PROXIES)).toBe('198.51.100.7')
  })

  it('reads the chain from the right, so an address a browser prepends is never believed', () => {
    // The browser sent "X-Forwarded-For: 1.2.3.4"; a proxy that appends added the real peer after it.
    expect(resolveClientIp('127.0.0.1', '1.2.3.4, 203.0.113.9', DEFAULT_TRUSTED_PROXIES)).toBe('203.0.113.9')
  })

  it('skips further trusted hops in the chain', () => {
    expect(resolveClientIp('127.0.0.1', '203.0.113.9, 10.0.0.2', ['127.0.0.1', '10.0.0.2'])).toBe('203.0.113.9')
  })

  it('falls back to the peer when the proxy sent no X-Forwarded-For', () => {
    expect(resolveClientIp('127.0.0.1', undefined, DEFAULT_TRUSTED_PROXIES)).toBe('127.0.0.1')
  })
})

describe('tagClientRequest', () => {
  it('tags a request that came through nginx with the visitor\'s address', () => {
    const event = externalRequest('127.0.0.1', { 'x-forwarded-for': '203.0.113.9' })

    tagClientRequest(event, DEFAULT_TRUSTED_PROXIES)

    expect(getVisitorIp(event)).toBe('203.0.113.9')
    expect(event.node.req.headers[RATE_LIMIT_KEY_HEADER]).toBe('203.0.113.9')
  })

  it('overwrites the tags when a browser sends them itself, so nobody can claim to be an internal request', () => {
    const event = externalRequest('198.51.100.7', { [CLIENT_IP_HEADER]: '1.1.1.1', [RATE_LIMIT_KEY_HEADER]: INTERNAL_RATE_LIMIT_KEY })

    tagClientRequest(event, DEFAULT_TRUSTED_PROXIES)

    expect(getVisitorIp(event)).toBe('198.51.100.7')
    expect(event.node.req.headers[RATE_LIMIT_KEY_HEADER]).toBe('198.51.100.7')
  })

  it('lets an SSR sub-request keep the visitor\'s address it inherited and exempts it from the limiter', () => {
    // Nitro copies the page request's (already tagged) headers onto the sub-request.
    const event = internalRequest({ [CLIENT_IP_HEADER]: '203.0.113.9', [RATE_LIMIT_KEY_HEADER]: '203.0.113.9' })

    tagClientRequest(event, DEFAULT_TRUSTED_PROXIES)

    expect(getVisitorIp(event)).toBe('203.0.113.9')
    expect(event.node.req.headers[RATE_LIMIT_KEY_HEADER]).toBe(INTERNAL_RATE_LIMIT_KEY)
  })

  it('drops the tags when the connection has no address at all', () => {
    const event = externalRequest(undefined, { [CLIENT_IP_HEADER]: '1.1.1.1', [RATE_LIMIT_KEY_HEADER]: '1.1.1.1' })

    tagClientRequest(event, DEFAULT_TRUSTED_PROXIES)

    expect(getVisitorIp(event)).toBeUndefined()
    expect(event.node.req.headers[RATE_LIMIT_KEY_HEADER]).toBeUndefined()
  })
})

describe('parseTrustedProxies', () => {
  it('defaults to loopback and accepts a comma-separated list', () => {
    expect(parseTrustedProxies('')).toEqual(DEFAULT_TRUSTED_PROXIES)
    expect(parseTrustedProxies(' 10.0.0.2 , 10.0.0.3 ')).toEqual(['10.0.0.2', '10.0.0.3'])
  })
})
