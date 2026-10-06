<script setup lang="ts">
const palette = useSearchPalette()
const route = useRoute()
const isActive = (path: string) => (path === '/' ? route.path === '/' : route.path.startsWith(path))
</script>

<template>
  <nav class="dock" aria-label="Primary">
    <NuxtLink to="/" class="dock__item" :aria-current="isActive('/') ? 'page' : undefined">
      <UiIcon name="index" />
      <span>Index</span>
    </NuxtLink>
    <button type="button" class="dock__item dock__item--search" @click="palette.show()">
      <span class="dock__search-glyph"><UiIcon name="search" /></span>
      <span>Search</span>
    </button>
    <NuxtLink to="/library" class="dock__item" :aria-current="isActive('/library') ? 'page' : undefined">
      <UiIcon name="library" />
      <span>Library</span>
    </NuxtLink>
  </nav>
</template>

<style scoped>
.dock {
  position: fixed;
  z-index: var(--z-dock);
  inset: auto 0 0;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  height: calc(var(--dock-height) + var(--safe-bottom));
  padding-bottom: var(--safe-bottom);
  background: rgb(8 8 10 / 0.86);
  backdrop-filter: blur(14px) saturate(140%);
  border-top: 1px solid var(--c-line);
}

@media (min-width: 900px) {
  .dock {
    display: none;
  }
}

.dock__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--c-fog);
  -webkit-tap-highlight-color: transparent;
  transition: color var(--dur-2) var(--ease-out);
}

.dock__item[aria-current='page'] {
  color: var(--c-paper);
}

.dock__item[aria-current='page'] :deep(.icon) {
  color: var(--c-shu);
}

.dock__item:active {
  transform: scale(0.94);
}

.dock__search-glyph {
  display: grid;
  place-items: center;
  width: 44px;
  height: 30px;
  border: 1px solid var(--c-line-strong);
  color: var(--c-bone);
}
</style>
