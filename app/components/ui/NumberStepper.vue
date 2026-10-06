<script setup lang="ts">
const props = withDefaults(defineProps<{ modelValue: number; label: string; min?: number; max?: number | null; suffix?: string }>(), {
  min: 0,
  max: null,
})
const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const inputId = useId()

const draft = ref(String(props.modelValue))
watch(
  () => props.modelValue,
  value => {
    draft.value = String(value)
  },
)

const atMin = computed(() => props.modelValue <= props.min)
const atMax = computed(() => props.max !== null && props.modelValue >= props.max)

function clamp(value: number): number {
  const upper = props.max ?? Number.MAX_SAFE_INTEGER
  return Math.min(upper, Math.max(props.min, Math.trunc(value)))
}

function commit(value: number) {
  const next = clamp(value)
  draft.value = String(next)
  if (next !== props.modelValue) emit('update:modelValue', next)
}

function commitDraft() {
  const parsed = Number(draft.value)
  if (draft.value.trim() === '' || Number.isNaN(parsed)) {
    draft.value = String(props.modelValue)
    return
  }
  commit(parsed)
}
</script>

<template>
  <div class="stepper">
    <label class="label stepper__label" :for="inputId">{{ label }}</label>
    <div class="stepper__control">
      <button type="button" class="stepper__button" :disabled="atMin" :aria-label="`Decrease ${label.toLowerCase()}`" @click="commit(modelValue - 1)">
        <UiIcon name="minus" :size="16" />
      </button>
      <input
        :id="inputId"
        v-model="draft"
        class="stepper__input numeric"
        type="text"
        inputmode="numeric"
        pattern="[0-9]*"
        autocomplete="off"
        @change="commitDraft"
        @keydown.enter.prevent="commitDraft"
        @keydown.up.prevent="commit(modelValue + 1)"
        @keydown.down.prevent="commit(modelValue - 1)"
      />
      <span v-if="suffix" class="stepper__suffix numeric" aria-hidden="true">{{ suffix }}</span>
      <button type="button" class="stepper__button" :disabled="atMax" :aria-label="`Increase ${label.toLowerCase()}`" @click="commit(modelValue + 1)">
        <UiIcon name="plus" :size="16" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.stepper {
  display: grid;
  gap: var(--s-2);
}

.stepper__control {
  display: flex;
  align-items: center;
  border: 1px solid var(--c-line-strong);
  width: fit-content;
}

.stepper__button {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-mist);
  transition: color var(--dur-1), background-color var(--dur-1);
}

.stepper__button:hover:not(:disabled) {
  color: var(--c-bone);
  background: var(--c-ink-3);
}

.stepper__button:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.stepper__input {
  width: 5ch;
  height: var(--tap-min);
  text-align: center;
  background: transparent;
  border: 0;
  border-inline: 1px solid var(--c-line);
  font-size: var(--fs-base);
}

.stepper__suffix {
  padding-inline: var(--s-2);
  color: var(--c-fog);
  font-size: var(--fs-xs);
}
</style>
