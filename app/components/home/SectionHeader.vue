<script setup lang="ts">
defineProps<{ marker: string; title: string; jp: string; kicker?: string; headingId: string; more?: { to: string; label: string } }>()
</script>

<template>
  <header class="section-head">
    <span class="section-head__index numeric" aria-hidden="true">{{ marker }}</span>
    <div class="section-head__titles">
      <p v-if="kicker" class="label">{{ kicker }}</p>
      <h2 :id="headingId" class="section-head__title display">{{ title }}</h2>
    </div>
    <span class="section-head__jp jp" aria-hidden="true">{{ jp }}</span>
    <NuxtLink v-if="more" :to="more.to" class="section-head__more">
      {{ more.label }}
      <UiIcon name="arrowRight" :size="16" />
    </NuxtLink>
  </header>
</template>

<style scoped>
.section-head {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: end;
  gap: var(--s-2) var(--s-4);
  padding-bottom: var(--s-4);
  margin-bottom: var(--s-6);
  border-bottom: 1px solid var(--c-line);
}

.section-head__index {
  align-self: start;
  font-size: var(--fs-xs);
  color: var(--c-shu);
  padding-top: 0.4em;
}

.section-head__titles {
  display: grid;
  gap: var(--s-1);
}

.section-head__title {
  font-size: var(--fs-2xl);
}

.section-head__jp {
  font-size: var(--fs-sm);
  color: var(--c-fog);
  letter-spacing: 0.3em;
  writing-mode: vertical-rl;
  align-self: start;
}

.section-head__more {
  grid-column: 2 / -1;
  justify-self: start;
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--c-mist);
  transition: color var(--dur-2) var(--ease-out);
}

.section-head__more:hover {
  color: var(--c-bone);
}

@media (min-width: 720px) {
  .section-head {
    grid-template-columns: auto 1fr auto auto;
  }

  .section-head__more {
    grid-column: auto;
    justify-self: end;
  }
}
</style>
