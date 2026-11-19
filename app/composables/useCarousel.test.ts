import { describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick } from 'vue'
import { useCarousel } from './useCarousel'

describe('useCarousel', () => {
  it('advances on an interval and wraps at the bound set by visibleCount', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const carousel = scope.run(() => useCarousel(5, { visibleCount: 2, intervalMs: 1000 }))!

    expect(carousel.index.value).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(carousel.index.value).toBe(1)

    // cycleLength = 5 - 2 + 1 = 4, so index wraps back to 0 after 4 ticks total.
    vi.advanceTimersByTime(1000 * 3)
    expect(carousel.index.value).toBe(0)

    scope.stop()
    vi.useRealTimers()
  })

  it('pauses and resumes autoplay', () => {
    vi.useFakeTimers()
    const scope = effectScope()
    const carousel = scope.run(() => useCarousel(3, { intervalMs: 1000 }))!

    carousel.pause()
    vi.advanceTimersByTime(5000)
    expect(carousel.index.value).toBe(0)

    carousel.resume()
    vi.advanceTimersByTime(1000)
    expect(carousel.index.value).toBe(1)

    scope.stop()
    vi.useRealTimers()
  })

  it('stops advancing while the tab is hidden and picks up again when shown', async () => {
    vi.useFakeTimers()
    let visibility: DocumentVisibilityState = 'visible'
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    const scope = effectScope()
    const carousel = scope.run(() => useCarousel(3, { intervalMs: 1000 }))!

    visibility = 'hidden'
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    vi.advanceTimersByTime(5000)
    expect(carousel.index.value).toBe(0)

    visibility = 'visible'
    document.dispatchEvent(new Event('visibilitychange'))
    await nextTick()
    vi.advanceTimersByTime(1000)
    expect(carousel.index.value).toBe(1)

    scope.stop()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('next/prev/goTo wrap within the cycle', () => {
    const scope = effectScope()
    const carousel = scope.run(() => useCarousel(4, { visibleCount: 1, autoplay: false }))!

    carousel.prev()
    expect(carousel.index.value).toBe(3)

    carousel.goTo(10)
    expect(carousel.index.value).toBe(2)

    scope.stop()
  })
})
