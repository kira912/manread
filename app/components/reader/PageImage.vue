<script setup lang="ts">
import type { ChapterPage } from '#shared/domain/reader'

const props = withDefaults(defineProps<{ page: ChapterPage; pageCount: number; eager?: boolean; fit?: 'height' | 'width' }>(), {
  eager: false,
  fit: 'width',
})

const status = ref<'loading' | 'loaded' | 'error'>('loading')
const attempt = ref(0)
const image = ref<HTMLImageElement | null>(null)
const source = computed(() => (attempt.value ? `${props.page.url}?retry=${attempt.value}` : props.page.url))

watch(
  () => props.page.url,
  () => {
    status.value = 'loading'
    attempt.value = 0
  },
)

onMounted(() => {
  if (image.value?.complete && image.value.naturalWidth > 0) status.value = 'loaded'
})

function retry() {
  status.value = 'loading'
  attempt.value += 1
}
</script>

<template>
  <figure class="page-image" :class="[`page-image--${fit}`, `is-${status}`]" :style="{ aspectRatio: `${page.width} / ${page.height}` }">
    <img
      ref="image"
      :src="source"
      :width="page.width"
      :height="page.height"
      :alt="`Page ${page.index + 1} of ${pageCount}`"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
      draggable="false"
      @load="status = 'loaded'"
      @error="status = 'error'"
    />
    <span v-if="status === 'loading'" class="page-image__loading" aria-hidden="true" />
    <figcaption v-if="status === 'error'" class="page-image__error" role="alert">
      <span>Page {{ page.index + 1 }} didn't load.</span>
      <UiButton size="sm" variant="line" icon="refresh" @click.stop="retry">Retry</UiButton>
    </figcaption>
  </figure>
</template>

<style scoped>
.page-image {
  position: relative;
  margin: 0;
  background: var(--c-ink-1);
}

.page-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  user-select: none;
  -webkit-user-drag: none;
  transition: opacity var(--dur-2) var(--ease-out);
}

.page-image.is-loading img,
.page-image.is-error img {
  opacity: 0;
}

.page-image--height {
  height: 100%;
  max-width: 100%;
}

.page-image--width {
  width: 100%;
}

.page-image__loading {
  position: absolute;
  inset: 0;
  overflow: hidden;
}

.page-image__loading::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.04), transparent);
  animation: shimmer 1.4s var(--ease-in-out) infinite;
}

.page-image__error {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: var(--s-3);
  color: var(--c-mist);
  font-size: var(--fs-sm);
}
</style>
