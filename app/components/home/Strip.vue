<script setup lang="ts">
import { statusLabel, type MangaSummary } from '#shared/domain/manga'

defineProps<{ items: readonly MangaSummary[]; label: string }>()
const track = ref<HTMLElement | null>(null)
const SCROLL_RATIO = 0.8

function scroll(direction: 1 | -1) {
  const element = track.value
  if (!element) return
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  element.scrollBy({ left: direction * element.clientWidth * SCROLL_RATIO, behavior: reduceMotion ? 'auto' : 'smooth' })
}
</script>

<template>
  <div class="strip">
    <div class="strip__controls">
      <button type="button" class="strip__control" :aria-label="`Scroll ${label} backward`" @click="scroll(-1)">
        <UiIcon name="arrowLeft" />
      </button>
      <button type="button" class="strip__control" :aria-label="`Scroll ${label} forward`" @click="scroll(1)">
        <UiIcon name="arrowRight" />
      </button>
    </div>
    <ol ref="track" class="strip__track" role="list" :aria-label="label" tabindex="0">
      <li v-for="(manga, index) in items" :key="manga.id" class="strip__item" :class="{ 'strip__item--offset': index % 2 === 1 }">
        <MangaTile
          :manga="manga"
          :caption="[manga.startYear, statusLabel(manga.status)].filter(Boolean).join(' · ')"
          sizes="(min-width: 900px) 220px, 42vw"
        />
      </li>
    </ol>
  </div>
</template>

<style scoped>
.strip {
  position: relative;
}

.strip__controls {
  display: none;
  position: absolute;
  top: calc(-1 * var(--s-6) - var(--tap-min) - var(--s-4));
  right: 0;
  gap: var(--s-1);
}

@media (min-width: 900px) and (hover: hover) {
  .strip__controls {
    display: flex;
  }
}

.strip__control {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  border: 1px solid var(--c-line);
  color: var(--c-mist);
  transition:
    color var(--dur-2),
    border-color var(--dur-2);
}

.strip__control:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.strip__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: clamp(150px, 15vw + 60px, 220px);
  gap: var(--s-5);
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: var(--gutter);
  margin-inline: calc(-1 * var(--gutter));
  padding: var(--s-2) var(--gutter) var(--s-6);
  scrollbar-width: none;
}

.strip__track::-webkit-scrollbar {
  display: none;
}

.strip__track:focus-visible {
  box-shadow: inset var(--focus-ring);
}

.strip__item {
  scroll-snap-align: start;
}

.strip__item--offset {
  padding-top: var(--s-6);
}
</style>
