<script setup lang="ts">
import { COVER_ASPECT_RATIO, COVER_WIDTHS, type CoverImage } from '#shared/domain/manga'

const props = withDefaults(
  defineProps<{ cover: CoverImage; title: string; sizes: string; priority?: boolean; eager?: boolean; decorative?: boolean; transitionName?: string }>(),
  { priority: false, eager: false, decorative: false },
)

const height = Math.round(COVER_WIDTHS.medium / COVER_ASPECT_RATIO)
const resolveSources = useCoverSources()
const sources = computed(() => resolveSources(props.cover))
</script>

<template>
  <div
    class="cover"
    data-cover
    :style="{ '--cover-tone': cover.dominantColor ?? 'var(--c-ink-3)', viewTransitionName: transitionName }"
  >
    <img
      class="cover__img"
      :src="sources.src"
      :srcset="sources.srcset"
      :sizes="sizes"
      :width="COVER_WIDTHS.medium"
      :height="height"
      :alt="decorative ? '' : `Couverture de ${title}`"
      :loading="priority || eager ? 'eager' : 'lazy'"
      :fetchpriority="priority ? 'high' : 'auto'"
      decoding="async"
    />
  </div>
</template>

<style scoped>
.cover {
  position: relative;
  aspect-ratio: 0.7;
  overflow: hidden;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--cover-tone) 40%, transparent), transparent 70%),
    var(--c-ink-2);
}

.cover__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition:
    transform var(--dur-4) var(--ease-out),
    filter var(--dur-3) var(--ease-out);
}

.cover::after {
  content: '';
  position: absolute;
  inset: 0;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.06);
  pointer-events: none;
}
</style>
