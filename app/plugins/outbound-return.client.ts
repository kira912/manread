export default defineNuxtPlugin({
  name: 'outbound-return',
  dependsOn: ['persistence'],
  setup() {
    const toast = useToast()
    const { library, setProgress } = useLibrary()

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return
      const pending = takePendingReturn()
      const entry = pending ? library.value.entries[pending.mangaId] : undefined
      if (!pending || !entry || entry.chapter >= pending.nextChapter) return
      toast.push(`De retour de ${pending.platformName}. Avez-vous fini le chapitre ${pending.nextChapter} de ${pending.title} ?`, {
        durationMs: 12_000,
        action: { label: 'Marquer comme lu', run: () => setProgress(pending.mangaId, pending.nextChapter) },
      })
    })
  },
})
