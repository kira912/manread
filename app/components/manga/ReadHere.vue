<script setup lang="ts">
import { chapterLabel, formatChapterNumber, type Chapter } from '#shared/domain/reader'

const props = defineProps<{ mangaId: string; title: string; chapters: readonly Chapter[] }>()
const { entryOf, ready } = useLibrary()
const entry = entryOf(() => props.mangaId)
const resume = useResumeTarget(() => props.mangaId, () => props.chapters)

const licenses = computed(() => {
  const unique = new Map<string, Chapter>()
  for (const chapter of props.chapters) unique.set(`${chapter.sourceName}|${chapter.license.name}`, chapter)
  return [...unique.values()]
})

const isRead = (chapter: Chapter) => ready.value && entry.value !== undefined && chapter.number <= entry.value.chapter
const dateFormatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium', timeZone: 'UTC' })
</script>

<template>
  <section id="read-here" class="read" aria-labelledby="read-heading">
    <header class="read__head">
      <p class="label"><span class="read__dot" aria-hidden="true" /> Dans l’app · diffusion autorisée</p>
      <h2 id="read-heading" class="display read__title">Lire sur Manread</h2>
      <UiButton v-if="resume" variant="accent" :to="resume.to" icon-after="arrowRight">{{ resume.label }}</UiButton>
    </header>

    <ol class="read__list" role="list">
      <li v-for="chapter in chapters" :key="chapter.id">
        <NuxtLink :to="readerPath(chapter)" class="read__row" :class="{ 'is-read': isRead(chapter) }">
          <span class="read__number numeric">{{ formatChapterNumber(chapter.number) }}</span>
          <span class="read__name">{{ chapter.title ?? chapterLabel(chapter) }}</span>
          <span class="read__meta numeric">
            {{ chapter.pageCount }} p.<template v-if="chapter.publishedAt"> · {{ dateFormatter.format(new Date(chapter.publishedAt)) }}</template>
          </span>
          <span class="read__state">
            <UiIcon v-if="isRead(chapter)" name="check" :size="16" />
            <span class="visually-hidden">{{ isRead(chapter) ? '(lu)' : '' }}</span>
          </span>
        </NuxtLink>
      </li>
    </ol>

    <p v-for="licensed in licenses" :key="licensed.id" class="read__license">
      Publié par {{ licensed.sourceName }} · © {{ licensed.license.rightsHolder }} ·
      <a v-if="licensed.license.url" :href="licensed.license.url" class="link-underline" target="_blank" rel="noopener noreferrer external">{{ licensed.license.name }}</a>
      <template v-else>{{ licensed.license.name }}</template>
    </p>
  </section>
</template>

<style scoped>
.read {
  display: grid;
  gap: var(--s-5);
  scroll-margin-top: var(--s-6);
}

.read__head {
  display: grid;
  gap: var(--s-3);
  justify-items: start;
}

.read__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: var(--s-1);
  background: var(--c-shu);
  vertical-align: middle;
}

.read__title {
  font-size: var(--fs-2xl);
}

.read__list {
  border-top: 1px solid var(--c-line);
}

.read__row {
  display: grid;
  grid-template-columns: 5ch 1fr auto 24px;
  align-items: center;
  gap: var(--s-4);
  min-height: 56px;
  padding-inline: var(--s-2);
  border-bottom: 1px solid var(--c-line);
  transition: background-color var(--dur-2) var(--ease-out);
}

.read__row:hover {
  background: var(--c-ink-1);
}

.read__number {
  color: var(--c-shu);
  font-size: var(--fs-sm);
}

.read__name {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.read__meta {
  font-size: var(--fs-2xs);
  color: var(--c-fog);
}

.read__state {
  color: var(--c-mist);
}

.read__row.is-read .read__name {
  color: var(--c-fog);
}

.read__license {
  font-size: var(--fs-xs);
  color: var(--c-fog);
}

@media (max-width: 560px) {
  .read__row {
    grid-template-columns: 4ch 1fr 24px;
  }

  .read__meta {
    display: none;
  }
}
</style>
