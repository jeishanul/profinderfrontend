import { describe, expect, it } from 'vitest'
import { useBottomNav } from './useBottomNav'

describe('useBottomNav', () => {
  it('starts not force-hidden', () => {
    const bottomNav = useBottomNav()

    expect(bottomNav.isForceHidden.value).toBe(false)
  })

  it('hide() and show() toggle the flag', () => {
    const bottomNav = useBottomNav()

    bottomNav.hide()
    expect(bottomNav.isForceHidden.value).toBe(true)

    bottomNav.show()
    expect(bottomNav.isForceHidden.value).toBe(false)
  })

  it('shares state across separate calls (single source of truth)', () => {
    const a = useBottomNav()
    const b = useBottomNav()

    a.hide()
    expect(b.isForceHidden.value).toBe(true)

    b.show()
    expect(a.isForceHidden.value).toBe(false)
  })
})
