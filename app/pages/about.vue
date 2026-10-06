<script setup lang="ts">
usePageSeo({
  title: 'About & sources',
  description: 'How Manread works: an editorial index of manga that links only to official publishers and licensed platforms, with metadata from AniList.',
  path: '/about',
})

const principles = [
  { title: 'We index. We never host.', body: 'Manread stores no chapters, pages or scans. Every reading link points to a publisher or a platform that holds the rights in that language.' },
  { title: 'Official sources only.', body: 'Availability comes from AniList’s moderated list of official streaming links. Unofficial and scanlation sites are never listed, and every link is validated before it is shown.' },
  { title: 'Your library stays yours.', body: 'Your library, progress and history live in this browser only. No account, no tracking profile. You can export them at any time from the library page.' },
  { title: 'Measured, not watched.', body: 'We collect anonymous performance metrics (page speed) and crash reports to keep the site fast. They never contain what you read or search for.' },
]
</script>

<template>
  <div class="page about">
    <header class="about__head">
      <p class="label">About &amp; sources</p>
      <h1 class="display about__title">A table of contents <em>for everything worth reading.</em></h1>
    </header>
    <ol class="about__list" role="list">
      <li v-for="(principle, index) in principles" :key="principle.title" class="about__item">
        <span class="numeric about__index" aria-hidden="true">{{ indexLabel(index) }}</span>
        <h2 class="display about__item-title">{{ principle.title }}</h2>
        <p class="about__body">{{ principle.body }}</p>
      </li>
    </ol>
    <p class="about__credit">
      Catalog data, covers and official links are provided by
      <a class="link-underline" href="https://anilist.co" target="_blank" rel="noopener noreferrer external">AniList</a>. Cover art belongs to its respective
      publishers and creators.
    </p>
  </div>
</template>

<style scoped>
.about {
  padding-block: var(--s-7);
}

.about__head {
  display: grid;
  gap: var(--s-3);
  margin-bottom: var(--s-7);
}

.about__title {
  font-size: var(--fs-display);
  max-width: 16ch;
}

.about__title em {
  color: var(--c-mist);
}

.about__list {
  border-top: 1px solid var(--c-line);
}

.about__item {
  display: grid;
  gap: var(--s-2) var(--s-6);
  padding-block: var(--s-6);
  border-bottom: 1px solid var(--c-line);
}

.about__index {
  color: var(--c-shu);
  font-size: var(--fs-xs);
}

.about__item-title {
  font-size: var(--fs-xl);
}

.about__body {
  color: var(--c-mist);
  max-width: 60ch;
}

.about__credit {
  margin-top: var(--s-6);
  color: var(--c-fog);
  font-size: var(--fs-sm);
}

@media (min-width: 900px) {
  .about__item {
    grid-template-columns: 4ch minmax(0, 1fr) minmax(0, 1.2fr);
    align-items: baseline;
  }
}
</style>
