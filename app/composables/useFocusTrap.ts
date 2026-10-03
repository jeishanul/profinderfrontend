const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Keeps Tab/Shift+Tab cycling within `containerRef` while `isActive` is true,
 * and returns focus to whatever had it beforehand once it goes false — a
 * dialog/lightbox otherwise lets Tab escape into the page behind it, and
 * loses the keyboard user's place entirely on close.
 */
export function useFocusTrap(containerRef: Ref<HTMLElement | null | undefined>, isActive: Ref<boolean>) {
  let previouslyFocused: HTMLElement | null = null

  function focusableElements(): HTMLElement[] {
    const root = containerRef.value
    if (!root) return []
    return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(el => el.offsetParent !== null)
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    const elements = focusableElements()
    if (elements.length === 0) return
    const first = elements[0]!
    const last = elements[elements.length - 1]!
    const active = document.activeElement as HTMLElement | null
    const isInside = active ? (containerRef.value?.contains(active) ?? false) : false

    if (event.shiftKey) {
      if (!isInside || active === first) {
        event.preventDefault()
        last.focus()
      }
    }
    else if (!isInside || active === last) {
      event.preventDefault()
      first.focus()
    }
  }

  watch(isActive, (active) => {
    if (!import.meta.client) return
    if (active) {
      previouslyFocused = document.activeElement as HTMLElement | null
      document.addEventListener('keydown', handleKeydown)
    }
    else {
      document.removeEventListener('keydown', handleKeydown)
      previouslyFocused?.focus?.()
      previouslyFocused = null
    }
  })

  onUnmounted(() => {
    if (import.meta.client) document.removeEventListener('keydown', handleKeydown)
  })
}
