<script setup lang="ts">
import { libraryStats } from '#shared/domain/library'

const palette = useSearchPalette()
const { library, ready } = useLibrary()
const route = useRoute()

const readingCount = computed(() => (ready.value ? libraryStats(library.value).reading : 0))
const isActive = (path: string) => (path === '/' ? route.path === '/' : route.path.startsWith(path))
</script>

<template>
  <header class="rail">
    <NuxtLink to="/" class="rail__brand" aria-label="Manread, home">
      <LayoutBrandMark />
    </NuxtLink>

    <nav class="rail__nav" aria-label="Primary">
      <NuxtLink to="/" class="rail__link" :class="{ 'is-active': isActive('/') }" :aria-current="isActive('/') ? 'page' : undefined">
        Index
      </NuxtLink>
      <button type="button" class="rail__link" aria-keyshortcuts="Control+K Meta+K" @click="palette.show()">
        Search <kbd class="rail__kbd">⌘K</kbd>
      </button>
      <NuxtLink to="/library" class="rail__link" :class="{ 'is-active': isActive('/library') }" :aria-current="isActive('/library') ? 'page' : undefined">
        Library
        <span v-if="readingCount" class="rail__count numeric">
          {{ readingCount }}<span class="visually-hidden"> in progress</span>
        </span>
      </NuxtLink>
    </nav>

    <div class="rail__meter" aria-hidden="true"><span class="rail__meter-fill" /></div>
    <span class="rail__jp jp" aria-hidden="true">読む</span>
  </header>
</template>

<style scoped>
.rail {
  position: fixed;
  z-index: var(--z-rail);
  inset: 0 auto 0 0;
  width: var(--rail-width);
  display: none;
  flex-direction: column;
  align-items: center;
  gap: var(--s-6);
  padding: var(--s-5) 0;
  border-right: 1px solid var(--c-line);
  background: linear-gradient(180deg, var(--c-void), rgb(5 5 6 / 0.92));
}

@media (min-width: 900px) {
  .rail {
    display: flex;
  }
}

.rail__brand {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-bone);
}

.rail__nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--s-2);
}

.rail__link {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--s-3);
  writing-mode: vertical-rl;
  rotate: 180deg;
  min-width: var(--tap-min);
  padding: var(--s-4) 0;
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--c-fog);
  transition: color var(--dur-2) var(--ease-out);
}

.rail__link::before {
  content: '';
  position: absolute;
  right: 6px;
  top: 50%;
  width: 4px;
  height: 4px;
  background: var(--c-shu);
  translate: 0 -50%;
  scale: 0;
  transition: scale var(--dur-3) var(--ease-out);
}

.rail__link:hover,
.rail__link.is-active {
  color: var(--c-paper);
}

.rail__link.is-active::before {
  scale: 1;
}

.rail__kbd {
  font-family: inherit;
  font-size: var(--fs-2xs);
  color: var(--c-fog);
  border: 1px solid var(--c-line);
  padding: 4px 2px;
}

.rail__count {
  font-size: var(--fs-2xs);
  color: var(--c-shu);
}

.rail__meter {
  flex: 1;
  width: 1px;
  background: var(--c-line);
  position: relative;
  overflow: hidden;
}

.rail__meter-fill {
  position: absolute;
  inset: 0;
  background: var(--c-shu);
  transform-origin: top;
  transform: scaleY(0);
}

@supports (animation-timeline: scroll()) {
  .rail__meter-fill {
    animation: meter linear both;
    animation-timeline: scroll(root block);
  }
}

@keyframes meter {
  to {
    transform: scaleY(1);
  }
}

.rail__jp {
  writing-mode: vertical-rl;
  font-size: var(--fs-sm);
  color: var(--c-fog);
  letter-spacing: 0.3em;
}
</style>
