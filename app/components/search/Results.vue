<script setup lang="ts">
import type { SearchQuery } from '#shared/domain/search'

const props = defineProps<{ query: SearchQuery; headingLevel?: 'h2' | 'h3' }>()
const emit = defineEmits<{ reset: [] }>()

const results = useSearchResults(() => props.query)
const { items, total, status, error, refresh, hasMore, canAutoLoad, loadMore, loadingMore, loadMoreFailed } = results
await results.whenReady()

const ABOVE_THE_FOLD_TILES = 4
const sentinel = ref<HTMLElement | null>(null)
const sentinelVisible = useInView(sentinel, { rootMargin: '600px', once: false })
watch([sentinelVisible, canAutoLoad], ([visible, allowed]) => {
  if (visible && allowed) void loadMore()
})

watch(
  () => [status.value, items.value.length] as const,
  ([currentStatus, count]) => {
    if (import.meta.client && currentStatus === 'success' && count === 0 && props.query.text) {
      trackEvent('search_no_results', { term: props.query.text })
    }
  },
  { immediate: true },
)

const countLabel = computed(() => {
  if (total.value === null) return plural(items.value.length, 'titre')
  return `${compactNumber(total.value)} ${total.value <= 1 ? 'titre' : 'titres'}`
})
</script>

<template>
  <div class="results">
    <p class="results__count label" role="status">
      <template v-if="status === 'pending' && !items.length">Recherche…</template>
      <template v-else-if="status !== 'error'">{{ countLabel }}</template>
    </p>

    <UiErrorState v-if="error && !items.length" :retrying="status === 'pending'" @retry="refresh()" />

    <MangaGridSkeleton v-else-if="status === 'pending' && !items.length" />

    <UiEmptyState v-else-if="!items.length" title="Rien sur ces étagères" glyph="無">
      <p>Aucun titre ne correspond à tous les filtres. Assouplissez-en un, ou repartez de zéro.</p>
      <template #actions>
        <UiButton variant="line" icon="close" @click="emit('reset')">Effacer les filtres</UiButton>
      </template>
    </UiEmptyState>

    <template v-else>
      <MangaGrid :items="items" :heading-level="headingLevel ?? 'h2'" :eager-count="ABOVE_THE_FOLD_TILES" :class="{ 'results__grid--stale': status === 'pending' }" />
      <div ref="sentinel" class="results__more">
        <UiButton
          v-if="hasMore && (!canAutoLoad || loadMoreFailed)"
          variant="line"
          :icon="loadMoreFailed ? 'refresh' : undefined"
          :loading="loadingMore"
          @click="loadMore"
        >
          {{ loadMoreFailed ? 'Réessayer de charger la suite' : 'Charger plus' }}
        </UiButton>
        <MangaGridSkeleton v-else-if="loadingMore" :count="6" />
        <p v-else-if="!hasMore" class="label results__end">Fin de l’index</p>
      </div>
    </template>
  </div>
</template>

<style scoped>
.results {
  display: grid;
  gap: var(--s-5);
}

.results__grid--stale {
  opacity: 0.45;
  transition: opacity var(--dur-2) var(--ease-out);
}

.results__more {
  display: grid;
  justify-items: center;
  padding-block: var(--s-6);
}

.results__end {
  color: var(--c-fog);
}
</style>
