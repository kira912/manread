export type ToastTone = 'neutral' | 'error'

export interface Toast {
  readonly id: number
  readonly message: string
  readonly tone: ToastTone
  readonly action?: { readonly label: string; readonly run: () => void }
}

const DEFAULT_DURATION_MS = 4_500
const MAX_VISIBLE = 3
let nextId = 1

export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(toast => toast.id !== id)
  }

  function push(message: string, options: { tone?: ToastTone; action?: Toast['action']; durationMs?: number } = {}) {
    const toast: Toast = { id: nextId++, message, tone: options.tone ?? 'neutral', action: options.action }
    toasts.value = [...toasts.value, toast].slice(-MAX_VISIBLE)
    if (import.meta.client) window.setTimeout(() => dismiss(toast.id), options.durationMs ?? DEFAULT_DURATION_MS)
    return toast.id
  }

  return { toasts: readonly(toasts), push, dismiss }
}
