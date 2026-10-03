export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  run: () => void
}

export interface Toast {
  id: number
  tone: ToastTone
  message: string
  /** An optional button on the toast, e.g. "Undo". */
  action?: ToastAction
}

const DISMISS_AFTER_MS = 4000
// A toast with a button needs time to be read and clicked.
const DISMISS_WITH_ACTION_MS = 7000

/**
 * App-wide transient feedback ("Saved", "Couldn't send"). State lives in
 * `useState` so it's request-isolated under SSR; the container that renders
 * it is mounted once in `app.vue`. Auto-dismiss only runs client-side —
 * toasts are never raised during SSR in practice, but a timer there would leak.
 */
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])
  const nextId = useState<number>('toasts-next-id', () => 1)

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(tone: ToastTone, message: string, action?: ToastAction) {
    const id = nextId.value++
    toasts.value = [...toasts.value, { id, tone, message, action }]
    if (import.meta.client) setTimeout(() => dismiss(id), action ? DISMISS_WITH_ACTION_MS : DISMISS_AFTER_MS)
    return id
  }

  return {
    toasts,
    dismiss,
    success: (message: string, action?: ToastAction) => push('success', message, action),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  }
}
