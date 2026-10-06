<script setup lang="ts">
import { creatorPath } from '#shared/domain/creator'

definePageMeta({
  validate: route => typeof route.params.id === 'string' && /^[a-z0-9-]{1,40}$/.test(route.params.id),
})

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: creator, error, refresh, status } = await useCreator(id)

if (error.value?.statusCode === 404) throw createError({ statusCode: 404, statusMessage: 'Creator not found', fatal: true })
if (creator.value && route.params.slug !== creator.value.slug) {
  await navigateTo(creatorPath(creator.value), { redirectCode: 301, replace: true })
}

const BIO_PREVIEW = 2
const bioExpanded = ref(false)
const biography = computed(() => (bioExpanded.value ? creator.value?.biography : creator.value?.biography.slice(0, BIO_PREVIEW)) ?? [])

const siteUrl = useSiteUrl()
usePageSeo(() => ({
  title: creator.value ? `${creator.value.name} — works & where to read` : 'Creator',
  description: creator.value
    ? `${creator.value.name}'s manga: ${creator.value.works.slice(0, 4).map(work => work.manga.title).join(', ')}. Find where to read each one legally.`
    : 'Creator',
  path: creator.value ? creatorPath(creator.value) : route.path,
  image: creator.value?.image,
  type: 'profile',
  noindex: !creator.value,
}))
useJsonLd(() =>
  creator.value
    ? { '@context': 'https://schema.org', '@type': 'Person', name: creator.value.name, alternateName: creator.value.nativeName ?? undefined, url: `${siteUrl}${creatorPath(creator.value)}` }
    : null,
)
</script>

<template>
  <div class="page creator">
    <UiErrorState v-if="!creator" :retrying="status === 'pending'" @retry="refresh()" />
    <template v-else>
      <header class="creator__head">
        <img v-if="creator.image" class="creator__portrait" :src="creator.image" :alt="`Portrait of ${creator.name}`" width="160" height="220" />
        <div class="creator__copy">
          <p class="label">Creator · {{ creator.works.length }} works indexed</p>
          <h1 class="display creator__name">{{ creator.name }}</h1>
          <p v-if="creator.nativeName" class="creator__native jp">{{ creator.nativeName }}</p>
          <div v-if="biography.length" class="creator__bio">
            <p v-for="(paragraph, index) in biography" :key="index">{{ paragraph }}</p>
            <button
              v-if="creator.biography.length > BIO_PREVIEW"
              type="button"
              class="label creator__more"
              :aria-expanded="bioExpanded"
              @click="bioExpanded = !bioExpanded"
            >
              {{ bioExpanded ? 'Show less' : 'Full biography' }}
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="works-heading">
        <HomeSectionHeader marker="—" title="Works" jp="作品" heading-id="works-heading" />
        <ol class="creator__works" role="list">
          <li v-for="work in creator.works" :key="work.manga.id">
            <MangaTile :manga="work.manga" :caption="`${work.roleLabel} · ${work.manga.startYear ?? '—'}`" />
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>

<style scoped>
.creator {
  padding-block: var(--s-6) var(--s-7);
}

.creator__head {
  display: grid;
  gap: var(--s-6);
  margin-bottom: var(--s-7);
}

.creator__portrait {
  width: 160px;
  height: auto;
  aspect-ratio: 160 / 220;
  object-fit: cover;
  filter: grayscale(1) contrast(1.05);
  box-shadow: var(--shadow-float);
}

.creator__copy {
  display: grid;
  gap: var(--s-3);
  align-content: end;
}

.creator__name {
  font-size: var(--fs-display);
}

.creator__native {
  font-size: var(--fs-lg);
  color: var(--c-mist);
}

.creator__bio {
  display: grid;
  gap: var(--s-3);
  max-width: 68ch;
  color: var(--c-mist);
}

.creator__more {
  justify-self: start;
  min-height: var(--tap-min);
  color: var(--c-shu);
}

.creator__works {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(clamp(136px, 12vw + 60px, 210px), 1fr));
  gap: var(--s-6) var(--s-4);
}

@media (min-width: 900px) {
  .creator__head {
    grid-template-columns: auto 1fr;
    align-items: end;
  }
}
</style>
