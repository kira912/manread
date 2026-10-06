<script setup lang="ts">
import type { ChapterPage, PageFit } from '#shared/domain/reader'

const props = defineProps<{ pages: readonly ChapterPage[]; fit: PageFit }>()
const emit = defineEmits<{ 'update:page': [page: number]; toggleChrome: [] }>()

const VISIBILITY_THRESHOLDS = [0, 0.25, 0.5, 0.75, 1]
const EAGER_PAGES = 2
const frames = ref<HTMLElement[]>([])
const ratios = new Map<number, number>()
let observer: IntersectionObserver | undefined

function jumpTo(page: number) {
  frames.value[page]?.scrollIntoView({ block: 'start' })
}

defineExpose({ jumpTo })

onMounted(() => {
  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) ratios.set(Number((entry.target as HTMLElement).dataset.index), entry.intersectionRatio)
      let best = -1
      let bestRatio = 0
      for (const [index, ratio] of ratios) {
        if (ratio > bestRatio || (ratio === bestRatio && index > best)) {
          best = index
          bestRatio = ratio
        }
      }
      if (best >= 0 && bestRatio > 0) emit('update:page', best)
    },
    { threshold: VISIBILITY_THRESHOLDS },
  )
  for (const frame of frames.value) observer.observe(frame)
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div class="vertical" :class="`vertical--${fit}`" @click.self="emit('toggleChrome')">
    <div v-for="page in pages" :key="page.url" ref="frames" class="vertical__frame" :data-index="page.index" @click="emit('toggleChrome')">
      <ReaderPageImage :page="page" :page-count="props.pages.length" :eager="page.index < EAGER_PAGES" fit="width" />
    </div>
    <slot name="end" />
  </div>
</template>

<style scoped>
.vertical {
  display: grid;
  justify-items: center;
  padding-bottom: var(--s-6);
}

.vertical__frame {
  width: min(100%, 800px);
}

.vertical--width .vertical__frame {
  width: 100%;
}
</style>
