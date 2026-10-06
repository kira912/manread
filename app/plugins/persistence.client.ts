export default defineNuxtPlugin({
  name: 'persistence',
  setup() {
    const ready = useState(LIBRARY_READY_KEY, () => false)
    const library = useLibrary()
    const viewHistory = useViewHistory()
    const searchHistory = useSearchHistory()
    const readingPositions = useReadingPositions()
    const readerPreferences = useReaderPreferences()
    const analyticsConsent = useAnalyticsConsent()

    onNuxtReady(() => {
      library.hydrate()
      viewHistory.hydrate()
      searchHistory.hydrate()
      readingPositions.hydrate()
      readerPreferences.hydrate()
      analyticsConsent.hydrate()
      ready.value = true
      document.documentElement.dataset.ready = 'true'
    })
  },
})
