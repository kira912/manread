<script setup lang="ts">
withDefaults(defineProps<{ title?: string; message?: string; retrying?: boolean }>(), {
  title: 'Signal perdu',
  message: 'Le catalogue n’a pas répondu à temps. Rien n’est cassé de votre côté.',
})
defineEmits<{ retry: [] }>()
</script>

<template>
  <div class="error" role="alert">
    <span class="label">Erreur</span>
    <p class="error__title display">{{ title }}</p>
    <p class="error__message">{{ message }}</p>
    <UiButton variant="line" size="sm" icon="refresh" :loading="retrying" @click="$emit('retry')">Réessayer</UiButton>
  </div>
</template>

<style scoped>
.error {
  display: grid;
  justify-items: start;
  gap: var(--s-2);
  padding: var(--s-5);
  border-left: 2px solid var(--c-shu);
  background: linear-gradient(90deg, var(--c-shu-soft), transparent 60%);
}

.error__title {
  font-size: var(--fs-xl);
}

.error__message {
  color: var(--c-mist);
  max-width: 52ch;
  margin-bottom: var(--s-2);
}
</style>
