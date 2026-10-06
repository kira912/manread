<script setup lang="ts" generic="T extends string">
const model = defineModel<T>({ required: true })
defineProps<{ label: string; options: readonly { value: T; label: string }[]; hideLabel?: boolean }>()
const id = useId()
</script>

<template>
  <div class="select">
    <label :for="id" class="label" :class="{ 'visually-hidden': hideLabel }">{{ label }}</label>
    <div class="select__control">
      <select :id="id" v-model="model" class="select__native">
        <option v-for="option in options" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
      <UiIcon name="chevronDown" :size="16" class="select__chevron" />
    </div>
  </div>
</template>

<style scoped>
.select {
  display: grid;
  gap: var(--s-2);
}

.select__control {
  position: relative;
}

.select__native {
  appearance: none;
  width: 100%;
  min-height: var(--tap-min);
  padding: 0 var(--s-6) 0 var(--s-3);
  background: var(--c-ink-1);
  border: 1px solid var(--c-line-strong);
  border-radius: var(--radius-xs);
  font-size: var(--fs-sm);
  cursor: pointer;
}

.select__native:hover {
  border-color: var(--c-fog);
}

.select__chevron {
  position: absolute;
  right: var(--s-3);
  top: 50%;
  translate: 0 -50%;
  pointer-events: none;
  color: var(--c-mist);
}
</style>
