<script setup lang="ts">
import { READING_STATUSES, readingStatusLabel, type MangaSnapshot, type ReadingStatus } from '#shared/domain/library'

const props = defineProps<{ manga: MangaSnapshot }>()
const { entryOf, setStatus, toggleFavorite, setProgress, remove, ready } = useLibrary()
const entry = entryOf(() => props.manga.id)
const groupId = useId()

const chapter = computed({
  get: () => entry.value?.chapter ?? 0,
  set: value => setProgress(props.manga.id, value),
})

function choose(status: ReadingStatus) {
  if (entry.value?.status !== status) setStatus(props.manga, status)
}
</script>

<template>
  <div class="control" :class="{ 'control--loading': !ready }">
    <template v-if="!ready">
      <UiSkeleton height="44px" width="180px" />
    </template>

    <div v-else-if="!entry" class="control__actions">
      <UiButton variant="primary" icon="plus" @click="setStatus(manga, 'plan_to_read')">Ajouter à ma bibliothèque</UiButton>
      <UiButton variant="line" icon="bookmark" :pressed="false" @click="toggleFavorite(manga)">Favori</UiButton>
    </div>

    <div v-else class="control__panel">
      <fieldset class="control__statuses">
        <legend class="label">Dans votre bibliothèque</legend>
        <div class="control__chips">
          <label v-for="status in READING_STATUSES" :key="status" class="control__chip" :class="{ 'is-checked': entry.status === status }">
            <input
              type="radio"
              class="visually-hidden"
              :name="groupId"
              :value="status"
              :checked="entry.status === status"
              @change="choose(status)"
            />
            {{ readingStatusLabel(status) }}
          </label>
        </div>
      </fieldset>

      <div class="control__row">
        <UiNumberStepper v-model="chapter" label="Dernier chapitre lu" :max="manga.chapters" :suffix="manga.chapters ? `/ ${manga.chapters}` : undefined" />
        <div class="control__secondary">
          <UiButton
            variant="line"
            size="sm"
            :icon="entry.favorite ? 'bookmarkFilled' : 'bookmark'"
            :pressed="entry.favorite"
            @click="toggleFavorite(manga)"
          >
            {{ entry.favorite ? 'Favori' : 'Mettre en favori' }}
          </UiButton>
          <UiButton variant="ghost" size="sm" icon="trash" @click="remove(manga.id)">Retirer</UiButton>
        </div>
      </div>

      <a
        v-if="entry.preferredPlatform"
        class="control__resume"
        :href="entry.preferredPlatform.url"
        target="_blank"
        rel="noopener noreferrer external"
        @click="openOfficialPlatform({ mangaId: manga.id, title: manga.title, platformName: entry.preferredPlatform.name, nextChapter: entry.chapter + 1 })"
      >
        Reprendre sur {{ entry.preferredPlatform.name }} — ch. {{ entry.chapter + 1 }}
        <UiIcon name="arrowUpRight" :size="16" />
        <span class="visually-hidden">(s’ouvre dans un nouvel onglet)</span>
      </a>
    </div>
  </div>
</template>

<style scoped>
.control {
  min-height: 44px;
}

.control__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.control__panel {
  display: grid;
  gap: var(--s-4);
  padding: var(--s-4);
  border: 1px solid var(--c-line);
  background: var(--c-ink-1);
}

.control__statuses {
  border: 0;
  padding: 0;
  display: grid;
  gap: var(--s-2);
}

.control__chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1);
}

.control__chip {
  display: inline-flex;
  align-items: center;
  min-height: 36px;
  padding-inline: var(--s-3);
  border: 1px solid var(--c-line);
  font-size: var(--fs-sm);
  color: var(--c-mist);
  cursor: pointer;
  transition:
    color var(--dur-2),
    border-color var(--dur-2),
    background-color var(--dur-2);
}

.control__chip:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.control__chip.is-checked {
  color: var(--c-paper);
  border-color: var(--c-shu-line);
  background: var(--c-shu-soft);
}

.control__chip:has(:focus-visible) {
  box-shadow: var(--focus-ring);
}

.control__row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: var(--s-4);
}

.control__secondary {
  display: flex;
  gap: var(--s-1);
}

.control__resume {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-shu);
}
</style>
