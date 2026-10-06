<script setup lang="ts">
withDefaults(defineProps<{ count?: number }>(), { count: 12 })
</script>

<template>
  <div class="grid-skeleton" aria-hidden="true">
    <div v-for="index in count" :key="index" class="grid-skeleton__item">
      <UiSkeleton :ratio="0.7" />
      <UiSkeleton height="1.1em" width="85%" />
      <UiSkeleton height="0.7em" width="55%" />
    </div>
  </div>
</template>

<style scoped>
.grid-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(136px, 12vw + 60px, 210px), 1fr));
  gap: var(--s-6) var(--s-4);
}

.grid-skeleton__item {
  display: grid;
  gap: var(--s-2);
}
</style>
