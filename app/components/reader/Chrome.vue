<script setup lang="ts">
import { chapterLabel, type Chapter, type ReadingDirection } from '#shared/domain/reader'

const props = defineProps<{
  visible: boolean
  title: string
  backTo: string
  chapter: Chapter
  chapters: readonly Chapter[]
  page: number
  pageCount: number
  direction: ReadingDirection
  previousChapterTo: string | null
  nextChapterTo: string | null
  chapterPath: (chapter: Chapter) => string
  fullscreenSupported: boolean
  fullscreen: boolean
}>()
const emit = defineEmits<{ seek: [page: number]; openSettings: []; toggleFullscreen: []; pin: [pinned: boolean] }>()

const chapterSelectId = useId()
const selectedChapter = computed({
  get: () => props.chapter.id,
  set: id => {
    const target = props.chapters.find(chapter => chapter.id === id)
    if (target) void navigateTo(props.chapterPath(target))
  },
})
</script>

<template>
  <div class="chrome" :class="{ 'is-visible': visible }" @focusin="emit('pin', true)" @focusout="emit('pin', false)" @pointerenter="emit('pin', true)" @pointerleave="emit('pin', false)">
    <header class="chrome__top">
      <NuxtLink :to="backTo" class="chrome__icon" :aria-label="`Back to ${title}`">
        <UiIcon name="arrowLeft" />
      </NuxtLink>
      <div class="chrome__titles">
        <p class="chrome__title">{{ title }}</p>
        <label :for="chapterSelectId" class="visually-hidden">Chapter</label>
        <select :id="chapterSelectId" v-model="selectedChapter" class="chrome__chapter">
          <option v-for="option in chapters" :key="option.id" :value="option.id">{{ chapterLabel(option) }}</option>
        </select>
      </div>
      <button v-if="fullscreenSupported" type="button" class="chrome__icon" :aria-pressed="fullscreen" aria-label="Fullscreen" aria-keyshortcuts="F" @click="emit('toggleFullscreen')">
        <UiIcon :name="fullscreen ? 'collapse' : 'expand'" />
      </button>
      <button type="button" class="chrome__icon" aria-label="Reader settings" @click="emit('openSettings')">
        <UiIcon name="filters" />
      </button>
    </header>

    <footer class="chrome__bottom">
      <NuxtLink v-if="previousChapterTo" :to="previousChapterTo" class="chrome__icon" aria-label="Previous chapter" aria-keyshortcuts="[">
        <UiIcon :name="direction === 'rtl' ? 'arrowRight' : 'arrowLeft'" />
      </NuxtLink>
      <span v-else class="chrome__icon chrome__icon--empty" aria-hidden="true" />
      <label class="chrome__scrubber">
        <span class="visually-hidden">Page</span>
        <input
          type="range"
          min="1"
          :max="pageCount"
          :value="page + 1"
          :dir="direction"
          :aria-valuetext="`Page ${page + 1} of ${pageCount}`"
          @input="emit('seek', Number(($event.target as HTMLInputElement).value) - 1)"
        />
      </label>
      <span class="chrome__count numeric" aria-hidden="true">{{ page + 1 }} / {{ pageCount }}</span>
      <NuxtLink v-if="nextChapterTo" :to="nextChapterTo" class="chrome__icon" aria-label="Next chapter" aria-keyshortcuts="]">
        <UiIcon :name="direction === 'rtl' ? 'arrowLeft' : 'arrowRight'" />
      </NuxtLink>
      <span v-else class="chrome__icon chrome__icon--empty" aria-hidden="true" />
    </footer>
  </div>
</template>

<style scoped>
.chrome__top,
.chrome__bottom {
  position: fixed;
  z-index: var(--z-dock);
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: var(--s-2);
  padding: var(--s-2) var(--s-3);
  background: rgb(5 5 6 / 0.88);
  backdrop-filter: blur(12px);
  transition:
    transform var(--dur-3) var(--ease-out),
    opacity var(--dur-2) var(--ease-out);
}

.chrome__top {
  top: 0;
  padding-top: calc(var(--s-2) + env(safe-area-inset-top, 0px));
  border-bottom: 1px solid var(--c-line);
  transform: translateY(-100%);
}

.chrome__bottom {
  bottom: 0;
  padding-bottom: calc(var(--s-2) + var(--safe-bottom));
  border-top: 1px solid var(--c-line);
  transform: translateY(100%);
}

.chrome.is-visible .chrome__top,
.chrome.is-visible .chrome__bottom,
.chrome:focus-within .chrome__top,
.chrome:focus-within .chrome__bottom {
  transform: none;
}

.chrome__titles {
  flex: 1;
  min-width: 0;
  display: grid;
}

.chrome__title {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  line-height: 1.1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chrome__chapter {
  appearance: none;
  background: transparent;
  border: 0;
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--c-mist);
  cursor: pointer;
  max-width: 100%;
  text-overflow: ellipsis;
}

.chrome__icon {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-bone);
}

.chrome__icon:hover {
  color: var(--c-shu);
}

.chrome__scrubber {
  flex: 1;
  display: flex;
}

.chrome__scrubber input {
  width: 100%;
  accent-color: var(--c-shu);
  min-height: var(--tap-min);
}

.chrome__count {
  font-size: var(--fs-xs);
  color: var(--c-mist);
  min-width: 7ch;
  text-align: center;
}
</style>
