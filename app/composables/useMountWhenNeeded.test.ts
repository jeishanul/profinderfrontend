import { describe, expect, it } from 'vitest'
import { useMountWhenNeeded } from './useMountWhenNeeded'

describe('useMountWhenNeeded', () => {
  it('stays unmounted until first needed, then stays mounted after it is closed', async () => {
    const open = ref(false)
    const mounted = useMountWhenNeeded(() => open.value)
    expect(mounted.value).toBe(false)

    open.value = true
    await nextTick()
    expect(mounted.value).toBe(true)

    open.value = false
    await nextTick()
    expect(mounted.value).toBe(true)
  })

  it('is mounted at once when already needed (e.g. an OAuth result in the URL on arrival)', () => {
    expect(useMountWhenNeeded(() => true).value).toBe(true)
  })
})
