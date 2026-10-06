<script setup lang="ts">
import { creatorPath, creatorRoleLabel, principalCredits } from '#shared/domain/creator'
import { genreLabel, genreSlug } from '#shared/domain/labels'
import { toSnapshot } from '#shared/domain/library'
import { mangaPath, originLabel, originLanguage, shortSynopsis, statusLabel } from '#shared/domain/manga'

definePageMeta({
  validate: route => typeof route.params.id === 'string' && /^[a-z0-9-]{1,40}$/.test(route.params.id),
})

const SYNOPSIS_PREVIEW_PARAGRAPHS = 2
const MAX_ALT_TITLES = 4

const route = useRoute()
const id = computed(() => String(route.params.id))
const [detailsResult, chaptersResult] = await Promise.all([useMangaDetails(id), useChapters(id)])
const { data: details, error, refresh, status } = detailsResult
const { data: chapterList } = chaptersResult
const chapters = computed(() => chapterList.value.chapters)
const resume = useResumeTarget(id, chapters)

if (error.value?.statusCode === 404) {
  throw createError({ statusCode: 404, statusMessage: 'Titre introuvable', fatal: true })
}

const manga = computed(() => details.value?.manga)
if (manga.value && route.params.slug !== manga.value.slug) {
  await navigateTo({ path: mangaPath(manga.value), hash: route.hash }, { redirectCode: 301, replace: true })
}

const COVER_SIZES = '(min-width: 900px) 360px, 56vw'
const resolveSources = useCoverSources()
const coverSources = computed(() => (manga.value ? resolveSources(manga.value.cover) : null))
useHead({
  link: [
    {
      key: 'manga-cover-preload',
      rel: 'preload',
      as: 'image',
      href: () => coverSources.value?.src,
      imagesrcset: () => coverSources.value?.srcset,
      imagesizes: COVER_SIZES,
      fetchpriority: 'high',
    },
  ],
})

const snapshot = computed(() => (manga.value ? toSnapshot(manga.value) : null))
const credits = computed(() => (manga.value ? principalCredits(manga.value.credits) : []))
const synopsisExpanded = ref(false)
const visibleSynopsis = computed(() => {
  const paragraphs = manga.value?.synopsis ?? []
  return synopsisExpanded.value ? paragraphs : paragraphs.slice(0, SYNOPSIS_PREVIEW_PARAGRAPHS)
})
const hasMoreSynopsis = computed(() => (manga.value?.synopsis.length ?? 0) > SYNOPSIS_PREVIEW_PARAGRAPHS)
const altTitles = computed(() => manga.value?.alternativeTitles.slice(0, MAX_ALT_TITLES) ?? [])

const recommendationsRoot = ref<HTMLElement | null>(null)
const recommendationsVisible = useInView(recommendationsRoot)
const recommendations = useRecommendations(id, { immediate: false })
watch(recommendationsVisible, visible => {
  if (visible) void recommendations.execute()
})

const { refresh: refreshLibrarySnapshot } = useLibrary()
const viewHistory = useViewHistory()
onMounted(() => {
  if (!snapshot.value) return
  viewHistory.record(snapshot.value)
  refreshLibrarySnapshot(snapshot.value)
})

const siteUrl = useSiteUrl()
usePageSeo(() => {
  const current = manga.value
  if (!current) return { title: 'Manga', description: 'Fiche manga', path: route.path, noindex: true }
  const platforms = [...new Set(details.value?.availability.map(entry => entry.platformName))].slice(0, 3)
  const readHere = chapters.value.length ? ' directement sur Manread' : ''
  const where = platforms.length ? `Lire ${current.title} légalement${readHere} et sur ${platforms.join(', ')}.` : `${current.title}${readHere ? ` à lire${readHere}` : ''} : fiche, suivi de lecture et recommandations.`
  const author = credits.value[0] ? ` de ${credits.value[0].name}` : ''
  const since = current.startYear ? ` depuis ${current.startYear}` : ''
  const genres = current.genres.length ? ` — ${genreList(current.genres, 3, ', ')}.` : '.'
  return {
    title: `${current.title} — où le lire`,
    description: `${where} ${originLabel(current.origin)}${author}, ${statusLabel(current.status).toLowerCase()}${since}${genres}`,
    path: mangaPath(current),
    image: current.cover.large,
    imageAlt: `Couverture de ${current.title}`,
    type: 'book',
  }
})

useJsonLd(() => {
  const current = manga.value
  if (!current) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'ComicSeries',
    name: current.title,
    alternateName: current.alternativeTitles,
    url: `${siteUrl}${mangaPath(current)}`,
    image: current.cover.large,
    description: shortSynopsis(current.synopsis, 500),
    genre: current.genres,
    startDate: current.startDate ?? undefined,
    inLanguage: originLanguage(current.origin),
    author: credits.value
      .filter(credit => credit.role === 'story' || credit.role === 'story_art')
      .map(credit => ({ '@type': 'Person', name: credit.name, url: `${siteUrl}${creatorPath({ id: credit.creatorId, slug: credit.slug })}` })),
    illustrator: credits.value
      .filter(credit => credit.role === 'art' || credit.role === 'story_art')
      .map(credit => ({ '@type': 'Person', name: credit.name })),
  }
})
</script>

<template>
  <div v-if="!manga" class="page manga-error">
    <h1 class="visually-hidden">Manga</h1>
    <UiErrorState :retrying="status === 'pending'" @retry="refresh()" />
  </div>

  <article v-else class="manga" :style="{ '--tone': manga.cover.dominantColor ?? '#3b3b43' }">
    <div class="manga__ambient" aria-hidden="true" />

    <div class="page manga__top">
      <aside class="manga__visual">
        <div class="manga__cover">
          <MangaCover :cover="manga.cover" :title="manga.title" :sizes="COVER_SIZES" priority transition-name="manga-cover" />
        </div>
        <p v-if="manga.nativeTitle" class="manga__native jp" :lang="originLanguage(manga.origin)">{{ manga.nativeTitle }}</p>
      </aside>

      <header class="manga__head">
        <nav class="manga__crumbs label" aria-label="Fil d’Ariane">
          <NuxtLink to="/">Index</NuxtLink>
          <span aria-hidden="true">/</span>
          <NuxtLink :to="`/search?origin=${manga.origin}`">{{ originLabel(manga.origin) }}</NuxtLink>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{{ manga.title }}</span>
        </nav>

        <h1 class="manga__title display">{{ manga.title }}</h1>
        <p v-if="altTitles.length" class="manga__alt">
          <span class="visually-hidden">Autres titres : </span>{{ altTitles.join(' · ') }}
        </p>

        <p v-if="credits.length" class="manga__credits">
          <span v-for="credit in credits" :key="credit.creatorId" class="manga__credit">
            <span class="label">{{ creatorRoleLabel(credit) }}</span>
            <NuxtLink :to="creatorPath({ id: credit.creatorId, slug: credit.slug })" class="link-underline">{{ credit.name }}</NuxtLink>
          </span>
        </p>

        <div class="manga__cta">
          <UiButton v-if="resume" variant="accent" :to="resume.to" icon-after="arrowRight">{{ resume.label }}</UiButton>
          <UiButton :variant="resume ? 'line' : 'accent'" to="#where-to-read" icon-after="arrowRight">
            Où lire<template v-if="details?.availability.length"> · {{ new Set(details.availability.map(entry => entry.platformId)).size }}</template>
          </UiButton>
        </div>

        <ClientOnly>
          <MangaLibraryControl v-if="snapshot" :manga="snapshot" />
          <template #fallback><UiSkeleton height="44px" width="180px" /></template>
        </ClientOnly>

        <div v-if="manga.synopsis.length" class="manga__synopsis">
          <p v-for="(paragraph, index) in visibleSynopsis" :key="index">{{ paragraph }}</p>
          <button v-if="hasMoreSynopsis" type="button" class="manga__more label" :aria-expanded="synopsisExpanded" @click="synopsisExpanded = !synopsisExpanded">
            {{ synopsisExpanded ? 'Réduire' : 'Lire tout le synopsis' }}
          </button>
        </div>

        <MangaFacts :manga="manga" />

        <div v-if="manga.genres.length || manga.tags.length" class="manga__tags">
          <UiTag v-for="genre in manga.genres" :key="genre" tone="accent" :to="`/genre/${genreSlug(genre)}`">{{ genreLabel(genre) }}</UiTag>
          <UiTag v-for="tag in manga.tags" :key="tag.name">{{ tag.name }}</UiTag>
        </div>
      </header>
    </div>

    <div v-if="chapters.length" class="page manga__section">
      <MangaReadHere :manga-id="manga.id" :title="manga.title" :chapters="chapters" />
    </div>

    <div class="page manga__section">
      <MangaWhereToRead
        :manga-id="manga.id"
        :title="manga.title"
        :availability="details?.availability ?? []"
        :degraded="details?.availabilityDegraded ?? false"
      />
    </div>

    <section v-if="manga.relations.length" class="page manga__section" aria-labelledby="related-heading">
      <HomeSectionHeader marker="↳" title="Même univers" jp="関連作品" kicker="Suites, histoires parallèles, spin-offs" heading-id="related-heading" />
      <HomeStrip :items="manga.relations.map(relation => relation.manga)" label="les titres liés" />
    </section>

    <section ref="recommendationsRoot" class="page manga__section" aria-labelledby="recommended-heading">
      <HomeSectionHeader marker="→" title="Si vous avez aimé" jp="おすすめ" kicker="Recommandés par les lecteurs" heading-id="recommended-heading" />
      <UiErrorState v-if="recommendations.status.value === 'error'" message="Les recommandations n’ont pas pu être chargées." @retry="recommendations.execute()" />
      <MangaGridSkeleton v-else-if="recommendations.status.value !== 'success'" :count="6" />
      <MangaGrid v-else-if="recommendations.data.value?.length" :items="recommendations.data.value" />
      <p v-else class="manga__empty">Les lecteurs n’ont encore rien recommandé pour ce titre.</p>
    </section>
  </article>
</template>

<style scoped>
.manga-error {
  padding-block: var(--s-8);
}

.manga {
  position: relative;
  isolation: isolate;
}

.manga__ambient {
  position: absolute;
  z-index: -1;
  inset: 0 0 auto;
  height: 900px;
  background:
    radial-gradient(60% 50% at 20% 10%, color-mix(in srgb, var(--tone) 26%, transparent), transparent 70%),
    linear-gradient(180deg, transparent 60%, var(--c-void));
  pointer-events: none;
}

.manga__top {
  display: grid;
  gap: var(--s-6);
  padding-block: var(--s-5) var(--s-7);
}

.manga__visual {
  position: relative;
  width: min(56vw, 300px);
}

.manga__cover {
  box-shadow: var(--shadow-float);
}

.manga__native {
  position: absolute;
  top: 0;
  left: calc(100% + var(--s-3));
  writing-mode: vertical-rl;
  font-size: var(--fs-lg);
  letter-spacing: 0.2em;
  color: var(--c-mist);
  max-height: 100%;
  overflow: hidden;
}

.manga__head {
  display: grid;
  gap: var(--s-5);
  align-content: start;
  min-width: 0;
}

.manga__crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  font-size: var(--fs-2xs);
}

.manga__crumbs a {
  color: var(--c-fog);
}

.manga__crumbs a:hover {
  color: var(--c-bone);
}

.manga__crumbs [aria-current] {
  color: var(--c-mist);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 30ch;
}

.manga__title {
  font-size: var(--fs-display);
  overflow-wrap: anywhere;
}

.manga__alt {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--c-fog);
  margin-top: calc(-1 * var(--s-3));
}

.manga__credits {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: var(--s-2);
  font-size: var(--fs-lg);
}

.manga__credits {
  column-gap: var(--s-6);
}

.manga__credit {
  display: inline-flex;
  align-items: baseline;
  gap: var(--s-2);
}

.manga__cta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.manga__synopsis {
  display: grid;
  gap: var(--s-3);
  max-width: 68ch;
  color: var(--c-mist);
}

.manga__synopsis p:first-child::first-letter {
  float: left;
  font-family: var(--font-display);
  font-size: 3.4em;
  line-height: 0.82;
  padding: 0.06em 0.1em 0 0;
  color: var(--c-bone);
}

.manga__more {
  justify-self: start;
  min-height: var(--tap-min);
  color: var(--c-shu);
}

.manga__tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
}

.manga__section {
  padding-block: var(--s-7);
}

.manga__empty {
  color: var(--c-mist);
}

@media (min-width: 900px) {
  .manga__top {
    grid-template-columns: minmax(240px, 360px) minmax(0, 1fr);
    gap: var(--s-8);
    padding-top: var(--s-7);
  }

  .manga__visual {
    width: auto;
    position: sticky;
    top: var(--s-6);
    align-self: start;
  }
}
</style>
