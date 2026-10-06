<script setup lang="ts">
import { LIBRARY_SORTS, libraryStats, queryLibrary, READING_STATUSES, readingStatusLabel, type LibrarySort, type LibraryView } from '#shared/domain/library'

type LibraryTab = LibraryView | 'history'

const SORT_LABELS: Record<LibrarySort, string> = { updated: 'Recently updated', added: 'Recently added', title: 'Title A–Z', progress: 'Progress' }
const TAB_VALUES: readonly LibraryTab[] = ['all', ...READING_STATUSES, 'favorites', 'history']

const route = useRoute()
const router = useRouter()
const { library, ready } = useLibrary()
const { history } = useViewHistory()

const tab = computed<LibraryTab>({
  get: () => (TAB_VALUES as readonly string[]).includes(String(route.query.view)) ? (route.query.view as LibraryTab) : 'all',
  set: value => void router.replace({ query: value === 'all' ? {} : { view: value } }),
})
const text = ref('')
const sort = ref<LibrarySort>('updated')
const sortOptions = LIBRARY_SORTS.map(value => ({ value, label: SORT_LABELS[value] }))

const stats = computed(() => libraryStats(library.value))
const tabs = computed(() => [
  { value: 'all' as const, label: 'All', count: stats.value.all },
  ...READING_STATUSES.map(status => ({ value: status, label: readingStatusLabel(status), count: stats.value[status] })),
  { value: 'favorites' as const, label: 'Favorites', count: stats.value.favorites },
  { value: 'history' as const, label: 'History', count: history.value.entries.length },
])
const entries = computed(() => (tab.value === 'history' ? [] : queryLibrary(library.value, { view: tab.value, text: text.value, sort: sort.value })))
const emptyCopy = computed(() =>
  stats.value.all === 0
    ? { title: 'Your shelves are empty', body: 'Add titles from any page and they will wait for you here, with your progress and where you read them.' }
    : text.value
      ? { title: 'No match on your shelves', body: `Nothing in this view matches “${text.value}”.` }
      : { title: 'Nothing here yet', body: 'Titles you file under this status will appear here.' },
)

usePageSeo({ title: 'Your library', description: 'Your reading list, progress and history.', path: '/library', noindex: true })
</script>

<template>
  <div class="page library">
    <header class="library__head">
      <p class="label">Stored on this device</p>
      <h1 class="display library__title">Your library</h1>
      <p v-if="ready" class="library__stats numeric">
        {{ plural(stats.all, 'title') }} · {{ stats.reading }} reading · {{ stats.completed }} completed · {{ plural(stats.favorites, 'favorite') }}
      </p>
    </header>

    <div v-if="!ready" class="library__loading" aria-hidden="true">
      <UiSkeleton v-for="index in 5" :key="index" height="96px" />
    </div>

    <template v-else>
      <div class="library__nav">
        <UiTabs v-model="tab" :items="tabs" label="Library views" panel-id="library-panel" />
      </div>

      <div id="library-panel" class="library__panel" role="tabpanel" :aria-labelledby="`library-panel-tab-${tab}`" tabindex="0">
        <LibraryHistoryList v-if="tab === 'history'" />
        <template v-else>
          <div class="library__toolbar">
            <label class="library__filter">
              <UiIcon name="search" :size="18" />
              <span class="visually-hidden">Filter your library</span>
              <input v-model="text" type="search" placeholder="Filter by title…" autocomplete="off" />
            </label>
            <UiSelect v-model="sort" label="Sort" :options="sortOptions" hide-label />
            <LibraryBackup />
          </div>

          <ol v-if="entries.length" class="library__list" role="list">
            <li v-for="entry in entries" :key="entry.manga.id" class="library__item">
              <LibraryEntryRow :entry="entry" />
            </li>
          </ol>
          <UiEmptyState v-else :title="emptyCopy.title" glyph="棚">
            <p>{{ emptyCopy.body }}</p>
            <template v-if="stats.all === 0" #actions>
              <UiButton variant="primary" to="/" icon-after="arrowRight">Discover titles</UiButton>
              <UiButton variant="line" icon="search" @click="useSearchPalette().show()">Search</UiButton>
            </template>
          </UiEmptyState>
        </template>
      </div>
    </template>
  </div>
</template>

<style scoped>
.library {
  padding-block: var(--s-6) var(--s-7);
}

.library__head {
  display: grid;
  gap: var(--s-2);
  margin-bottom: var(--s-6);
}

.library__title {
  font-size: var(--fs-display);
}

.library__stats {
  font-size: var(--fs-xs);
  color: var(--c-mist);
}

.library__loading {
  display: grid;
  gap: var(--s-3);
}

.library__nav {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--c-void);
  margin-inline: calc(-1 * var(--gutter));
  padding-inline: var(--gutter);
}

.library__panel {
  padding-top: var(--s-5);
}

.library__panel:focus-visible {
  box-shadow: none;
}

.library__toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  align-items: center;
  margin-bottom: var(--s-3);
}

.library__filter {
  flex: 1 1 240px;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
  padding-inline: var(--s-3);
  border: 1px solid var(--c-line-strong);
  background: var(--c-ink-1);
  color: var(--c-fog);
}

.library__filter:focus-within {
  border-color: var(--c-shu-line);
}

.library__filter input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: 0;
  outline: none;
  color: var(--c-bone);
}

.library__item {
  content-visibility: auto;
  contain-intrinsic-size: auto 120px;
}
</style>
