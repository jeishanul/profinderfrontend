/**
 * Lets a page temporarily hide `<AppBottomNav>` for a state change that
 * isn't a route change — e.g. `messages.vue` drilling from its conversation
 * list into a thread on mobile, where the fixed composer at the bottom of
 * `DashboardMessageThread` would otherwise stack with the tab bar. For a
 * hide that's true for an entire route instead, use `definePageMeta({
 * hideBottomNav: true })` (see `app/app.d.ts`) rather than this.
 *
 * `useState`-backed like `useAuthModal`/`useMoreMenu` (never a module-level
 * ref — see CLAUDE.md). A page that calls `hide()` on some internal state
 * change MUST call `show()` again once that state clears, including on
 * unmount, or the flag leaks and hides the bar on whatever page comes next.
 */
export function useBottomNav() {
  const isForceHidden = useState('bottom-nav-force-hidden', () => false)

  function hide() {
    isForceHidden.value = true
  }

  function show() {
    isForceHidden.value = false
  }

  return {
    isForceHidden: computed(() => isForceHidden.value),
    hide,
    show,
  }
}
