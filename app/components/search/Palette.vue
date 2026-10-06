<script setup lang="ts">
import { creatorPath } from '#shared/domain/creator'
import { mangaPath, statusLabel, type MangaSummary } from '#shared/domain/manga'
import { toSearchUrlParams, EMPTY_SEARCH_QUERY } from '#shared/domain/search'

type PaletteOption =
  | { readonly id: string; readonly kind: 'manga'; readonly to: string; readonly manga: MangaSummary }
  | { readonly id: string; readonly kind: 'creator'; readonly to: string; readonly label: string; readonly detail: string | null; readonly image: string | null }
  | { readonly id: string; readonly kind: 'all'; readonly to: string; readonly label: string }
  | { readonly id: string; readonly kind: 'recent-term'; readonly term: string }
  | { readonly id: string; readonly kind: 'recent-view'; readonly to: string; readonly label: string; readonly detail: string }

const palette = useSearchPalette()
const open = computed({
  get: () => palette.isOpen.value,
  set: value => (value ? palette.show() : palette.hide()),
})

const { term, results, status, retry, minLength } = useInstantSearch()
const searchHistory = useSearchHistory()
const viewHistory = useViewHistory()
const prefetch = usePrefetchManga()
const input = ref<HTMLInputElement | null>(null)
const activeIndex = ref(0)
const listId = useId()
const RECENT_VIEW_LIMIT = 4

const hasQuery = computed(() => normalizeTerm(term.value).length >= minLength)

const options = computed<PaletteOption[]>(() => {
  if (!hasQuery.value) {
    return [
      ...searchHistory.terms.value.map(recent => ({ id: `term-${recent}`, kind: 'recent-term' as const, term: recent })),
      ...viewHistory.history.value.entries.slice(0, RECENT_VIEW_LIMIT).map(entry => ({
        id: `view-${entry.manga.id}`,
        kind: 'recent-view' as const,
        to: mangaPath(entry.manga),
        label: entry.manga.title,
        detail: relativeTime(entry.viewedAt),
      })),
    ]
  }
  const text = normalizeTerm(term.value)
  return [
    ...(results.value?.manga ?? []).map(manga => ({ id: `manga-${manga.id}`, kind: 'manga' as const, to: mangaPath(manga), manga })),
    ...(results.value?.creators ?? []).map(creator => ({
      id: `creator-${creator.id}`,
      kind: 'creator' as const,
      to: creatorPath(creator),
      label: creator.name,
      detail: creator.nativeName,
      image: creator.image,
    })),
    { id: 'all', kind: 'all' as const, to: searchPageUrl(text), label: text },
  ]
})

const activeOption = computed(() => options.value[activeIndex.value])
const activeDescendant = computed(() => (activeOption.value ? `${listId}-${activeOption.value.id}` : undefined))

watch(options, () => {
  activeIndex.value = 0
})

watch(activeOption, option => {
  if (option?.kind === 'manga') prefetch(option.manga)
})

watch(open, isOpen => {
  if (isOpen) nextTick(() => input.value?.select())
})

onMounted(() => nextTick(() => input.value?.focus()))

function searchPageUrl(text: string): string {
  const params = new URLSearchParams(toSearchUrlParams({ ...EMPTY_SEARCH_QUERY, text }))
  return `/search?${params.toString()}`
}

function move(delta: number) {
  const count = options.value.length
  if (count === 0) return
  activeIndex.value = (activeIndex.value + delta + count) % count
  nextTick(() => document.getElementById(activeDescendant.value ?? '')?.scrollIntoView({ block: 'nearest' }))
}

async function choose(option: PaletteOption | undefined) {
  if (!option) return
  if (option.kind === 'recent-term') {
    term.value = option.term
    return
  }
  if (hasQuery.value) {
    searchHistory.record(normalizeTerm(term.value))
    trackEvent('search', { source: 'palette', term: normalizeTerm(term.value) })
  }
  palette.hide()
  await navigateTo(option.to)
}

async function openFullResults() {
  const text = normalizeTerm(term.value)
  if (!text) return
  searchHistory.record(text)
  trackEvent('search', { source: 'palette', term: text })
  palette.hide()
  await navigateTo(searchPageUrl(text))
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    move(1)
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    move(-1)
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (event.metaKey || event.ctrlKey) void openFullResults()
    else void choose(activeOption.value)
  }
}
</script>

<template>
  <UiDialog v-model:open="open" label="Rechercher dans le catalogue" fullscreen-on-mobile>
    <div class="palette">
      <div class="palette__field">
        <UiIcon name="search" :size="22" class="palette__glyph" />
        <input
          ref="input"
          v-model="term"
          class="palette__input"
          type="search"
          role="combobox"
          aria-label="Rechercher des titres et des auteurs"
          aria-autocomplete="list"
          :aria-expanded="options.length > 0"
          :aria-controls="listId"
          :aria-activedescendant="activeDescendant"
          autocomplete="off"
          autocorrect="off"
          spellcheck="false"
          enterkeyhint="search"
          maxlength="100"
          placeholder="Titre, auteur, dessinateur…"
          @keydown="onKeydown"
        />
        <span v-if="status === 'loading'" class="palette__spinner" aria-hidden="true" />
        <button type="button" class="palette__close" aria-label="Fermer la recherche" @click="palette.hide()">
          <span class="palette__esc">Échap</span>
          <UiIcon name="close" class="palette__close-icon" />
        </button>
      </div>

      <div class="palette__body">
        <p class="visually-hidden" aria-live="polite">
          <template v-if="hasQuery && status === 'success'">{{ plural(results?.manga.length ?? 0, 'titre') }} et {{ plural(results?.creators.length ?? 0, 'auteur') }} trouvés</template>
        </p>

        <div v-if="hasQuery && status === 'error'" class="palette__state">
          <UiErrorState title="La recherche est injoignable" message="Impossible de joindre le catalogue. Vérifiez votre connexion." @retry="retry" />
        </div>

        <ul v-else-if="options.length" :id="listId" class="palette__list" role="listbox" aria-label="Suggestions">
          <template v-for="(option, index) in options" :key="option.id">
            <li v-if="index === 0 && !hasQuery && option.kind === 'recent-term'" class="palette__group label" role="presentation">Recherches récentes</li>
            <li
              v-if="!hasQuery && option.kind === 'recent-view' && options[index - 1]?.kind !== 'recent-view'"
              class="palette__group label"
              role="presentation"
            >
              Consultés récemment
            </li>
            <li v-if="hasQuery && option.kind === 'manga' && index === 0" class="palette__group label" role="presentation">Titres</li>
            <li
              v-if="option.kind === 'creator' && options[index - 1]?.kind !== 'creator'"
              class="palette__group label"
              role="presentation"
            >
              Auteurs
            </li>

            <li
              :id="`${listId}-${option.id}`"
              class="palette__option"
              :class="[`palette__option--${option.kind}`, { 'is-active': index === activeIndex }]"
              role="option"
              :aria-selected="index === activeIndex"
              @pointermove="activeIndex = index"
              @click="choose(option)"
            >
              <template v-if="option.kind === 'manga'">
                <span class="palette__thumb">
                  <MangaCover :cover="option.manga.cover" :title="option.manga.title" sizes="48px" decorative />
                </span>
                <span class="palette__text">
                  <span class="palette__title">{{ option.manga.title }}</span>
                  <span class="palette__detail">{{ metaLine(option.manga) }}</span>
                </span>
                <span class="palette__aside numeric">{{ option.manga.chapters ? `${option.manga.chapters} ch.` : statusLabel(option.manga.status) }}</span>
              </template>
              <template v-else-if="option.kind === 'creator'">
                <span class="palette__avatar" aria-hidden="true">
                  <img v-if="option.image" :src="option.image" alt="" width="40" height="40" loading="lazy" />
                  <span v-else>{{ option.label.charAt(0) }}</span>
                </span>
                <span class="palette__text">
                  <span class="palette__title">{{ option.label }}</span>
                  <span v-if="option.detail" class="palette__detail">{{ option.detail }}</span>
                </span>
              </template>
              <template v-else-if="option.kind === 'all'">
                <UiIcon name="arrowRight" />
                <span class="palette__text">
                  <span class="palette__title">Tous les résultats pour « {{ option.label }} »</span>
                  <span class="palette__detail">Filtrer par genre, statut, plateforme, langue…</span>
                </span>
              </template>
              <template v-else-if="option.kind === 'recent-term'">
                <UiIcon name="clock" />
                <span class="palette__text"><span class="palette__title">{{ option.term }}</span></span>
              </template>
              <template v-else>
                <UiIcon name="arrowUpRight" />
                <span class="palette__text">
                  <span class="palette__title">{{ option.label }}</span>
                  <span class="palette__detail">{{ option.detail }}</span>
                </span>
              </template>
            </li>
          </template>
        </ul>

        <div v-else-if="!hasQuery" class="palette__state palette__intro">
          <p class="display palette__intro-title">Trouvez un titre, un auteur, un dessinateur.</p>
          <p class="palette__intro-body">Chaque résultat indique où le lire légalement.</p>
        </div>

        <div v-else-if="status === 'loading'" class="palette__state" aria-hidden="true">
          <div v-for="index in 4" :key="index" class="palette__skeleton">
            <UiSkeleton width="48px" :ratio="0.7" />
            <div class="palette__skeleton-lines">
              <UiSkeleton width="60%" />
              <UiSkeleton width="35%" height="0.7em" />
            </div>
          </div>
        </div>
      </div>

      <footer class="palette__footer" aria-hidden="true">
        <span><kbd>↑</kbd><kbd>↓</kbd> naviguer</span>
        <span><kbd>↵</kbd> ouvrir</span>
        <span><kbd>⌘</kbd><kbd>↵</kbd> tous les résultats</span>
        <button v-if="!hasQuery && searchHistory.terms.value.length" type="button" class="palette__clear" tabindex="-1" @click="searchHistory.clear()">
          Effacer l’historique
        </button>
      </footer>
    </div>
  </UiDialog>
</template>

<style scoped>
.palette {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: inherit;
}

.palette__field {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: 0 var(--s-3) 0 var(--s-5);
  border-bottom: 1px solid var(--c-line);
}

.palette__glyph {
  color: var(--c-shu);
}

.palette__input {
  flex: 1;
  min-width: 0;
  height: 68px;
  background: transparent;
  border: 0;
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  outline: none;
}

.palette__input:focus-visible {
  box-shadow: none;
}

.palette__field:focus-within {
  border-bottom-color: var(--c-shu-line);
}

.palette__input::placeholder {
  color: var(--c-fog);
}

.palette__input::-webkit-search-cancel-button {
  display: none;
}

.palette__spinner {
  width: 16px;
  height: 16px;
  border: 1px solid var(--c-line-strong);
  border-top-color: var(--c-shu);
  border-radius: 50%;
  animation: spin 700ms linear infinite;
}

@keyframes spin {
  to {
    rotate: 1turn;
  }
}

.palette__close {
  display: grid;
  place-items: center;
  min-width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-mist);
}

.palette__esc {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  text-transform: uppercase;
  border: 1px solid var(--c-line);
  padding: 4px 8px;
}

.palette__close-icon {
  display: none;
}

.palette__body {
  flex: 1;
  overflow-y: auto;
  overscroll-behavior: contain;
  min-height: 160px;
}

.palette__list {
  list-style: none;
  padding: var(--s-2);
}

.palette__group {
  padding: var(--s-4) var(--s-3) var(--s-2);
  font-size: var(--fs-2xs);
  color: var(--c-fog);
}

.palette__option {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  min-height: 56px;
  padding: var(--s-2) var(--s-3);
  cursor: pointer;
  color: var(--c-mist);
  border-left: 2px solid transparent;
}

.palette__option.is-active {
  background: var(--c-ink-3);
  color: var(--c-paper);
  border-left-color: var(--c-shu);
}

.palette__thumb {
  width: 40px;
  flex: none;
}

.palette__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--c-ink-3);
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  flex: none;
}

.palette__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.palette__text {
  display: grid;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.palette__title {
  color: var(--c-bone);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.palette__detail,
.palette__aside {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-fog);
}

.palette__state {
  padding: var(--s-5);
}

.palette__intro {
  display: grid;
  gap: var(--s-2);
  padding-block: var(--s-6);
}

.palette__intro-title {
  font-size: var(--fs-xl);
}

.palette__intro-body {
  color: var(--c-fog);
  font-size: var(--fs-sm);
}

.palette__skeleton {
  display: flex;
  gap: var(--s-4);
  align-items: center;
  padding: var(--s-2) 0;
}

.palette__skeleton-lines {
  display: grid;
  gap: var(--s-2);
  flex: 1;
}

.palette__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-3) var(--s-5);
  border-top: 1px solid var(--c-line);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--c-fog);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.palette__footer kbd {
  font-family: inherit;
  border: 1px solid var(--c-line);
  padding: 1px 5px;
  margin-right: 3px;
}

.palette__clear {
  margin-left: auto;
  font-family: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  color: var(--c-mist);
}

@media (max-width: 720px) {
  .palette__footer {
    display: none;
  }

  .palette__esc {
    display: none;
  }

  .palette__close-icon {
    display: block;
  }

  .palette__field {
    padding-top: env(safe-area-inset-top, 0px);
  }
}
</style>
