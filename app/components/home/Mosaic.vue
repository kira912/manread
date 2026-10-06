<script setup lang="ts">
import { originLabel, type MangaSummary } from '#shared/domain/manga'

defineProps<{ items: readonly MangaSummary[] }>()
</script>

<template>
  <ol class="mosaic" role="list">
    <li v-for="(manga, index) in items.slice(0, 7)" :key="manga.id" class="mosaic__cell" :class="`mosaic__cell--${index}`">
      <MangaLink :manga="manga" class="mosaic__link">
        <MangaCover
          :cover="manga.cover"
          :title="manga.title"
          :sizes="index === 0 ? '(min-width: 900px) 40vw, 90vw' : '(min-width: 900px) 18vw, 44vw'"
          decorative
        />
        <span class="mosaic__veil" aria-hidden="true" />
        <span class="mosaic__caption">
          <span v-if="manga.score" class="mosaic__score numeric">{{ formatScore(manga.score) }}<span class="visually-hidden"> out of 10</span></span>
          <span class="mosaic__title display">{{ manga.title }}</span>
          <span class="mosaic__meta">{{ originLabel(manga.origin) }} · {{ compactNumber(manga.popularity) }} readers</span>
        </span>
      </MangaLink>
    </li>
  </ol>
</template>

<style scoped>
.mosaic {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--s-3);
}

.mosaic__cell--0 {
  grid-column: 1 / -1;
}

.mosaic__link {
  position: relative;
  display: block;
  height: 100%;
  overflow: hidden;
}

.mosaic__link :deep(.cover) {
  height: 100%;
  aspect-ratio: auto;
  min-height: 240px;
}

.mosaic__veil {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 35%, rgb(5 5 6 / 0.92));
  transition: opacity var(--dur-3) var(--ease-out);
}

.mosaic__caption {
  position: absolute;
  inset: auto 0 0;
  display: grid;
  gap: var(--s-1);
  padding: var(--s-4);
}

.mosaic__score {
  font-size: var(--fs-xl);
  color: var(--c-shu);
  line-height: 1;
}

.mosaic__title {
  font-size: var(--fs-lg);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.mosaic__meta {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mist);
}

.mosaic__cell--0 .mosaic__title {
  font-size: var(--fs-2xl);
}

.mosaic__cell--0 .mosaic__score {
  font-size: var(--fs-2xl);
}

.mosaic__link:hover :deep(.cover__img),
.mosaic__link:focus-visible :deep(.cover__img) {
  transform: scale(1.05);
}

@media (min-width: 900px) {
  .mosaic {
    grid-template-columns: repeat(6, 1fr);
    grid-auto-rows: clamp(150px, 14vw, 230px);
  }

  .mosaic__cell--0 {
    grid-column: 1 / span 3;
    grid-row: span 3;
  }

  .mosaic__cell--1,
  .mosaic__cell--4 {
    grid-column: span 2;
    grid-row: span 2;
  }

  .mosaic__cell--2,
  .mosaic__cell--3,
  .mosaic__cell--5,
  .mosaic__cell--6 {
    grid-column: span 1;
    grid-row: span 1;
  }

  .mosaic__cell--2 .mosaic__title,
  .mosaic__cell--3 .mosaic__title,
  .mosaic__cell--5 .mosaic__title,
  .mosaic__cell--6 .mosaic__title {
    font-size: var(--fs-base);
  }

  .mosaic__link :deep(.cover) {
    min-height: 0;
  }
}
</style>
