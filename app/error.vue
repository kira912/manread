<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const isNotFound = computed(() => props.error.statusCode === 404)

useHead({ title: isNotFound.value ? 'Not found' : 'Something went wrong' })
useSeoMeta({ robots: 'noindex' })

const recover = () => clearError({ redirect: '/' })
</script>

<template>
  <NuxtLayout>
    <section class="page error-page">
      <span class="error-page__code display numeric" aria-hidden="true">{{ error.statusCode }}</span>
      <div class="error-page__copy">
        <p class="label">{{ isNotFound ? 'Missing page' : 'Unexpected error' }}</p>
        <h1 class="display error-page__title">
          {{ isNotFound ? 'This page was never printed.' : 'The presses stopped for a moment.' }}
        </h1>
        <p class="error-page__body">
          {{
            isNotFound
              ? 'The title or page you were looking for is not in the index. It may have moved, or it may never have existed.'
              : 'Something failed on our side. Your library is stored on this device and is safe.'
          }}
        </p>
        <div class="error-page__actions">
          <UiButton variant="primary" icon-after="arrowRight" @click="recover">Back to the index</UiButton>
          <UiButton variant="line" icon="search" @click="useSearchPalette().show()">Search</UiButton>
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
