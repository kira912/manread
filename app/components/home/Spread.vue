<script setup lang="ts">
import type { EditorialPick } from '#shared/domain/discovery'

defineProps<{ picks: readonly EditorialPick[] }>()
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']
</script>

<template>
  <ol class="spread" role="list">
    <li v-for="(pick, index) in picks" :key="pick.manga.id" class="spread__item" :class="{ 'spread__item--flip': index % 2 === 1 }">
      <span class="spread__roman display" aria-hidden="true">{{ ROMAN[index] }}</span>
      <MangaLink :manga="pick.manga" class="spread__cover" tabindex="-1" aria-hidden="true">
        <MangaCover :cover="pick.manga.cover" :title="pick.manga.title" sizes="(min-width: 900px) 220px, 34vw" decorative />
      </MangaLink>
      <figure class="spread__copy">
        <blockquote class="spread__note display">
          <p>“{{ pick.note }}”</p>
        </blockquote>
        <figcaption class="spread__caption">
          <MangaLink :manga="pick.manga" class="spread__title link-underline">{{ pick.manga.title }}</MangaLink>
          <span class="label">{{ metaLine(pick.manga) }}</span>
        </figcaption>
      </figure>
    </li>
  </ol>
</template>

<style scoped>
.spread {
  display: grid;
  gap: var(--s-7);
}

.spread__item {
  position: relative;
  display: grid;
  grid-template-columns: minmax(96px, 34vw) 1fr;
  gap: var(--s-5);
  align-items: end;
}

.spread__roman {
  position: absolute;
  top: calc(-1 * var(--s-5));
  left: 0;
  font-size: var(--fs-sm);
  font-style: italic;
  color: var(--c-shu);
}

.spread__cover {
  display: block;
  box-shadow: var(--shadow-float);
}

.spread__copy {
  display: grid;
  gap: var(--s-4);
}

.spread__note {
  font-size: var(--fs-xl);
  font-style: italic;
  line-height: var(--lh-snug);
}

.spread__caption {
  display: grid;
  gap: var(--s-1);
}

.spread__title {
  justify-self: start;
  font-size: var(--fs-base);
}

@media (min-width: 900px) {
  .spread__item {
    grid-template-columns: 220px minmax(0, 46ch);
    gap: var(--s-7);
    justify-content: start;
  }

  .spread__item--flip {
    grid-template-columns: minmax(0, 46ch) 220px;
    justify-content: end;
  }

  .spread__item--flip .spread__cover {
    order: 2;
  }

  .spread__item--flip .spread__roman {
    left: auto;
    right: 0;
  }

  .spread__note {
    font-size: var(--fs-2xl);
  }
}
</style>
