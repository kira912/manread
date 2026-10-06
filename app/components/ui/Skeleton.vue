<script setup lang="ts">
withDefaults(defineProps<{ width?: string; height?: string; ratio?: number; radius?: string }>(), {
  width: '100%',
  height: '1em',
  radius: 'var(--radius-xs)',
})
</script>

<template>
  <span
    class="skeleton"
    aria-hidden="true"
    :style="{ width, height: ratio ? 'auto' : height, aspectRatio: ratio ? String(ratio) : undefined, borderRadius: radius }"
  />
</template>

<style scoped>
.skeleton {
  position: relative;
  display: block;
  overflow: hidden;
  background: var(--c-ink-2);
}

.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgb(255 255 255 / 0.035), transparent);
  animation: shimmer 1.6s var(--ease-in-out) infinite;
}
</style>
