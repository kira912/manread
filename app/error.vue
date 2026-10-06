<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const isNotFound = computed(() => props.error.statusCode === 404)

useHead({ title: isNotFound.value ? 'Page introuvable' : 'Erreur' })
useSeoMeta({ robots: 'noindex' })

const recover = () => clearError({ redirect: '/' })
</script>

<template>
  <NuxtLayout>
    <section class="page error-page">
      <span class="error-page__code display numeric" aria-hidden="true">{{ error.statusCode }}</span>
      <div class="error-page__copy">
        <p class="label">{{ isNotFound ? 'Page introuvable' : 'Erreur inattendue' }}</p>
        <h1 class="display error-page__title">
          {{ isNotFound ? 'Cette page n’a jamais été imprimée.' : 'Les presses se sont arrêtées un instant.' }}
        </h1>
        <p class="error-page__body">
          {{
            isNotFound
              ? 'Le titre ou la page que vous cherchez n’est pas dans l’index. Elle a peut-être été déplacée, ou n’a jamais existé.'
              : 'Quelque chose a échoué de notre côté. Votre bibliothèque est enregistrée sur cet appareil et ne risque rien.'
          }}
        </p>
        <div class="error-page__actions">
          <UiButton variant="primary" icon-after="arrowRight" @click="recover">Retour à l’index</UiButton>
          <UiButton variant="line" icon="search" @click="useSearchPalette().show()">Rechercher</UiButton>
        </div>
      </div>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: grid;
  gap: var(--s-6);
  align-items: center;
  min-height: 70dvh;
  padding-block: var(--s-7);
}

@media (min-width: 900px) {
  .error-page {
    grid-template-columns: auto 1fr;
  }
}

.error-page__code {
  font-size: var(--fs-mega);
  color: transparent;
  -webkit-text-stroke: 1px var(--c-line-strong);
}

.error-page__copy {
  display: grid;
  gap: var(--s-4);
  max-width: 56ch;
}

.error-page__title {
  font-size: var(--fs-2xl);
}

.error-page__body {
  color: var(--c-mist);
}

.error-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}
</style>
