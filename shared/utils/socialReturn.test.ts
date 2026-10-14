import { describe, expect, it } from 'vitest'
import { safeReturnTo, withSocialResult } from './socialReturn'

describe('safeReturnTo', () => {
  it('keeps a same-site path, query included', () => {
    expect(safeReturnTo('/providers/12?tab=reviews')).toBe('/providers/12?tab=reviews')
    expect(safeReturnTo('/fr/browse')).toBe('/fr/browse')
  })

  it('falls back to the home page for anything that could leave the site', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)', '', undefined, 42, '/ok\nnext']) {
      expect(safeReturnTo(bad)).toBe('/')
    }
  })

  it('drops result flags left over from an earlier round trip', () => {
    expect(safeReturnTo('/browse?social=error&reason=failed&provider=google&q=ac')).toBe('/browse?q=ac')
  })
})

describe('withSocialResult', () => {
  it('adds the result to the path without losing the existing query', () => {
    expect(withSocialResult('/browse?q=ac', { social: 'ok' })).toBe('/browse?q=ac&social=ok')
    expect(withSocialResult('/', { social: 'error', reason: 'cancelled' })).toBe('/?social=error&reason=cancelled')
  })
})
