<script setup lang="ts">
import { chapterLabel, formatChapterNumber, type Chapter } from '#shared/domain/reader'

defineProps<{ chapter: Chapter; next: Chapter | null; nextTo: string | null; mangaTo: string; title: string }>()
</script>

<template>
  <section class="end" aria-labelledby="end-heading">
    <p class="label">Fin du chapitre {{ formatChapterNumber(chapter.number) }}</p>
    <h2 id="end-heading" class="display end__title">{{ next ? 'On continue ?' : 'Vous êtes à jour.' }}</h2>
    <div class="end__actions">
      <UiButton v-if="next && nextTo" variant="accent" :to="nextTo" icon-after="arrowRight">{{ chapterLabel(next) }}</UiButton>
      <UiButton v-else variant="accent" :to="`${mangaTo}#where-to-read`" icon-after="arrowRight">La suite sur les plateformes officielles</UiButton>
      <UiButton variant="line" :to="mangaTo">Retour à {{ title }}</UiButton>
    </div>
    <p class="end__license">
      Publié par {{ chapter.sourceName }} · ©
      {{ chapter.license.rightsHolder }} ·
      <a v-if="chapter.license.url" :href="chapter.license.url" class="link-underline" target="_blank" rel="noopener noreferrer external">{{ chapter.license.name }}</a>
      <template v-else>{{ chapter.license.name }}</template>
    </p>
  </section>
</template>

<style scoped>
.end {
  display: grid;
  justify-items: center;
  gap: var(--s-4);
  padding: var(--s-7) var(--gutter);
  text-align: center;
}

.end__title {
  font-size: var(--fs-2xl);
}

.end__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-2);
}

.end__license {
  font-size: var(--fs-xs);
  color: var(--c-fog);
}
</style>
