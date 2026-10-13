import { describe, expect, it } from 'vitest'
import { parseBrowseQuery, toBrowseRouteQuery, toProviderApiQuery } from './browseQuery'
import { PRICE_MAX, PRICE_MIN } from './marketplace'

describe('parseBrowseQuery', () => {
  it('uses defaults for an empty URL', () => {
    expect(parseBrowseQuery({})).toMatchObject({ q: '', sort: 'recommended', categories: [], page: 1, minPrice: PRICE_MIN, maxPrice: PRICE_MAX, verifiedOnly: false })
  })

  it('reads lists from comma strings and repeated params, and the old `category` spelling', () => {
    expect(parseBrowseQuery({ categories: 'cleaning,plumber' }).categories).toEqual(['cleaning', 'plumber'])
    expect(parseBrowseQuery({ categories: ['cleaning', 'plumber,painter'] }).categories).toEqual(['cleaning', 'plumber', 'painter'])
    expect(parseBrowseQuery({ category: 'cleaning' }).categories).toEqual(['cleaning'])
  })

  it('ignores an unknown sort and clamps the page', () => {
    expect(parseBrowseQuery({ sort: 'cheapest-ever' }).sort).toBe('recommended')
    expect(parseBrowseQuery({ page: '-3' }).page).toBe(1)
  })
})

describe('toBrowseRouteQuery', () => {
  it('round-trips and leaves defaults out of the URL', () => {
    expect(toBrowseRouteQuery(parseBrowseQuery({}))).toEqual({})

    const query = { q: 'ac', sort: 'rating', categories: 'cleaning,plumber', province: '0722', verifiedOnly: 'true', minPrice: '500', page: '2' }
    expect(toBrowseRouteQuery(parseBrowseQuery(query))).toEqual(query)
  })
})

describe('toProviderApiQuery', () => {
  it('maps price to minRate/maxRate only when narrowed, and drops empty filters', () => {
    const wide = toProviderApiQuery(parseBrowseQuery({}), 6)
    expect(wide).toMatchObject({ minRate: undefined, maxRate: undefined, perPage: 6, page: 1 })

    const narrow = toProviderApiQuery(parseBrowseQuery({ minPrice: '300', maxPrice: '900', verifiedOnly: 'true' }), 6)
    expect(narrow).toMatchObject({ minRate: 300, maxRate: 900, verifiedOnly: true })
  })
})
