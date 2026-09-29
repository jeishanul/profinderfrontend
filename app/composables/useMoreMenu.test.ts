import { describe, expect, it } from 'vitest'
import { useMoreMenu } from './useMoreMenu'

describe('useMoreMenu', () => {
  it('starts closed', () => {
    const menu = useMoreMenu()

    expect(menu.isOpen.value).toBe(false)
  })

  it('open() and close() toggle visibility', () => {
    const menu = useMoreMenu()

    menu.open()
    expect(menu.isOpen.value).toBe(true)

    menu.close()
    expect(menu.isOpen.value).toBe(false)
  })

  it('shares state across separate calls (single source of truth)', () => {
    const a = useMoreMenu()
    const b = useMoreMenu()

    a.open()
    expect(b.isOpen.value).toBe(true)

    b.close()
    expect(a.isOpen.value).toBe(false)
  })
})
