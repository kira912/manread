<script setup lang="ts">
import type { SearchFacets } from '#shared/domain/discovery'
import { genreLabel, languageLabel } from '#shared/domain/labels'
import { MANGA_STATUSES, originLabel, statusLabel, type MangaOrigin, type MangaStatus } from '#shared/domain/manga'
import { SEARCH_LIMITS, SEARCH_SORTS, type SearchQuery, type SearchSort } from '#shared/domain/search'

const props = defineProps<{ query: SearchQuery; facets: SearchFacets; hideGenres?: boolean }>()
const emit = defineEmits<{ change: [query: SearchQuery] }>()

const VISIBLE_LANGUAGES = 8
const ORIGINS: readonly MangaOrigin[] = ['JP', 'KR', 'CN']
const SORT_LABELS: Record<SearchSort, string> = {
  relevance: 'Pertinence',
  popularity: 'Popularité',
  score: 'Meilleure note',
  trending: 'Tendance',
  newest: 'Plus récents',
  title: 'Titre A–Z',
}

const platformFilter = ref('')
const platformsExpanded = ref(props.query.platformIds.length > 0)
const currentYear = new Date().getFullYear()
const idPrefix = useId()

const sortOptions = computed(() =>
  SEARCH_SORTS.filter(sort => sort !== 'relevance' || props.query.text).map(sort => ({ value: sort, label: SORT_LABELS[sort] })),
)
const sort = computed({
  get: () => props.query.sort,
  set: value => update({ sort: value }),
})

const visiblePlatforms = computed(() => {
  const needle = platformFilter.value.trim().toLowerCase()
  const selected = new Set(props.query.platformIds)
  return props.facets.platforms
    .filter(platform => !needle || platform.name.toLowerCase().includes(needle) || selected.has(platform.id))
    .toSorted((a, b) => Number(selected.has(b.id)) - Number(selected.has(a.id)))
})

function update(patch: Partial<SearchQuery>) {
  emit('change', { ...props.query, ...patch, page: 1 })
}

function toggle<T extends string>(list: readonly T[], value: T, max: number): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value].slice(-max)
}

function parseYear(value: string): number | null {
  const year = Number.parseInt(value, 10)
  if (!Number.isInteger(year) || year < SEARCH_LIMITS.minYear || year > currentYear + 1) return null
  return year
}
</script>

<template>
  <form class="filters" aria-label="Filtres de recherche" @submit.prevent>
    <UiSelect v-model="sort" label="Trier par" :options="sortOptions" />

    <fieldset class="filters__group">
      <legend class="label">Statut</legend>
      <div class="filters__chips">
        <button type="button" class="chip" :aria-pressed="query.status === null" @click="update({ status: null })">Tous</button>
        <button
          v-for="status in MANGA_STATUSES"
          :key="status"
          type="button"
          class="chip"
          :aria-pressed="query.status === status"
          @click="update({ status: query.status === status ? null : (status as MangaStatus) })"
        >
          {{ statusLabel(status) }}
        </button>
      </div>
    </fieldset>

    <fieldset class="filters__group">
      <legend class="label">Type</legend>
      <div class="filters__chips">
        <button type="button" class="chip" :aria-pressed="query.origin === null" @click="update({ origin: null })">Tous</button>
        <button
          v-for="origin in ORIGINS"
          :key="origin"
          type="button"
          class="chip"
          :aria-pressed="query.origin === origin"
          @click="update({ origin: query.origin === origin ? null : origin })"
        >
          {{ originLabel(origin) }}
        </button>
      </div>
    </fieldset>

    <fieldset v-if="!hideGenres && facets.genres.length" class="filters__group">
      <legend class="label">Genres <span class="filters__hint">— tous doivent correspondre</span></legend>
      <div class="filters__chips">
        <button
          v-for="genre in facets.genres"
          :key="genre"
          type="button"
          class="chip"
          :aria-pressed="query.genres.includes(genre)"
          @click="update({ genres: toggle(query.genres, genre, SEARCH_LIMITS.maxGenres) })"
        >
          {{ genreLabel(genre) }}
        </button>
      </div>
    </fieldset>

    <fieldset class="filters__group">
      <legend class="label">Première parution</legend>
      <div class="filters__years">
        <label :for="`${idPrefix}-from`" class="visually-hidden">À partir de l’année</label>
        <input
          :id="`${idPrefix}-from`"
          class="filters__year numeric"
          inputmode="numeric"
          placeholder="De"
          :value="query.yearFrom ?? ''"
          @change="update({ yearFrom: parseYear(($event.target as HTMLInputElement).value) })"
        />
        <span aria-hidden="true">—</span>
        <label :for="`${idPrefix}-to`" class="visually-hidden">Jusqu’à l’année</label>
        <input
          :id="`${idPrefix}-to`"
          class="filters__year numeric"
          inputmode="numeric"
          placeholder="À"
          :value="query.yearTo ?? ''"
          @change="update({ yearTo: parseYear(($event.target as HTMLInputElement).value) })"
        />
      </div>
    </fieldset>

    <fieldset class="filters__group">
      <legend class="label">Disponibilité</legend>
      <label class="filters__switch">
        <input type="checkbox" :checked="query.readableOnly" @change="update({ readableOnly: ($event.target as HTMLInputElement).checked })" />
        <span>Lisible sur une plateforme officielle</span>
      </label>
    </fieldset>

    <fieldset v-if="facets.languages.length" class="filters__group">
      <legend class="label">Langue</legend>
      <div class="filters__chips">
        <button
          v-for="language in facets.languages.slice(0, VISIBLE_LANGUAGES)"
          :key="language"
          type="button"
          class="chip"
          :aria-pressed="query.languages.includes(language)"
          @click="update({ languages: toggle(query.languages, language, SEARCH_LIMITS.maxLanguages) })"
        >
          {{ languageLabel(language) }}
        </button>
      </div>
    </fieldset>

    <fieldset v-if="facets.platforms.length" class="filters__group">
      <legend class="label">Plateformes</legend>
      <button
        type="button"
        class="filters__expand"
        :aria-expanded="platformsExpanded"
        :aria-controls="`${idPrefix}-platforms`"
        @click="platformsExpanded = !platformsExpanded"
      >
        {{ platformsExpanded ? 'Masquer les plateformes' : `Choisir parmi ${facets.platforms.length} plateformes` }}
        <template v-if="query.platformIds.length"> · {{ plural(query.platformIds.length, 'sélectionnée', 'sélectionnées') }}</template>
        <UiIcon name="chevronDown" :size="16" :class="{ 'is-flipped': platformsExpanded }" />
      </button>
      <template v-if="platformsExpanded">
      <label :for="`${idPrefix}-platform`" class="visually-hidden">Filtrer les plateformes</label>
      <input :id="`${idPrefix}-platform`" v-model="platformFilter" class="filters__platform-search" type="search" placeholder="Trouver une plateforme…" autocomplete="off" />
      <ul :id="`${idPrefix}-platforms`" class="filters__platforms" role="list">
        <li v-for="platform in visiblePlatforms" :key="platform.id">
          <label class="filters__check">
            <input
              type="checkbox"
              :checked="query.platformIds.includes(platform.id)"
              @change="update({ platformIds: toggle(query.platformIds, platform.id, SEARCH_LIMITS.maxPlatforms) })"
            />
            <span>{{ platform.name }}</span>
          </label>
        </li>
      </ul>
      </template>
    </fieldset>
  </form>
</template>

<style scoped>
.filters {
  display: grid;
  gap: var(--s-5);
}

.filters__group {
  display: grid;
  gap: var(--s-2);
  border: 0;
  padding: 0;
  min-width: 0;
}

.filters__hint {
  text-transform: none;
  letter-spacing: 0;
  color: var(--c-fog);
}

.filters__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1);
}

.chip {
  min-height: 34px;
  padding-inline: var(--s-3);
  border: 1px solid var(--c-line);
  font-size: var(--fs-sm);
  color: var(--c-mist);
  transition:
    color var(--dur-2),
    border-color var(--dur-2),
    background-color var(--dur-2);
}

.chip:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.chip[aria-pressed='true'] {
  color: var(--c-paper);
  border-color: var(--c-shu-line);
  background: var(--c-shu-soft);
}

.filters__years {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  color: var(--c-fog);
}

.filters__year,
.filters__platform-search {
  min-height: var(--tap-min);
  padding-inline: var(--s-3);
  background: var(--c-ink-1);
  border: 1px solid var(--c-line-strong);
  font-size: var(--fs-sm);
}

.filters__year {
  width: 7ch;
}

.filters__switch,
.filters__check {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  min-height: 36px;
  font-size: var(--fs-sm);
  color: var(--c-mist);
  cursor: pointer;
}

.filters__switch input,
.filters__check input {
  width: 18px;
  height: 18px;
  accent-color: var(--c-shu);
}

.filters__expand {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
  min-height: var(--tap-min);
  padding-inline: var(--s-3);
  border: 1px solid var(--c-line);
  font-size: var(--fs-sm);
  color: var(--c-mist);
  text-align: left;
}

.filters__expand:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.filters__expand .is-flipped {
  rotate: 180deg;
}

.filters__platforms {
  max-height: 260px;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding-right: var(--s-2);
}
</style>
