<script setup lang="ts">
const palette = useSearchPalette()
const paletteRequested = ref(false)

watch(palette.isOpen, open => {
  if (open) paletteRequested.value = true
})

useHotkey({ key: 'k', mod: true }, () => palette.show())
useHotkey({ key: '/' }, () => palette.show())
</script>

<template>
  <div class="shell">
    <a class="skip-link" href="#main">Aller au contenu</a>
    <LayoutRail />
    <header class="topbar page">
      <NuxtLink to="/" class="topbar__brand" aria-label="Manread, accueil">
        <LayoutBrandMark :size="24" />
        <span class="topbar__name display">manread</span>
      </NuxtLink>
    </header>
    <main id="main" class="shell__main" tabindex="-1">
      <slot />
    </main>
    <LayoutFooter />
    <LayoutDock />
    <UiToasts />
    <LazySearchPalette v-if="paletteRequested" />
  </div>
</template>

<style scoped>
.shell {
  min-height: 100dvh;
  overflow-x: clip;
  padding-bottom: calc(var(--dock-height) + var(--safe-bottom));
}

.shell__main:focus {
  outline: none;
}

.topbar {
  display: flex;
  align-items: center;
  height: 56px;
}

@media (min-width: 900px) {
  .shell {
    padding-left: var(--rail-width);
    padding-bottom: 0;
  }

  .topbar {
    display: none;
  }
}

.topbar__brand {
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
}

.topbar__name {
  font-size: 1.5rem;
  font-style: italic;
  line-height: 1;
}

.skip-link {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--s-3);
  left: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--c-bone);
  color: var(--c-void);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-label);
  transform: translateY(-200%);
  transition: transform var(--dur-2) var(--ease-out);
}

.skip-link:focus {
  transform: none;
}
</style>
