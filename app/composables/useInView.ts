export function useInView(target: Ref<HTMLElement | null>, options: { rootMargin?: string; once?: boolean } = {}) {
  const inView = ref(false)
  let observer: IntersectionObserver | undefined

  onMounted(() => {
    if (!target.value) return
    if (!('IntersectionObserver' in window)) {
      inView.value = true
      return
    }
    observer = new IntersectionObserver(
      ([entry]) => {
        inView.value = entry?.isIntersecting ?? false
        if (inView.value && options.once !== false) observer?.disconnect()
      },
      { rootMargin: options.rootMargin ?? '200px' },
    )
    observer.observe(target.value)
  })

  onBeforeUnmount(() => observer?.disconnect())
  return inView
}
