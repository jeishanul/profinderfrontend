export interface UseCarouselOptions {
  /** How many items are visible at once — bounds the index so the track never scrolls past the last item. */
  visibleCount?: MaybeRefOrGetter<number>
  intervalMs?: number
  autoplay?: boolean
}

/**
 * Auto-advancing, pause-on-hover carousel index. Shared by the category
 * carousel, the jobs gallery, and the testimonial slider — anywhere the
 * design calls for an auto-sliding track of cards.
 */
export function useCarousel(itemCount: MaybeRefOrGetter<number>, options: UseCarouselOptions = {}) {
  const { intervalMs = 4000, autoplay = true } = options

  const visibleCount = computed(() => Math.max(1, toValue(options.visibleCount ?? 1)))
  const cycleLength = computed(() => Math.max(1, toValue(itemCount) - visibleCount.value + 1))

  const index = ref(0)
  const isPaused = ref(false)

  function wrap(value: number): number {
    const length = cycleLength.value
    return ((value % length) + length) % length
  }

  function next() {
    index.value = wrap(index.value + 1)
  }
  function prev() {
    index.value = wrap(index.value - 1)
  }
  function goTo(value: number) {
    index.value = wrap(value)
  }
  function pause() {
    isPaused.value = true
  }
  function resume() {
    isPaused.value = false
  }

  // A hidden tab neither advances nor wakes up for it: the timer stops while hidden and restarts when it's shown.
  const visibility = useDocumentVisibility()
  const timer = useIntervalFn(() => {
    if (!isPaused.value) next()
  }, intervalMs, { immediate: autoplay })
  if (autoplay) {
    watch(visibility, (state) => {
      if (state === 'hidden') timer.pause()
      else timer.resume()
    })
  }

  watch(cycleLength, (length) => {
    if (index.value > length - 1) index.value = 0
  })

  return {
    index: readonly(index),
    cycleLength,
    isPaused: readonly(isPaused),
    next,
    prev,
    goTo,
    pause,
    resume,
  }
}
