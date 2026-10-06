<script setup lang="ts">
const { data: feed, error, refresh, status } = await useHomeFeed()
const siteUrl = useSiteUrl()

const sections = computed(() => feed.value?.sections ?? {})
const heroImage = computed(() => feed.value?.hero?.manga.cover.large ?? null)

usePageSeo(() => ({
  title: 'Découvrez des mangas et lisez-les légalement',
  description:
    'Manread est un index éditorial de mangas, manhwas et manhuas : tendances, suivi de lecture, lecture intégrée des titres autorisés et toutes les plateformes officielles où lire chaque série.',
  path: '/',
  image: heroImage.value,
}))
useHead({ titleTemplate: 'Manread — %s' })

useJsonLd({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'Manread',
  url: siteUrl,
  potentialAction: {
    '@type': 'SearchAction',
    target: { '@type': 'EntryPoint', urlTemplate: `${siteUrl}/search?q={search_term_string}` },
    'query-input': 'required name=search_term_string',
  },
})
</script>

<template>
  <div class="home">
    <div v-if="!feed" class="page home__error">
      <h1 class="visually-hidden">Manread</h1>
      <UiErrorState
        :message="error?.statusCode === 503 ? 'Le catalogue reprend son souffle. Réessayez dans quelques secondes.' : undefined"
        :retrying="status === 'pending'"
        @retry="refresh()"
      />
    </div>

    <template v-else>
      <div class="page">
        <HomeHero v-if="feed.hero" :hero="feed.hero" />
        <h1 v-else class="visually-hidden">Manread</h1>
      </div>

      <HomeContinueReading />

      <section v-if="sections.trending?.length" class="page home__section" aria-labelledby="trending-heading">
        <HomeSectionHeader
          marker="01"
          title="L’index"
          jp="トレンド"
          kicker="Les tendances du moment"
          heading-id="trending-heading"
          :more="{ to: '/search?sort=trending', label: 'Classement complet' }"
        />
        <LazyHomeRankIndex hydrate-on-visible :items="sections.trending.slice(0, 10)" />
      </section>

      <section v-if="sections.newReleases?.length" class="page home__section" aria-labelledby="new-heading">
        <HomeSectionHeader
          marker="02"
          title="Encre fraîche"
          jp="新連載"
          kicker="Nouvelles séries en cours de parution"
          heading-id="new-heading"
          :more="{ to: '/search?status=releasing&sort=newest', label: 'Toutes les nouveautés' }"
        />
        <LazyHomeStrip hydrate-on-visible :items="sections.newReleases" label="les nouveautés" />
      </section>

      <section v-if="feed.editorsPicks.length" class="page home__section home__section--editorial" aria-labelledby="editors-heading">
        <HomeSectionHeader marker="03" title="La sélection" jp="編集部選" kicker="Choisie, pas calculée" heading-id="editors-heading" />
        <LazyHomeSpread hydrate-on-visible :picks="feed.editorsPicks" />
      </section>

      <HomeBecauseYouLiked />

      <section v-if="sections.hiddenGems?.length" class="page home__section" aria-labelledby="gems-heading">
        <HomeSectionHeader
          marker="04"
          title="Pépites cachées"
          jp="隠れた名作"
          kicker="Peu connues, très bien notées"
          heading-id="gems-heading"
          :more="{ to: '/search?sort=score', label: 'Les mieux notés' }"
        />
        <LazyHomeMosaic hydrate-on-visible :items="sections.hiddenGems" />
      </section>

      <section v-if="sections.mostFollowed?.length" class="page home__section" aria-labelledby="followed-heading">
        <HomeSectionHeader
          marker="05"
          title="Les plus suivis"
          jp="人気"
          kicker="Le registre de tous les temps"
          heading-id="followed-heading"
          :more="{ to: '/search?sort=popularity', label: 'Les plus populaires' }"
        />
        <LazyHomeLedger hydrate-on-visible :items="sections.mostFollowed" caption="Les mangas les plus suivis de tous les temps" />
      </section>

      <section v-if="sections.recentlyAdded?.length" class="page home__section" aria-labelledby="recent-heading">
        <HomeSectionHeader marker="06" title="Tout juste indexés" jp="新着" kicker="Récemment ajoutés au catalogue" heading-id="recent-heading" />
        <LazyMangaGrid hydrate-on-visible :items="sections.recentlyAdded" density="compact" />
      </section>
    </template>
  </div>
</template>

<style scoped>
.home__error {
  padding-block: var(--s-8);
}

.home__section {
  padding-block: var(--s-7);
}

.home__section--editorial {
  padding-block: var(--s-8);
}
</style>
