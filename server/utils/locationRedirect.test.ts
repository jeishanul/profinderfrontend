// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { landingPath } from './locationRedirect'

describe('landingPath', () => {
  it('normalises province, city and barangay paths', () => {
    expect(landingPath('/ph/Maguindanao/Barira/')).toBe('/ph/maguindanao/barira')
    expect(landingPath('/ph/compostela-valley?page=2')).toBe('/ph/compostela-valley')
    expect(landingPath('/ph/cavite/bacoor-city/aniban-iii')).toBe('/ph/cavite/bacoor-city/aniban-iii')
  })

  it('normalises category and sub-category paths', () => {
    expect(landingPath('/category/Plumber/')).toBe('/category/plumber')
    expect(landingPath('/category/pet-care-animal-services/veterinarians?page=2')).toBe('/category/pet-care-animal-services/veterinarians')
  })

  it('ignores everything that is not a landing page', () => {
    expect(landingPath('/ph')).toBeNull()
    expect(landingPath('/ph/a/b/c/d')).toBeNull()
    expect(landingPath('/category')).toBeNull()
    expect(landingPath('/category/a/b/c')).toBeNull()
    expect(landingPath('/api/seo/location/cebu')).toBeNull()
    expect(landingPath('/ph/%E0%A4%A')).toBeNull()
  })
})
