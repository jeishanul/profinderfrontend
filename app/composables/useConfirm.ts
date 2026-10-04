export interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
  /** Adds an optional free-text box under the message (used through `prompt`). */
  input?: { label: string, placeholder?: string, maxLength?: number }
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  /** What was typed into the optional `input` box. */
  inputValue: string
  resolve: ((confirmed: boolean) => void) | null
}

/**
 * Promise-based replacement for `window.confirm`:
 * `if (!(await confirm({ title, tone: 'danger' }))) return`. One dialog is
 * mounted in `app.vue` (`<UiConfirmDialog />`) and driven by this state.
 * Client-only by nature — it's only ever called from click handlers.
 */
export function useConfirm() {
  const state = useState<ConfirmState>('confirm-dialog', () => ({
    open: false,
    title: '',
    inputValue: '',
    resolve: null,
  }))

  function confirm(options: ConfirmOptions): Promise<boolean> {
    // A second request while one is open cancels the first rather than leaving it hanging.
    state.value.resolve?.(false)
    return new Promise((resolve) => {
      state.value = { ...options, open: true, inputValue: '', resolve }
    })
  }

  /**
   * Like `confirm`, with an optional note box: resolves to the (trimmed, possibly empty) text when
   * confirmed, or `null` when cancelled — e.g. "why are you declining?".
   */
  async function prompt(options: ConfirmOptions & { input: NonNullable<ConfirmOptions['input']> }): Promise<string | null> {
    const confirmed = await confirm(options)
    return confirmed ? state.value.inputValue.trim() : null
  }

  function settle(confirmed: boolean) {
    const { resolve } = state.value
    state.value = { ...state.value, open: false, resolve: null }
    resolve?.(confirmed)
  }

  return { state, confirm, prompt, settle }
}
