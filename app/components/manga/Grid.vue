<script setup lang="ts">
import type { MangaSummary } from '#shared/domain/manga'

withDefaults(defineProps<{ items: readonly MangaSummary[]; numbered?: boolean; density?: 'regular' | 'compact'; headingLevel?: 'h2' | 'h3' | 'h4'; eagerCount?: number }>(), {
  numbered: false,
  eagerCount: 0,
  density: 'regular',
  headingLevel: 'h3',
})
</script>

<template>
  <ol class="grid" :class="`grid--${density}`" role="list">
    <li v-for="(manga, index) in items" :key="manga.id" class="grid__item">
      <MangaTile
        :manga="manga"
        :index="numbered ? index : undefined"
        :heading-level="headingLevel"
        :eager="index < eagerCount"
        :priority="eagerCount > 0 && index === 0"
      />
    </li>
  </ol>
</template>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--grid-min), 1fr));
  gap: var(--s-6) var(--s-4);
  --grid-min: clamp(136px, 12vw + 60px, 210px);
}

.grid--compact {
  --grid-min: clamp(104px, 8vw + 50px, 150px);
  gap: var(--s-5) var(--s-3);
}

.grid__item:nth-child(n + 13) {
  content-visibility: auto;
  contain-intrinsic-size: auto 360px;
}
</style>
