<script setup lang="ts">
import { READING_STATUSES, progressRatio, readingStatusLabel, type LibraryEntry, type ReadingStatus } from '#shared/domain/library'
import { mangaPath, originLabel, statusLabel } from '#shared/domain/manga'

const props = defineProps<{ entry: LibraryEntry }>()
const { setStatus, toggleFavorite, setProgress, remove } = useLibrary()
const inAppPosition = useReadingPositions().positionOf(() => props.entry.manga.id)

const statusOptions = READING_STATUSES.map(status => ({ value: status, label: readingStatusLabel(status) }))
const status = computed<ReadingStatus>({
  get: () => props.entry.status,
  set: value => setStatus(props.entry.manga, value),
})
const atLastChapter = computed(() => props.entry.manga.chapters !== null && props.entry.chapter >= props.entry.manga.chapters)
</script>

<template>
  <article class="row">
    <MangaLink :manga="entry.manga" class="row__cover" tabindex="-1" aria-hidden="true">
      <MangaCover :cover="snapshotCover(entry.manga)" :title="entry.manga.title" sizes="72px" decorative />
    </MangaLink>

    <div class="row__main">
      <h3 class="row__title display">
        <MangaLink :manga="entry.manga" class="link-underline">{{ entry.manga.title }}</MangaLink>
        <span v-if="entry.favorite" class="row__fav" aria-label="Favorite"><UiIcon name="bookmarkFilled" :size="14" /></span>
      </h3>
      <p class="row__meta">{{ originLabel(entry.manga.origin) }} · {{ statusLabel(entry.manga.status) }} · updated {{ relativeTime(entry.updatedAt) }}</p>
      <div class="row__progress">
        <span class="numeric">Ch. {{ entry.chapter }}<template v-if="entry.manga.chapters"> / {{ entry.manga.chapters }}</template></span>
        <UiProgressBar :value="progressRatio(entry)" :label="`${entry.manga.title} progress`" class="row__bar" />
        <button
          type="button"
          class="row__bump"
          :disabled="atLastChapter"
          :aria-label="`Mark chapter ${entry.chapter + 1} of ${entry.manga.title} as read`"
          @click="setProgress(entry.manga.id, entry.chapter + 1)"
        >
          +1
        </button>
      </div>
    </div>

    <div class="row__side">
      <UiSelect v-model="status" :label="`Status of ${entry.manga.title}`" :options="statusOptions" hide-label />
      <div class="row__actions">
        <NuxtLink v-if="inAppPosition" class="row__resume" :to="`/read/${entry.manga.id}/${inAppPosition.chapterId}`">
          Resume here <UiIcon name="arrowRight" :size="14" />
        </NuxtLink>
        <a
          v-else-if="entry.preferredPlatform"
          class="row__resume"
          :href="entry.preferredPlatform.url"
          target="_blank"
          rel="noopener noreferrer external"
          @click="openOfficialPlatform({ mangaId: entry.manga.id, title: entry.manga.title, platformName: entry.preferredPlatform.name, nextChapter: entry.chapter + 1 })"
        >
          {{ entry.preferredPlatform.name }} <UiIcon name="arrowUpRight" :size="14" />
          <span class="visually-hidden">(opens in a new tab)</span>
        </a>
        <NuxtLink v-else class="row__resume" :to="`${mangaPath(entry.manga)}#where-to-read`">Where to read</NuxtLink>
        <button
          type="button"
          class="row__icon"
          :aria-pressed="entry.favorite"
          :aria-label="entry.favorite ? `Remove ${entry.manga.title} from favorites` : `Add ${entry.manga.title} to favorites`"
          @click="toggleFavorite(entry.manga)"
        >
          <UiIcon :name="entry.favorite ? 'bookmarkFilled' : 'bookmark'" :size="18" />
        </button>
        <button type="button" class="row__icon" :aria-label="`Remove ${entry.manga.title} from library`" @click="remove(entry.manga.id)">
          <UiIcon name="trash" :size="18" />
        </button>
      </div>
    </div>
  </article>
</template>

<style scoped>
.row {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr);
  gap: var(--s-3) var(--s-4);
  padding-block: var(--s-4);
  border-bottom: 1px solid var(--c-line);
}

.row__main {
  display: grid;
  gap: var(--s-1);
  align-content: center;
  min-width: 0;
}

.row__title {
  display: flex;
  align-items: center;
  gap: var(--s-2);
  font-size: var(--fs-lg);
  min-width: 0;
}

.row__title a {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__fav {
  color: var(--c-shu);
}

.row__meta {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--c-fog);
}

.row__progress {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  font-size: var(--fs-xs);
  color: var(--c-mist);
}

.row__bar {
  flex: 1;
  max-width: 220px;
}

.row__bump {
  min-width: 36px;
  min-height: 32px;
  border: 1px solid var(--c-line);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  color: var(--c-mist);
}

.row__bump:hover:not(:disabled) {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.row__bump:disabled {
  opacity: 0.35;
}

.row__side {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
}

.row__actions {
  display: flex;
  align-items: center;
  gap: var(--s-1);
}

.row__resume {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  min-height: var(--tap-min);
  padding-inline: var(--s-2);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-shu);
}

.row__icon {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-fog);
  transition: color var(--dur-2);
}

.row__icon:hover,
.row__icon[aria-pressed='true'] {
  color: var(--c-bone);
}

@media (min-width: 900px) {
  .row {
    grid-template-columns: 64px minmax(0, 1fr) auto;
    align-items: center;
  }

  .row__side {
    grid-column: auto;
    flex-wrap: nowrap;
  }

  .row__side :deep(.select) {
    width: 170px;
  }
}
</style>
