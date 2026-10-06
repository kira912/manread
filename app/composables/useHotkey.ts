export interface HotkeyOptions {
  readonly key: string
  readonly mod?: boolean
  readonly allowInInputs?: boolean
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

export function useHotkey(options: HotkeyOptions, handler: (event: KeyboardEvent) => void) {
  const listener = (event: KeyboardEvent) => {
    if (event.key.toLowerCase() !== options.key.toLowerCase()) return
    const modPressed = event.metaKey || event.ctrlKey
    if (Boolean(options.mod) !== modPressed) return
    if (!options.allowInInputs && !options.mod && isTypingTarget(event.target)) return
    event.preventDefault()
    handler(event)
  }
  onMounted(() => window.addEventListener('keydown', listener))
  onBeforeUnmount(() => window.removeEventListener('keydown', listener))
}
