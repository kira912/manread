<template>
  <footer class="footer">
    <div class="page footer__grid">
      <p class="footer__statement display">
        An index, <em>not a library.</em>
      </p>
      <p class="footer__note">
        Manread does not host, copy or distribute manga. Every “Where to read” link leads to an official publisher or a licensed platform.
        Catalog metadata courtesy of <a class="link-underline" href="https://anilist.co" rel="noopener noreferrer external" target="_blank">AniList</a>.
      </p>
      <nav class="footer__nav" aria-label="Footer">
        <NuxtLink class="link-underline" to="/about">About &amp; sources</NuxtLink>
        <NuxtLink class="link-underline" to="/search">Browse everything</NuxtLink>
        <NuxtLink class="link-underline" to="/library">Your library</NuxtLink>
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
