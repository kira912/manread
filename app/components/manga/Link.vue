<script setup lang="ts">
import { mangaPath, type MangaSummary } from '#shared/domain/manga'

const props = defineProps<{ manga: Pick<MangaSummary, 'id' | 'slug'> }>()
const prefetch = usePrefetchManga()
const COVER_TRANSITION = 'manga-cover'
const TRANSITION_RESET_MS = 1_000

function markSharedCover(event: MouseEvent) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return
  const cover = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('[data-cover]')
  if (!cover) return
  cover.style.viewTransitionName = COVER_TRANSITION
  window.setTimeout(() => {
    cover.style.viewTransitionName = ''
  }, TRANSITION_RESET_MS)
}
</script>

<template>
  <NuxtLink :to="mangaPath(props.manga)" @click="markSharedCover" @pointerenter="prefetch(manga)" @focus="prefetch(manga)">
    <slot />
  </NuxtLink>
</template>
