import type { ServiceCategory } from '#shared/types/marketplace'
import { describe, expect, it } from 'vitest'
import { asIconName, categoryWithSkill, getCategoryIcon, skillOptionsFor } from './marketplace'

const CATEGORIES: ServiceCategory[] = [
  { id: 'cleaning', name: 'Cleaning', icon: 'broom', providerCount: 4 },
  { id: 'mystery', name: 'Mystery', icon: null, providerCount: 1 },
  { id: 'typo', name: 'Typo', icon: 'not-a-real-icon', providerCount: 1 },
]

describe('asIconName', () => {
  it('passes through a known icon name', () => {
    expect(asIconName('broom')).toBe('broom')
  })

  it('falls back to briefcase for null/unknown names instead of rendering blank', () => {
    expect(asIconName(null)).toBe('briefcase')
    expect(asIconName(undefined)).toBe('briefcase')
    expect(asIconName('not-a-real-icon')).toBe('briefcase')
  })

  it('accepts a custom fallback', () => {
    expect(asIconName(null, 'star')).toBe('star')
  })
})

describe('getCategoryIcon', () => {
  it('resolves the matching category\'s icon', () => {
    expect(getCategoryIcon(CATEGORIES, 'cleaning')).toBe('broom')
  })

  it('falls back to briefcase when the category has no icon or an unknown one', () => {
    expect(getCategoryIcon(CATEGORIES, 'mystery')).toBe('briefcase')
    expect(getCategoryIcon(CATEGORIES, 'typo')).toBe('briefcase')
  })

  it('falls back to briefcase when the category id is not found', () => {
    expect(getCategoryIcon(CATEGORIES, 'nope')).toBe('briefcase')
  })
})

describe('skillOptionsFor', () => {
  const withSkills: ServiceCategory[] = [
    { id: 'home-services', name: 'Home services', icon: null, providerCount: 2, skills: [{ id: 'aircon-technician', name: 'Aircon technician' }] },
    { id: 'cleaning', name: 'Cleaning', icon: null, providerCount: 1 },
  ]

  it('lists the skills of the chosen category as options', () => {
    expect(skillOptionsFor(withSkills, 'home-services')).toEqual([{ value: 'aircon-technician', label: 'Aircon technician' }])
  })

  it('is empty without a category, for an unknown one, or one without skills', () => {
    expect(skillOptionsFor(withSkills, null)).toEqual([])
    expect(skillOptionsFor(withSkills, 'nope')).toEqual([])
    expect(skillOptionsFor(withSkills, 'cleaning')).toEqual([])
  })
})

describe('categoryWithSkill', () => {
  it('appends the sub-category when there is one', () => {
    expect(categoryWithSkill('Home services', 'Aircon technician')).toBe('Home services › Aircon technician')
    expect(categoryWithSkill('Home services', null)).toBe('Home services')
    expect(categoryWithSkill(null, 'Aircon technician')).toBe('')
  })
})
