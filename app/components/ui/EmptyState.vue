<script setup lang="ts">
withDefaults(defineProps<{ title: string; glyph?: string; headingLevel?: 'h2' | 'h3' }>(), { glyph: '空', headingLevel: 'h2' })
</script>

<template>
  <div class="empty">
    <span class="empty__glyph jp" aria-hidden="true">{{ glyph }}</span>
    <component :is="headingLevel" class="empty__title display">{{ title }}</component>
    <div class="empty__body"><slot /></div>
    <div v-if="$slots.actions" class="empty__actions"><slot name="actions" /></div>
  </div>
</template>

<style scoped>
.empty {
  position: relative;
  display: grid;
  gap: var(--s-3);
  justify-items: start;
  padding: var(--s-7) 0;
  max-width: 46ch;
}

.empty__glyph {
  position: absolute;
  right: -0.1em;
  top: 50%;
  translate: 100% -50%;
  font-size: clamp(6rem, 4rem + 8vw, 12rem);
  line-height: 1;
  color: var(--c-ink-3);
  pointer-events: none;
}

.empty__title {
  font-size: var(--fs-2xl);
}

.empty__body {
  color: var(--c-mist);
}

.empty__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  margin-top: var(--s-3);
}

@media (max-width: 720px) {
  .empty__glyph {
    position: static;
    translate: none;
    font-size: 4rem;
  }
}
</style>
