/**
 * Cross-component "More" sheet state — `AppBottomNav`'s More tab opens it,
 * `AppMoreMenu` (mounted once in both layouts, next to `MarketplaceAuthModal`)
 * renders it. Same `useState`-backed single-source-of-truth pattern as
 * `useAuthModal` (see CLAUDE.md — never a module-level ref here).
 */
export function useMoreMenu() {
  const isOpen = useState('more-menu-open', () => false)

  function open() {
    isOpen.value = true
  }

  function close() {
    isOpen.value = false
  }

  return {
    isOpen: computed(() => isOpen.value),
    open,
    close,
  }
}
