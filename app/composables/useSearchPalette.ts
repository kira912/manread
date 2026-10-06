export function useSearchPalette() {
  const open = useState('search-palette-open', () => false)
  return {
    isOpen: readonly(open),
    show: () => {
      open.value = true
    },
    hide: () => {
      open.value = false
    },
  }
}
