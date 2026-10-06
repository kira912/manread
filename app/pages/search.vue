<script setup lang="ts">
import { genreLabel, languageLabel } from '#shared/domain/labels'
import { originLabel, statusLabel } from '#shared/domain/manga'
import {
  activeFilterCount,
  EMPTY_SEARCH_QUERY,
  hasSearchCriteria,
  parseSearchQuery,
  toSearchUrlParams,
  type SearchQuery,
} from '#shared/domain/search'

const route = useRoute()
const router = useRouter()
const query = computed(() => parseSearchQuery(route.query))
const { data: facets } = useSearchFacets()
const searchHistory = useSearchHistory()
const filtersOpen = ref(false)
const draft = ref(query.value.text)

watch(
  () => query.value.text,
  text => {
    draft.value = text
  },
)

const filterCount = computed(() => activeFilterCount(query.value))
const platformNames = computed(() => new Map(facets.value.platforms.map(platform => [platform.id, platform.name])))

const activeChips = computed(() => {
  const current = query.value
  const chips: { key: string; label: string; remove: Partial<SearchQuery> }[] = []
  for (const genre of current.genres) chips.push({ key: `g-${genre}`, label: genreLabel(genre), remove: { genres: current.genres.filter(item => item !== genre) } })
  if (current.status) chips.push({ key: 'status', label: statusLabel(current.status), remove: { status: null } })
  if (current.origin) chips.push({ key: 'origin', label: originLabel(current.origin), remove: { origin: null } })
  if (current.yearFrom !== null || current.yearTo !== null) {
    chips.push({ key: 'years', label: `${current.yearFrom ?? '…'}–${current.yearTo ?? '…'}`, remove: { yearFrom: null, yearTo: null } })
  }
  if (current.readableOnly) chips.push({ key: 'readable', label: 'Lisible officiellement', remove: { readableOnly: false } })
  for (const language of current.languages) {
    chips.push({ key: `l-${language}`, label: languageLabel(language), remove: { languages: current.languages.filter(item => item !== language) } })
  }
  for (const platformId of current.platformIds) {
    chips.push({
      key: `p-${platformId}`,
      label: platformNames.value.get(platformId) ?? platformId,
      remove: { platformIds: current.platformIds.filter(item => item !== platformId) },
    })
  }
  return chips
})

const heading = computed(() => (query.value.text ? `« ${query.value.text} »` : 'Parcourir l’index'))

function apply(next: SearchQuery) {
  void router.replace({ query: toSearchUrlParams(next) })
}

function submit() {
  const text = draft.value.trim()
  if (text) {
    searchHistory.record(text)
    trackEvent('search', { source: 'page', term: text })
  }
  void router.push({ query: toSearchUrlParams({ ...query.value, text, sort: text ? 'relevance' : 'popularity', page: 1 }) })
}

function reset() {
  apply({ ...EMPTY_SEARCH_QUERY, text: query.value.text, sort: query.value.text ? 'relevance' : 'popularity' })
}

usePageSeo(() => ({
  title: query.value.text ? `Recherche : ${query.value.text}` : 'Parcourir les mangas',
  description: 'Recherchez des mangas, manhwas et manhuas par titre, genre, statut, année, langue et plateforme de lecture officielle.',
  path: '/search',
  noindex: hasSearchCriteria(query.value),
}))
</script>

<template>
  <div class="page search">
    <header class="search__head">
      <p class="label">Recherche</p>
      <h1 class="search__title display">{{ heading }}</h1>
      <form class="search__form" role="search" action="/search" method="get" @submit.prevent="submit">
        <label for="search-input" class="visually-hidden">Rechercher un titre</label>
        <UiIcon name="search" :size="22" class="search__glyph" />
        <input
          id="search-input"
          v-model="draft"
          class="search__input"
          name="q"
          type="search"
          placeholder="Rechercher un titre…"
          autocomplete="off"
          enterkeyhint="search"
          maxlength="100"
        />
        <UiButton type="submit" variant="primary" size="sm">Rechercher</UiButton>
      </form>
    </header>

    <div class="search__layout">
      <aside class="search__sidebar" aria-label="Filtres">
        <SearchFilters :query="query" :facets="facets" @change="apply" />
      </aside>

      <section class="search__main" aria-label="Résultats">
        <div class="search__toolbar">
          <UiButton class="search__filters-toggle" variant="line" size="sm" icon="filters" @click="filtersOpen = true">
            Filtres<template v-if="filterCount"> · {{ filterCount }}</template>
          </UiButton>
          <ul v-if="activeChips.length" class="search__chips" role="list" aria-label="Filtres actifs">
            <li v-for="chip in activeChips" :key="chip.key">
              <button type="button" class="search__chip" @click="apply({ ...query, ...chip.remove, page: 1 })">
                {{ chip.label }}
                <UiIcon name="close" :size="14" />
                <span class="visually-hidden">Retirer le filtre</span>
              </button>
            </li>
            <li>
              <button type="button" class="search__clear label" @click="reset">Tout effacer</button>
            </li>
          </ul>
        </div>
        <SearchResults :query="query" @reset="reset" />
      </section>
    </div>

    <UiDialog v-model:open="filtersOpen" label="Filtres" variant="sheet">
      <div v-if="filtersOpen" class="search__sheet">
        <div class="search__sheet-head">
          <h2 class="display">Filtres</h2>
          <UiButton variant="primary" size="sm" @click="filtersOpen = false">Voir les résultats</UiButton>
        </div>
        <SearchFilters :query="query" :facets="facets" @change="apply" />
      </div>
    </UiDialog>
  </div>
</template>

<style scoped>
.search {
  padding-block: var(--s-6) var(--s-7);
}

.search__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-3);
  margin-bottom: var(--s-6);
}

.search__title {
  font-size: var(--fs-display);
  overflow-wrap: anywhere;
}

.search__form {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  max-width: 720px;
  padding: var(--s-2) var(--s-2) var(--s-2) var(--s-4);
  border: 1px solid var(--c-line-strong);
  background: var(--c-ink-1);
  transition: border-color var(--dur-2);
}

.search__form:focus-within {
  border-color: var(--c-shu-line);
}

.search__glyph {
  color: var(--c-shu);
}

.search__input {
  flex: 1;
  min-width: 0;
  min-height: var(--tap-min);
  background: transparent;
  border: 0;
  outline: none;
  font-size: var(--fs-lg);
}

.search__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-6);
}

.search__sidebar {
  display: none;
}

.search__main {
  display: grid;
  gap: var(--s-5);
  align-content: start;
  min-width: 0;
}

.search__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-2);
}

.search__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-1);
}

.search__chip {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  min-height: 32px;
  padding-inline: var(--s-3);
  background: var(--c-shu-soft);
  border: 1px solid var(--c-shu-line);
  font-size: var(--fs-sm);
}

.search__clear {
  min-height: 32px;
  padding-inline: var(--s-2);
  color: var(--c-fog);
}

.search__clear:hover {
  color: var(--c-bone);
}

.search__sheet {
  display: grid;
  gap: var(--s-5);
  padding: var(--s-5) var(--gutter);
}

.search__sheet-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: sticky;
  top: calc(-1 * var(--s-5));
  padding-block: var(--s-3);
  background: var(--c-ink-1);
  z-index: 1;
}

@media (min-width: 1100px) {
  .search__layout {
    grid-template-columns: 280px minmax(0, 1fr);
    gap: var(--s-7);
  }

  .search__sidebar {
    display: block;
    position: sticky;
    top: var(--s-5);
    align-self: start;
    max-height: calc(100dvh - 2 * var(--s-5));
    overflow-y: auto;
    padding-right: var(--s-3);
    scrollbar-width: thin;
  }

  .search__filters-toggle {
    display: none;
  }
}
</style>
