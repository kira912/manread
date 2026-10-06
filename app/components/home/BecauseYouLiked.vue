<script setup lang="ts">
import { recommendationSeed } from '#shared/domain/library'

const RECOMMENDATION_COUNT = 6
const { library, ready } = useLibrary()
const seed = computed(() => (ready.value ? recommendationSeed(library.value) : undefined))
const root = ref<HTMLElement | null>(null)
const visible = useInView(root)

const { data, status, execute } = useRecommendations(() => seed.value?.manga.id ?? '', { immediate: false })

watch([visible, seed], ([isVisible, currentSeed]) => {
  if (isVisible && currentSeed) void execute()
})

const items = computed(() => (data.value ?? []).filter(manga => !library.value.entries[manga.id]).slice(0, RECOMMENDATION_COUNT))
</script>

<template>
  <section v-if="seed" ref="root" class="page because" aria-labelledby="because-heading">
    <HomeSectionHeader
      marker="Yours"
      :title="`Parce que vous avez aimé ${seed.manga.title}`"
      jp="おすすめ"
      kicker="D’après votre bibliothèque"
      heading-id="because-heading"
    />
    <UiErrorState
      v-if="status === 'error'"
      title="Les recommandations font une pause"
      message="Impossible de joindre le catalogue pour vos suggestions."
      @retry="execute()"
    />
    <MangaGridSkeleton v-else-if="status !== 'success'" :count="RECOMMENDATION_COUNT" />
    <MangaGrid v-else-if="items.length" :items="items" />
    <p v-else class="because__empty">Vous avez déjà tout ce que nous allions vous suggérer. Impressionnant.</p>
  </section>
</template>

<style scoped>
.because {
  padding-block: var(--s-7);
}

.because__empty {
  color: var(--c-mist);
}
</style>
