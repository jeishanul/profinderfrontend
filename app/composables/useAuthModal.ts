export type AuthModalView = 'login' | 'register' | 'forgot-password' | 'otp' | 'reset-password' | 'two-factor' | 'verify-email'

export interface AuthModalOptions {
  /** Where to go after a successful login/sign-up — e.g. the page that required it. */
  redirect?: string
  /** Runs after a successful login/sign-up instead of navigating — e.g. "save this provider", the action the visitor was trying. */
  onSuccess?: () => void
}

interface AuthModalState {
  isOpen: boolean
  view: AuthModalView
  /**
   * Carried across the forgot-password → otp → reset-password steps so each
   * step can display/reuse it (e.g. "Change email" going back a step) without
   * re-asking or the caller having to thread it through manually.
   */
  resetEmail: string
  /** What the visitor was trying to do when asked to log in; see `AuthModalOptions`. */
  redirect: string | null
  onSuccess: (() => void) | null
}

/**
 * Cross-component auth modal state — any "Log in" / "Sign up" / "Message"
 * control anywhere in the app opens the same modal (mounted once in
 * `layouts/default.vue`) on the requested view. `useState` keeps it
 * request-isolated under SSR (see CLAUDE.md — never a module-level ref here).
 */
export function useAuthModal() {
  const state = useState<AuthModalState>('auth-modal', () => ({
    isOpen: false,
    view: 'login',
    resetEmail: '',
    redirect: null,
    onSuccess: null,
  }))

  function open(view: AuthModalView = 'login', options: AuthModalOptions = {}) {
    state.value = { ...state.value, isOpen: true, view, redirect: options.redirect ?? null, onSuccess: options.onSuccess ?? null }
  }

  /**
   * Called when login/sign-up succeeded: closes the modal and carries on with
   * what the visitor was doing — their `onSuccess` action, else their
   * `redirect` page — instead of always dumping them on the dashboard.
   */
  async function complete(): Promise<void> {
    const { onSuccess, redirect } = state.value
    state.value = { ...state.value, isOpen: false, redirect: null, onSuccess: null }
    // Hearts on the page behind the modal were rendered for a guest; load this person's saved providers now.
    const savedProviders = useSavedProviders()
    savedProviders.reset()
    await savedProviders.ensureLoaded()
    if (onSuccess) onSuccess()
    else if (redirect) await navigateTo(redirect)
  }

  function close() {
    state.value = { ...state.value, isOpen: false }
  }

  function setView(view: AuthModalView) {
    state.value = { ...state.value, view }
  }

  function setResetEmail(email: string) {
    state.value = { ...state.value, resetEmail: email }
  }

  return {
    isOpen: computed(() => state.value.isOpen),
    view: computed(() => state.value.view),
    resetEmail: computed(() => state.value.resetEmail),
    open,
    complete,
    close,
    setView,
    setResetEmail,
  }
}
