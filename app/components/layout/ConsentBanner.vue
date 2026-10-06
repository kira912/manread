<script setup lang="ts">
const consent = useAnalyticsConsent()
const ready = useState(LIBRARY_READY_KEY, () => false)
const settingsOpen = useState('consent-settings-open', () => false)
const visible = computed(() => ready.value && consent.promptVisible.value)

const banner = ref<HTMLElement | null>(null)
let returnFocusTo: HTMLElement | null = null
let resizeObserver: ResizeObserver | null = null

// Reopened on purpose from the footer: move focus in, and give it back once a choice is made.
watch(
  settingsOpen,
  async open => {
    if (open) {
      returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
      await nextTick()
      banner.value?.focus()
    } else if (returnFocusTo?.isConnected) {
      returnFocusTo.focus({ preventScroll: true })
      returnFocusTo = null
    }
  },
  { flush: 'post' },
)

// Keeps keyboard focus from landing under the fixed banner (WCAG 2.4.11).
watch(banner, element => {
  resizeObserver?.disconnect()
  resizeObserver = null
  document.documentElement.style.removeProperty('scroll-padding-bottom')
  if (!element) return
  resizeObserver = new ResizeObserver(() => {
    document.documentElement.style.setProperty('scroll-padding-bottom', `${element.getBoundingClientRect().height + 16}px`)
  })
  resizeObserver.observe(element)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  document.documentElement.style.removeProperty('scroll-padding-bottom')
})
</script>

<template>
  <section v-if="visible" ref="banner" class="consent" aria-labelledby="consent-title" tabindex="-1">
    <div class="consent__text">
      <h2 id="consent-title" class="label consent__title">Mesure d’audience</h2>
      <p class="consent__body">
        Avec votre accord, nous utilisons Google Analytics pour comprendre comment Manread est utilisé : pages vues, recherches, plateformes
        ouvertes. Cela dépose des cookies et transmet ces données à Google. Si vous refusez, rien n’est envoyé à Google. Vous pouvez
        changer d’avis à tout moment depuis le pied de page.
        <NuxtLink class="link-underline" to="/about">En savoir plus</NuxtLink>
      </p>
    </div>
    <div class="consent__actions">
      <UiButton size="sm" @click="consent.refuse">Refuser</UiButton>
      <UiButton size="sm" @click="consent.accept">Accepter</UiButton>
    </div>
  </section>
</template>

<style scoped>
.consent {
  position: fixed;
  z-index: var(--z-consent);
  inset: auto var(--gutter) calc(var(--dock-height) + var(--safe-bottom) + var(--s-3));
  display: grid;
  gap: var(--s-4);
  max-width: 720px;
  padding: var(--s-4);
  background: var(--c-ink-2);
  border: 1px solid var(--c-line-strong);
  box-shadow: var(--shadow-float);
  font-size: var(--fs-sm);
  animation: rise-in var(--dur-3) var(--ease-out);
}

.consent:focus-visible {
  outline: none;
  box-shadow: var(--focus-ring), var(--shadow-float);
}

@media (min-width: 900px) {
  .consent {
    inset: auto auto calc(var(--gutter) + var(--safe-bottom)) calc(var(--rail-width) + var(--gutter));
    grid-template-columns: 1fr auto;
    align-items: end;
  }
}

.consent__text {
  display: grid;
  gap: var(--s-2);
}

.consent__body {
  color: var(--c-mist);
  line-height: 1.5;
}

.consent__actions {
  display: flex;
  gap: var(--s-2);
}

.consent__actions > * {
  flex: 1;
}
</style>
