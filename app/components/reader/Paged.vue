<script setup lang="ts">
import type { ChapterPage, PageFit, ReadingDirection } from '#shared/domain/reader'

const props = defineProps<{ pages: readonly ChapterPage[]; page: number; direction: ReadingDirection; fit: PageFit }>()
const emit = defineEmits<{ next: []; previous: []; toggleChrome: [] }>()

const SWIPE_THRESHOLD_PX = 50
const TAP_TOLERANCE_PX = 10
const EDGE_ZONE_RATIO = 0.33

const current = computed(() => props.pages[props.page])
let start: { x: number; y: number } | null = null

function turn(forward: boolean) {
  if (forward) emit('next')
  else emit('previous')
}

function onPointerDown(event: PointerEvent) {
  if (!event.isPrimary) return
  start = { x: event.clientX, y: event.clientY }
}

function onPointerUp(event: PointerEvent) {
  if (!start || !event.isPrimary) return
  const dx = event.clientX - start.x
  const dy = event.clientY - start.y
  start = null

  if (Math.abs(dx) > SWIPE_THRESHOLD_PX && Math.abs(dx) > Math.abs(dy)) {
    turn(props.direction === 'rtl' ? dx > 0 : dx < 0)
    return
  }
  if (Math.abs(dx) > TAP_TOLERANCE_PX || Math.abs(dy) > TAP_TOLERANCE_PX) return

  const bounds = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = (event.clientX - bounds.left) / bounds.width
  if (ratio > EDGE_ZONE_RATIO && ratio < 1 - EDGE_ZONE_RATIO) {
    emit('toggleChrome')
    return
  }
  const tappedLeft = ratio <= EDGE_ZONE_RATIO
  turn(props.direction === 'rtl' ? tappedLeft : !tappedLeft)
}
</script>

<template>
  <div
    class="paged"
    :class="`paged--${fit}`"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="start = null"
  >
    <ReaderPageImage v-if="current" :key="current.url" :page="current" :page-count="pages.length" :fit="fit" eager />
  </div>
</template>

<style scoped>
.paged {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100dvh;
  overflow: auto;
  touch-action: pan-y pinch-zoom;
  cursor: pointer;
}

.paged--height :deep(.page-image) {
  height: 100dvh;
  width: auto;
}

.paged--width {
  place-items: start center;
}

.paged--width :deep(.page-image) {
  width: min(100%, 1100px);
}
</style>
