import { describe, expect, it } from 'vitest'
import { nextTick, ref } from 'vue'
import { useFocusTrap } from './useFocusTrap'

function buildDialog(): { container: HTMLElement, first: HTMLButtonElement, last: HTMLButtonElement } {
  const container = document.createElement('div')
  const first = document.createElement('button')
  const middle = document.createElement('button')
  const last = document.createElement('button')
  container.append(first, middle, last)
  document.body.append(container)
  return { container, first, last }
}

describe('useFocusTrap', () => {
  it('wraps Tab from the last element back to the first', async () => {
    const { container, first, last } = buildDialog()
    const isActive = ref(false)
    useFocusTrap(ref(container), isActive)

    isActive.value = true
    await nextTick()
    last.focus()
    expect(document.activeElement).toBe(last)

    const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })
    document.dispatchEvent(event)

    expect(document.activeElement).toBe(first)

    container.remove()
  })

  it('wraps Shift+Tab from the first element back to the last', async () => {
    const { container, first, last } = buildDialog()
    const isActive = ref(false)
    useFocusTrap(ref(container), isActive)

    isActive.value = true
    await nextTick()
    first.focus()

    const event = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })
    document.dispatchEvent(event)

    expect(document.activeElement).toBe(last)

    container.remove()
  })

  it('restores focus to whatever had it before the trap activated', async () => {
    const trigger = document.createElement('button')
    document.body.append(trigger)
    trigger.focus()

    const { container } = buildDialog()
    const isActive = ref(false)
    useFocusTrap(ref(container), isActive)

    isActive.value = true
    await nextTick()
    isActive.value = false
    await nextTick()

    expect(document.activeElement).toBe(trigger)

    container.remove()
    trigger.remove()
  })
})
