<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true })
const props = defineProps<{ items: readonly { value: T; label: string; count?: number }[]; label: string; panelId: string }>()
const tabRefs = ref<HTMLButtonElement[]>([])

function focusTab(index: number) {
  const length = props.items.length
  const next = (index + length) % length
  const item = props.items[next]
  if (!item) return
  model.value = item.value
  nextTick(() => tabRefs.value[next]?.focus())
}

function onKeydown(event: KeyboardEvent, index: number) {
  const moves: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: props.items.length - 1 }
  const target = moves[event.key]
  if (target === undefined) return
  event.preventDefault()
  focusTab(target)
}
</script>

<template>
  <div class="tabs" role="tablist" :aria-label="label">
    <button
      v-for="(item, index) in items"
      :id="`${panelId}-tab-${item.value}`"
      :key="item.value"
      ref="tabRefs"
      type="button"
      role="tab"
      class="tabs__tab"
      :aria-selected="model === item.value"
      :aria-controls="panelId"
      :tabindex="model === item.value ? 0 : -1"
      @click="model = item.value"
      @keydown="onKeydown($event, index)"
    >
      <span>{{ item.label }}</span>
      <span v-if="item.count !== undefined" class="tabs__count numeric">{{ item.count }}</span>
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: flex;
  gap: var(--s-1);
  overflow-x: auto;
  scrollbar-width: none;
  border-bottom: 1px solid var(--c-line);
}

.tabs__tab {
  position: relative;
  display: inline-flex;
  align-items: baseline;
  gap: var(--s-2);
  min-height: var(--tap-min);
  padding: 0 var(--s-3);
  font-size: var(--fs-sm);
  color: var(--c-fog);
  white-space: nowrap;
  transition: color var(--dur-2) var(--ease-out);
}

.tabs__tab::after {
  content: '';
  position: absolute;
  left: var(--s-3);
  right: var(--s-3);
  bottom: -1px;
  height: 2px;
  background: var(--c-shu);
  transform: scaleX(0);
  transition: transform var(--dur-3) var(--ease-out);
}

.tabs__tab:hover {
  color: var(--c-bone);
}

.tabs__tab[aria-selected='true'] {
  color: var(--c-paper);
}

.tabs__tab[aria-selected='true']::after {
  transform: scaleX(1);
}

.tabs__count {
  font-size: var(--fs-2xs);
  color: var(--c-fog);
}
</style>
