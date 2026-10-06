<script setup lang="ts">
const { data: feed, error, refresh, status } = await useHomeFeed()
const siteUrl = useSiteUrl()

const sections = computed(() => feed.value?.sections ?? {})
const heroImage = computed(() => feed.value?.hero?.manga.cover.large ?? null)

usePageSeo(() => ({
  title: 'Discover manga, read it where it lives',
  description:
    'Manread is an editorial index of manga, manhwa and manhua. Discover what is trending, track your reading, and find every official platform where a series is legally available.',
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
        :message="error?.statusCode === 503 ? 'The catalog is catching its breath. Try again in a few seconds.' : undefined"
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
          title="The index"
          jp="トレンド"
          kicker="Trending now"
          heading-id="trending-heading"
          :more="{ to: '/search?sort=trending', label: 'Full ranking' }"
        />
        <LazyHomeRankIndex hydrate-on-visible :items="sections.trending.slice(0, 10)" />
      </section>

      <section v-if="sections.newReleases?.length" class="page home__section" aria-labelledby="new-heading">
        <HomeSectionHeader
          marker="02"
          title="Fresh ink"
          jp="新連載"
          kicker="New series, still running"
          heading-id="new-heading"
          :more="{ to: '/search?status=releasing&sort=newest', label: 'All new series' }"
        />
        <LazyHomeStrip hydrate-on-visible :items="sections.newReleases" label="New releases" />
      </section>

      <section v-if="feed.editorsPicks.length" class="page home__section home__section--editorial" aria-labelledby="editors-heading">
        <HomeSectionHeader marker="03" title="Editor’s picks" jp="編集部選" kicker="Chosen, not computed" heading-id="editors-heading" />
        <LazyHomeSpread hydrate-on-visible :picks="feed.editorsPicks" />
      </section>

      <HomeBecauseYouLiked />

      <section v-if="sections.hiddenGems?.length" class="page home__section" aria-labelledby="gems-heading">
        <HomeSectionHeader
          marker="04"
          title="Hidden gems"
          jp="隠れた名作"
          kicker="Loved by few, rated by all"
          heading-id="gems-heading"
          :more="{ to: '/search?sort=score', label: 'Highest rated' }"
        />
        <LazyHomeMosaic hydrate-on-visible :items="sections.hiddenGems" />
      </section>

      <section v-if="sections.mostFollowed?.length" class="page home__section" aria-labelledby="followed-heading">
        <HomeSectionHeader
          marker="05"
          title="Most followed"
          jp="人気"
          kicker="The all-time ledger"
          heading-id="followed-heading"
          :more="{ to: '/search?sort=popularity', label: 'Most popular' }"
        />
        <LazyHomeLedger hydrate-on-visible :items="sections.mostFollowed" caption="Most followed manga of all time" />
      </section>

      <section v-if="sections.recentlyAdded?.length" class="page home__section" aria-labelledby="recent-heading">
        <HomeSectionHeader marker="06" title="Just indexed" jp="新着" kicker="Recently added to the catalog" heading-id="recent-heading" />
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
