// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { canonicalHostRedirect } from './canonicalHost'

describe('canonicalHostRedirect', () => {
  const www = 'https://www.profinder.vip'

  it('sends the bare domain to www, keeping the path and query', () => {
    expect(canonicalHostRedirect(www, 'profinder.vip', '/')).toBe('https://www.profinder.vip/')
    expect(canonicalHostRedirect(www, 'Profinder.VIP', '/ph/cebu?page=2')).toBe('https://www.profinder.vip/ph/cebu?page=2')
    expect(canonicalHostRedirect(`${www}/`, 'profinder.vip:443', '/category/plumber')).toBe('https://www.profinder.vip/category/plumber')
  })

  it('leaves the canonical host alone', () => {
    expect(canonicalHostRedirect(www, 'www.profinder.vip', '/')).toBeNull()
    expect(canonicalHostRedirect(www, 'WWW.profinder.vip.', '/')).toBeNull()
  })

  it('never redirects internal or unrelated hosts', () => {
    expect(canonicalHostRedirect(www, '127.0.0.1:3001', '/')).toBeNull()
    expect(canonicalHostRedirect(www, 'localhost', '/')).toBeNull()
    expect(canonicalHostRedirect(www, 'admin.profinder.vip', '/')).toBeNull()
    expect(canonicalHostRedirect(www, undefined, '/')).toBeNull()
  })

  it('works the other way round when the site lives on the bare domain', () => {
    expect(canonicalHostRedirect('https://profinder.vip', 'www.profinder.vip', '/about')).toBe('https://profinder.vip/about')
    expect(canonicalHostRedirect('https://profinder.vip', 'profinder.vip', '/')).toBeNull()
  })

  it('does nothing without a usable site URL', () => {
    expect(canonicalHostRedirect('', 'profinder.vip', '/')).toBeNull()
  })
})
