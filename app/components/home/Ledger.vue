<script setup lang="ts">
import { originLabel, originLanguage, type MangaSummary } from '#shared/domain/manga'

const props = defineProps<{ items: readonly MangaSummary[]; caption: string }>()
const maxFavourites = computed(() => Math.max(1, ...props.items.map(manga => manga.favourites)))
</script>

<template>
  <div class="ledger-wrap">
    <table class="ledger">
      <caption class="visually-hidden">{{ caption }}</caption>
      <thead>
        <tr>
          <th scope="col" class="label">Nº</th>
          <th scope="col" class="label">Title</th>
          <th scope="col" class="label ledger__hide-sm">Type</th>
          <th scope="col" class="label ledger__hide-sm">Year</th>
          <th scope="col" class="label ledger__num">Followers</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(manga, index) in items.slice(0, 10)" :key="manga.id">
          <td class="numeric ledger__rank">{{ indexLabel(index) }}</td>
          <th scope="row" class="ledger__title">
            <MangaLink :manga="manga" class="link-underline">{{ manga.title }}</MangaLink>
            <span v-if="manga.nativeTitle" :lang="originLanguage(manga.origin)" class="ledger__native jp">{{ manga.nativeTitle }}</span>
          </th>
          <td class="ledger__hide-sm">{{ originLabel(manga.origin) }}</td>
          <td class="numeric ledger__hide-sm">{{ manga.startYear ?? '—' }}</td>
          <td class="ledger__num">
            <span class="numeric">{{ compactNumber(manga.favourites) }}</span>
            <span class="ledger__bar" aria-hidden="true">
              <span :style="{ transform: `scaleX(${manga.favourites / maxFavourites})` }" />
            </span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.ledger-wrap {
  overflow-x: auto;
}

.ledger {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-sm);
}

th,
td {
  padding: var(--s-3) var(--s-3) var(--s-3) 0;
  text-align: left;
  border-bottom: 1px solid var(--c-line);
  vertical-align: middle;
}

thead th {
  font-weight: 450;
  border-bottom-color: var(--c-line-strong);
}

.ledger__rank {
  color: var(--c-fog);
  width: 4ch;
}

.ledger__title {
  font-weight: 400;
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  line-height: var(--lh-snug);
}

.ledger__native {
  display: block;
  font-size: var(--fs-xs);
  color: var(--c-fog);
  margin-top: 2px;
}

.ledger__num {
  text-align: right;
  width: 9rem;
}

.ledger__bar {
  display: block;
  height: 2px;
  margin-top: var(--s-2);
  background: var(--c-line);
}

.ledger__bar span {
  display: block;
  height: 100%;
  background: var(--c-bone);
  transform-origin: right;
}

tbody tr {
  transition: background-color var(--dur-2) var(--ease-out);
}

tbody tr:hover {
  background: var(--c-ink-1);
}

tbody tr:hover .ledger__bar span {
  background: var(--c-shu);
}

@media (max-width: 640px) {
  .ledger__hide-sm {
    display: none;
  }

  .ledger__num {
    width: 6rem;
  }
}
</style>
