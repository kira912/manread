<script setup lang="ts">
import { groupAvailabilityByPlatform, primaryOffer, type Availability } from '#shared/domain/availability'
import { languageLabel } from '#shared/domain/labels'
import type { MangaId } from '#shared/domain/manga'

const props = defineProps<{ mangaId: MangaId; title: string; availability: readonly Availability[]; degraded: boolean }>()
const platforms = computed(() => groupAvailabilityByPlatform(props.availability))
const { rememberPlatform, entryOf } = useLibrary()
const entry = entryOf(() => props.mangaId)

function remember(platformId: string, platformName: string, url: string) {
  rememberPlatform(props.mangaId, { id: platformId, name: platformName, url })
  openOfficialPlatform({ mangaId: props.mangaId, title: props.title, platformName, nextChapter: entry.value ? entry.value.chapter + 1 : null })
}
</script>

<template>
  <section id="where-to-read" class="where" aria-labelledby="where-heading">
    <header class="where__head">
      <p class="label"><span class="where__dot" aria-hidden="true" /> Sources officielles uniquement</p>
      <h2 id="where-heading" class="display where__title">Où lire</h2>
      <p class="where__note">
        Ces liens ouvrent l’éditeur ou une plateforme sous licence dans un nouvel onglet. Y lire, c’est soutenir les auteurs.
      </p>
    </header>

    <p v-if="degraded" class="where__degraded" role="status">Certaines sources n’ont pas pu être vérifiées. La liste est peut-être incomplète.</p>

    <ol v-if="platforms.length" class="where__list" role="list">
      <li v-for="(platform, index) in platforms" :key="platform.platformId" class="where__platform">
        <a
          v-if="primaryOffer(platform)"
          class="where__primary"
          :href="primaryOffer(platform)!.url"
          target="_blank"
          rel="noopener noreferrer external"
          @click="remember(platform.platformId, platform.platformName, primaryOffer(platform)!.url)"
        >
          <span class="where__index numeric" aria-hidden="true">{{ indexLabel(index) }}</span>
          <span class="where__name display">{{ platform.platformName }}</span>
          <span class="where__lang label">{{ languageLabel(primaryOffer(platform)!.language) }}</span>
          <span class="where__cta">
            Ouvrir <UiIcon name="arrowUpRight" :size="18" />
          </span>
          <span class="visually-hidden">— lire {{ title }} sur {{ platform.platformName }} (s’ouvre dans un nouvel onglet)</span>
        </a>
        <p v-if="platform.offers.length > 1" class="where__others">
          <span class="label">Aussi en</span>
          <template v-for="offer in platform.offers.slice(1)" :key="offer.url + offer.language">
            <a
              class="where__other link-underline"
              :href="offer.url"
              target="_blank"
              rel="noopener noreferrer external"
              @click="remember(platform.platformId, platform.platformName, offer.url)"
            >
              {{ languageLabel(offer.language) }}<span class="visually-hidden"> sur {{ platform.platformName }} (s’ouvre dans un nouvel onglet)</span>
            </a>
          </template>
        </p>
      </li>
    </ol>

    <UiEmptyState v-else title="Aucune source officielle pour l’instant" glyph="無" heading-level="h3">
      <p>
        Nous ne listons que les éditeurs et les plateformes sous licence. Dès que {{ title }} sera publié officiellement, il apparaîtra ici : ajoutez-le à votre bibliothèque pour ne pas le perdre de vue.
      </p>
    </UiEmptyState>
  </section>
</template>

<style scoped>
.where {
  display: grid;
  gap: var(--s-6);
  scroll-margin-top: var(--s-6);
}

.where__head {
  display: grid;
  gap: var(--s-2);
  max-width: 64ch;
}

.where__dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: var(--s-1);
  background: var(--c-shu);
  vertical-align: middle;
}

.where__title {
  font-size: var(--fs-2xl);
}

.where__note {
  color: var(--c-mist);
  font-size: var(--fs-sm);
}

.where__degraded {
  font-size: var(--fs-sm);
  color: var(--c-shu);
}

.where__list {
  border-top: 1px solid var(--c-line);
}

.where__platform {
  border-bottom: 1px solid var(--c-line);
}

.where__primary {
  display: grid;
  grid-template-columns: 3ch 1fr auto;
  grid-template-areas:
    'index name cta'
    'index lang cta';
  align-items: center;
  gap: var(--s-1) var(--s-4);
  padding-block: var(--s-4);
  transition: background-color var(--dur-2) var(--ease-out);
}

.where__index {
  grid-area: index;
  font-size: var(--fs-xs);
  color: var(--c-fog);
}

.where__name {
  grid-area: name;
  font-size: var(--fs-xl);
  transition: transform var(--dur-3) var(--ease-out);
}

.where__lang {
  grid-area: lang;
  font-size: var(--fs-2xs);
}

.where__cta {
  grid-area: cta;
  display: inline-flex;
  align-items: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
  padding-inline: var(--s-4);
  border: 1px solid var(--c-line-strong);
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  transition:
    background-color var(--dur-2) var(--ease-out),
    color var(--dur-2) var(--ease-out),
    border-color var(--dur-2) var(--ease-out);
}

.where__primary:hover .where__name,
.where__primary:focus-visible .where__name {
  transform: translateX(var(--s-2));
}

.where__primary:hover .where__cta,
.where__primary:focus-visible .where__cta {
  background: var(--c-shu);
  border-color: var(--c-shu);
  color: var(--c-on-shu);
}

.where__primary:hover .where__index {
  color: var(--c-shu);
}

.where__others {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-1) var(--s-3);
  padding: 0 0 var(--s-4) calc(3ch + var(--s-4));
  font-size: var(--fs-sm);
  color: var(--c-mist);
}

.where__other {
  min-height: 32px;
  display: inline-flex;
  align-items: center;
}
</style>
