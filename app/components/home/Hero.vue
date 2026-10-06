<script setup lang="ts">
import type { HomeHero } from '#shared/domain/discovery'
import { toSnapshot } from '#shared/domain/library'
import { mangaPath, originLabel, originLanguage, shortSynopsis, statusLabel } from '#shared/domain/manga'

const props = defineProps<{ hero: HomeHero }>()
const MAX_VISIBLE_PLATFORMS = 3
const SYNOPSIS_LENGTH = 220
const HERO_SIZES = '(min-width: 900px) 34vw, 46vw'

const manga = computed(() => props.hero.manga)
const synopsis = computed(() => shortSynopsis(props.hero.synopsis, SYNOPSIS_LENGTH))
const visiblePlatforms = computed(() => props.hero.platforms.slice(0, MAX_VISIBLE_PLATFORMS))
const hiddenPlatformCount = computed(() => Math.max(0, props.hero.platforms.length - MAX_VISIBLE_PLATFORMS))

const resolveSources = useCoverSources()
const heroSources = computed(() => resolveSources(manga.value.cover))
const { entryOf, setStatus, ready } = useLibrary()
const entry = entryOf(() => manga.value.id)

useHead({
  link: [
    {
      rel: 'preload',
      as: 'image',
      href: () => heroSources.value.src,
      imagesrcset: () => heroSources.value.srcset,
      imagesizes: HERO_SIZES,
      fetchpriority: 'high',
    },
  ],
})
</script>

<template>
  <section class="hero" aria-labelledby="hero-title" :style="{ '--hero-tone': manga.cover.dominantColor ?? '#ff4f1f' }">
    <div class="hero__ambient" aria-hidden="true" />

    <div class="hero__visual">
      <span class="hero__numeral display" aria-hidden="true">01</span>
      <div class="hero__frame">
        <span class="hero__mark hero__mark--tl" aria-hidden="true" />
        <span class="hero__mark hero__mark--br" aria-hidden="true" />
        <MangaLink :manga="manga" tabindex="-1" aria-hidden="true">
          <MangaCover :cover="manga.cover" :title="manga.title" :sizes="HERO_SIZES" priority decorative />
        </MangaLink>
      </div>
      <p v-if="manga.nativeTitle" class="hero__native jp" :lang="originLanguage(manga.origin)" aria-hidden="true">{{ manga.nativeTitle }}</p>
    </div>

    <div class="hero__copy">
      <p class="label hero__kicker"><span class="hero__dot" aria-hidden="true" /> Trending now · Nº 01</p>
      <h1 id="hero-title" class="hero__title display">
        <MangaLink :manga="manga">{{ manga.title }}</MangaLink>
      </h1>

      <dl class="hero__facts">
        <div><dt class="label">Status</dt><dd>{{ statusLabel(manga.status) }}</dd></div>
        <div v-if="manga.chapters"><dt class="label">Chapters</dt><dd class="numeric">{{ manga.chapters }}</dd></div>
        <div v-if="manga.startYear"><dt class="label">Since</dt><dd class="numeric">{{ manga.startYear }}</dd></div>
        <div><dt class="label">Origin</dt><dd>{{ originLabel(manga.origin) }}</dd></div>
      </dl>

      <p v-if="synopsis" class="hero__synopsis">{{ synopsis }}</p>

      <p class="hero__genres">
        <template v-for="(genre, index) in manga.genres.slice(0, 4)" :key="genre">
          <span v-if="index" aria-hidden="true"> / </span>{{ genre }}
        </template>
      </p>

      <p v-if="visiblePlatforms.length" class="hero__platforms">
        <span class="label">Read on</span>
        <span>
          {{ visiblePlatforms.map(platform => platform.name).join(', ') }}<template v-if="hiddenPlatformCount"> +{{ hiddenPlatformCount }}</template>
        </span>
      </p>

      <div class="hero__actions">
        <UiButton variant="accent" :to="`${mangaPath(manga)}#where-to-read`" icon-after="arrowUpRight">Where to read</UiButton>
        <UiButton
          v-if="ready && !entry"
          variant="line"
          icon="plus"
          @click="setStatus(toSnapshot(manga), 'plan_to_read')"
        >
          Plan to read
        </UiButton>
        <UiButton v-else-if="ready && entry" variant="line" icon="check" to="/library">In your library</UiButton>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  position: relative;
  display: grid;
  gap: var(--s-6);
  padding-block: var(--s-6) var(--s-8);
  isolation: isolate;
}

.hero__ambient {
  position: absolute;
  z-index: -1;
  inset: -10% calc(-1 * var(--gutter)) 0 20%;
  background: radial-gradient(50% 50% at 70% 40%, color-mix(in srgb, var(--hero-tone) 22%, transparent), transparent 70%);
  pointer-events: none;
}

.hero__visual {
  position: relative;
  justify-self: end;
  width: min(46vw, 300px);
  margin-right: var(--s-4);
}

.hero__numeral {
  position: absolute;
  z-index: -1;
  left: -0.55em;
  bottom: -0.18em;
  font-size: var(--fs-mega);
  color: transparent;
  -webkit-text-stroke: 1px var(--c-line-strong);
  line-height: 1;
}

.hero__frame {
  position: relative;
  box-shadow: var(--shadow-float);
  animation: rise-in var(--dur-4) var(--ease-out) both;
}

.hero__mark {
  position: absolute;
  width: 18px;
  height: 18px;
  border-color: var(--c-shu);
  border-style: solid;
  z-index: 1;
}

.hero__mark--tl {
  top: -10px;
  left: -10px;
  border-width: 1px 0 0 1px;
}

.hero__mark--br {
  right: -10px;
  bottom: -10px;
  border-width: 0 1px 1px 0;
}

.hero__native {
  position: absolute;
  top: 0;
  right: calc(-1 * var(--s-5));
  writing-mode: vertical-rl;
  font-size: var(--fs-sm);
  letter-spacing: 0.25em;
  color: var(--c-mist);
  max-height: 100%;
  overflow: hidden;
}

.hero__copy {
  display: grid;
  gap: var(--s-4);
  align-content: end;
}

.hero__kicker {
  display: flex;
  align-items: center;
  gap: var(--s-2);
}

.hero__dot {
  width: 6px;
  height: 6px;
  background: var(--c-shu);
}

.hero__title {
  font-size: var(--fs-display);
  max-width: 14ch;
  animation: rise-in var(--dur-4) var(--ease-out) 80ms both;
}

.hero__title a:hover {
  color: var(--c-paper);
}

.hero__facts {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3) var(--s-6);
  padding-block: var(--s-3);
  border-block: 1px solid var(--c-line);
}

.hero__facts div {
  display: grid;
  gap: 2px;
}

.hero__facts dd {
  font-size: var(--fs-sm);
}

.hero__synopsis {
  max-width: 58ch;
  color: var(--c-mist);
}

.hero__genres {
  font-family: var(--font-display);
  font-style: italic;
  font-size: var(--fs-lg);
  color: var(--c-bone);
}

.hero__platforms {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-3);
  align-items: baseline;
  font-size: var(--fs-sm);
}

.hero__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2);
  padding-top: var(--s-2);
}

@media (min-width: 900px) {
  .hero {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    align-items: end;
    min-height: min(88dvh, 920px);
    padding-top: var(--s-7);
  }

  .hero__visual {
    order: 2;
    width: 100%;
    max-width: 440px;
    justify-self: center;
    margin-right: 0;
  }

  .hero__copy {
    order: 1;
  }
}
</style>
