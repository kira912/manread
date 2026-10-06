<script setup lang="ts">
import type { MangaSummary } from '#shared/domain/manga'

defineProps<{ items: readonly MangaSummary[] }>()
</script>

<template>
  <ol class="rank" role="list">
    <li v-for="(manga, index) in items" :key="manga.id" class="rank__item" :style="{ '--reveal-index': index }">
      <MangaLink :manga="manga" class="rank__row">
        <span class="rank__num numeric" aria-hidden="true">{{ indexLabel(index) }}</span>
        <span class="rank__thumb">
          <MangaCover :cover="manga.cover" :title="manga.title" sizes="(min-width: 900px) 140px, 64px" decorative />
        </span>
        <span class="rank__body">
          <span class="rank__title display">{{ manga.title }}</span>
          <span class="rank__meta">{{ metaLine(manga) }}<template v-if="manga.genres.length"> — {{ genreList(manga.genres, 3) }}</template></span>
        </span>
        <UiIcon class="rank__arrow" name="arrowUpRight" :size="22" />
      </MangaLink>
    </li>
  </ol>
</template>

<style scoped>
.rank {
  counter-reset: rank;
  border-top: 1px solid var(--c-line);
}

.rank__item {
  border-bottom: 1px solid var(--c-line);
}

.rank__row {
  position: relative;
  display: grid;
  grid-template-columns: 2.6ch 64px 1fr auto;
  align-items: center;
  gap: var(--s-4);
  padding-block: var(--s-4);
  transition: background-color var(--dur-2) var(--ease-out);
}

.rank__num {
  font-size: var(--fs-sm);
  color: var(--c-fog);
  transition: color var(--dur-2) var(--ease-out);
}

.rank__body {
  display: grid;
  gap: var(--s-1);
  min-width: 0;
}

.rank__title {
  font-size: var(--fs-xl);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: transform var(--dur-3) var(--ease-out);
}

.rank__meta {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-fog);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank__arrow {
  color: var(--c-fog);
  transition:
    color var(--dur-2) var(--ease-out),
    transform var(--dur-3) var(--ease-out);
}

.rank__row:hover .rank__num,
.rank__row:focus-visible .rank__num,
.rank__row:hover .rank__arrow,
.rank__row:focus-visible .rank__arrow {
  color: var(--c-shu);
}

.rank__row:hover .rank__arrow {
  transform: translate(3px, -3px);
}

@media (min-width: 900px) {
  .rank__row {
    grid-template-columns: 4ch 1fr auto;
    padding-block: var(--s-5);
  }

  .rank__num {
    font-size: var(--fs-lg);
  }

  .rank__title {
    font-size: var(--fs-2xl);
  }

  .rank__thumb {
    position: absolute;
    right: 12%;
    top: 50%;
    width: 140px;
    z-index: 2;
    pointer-events: none;
    opacity: 0;
    translate: 0 -50%;
    rotate: -3deg;
    scale: 0.92;
    clip-path: inset(0 0 100% 0);
    box-shadow: var(--shadow-float);
    transition:
      opacity var(--dur-2) var(--ease-out),
      clip-path var(--dur-3) var(--ease-out),
      scale var(--dur-3) var(--ease-out);
  }

  .rank__row:hover .rank__thumb,
  .rank__row:focus-visible .rank__thumb {
    opacity: 1;
    scale: 1;
    clip-path: inset(0 0 0 0);
  }

  .rank__row:hover .rank__title,
  .rank__row:focus-visible .rank__title {
    transform: translateX(var(--s-3));
  }
}
</style>
