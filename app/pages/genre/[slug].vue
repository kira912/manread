<script setup lang="ts">
import { EMPTY_SEARCH_QUERY, parseSearchQuery, toSearchUrlParams, type SearchQuery } from '#shared/domain/search'
import { slugify } from '#shared/domain/slug'

definePageMeta({
  validate: route => typeof route.params.slug === 'string' && /^[a-z0-9-]{1,60}$/.test(route.params.slug),
})

const route = useRoute()
const router = useRouter()
const { data: facets } = await useSearchFacets()

const genre = computed(() => facets.value.genres.find(name => slugify(name) === route.params.slug))
if (facets.value.genres.length && !genre.value) {
  throw createError({ statusCode: 404, statusMessage: 'Genre not found', fatal: true })
}

const overrides = computed(() => parseSearchQuery(route.query))
const query = computed<SearchQuery>(() => ({
  ...overrides.value,
  text: '',
  genres: genre.value ? [genre.value] : [],
  sort: route.query.sort ? overrides.value.sort : 'popularity',
}))

function apply(next: SearchQuery) {
  const { genre: _genre, q: _q, ...params } = toSearchUrlParams({ ...next, genres: [], text: '' })
  void router.replace({ query: params })
}

const otherGenres = computed(() => facets.value.genres.filter(name => name !== genre.value))

usePageSeo(() => ({
  title: `${genre.value ?? 'Genre'} manga — where to read`,
  description: `The most popular ${genre.value?.toLowerCase() ?? ''} manga, manhwa and manhua, with every official platform where you can read them legally.`,
  path: `/genre/${route.params.slug}`,
  noindex: Object.keys(route.query).length > 0,
}))
</script>

<template>
  <div class="page genre">
    <header class="genre__head">
      <nav class="label genre__crumbs" aria-label="Breadcrumb">
        <NuxtLink to="/">Index</NuxtLink> <span aria-hidden="true">/</span> <NuxtLink to="/search">Genres</NuxtLink>
      </nav>
      <h1 class="display genre__title">{{ genre }}</h1>
      <ul class="genre__others" role="list" aria-label="Other genres">
        <li v-for="name in otherGenres" :key="name">
          <NuxtLink :to="`/genre/${slugify(name)}`" class="link-underline">{{ name }}</NuxtLink>
        </li>
      </ul>
    </header>

    <div class="genre__layout">
      <aside class="genre__sidebar" aria-label="Filters">
        <SearchFilters :query="query" :facets="facets" hide-genres @change="apply" />
      </aside>
      <section aria-label="Results">
        <SearchResults :query="query" @reset="apply({ ...EMPTY_SEARCH_QUERY })" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.genre {
  padding-block: var(--s-6) var(--s-7);
}

.genre__head {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: var(--s-4);
  margin-bottom: var(--s-7);
}

.genre__crumbs {
  display: flex;
  gap: var(--s-2);
}

.genre__title {
  font-size: var(--fs-mega);
  font-style: italic;
}

.genre__others {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1) var(--s-4);
  list-style: none;
  padding: 0;
  font-size: var(--fs-sm);
  color: var(--c-fog);
}

.genre__others a {
  display: inline-block;
  padding-block: var(--s-1);
}

.genre__sidebar {
  display: none;
}

@media (min-width: 1100px) {
  .genre__layout {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr);
    gap: var(--s-7);
  }

  .genre__sidebar {
    display: block;
    position: sticky;
    top: var(--s-5);
    align-self: start;
  }
}
</style>
