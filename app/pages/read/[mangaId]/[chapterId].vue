<script setup lang="ts">
import { mangaPath } from '#shared/domain/manga'
import { CHAPTER_ID_PATTERN, chapterLabel, type Chapter } from '#shared/domain/reader'

definePageMeta({
  layout: 'reader',
  key: route => route.path,
  validate: route =>
    typeof route.params.mangaId === 'string' &&
    /^[a-z0-9-]{1,40}$/.test(route.params.mangaId) &&
    typeof route.params.chapterId === 'string' &&
    CHAPTER_ID_PATTERN.test(route.params.chapterId),
})

const CHROME_IDLE_MS = 2_800

const route = useRoute()
const mangaId = String(route.params.mangaId)
const chapterId = String(route.params.chapterId)

const [chapterResult, detailsResult, listResult] = await Promise.all([useReadableChapter(chapterId), useMangaDetails(mangaId), useChapters(mangaId)])
const { data: readable, error: chapterError } = chapterResult
const { data: details } = detailsResult
const { data: chapterList } = listResult

if (chapterError.value?.statusCode === 404 || (readable.value && readable.value.chapter.mangaId !== mangaId)) {
  throw createError({ statusCode: 404, statusMessage: 'Chapitre introuvable', fatal: true })
}
if (!readable.value || !details.value) {
  throw createError({ statusCode: 503, statusMessage: 'Lecteur indisponible', fatal: true })
}

const readableChapter = computed(() => readable.value!)
const manga = computed(() => details.value!.manga)
const chapters = computed(() => (chapterList.value.chapters.length ? chapterList.value.chapters : [readableChapter.value.chapter]))
const chapterPath = (chapter: Chapter) => `/read/${chapter.mangaId}/${chapter.id}`
const previousTo = computed(() => (readableChapter.value.previous ? chapterPath(readableChapter.value.previous) : null))
const nextTo = computed(() => (readableChapter.value.next ? chapterPath(readableChapter.value.next) : null))

const session = useReaderSession(readableChapter, manga)
const { settings, page, pageCount, finished, resumedFrom, goTo, next, previous } = session

const vertical = ref<{ jumpTo: (page: number) => void } | null>(null)
const settingsOpen = ref(false)
const chromeVisible = ref(true)
const chromePinned = ref(false)
const fullscreen = ref(false)
const fullscreenSupported = ref(false)
let hideTimer: ReturnType<typeof setTimeout> | undefined

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (!chromePinned.value && !settingsOpen.value && !finished.value) chromeVisible.value = false
  }, CHROME_IDLE_MS)
}

function showChrome() {
  chromeVisible.value = true
  scheduleHide()
}

function toggleChrome() {
  chromeVisible.value = !chromeVisible.value
  if (chromeVisible.value) scheduleHide()
}

function seek(target: number) {
  goTo(target)
  if (settings.value.mode === 'vertical') vertical.value?.jumpTo(target)
}

async function toggleFullscreen() {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
}

function onKeydown(event: KeyboardEvent) {
  if (settingsOpen.value || event.metaKey || event.ctrlKey || event.altKey || isTypingTarget(event.target)) return
  const paged = settings.value.mode === 'paged'
  const forwardKey = settings.value.direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'
  const backwardKey = settings.value.direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'
  const actions: Record<string, (() => void) | undefined> = {
    [forwardKey]: paged ? next : undefined,
    [backwardKey]: paged ? previous : undefined,
    ' ': paged ? (event.shiftKey ? previous : next) : undefined,
    PageDown: paged ? next : undefined,
    PageUp: paged ? previous : undefined,
    Home: paged ? () => goTo(0) : undefined,
    End: paged ? () => goTo(pageCount.value - 1) : undefined,
    f: fullscreenSupported.value ? () => void toggleFullscreen() : undefined,
    m: toggleChrome,
    '[': previousTo.value ? () => void navigateTo(previousTo.value!) : undefined,
    ']': nextTo.value ? () => void navigateTo(nextTo.value!) : undefined,
  }
  const action = actions[event.key.length === 1 ? event.key.toLowerCase() : event.key] ?? actions[event.key]
  if (!action) return
  event.preventDefault()
  action()
}

const onFullscreenChange = () => {
  fullscreen.value = Boolean(document.fullscreenElement)
}

watch(resumedFrom, start => {
  if (start && settings.value.mode === 'vertical') nextTick(() => vertical.value?.jumpTo(start))
})

watch(finished, done => {
  if (done) chromeVisible.value = true
})

onMounted(() => {
  fullscreenSupported.value = document.fullscreenEnabled
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  scheduleHide()
})

onBeforeUnmount(() => {
  clearTimeout(hideTimer)
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

usePageSeo(() => ({
  title: `${chapterLabel(readableChapter.value.chapter)} · ${manga.value.title}`,
  description: `Lisez le ${chapterLabel(readableChapter.value.chapter).toLowerCase()} de ${manga.value.title}, publié par ${readableChapter.value.chapter.sourceName} sous licence ${readableChapter.value.chapter.license.name}.`,
  path: route.path,
  image: manga.value.cover.large,
  noindex: true,
}))
</script>

<template>
  <div class="reader" :class="`reader--${settings.mode}`" @mousemove="showChrome">
    <ReaderChrome
      :visible="chromeVisible"
      :title="manga.title"
      :back-to="mangaPath(manga)"
      :chapter="readableChapter.chapter"
      :chapters="chapters"
      :page="page"
      :page-count="pageCount"
      :direction="settings.direction"
      :previous-chapter-to="previousTo"
      :next-chapter-to="nextTo"
      :chapter-path="chapterPath"
      :fullscreen-supported="fullscreenSupported"
      :fullscreen="fullscreen"
      @seek="seek"
      @open-settings="settingsOpen = true"
      @toggle-fullscreen="toggleFullscreen"
      @pin="pinned => (chromePinned = pinned)"
    />

    <main id="reader" class="reader__stage" :aria-label="`${manga.title}, ${chapterLabel(readableChapter.chapter)}`" tabindex="-1">
      <h1 class="visually-hidden">{{ manga.title }} — {{ chapterLabel(readableChapter.chapter) }}</h1>

      <template v-if="settings.mode === 'paged'">
        <ReaderPaged
          v-show="!finished"
          :pages="readableChapter.pages"
          :page="page"
          :direction="settings.direction"
          :fit="settings.fit"
          @next="next"
          @previous="previous"
          @toggle-chrome="toggleChrome"
        />
        <ReaderEnd
          v-if="finished"
          class="reader__end"
          :chapter="readableChapter.chapter"
          :next="readableChapter.next"
          :next-to="nextTo"
          :manga-to="mangaPath(manga)"
          :title="manga.title"
        />
        <p class="visually-hidden" aria-live="polite">{{ finished ? 'Fin du chapitre' : `Page ${page + 1} sur ${pageCount}` }}</p>
      </template>

      <ReaderVertical v-else ref="vertical" :pages="readableChapter.pages" :fit="settings.fit" @update:page="value => (page = value)" @toggle-chrome="toggleChrome">
        <template #end>
          <ReaderEnd
            :chapter="readableChapter.chapter"
            :next="readableChapter.next"
            :next-to="nextTo"
            :manga-to="mangaPath(manga)"
            :title="manga.title"
          />
        </template>
      </ReaderVertical>
    </main>

    <div class="reader__progress" aria-hidden="true">
      <span :style="{ transform: `scaleX(${finished ? 1 : (page + 1) / Math.max(1, pageCount)})` }" />
    </div>

    <ReaderSettings v-model:open="settingsOpen" :preferences="session.preferences.value" @change="session.setPreferences" />
  </div>
</template>

<style scoped>
.reader {
  min-height: 100dvh;
  color: var(--c-bone);
}

.reader__stage:focus {
  outline: none;
}

.reader--paged .reader__stage {
  height: 100dvh;
  overflow: hidden;
}

.reader__end {
  min-height: 100dvh;
  display: grid;
  align-content: center;
}

.reader__progress {
  position: fixed;
  z-index: var(--z-dock);
  left: 0;
  right: 0;
  top: 0;
  height: 2px;
  pointer-events: none;
}

.reader__progress span {
  display: block;
  height: 100%;
  background: var(--c-shu);
  transform-origin: left;
  transition: transform var(--dur-3) var(--ease-out);
}
</style>
