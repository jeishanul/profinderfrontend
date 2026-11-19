import { describe, expect, it } from 'vitest'
import { AVATAR_FALLBACK_PIXELS, avatarPixels } from './avatarPixels'

describe('avatarPixels', () => {
  it('reads Tailwind spacing-scale heights', () => {
    expect(avatarPixels('h-9 w-9 rounded-full')).toBe(36)
    expect(avatarPixels('mx-auto mb-4 h-14 w-14 rounded-full')).toBe(56)
    expect(avatarPixels('size-12 rounded-2xl')).toBe(48)
  })

  it('reads arbitrary pixel heights', () => {
    expect(avatarPixels('h-[76px] w-[76px] rounded-2xl')).toBe(76)
  })

  it('ignores responsive variants and falls back when the size comes from the parent', () => {
    expect(avatarPixels('h-10 sm:h-16')).toBe(40)
    expect(avatarPixels('h-full w-full rounded-full')).toBe(AVATAR_FALLBACK_PIXELS)
  })
})
