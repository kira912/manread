<script setup lang="ts">
usePageSeo({
  title: 'À propos & sources',
  description:
    'Comment fonctionne Manread : un index éditorial de mangas qui renvoie vers les éditeurs officiels et les plateformes sous licence, avec une lecture intégrée réservée aux contenus autorisés.',
  path: '/about',
})

const principles = [
  {
    title: 'Nous indexons. Nous ne copions pas.',
    body: 'Manread ne recopie ni ne récupère aucun contenu d’autres sites. Les seuls chapitres lisibles dans l’app sont ceux dont la diffusion est autorisée : licence, ayant droit et source sont affichés sur chacun.',
  },
  {
    title: 'Uniquement des sources officielles.',
    body: 'Les liens « Où lire » proviennent de la liste modérée des liens officiels d’AniList. Les sites non officiels et de scantrad n’y figurent jamais, et chaque lien est vérifié avant d’être affiché.',
  },
  {
    title: 'Votre bibliothèque vous appartient.',
    body: 'Votre bibliothèque, votre progression et votre historique restent dans ce navigateur. Pas de compte, pas de profil. Vous pouvez les exporter à tout moment depuis la page Bibliothèque.',
  },
  {
    title: 'Mesuré, pas surveillé.',
    body: 'Nous utilisons des statistiques anonymes et sans cookies (Vercel Web Analytics, Speed Insights et Umami) pour compter les visites, mesurer la vitesse des pages et voir quelles fonctionnalités servent : recherches, chapitres lus, plateformes ouvertes. Aucun pistage entre sites, aucun profil, et le réglage « Ne pas me pister » de votre navigateur est respecté.',
  },
]
</script>

<template>
  <div class="page about">
    <header class="about__head">
      <p class="label">À propos &amp; sources</p>
      <h1 class="display about__title">Une table des matières <em>pour tout ce qui mérite d’être lu.</em></h1>
    </header>
    <ol class="about__list" role="list">
      <li v-for="(principle, index) in principles" :key="principle.title" class="about__item">
        <span class="numeric about__index" aria-hidden="true">{{ indexLabel(index) }}</span>
        <h2 class="display about__item-title">{{ principle.title }}</h2>
        <p class="about__body">{{ principle.body }}</p>
      </li>
    </ol>
    <p class="about__credit">
      Les données du catalogue, les couvertures et les liens officiels sont fournis par
      <a class="link-underline" href="https://anilist.co" target="_blank" rel="noopener noreferrer external">AniList</a>. Les couvertures appartiennent à leurs
      éditeurs et à leurs auteurs. Les synopsis et les tags proviennent d’AniList et sont en anglais.
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
