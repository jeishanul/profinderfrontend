import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useToast } from './useToast'

describe('useToast', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useToast().toasts.value = []
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pushes a toast with its tone and message', () => {
    const toast = useToast()
    toast.success('Saved')

    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]).toMatchObject({ tone: 'success', message: 'Saved' })
  })

  it('auto-dismisses after a few seconds', () => {
    const toast = useToast()
    toast.error('Nope')

    vi.advanceTimersByTime(4001)

    expect(toast.toasts.value).toHaveLength(0)
  })

  it('dismiss() removes only the targeted toast', () => {
    const toast = useToast()
    const first = toast.info('one')
    toast.info('two')

    toast.dismiss(first)

    expect(toast.toasts.value.map(t => t.message)).toEqual(['two'])
  })
})

describe('useToast actions', () => {
  it('keeps a toast with an action longer than a plain one', () => {
    vi.useFakeTimers()
    const toast = useToast()
    toast.toasts.value = []
    toast.success('Archived', { label: 'Undo', run: () => {} })

    vi.advanceTimersByTime(4500)
    expect(toast.toasts.value).toHaveLength(1)
    expect(toast.toasts.value[0]?.action?.label).toBe('Undo')

    vi.advanceTimersByTime(3000)
    expect(toast.toasts.value).toHaveLength(0)
    vi.useRealTimers()
  })
})
