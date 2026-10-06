<script setup lang="ts">
withDefaults(defineProps<{ tone?: 'neutral' | 'accent'; to?: string }>(), { tone: 'neutral' })
</script>

<template>
  <NuxtLink v-if="to" :to="to" class="tag" :class="`tag--${tone}`"><slot /></NuxtLink>
  <span v-else class="tag" :class="`tag--${tone}`"><slot /></span>
</template>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--s-1);
  min-height: 26px;
  padding: 0 var(--s-2);
  border: 1px solid var(--c-line);
  border-radius: var(--radius-xs);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-mist);
  transition:
    color var(--dur-2) var(--ease-out),
    border-color var(--dur-2) var(--ease-out);
}

a.tag:hover {
  color: var(--c-bone);
  border-color: var(--c-line-strong);
}

.tag--accent {
  color: var(--c-shu);
  border-color: var(--c-shu-line);
}
</style>
