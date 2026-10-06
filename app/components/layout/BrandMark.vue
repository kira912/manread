<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 28 })
</script>

<template>
  <svg class="brand-mark" :width="size" :height="size" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
    <rect x="1" y="1" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.5" />
    <path d="M18 1h9v21l-4.5-3.6L18 22V1Z" fill="var(--c-shu)" />
    <path d="M6 9h7M6 14h7M6 19h9M6 24h15" stroke="currentColor" stroke-width="1.5" />
  </svg>
</template>
