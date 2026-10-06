<script setup lang="ts">
import { continueReading, progressRatio } from '#shared/domain/library'
import { mangaPath } from '#shared/domain/manga'

const CONTINUE_LIMIT = 6
const { library, ready, setProgress } = useLibrary()
const { positions } = useReadingPositions()
const inAppPosition = (mangaId: string) => positions.value.entries[mangaId]
const entries = computed(() => (ready.value ? continueReading(library.value, CONTINUE_LIMIT) : []))
</script>

<template>
  <section v-if="entries.length" class="page continue" aria-labelledby="continue-heading">
    <HomeSectionHeader
      marker="Yours"
      title="Continue reading"
      jp="続きから"
      kicker="Picked up where you left off"
      heading-id="continue-heading"
      :more="{ to: '/library', label: 'Library' }"
    />
    <ol class="continue__list" role="list">
      <li v-for="entry in entries" :key="entry.manga.id" class="continue__card">
        <MangaLink :manga="entry.manga" class="continue__cover" tabindex="-1" aria-hidden="true">
          <MangaCover :cover="snapshotCover(entry.manga)" :title="entry.manga.title" sizes="96px" decorative />
        </MangaLink>
        <div class="continue__body">
          <MangaLink :manga="entry.manga" class="continue__title display">{{ entry.manga.title }}</MangaLink>
          <p class="continue__progress numeric">
            Ch. {{ entry.chapter }}<template v-if="entry.manga.chapters"> / {{ entry.manga.chapters }}</template>
          </p>
          <UiProgressBar :value="progressRatio(entry)" :label="`${entry.manga.title} reading progress`" />
          <div class="continue__actions">
            <NuxtLink
              v-if="inAppPosition(entry.manga.id)"
              class="continue__resume"
              :to="`/read/${entry.manga.id}/${inAppPosition(entry.manga.id)!.chapterId}`"
            >
              Resume here · ch. {{ inAppPosition(entry.manga.id)!.chapterNumber }}
              <UiIcon name="arrowRight" :size="16" />
            </NuxtLink>
            <a
              v-else-if="entry.preferredPlatform"
              class="continue__resume"
              :href="entry.preferredPlatform.url"
              target="_blank"
              rel="noopener noreferrer external"
              @click="rememberOutbound({ mangaId: entry.manga.id, title: entry.manga.title, platformName: entry.preferredPlatform.name, nextChapter: entry.chapter + 1 })"
            >
              Resume on {{ entry.preferredPlatform.name }}
              <UiIcon name="arrowUpRight" :size="16" />
              <span class="visually-hidden">(opens in a new tab)</span>
            </a>
            <NuxtLink v-else class="continue__resume" :to="`${mangaPath(entry.manga)}#where-to-read`">
              Choose where to read <UiIcon name="arrowRight" :size="16" />
            </NuxtLink>
            <button type="button" class="continue__bump" :aria-label="`Mark chapter ${entry.chapter + 1} of ${entry.manga.title} as read`" @click="setProgress(entry.manga.id, entry.chapter + 1)">
              +1 ch.
            </button>
          </div>
        </div>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.continue {
  padding-block: var(--s-7);
}

.continue__list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: var(--s-3);
}

.continue__card {
  display: grid;
  grid-template-columns: 76px 1fr;
  gap: var(--s-4);
  padding: var(--s-3);
  background: var(--c-ink-1);
  border: 1px solid var(--c-line);
  transition: border-color var(--dur-2) var(--ease-out);
}

.continue__card:hover {
  border-color: var(--c-line-strong);
}

.continue__body {
  display: grid;
  gap: var(--s-2);
  align-content: center;
  min-width: 0;
}

.continue__title {
  font-size: var(--fs-lg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.continue__progress {
  font-size: var(--fs-xs);
  color: var(--c-mist);
}

.continue__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--s-2);
}

.continue__resume,
.continue__bump {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  min-height: var(--tap-min);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.continue__resume {
  color: var(--c-shu);
}

.continue__bump {
  color: var(--c-mist);
  padding-inline: var(--s-2);
  border: 1px solid var(--c-line);
}

.continue__bump:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}
</style>
