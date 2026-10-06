<template>
  <footer class="footer">
    <div class="page footer__grid">
      <p class="footer__statement display">
        Un index, <em>pas une bibliothèque.</em>
      </p>
      <p class="footer__note">
        Manread ne copie aucun site tiers. Les liens « Où lire » mènent vers des éditeurs officiels ou des plateformes sous licence, et la
        lecture intégrée ne propose que des contenus dont la diffusion est autorisée. Données du catalogue fournies par <a class="link-underline" href="https://anilist.co" rel="noopener noreferrer external" target="_blank">AniList</a>.
      </p>
      <nav class="footer__nav" aria-label="Pied de page">
        <NuxtLink class="link-underline" to="/about">À propos &amp; sources</NuxtLink>
        <NuxtLink class="link-underline" to="/search">Tout parcourir</NuxtLink>
        <NuxtLink class="link-underline" to="/library">Votre bibliothèque</NuxtLink>
      </nav>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  margin-top: var(--s-8);
  padding: var(--s-7) 0 var(--s-6);
  border-top: 1px solid var(--c-line);
}

.footer__grid {
  display: grid;
  gap: var(--s-5);
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  align-items: end;
}

.footer__statement {
  font-size: var(--fs-2xl);
}

.footer__statement em {
  color: var(--c-mist);
}

.footer__note {
  color: var(--c-fog);
  font-size: var(--fs-sm);
  max-width: 52ch;
}

.footer__nav {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-2) var(--s-5);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--c-mist);
}

.footer__nav a {
  padding-block: var(--s-2);
}
</style>
