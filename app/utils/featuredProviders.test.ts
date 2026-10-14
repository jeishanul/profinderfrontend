import { describe, expect, it } from 'vitest'
import { featuredMode, featuredQuery } from './featuredProviders'

describe('featuredMode', () => {
  it('is manual only when the admin said so', () => {
    expect(featuredMode({ mode: 'manual' })).toBe('manual')
    expect(featuredMode({ mode: 'auto' })).toBe('auto')
  })

  it('is automatic for anything else, so a missing or odd setting never changes the section', () => {
    expect(featuredMode(undefined)).toBe('auto')
    expect(featuredMode({})).toBe('auto')
    expect(featuredMode({ mode: 'random' })).toBe('auto')
    expect(featuredMode({ mode: 1 })).toBe('auto')
  })
})

describe('featuredQuery', () => {
  it('automatic: verified, best rated, and the visitor\'s province when there is one', () => {
    expect(featuredQuery('auto', 8)).toEqual({ perPage: 8, sort: 'rating', verifiedOnly: true })
    expect(featuredQuery('auto', 8, '0722')).toEqual({ perPage: 8, sort: 'rating', verifiedOnly: true, province: '0722' })
    expect(featuredQuery('auto', 8, null)).not.toHaveProperty('province')
  })

  it('manual: only the featured providers, ignoring verification and any province preference', () => {
    expect(featuredQuery('manual', 6)).toEqual({ perPage: 6, sort: 'rating', featuredOnly: true })
    expect(featuredQuery('manual', 6, '0722')).toEqual({ perPage: 6, sort: 'rating', featuredOnly: true })
    expect(featuredQuery('manual', 6)).not.toHaveProperty('verifiedOnly')
  })
})
