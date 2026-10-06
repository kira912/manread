<script setup lang="ts">
const props = defineProps<{ value: number | null; label: string }>()
const percent = computed(() => (props.value === null ? null : Math.round(Math.min(1, Math.max(0, props.value)) * 100)))
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    :aria-label="label"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percent ?? undefined"
    :aria-valuetext="percent === null ? 'Unknown length' : `${percent}%`"
    :class="{ 'progress--indeterminate': percent === null }"
  >
    <span class="progress__fill" :style="{ transform: `scaleX(${percent === null ? 0.18 : percent / 100})` }" />
  </div>
</template>

<style scoped>
.progress {
  position: relative;
  height: 2px;
  background: var(--c-line);
  overflow: hidden;
}

.progress__fill {
  position: absolute;
  inset: 0;
  background: var(--c-shu);
  transform-origin: left;
  transition: transform var(--dur-3) var(--ease-out);
}

.progress--indeterminate .progress__fill {
  background: repeating-linear-gradient(90deg, var(--c-shu) 0 6px, transparent 6px 10px);
}
</style>
