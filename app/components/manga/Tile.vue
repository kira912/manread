<script setup lang="ts">
import type { MangaSummary } from '#shared/domain/manga'

withDefaults(defineProps<{ manga: MangaSummary; index?: number; caption?: string; sizes?: string; headingLevel?: 'h2' | 'h3' | 'h4'; eager?: boolean; priority?: boolean }>(), {
  sizes: '(min-width: 1200px) 200px, (min-width: 700px) 22vw, 45vw',
  headingLevel: 'h3',
})
</script>

<template>
  <article class="tile">
    <MangaLink :manga="manga" class="tile__link">
      <div class="tile__frame">
        <MangaCover :cover="manga.cover" :title="manga.title" :sizes="sizes" :eager="eager" :priority="priority" decorative />
        <span v-if="index !== undefined" class="tile__index numeric" aria-hidden="true">{{ indexLabel(index) }}</span>
      </div>
      <component :is="headingLevel" class="tile__title">{{ manga.title }}</component>
    </MangaLink>
    <p class="tile__meta">{{ caption ?? metaLine(manga) }}</p>
  </article>
</template>

<style scoped>
.tile {
  display: grid;
  gap: var(--s-2);
  align-content: start;
  min-width: 0;
}

.tile__link {
  display: grid;
  gap: var(--s-3);
}

.tile__frame {
  position: relative;
  overflow: hidden;
}

.tile__index {
  position: absolute;
  top: 0;
  left: 0;
  padding: 3px 6px;
  background: var(--c-void);
  font-size: var(--fs-2xs);
  color: var(--c-mist);
}

.tile__title {
  font-family: var(--font-display);
  font-weight: 400;
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  background: linear-gradient(var(--c-shu), var(--c-shu)) 0 100% / 0 1px no-repeat;
  transition: background-size var(--dur-3) var(--ease-out);
}

.tile__meta {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  color: var(--c-fog);
  text-transform: uppercase;
}

.tile__link:hover :deep(.cover__img),
.tile__link:focus-visible :deep(.cover__img) {
  transform: scale(1.04);
}

.tile__link:hover .tile__title,
.tile__link:focus-visible .tile__title {
  background-size: 100% 1px;
}

.tile__link:focus-visible {
  box-shadow: none;
}

.tile__link:focus-visible .tile__frame {
  box-shadow: var(--focus-ring);
}
</style>
