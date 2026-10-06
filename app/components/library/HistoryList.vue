<script setup lang="ts">
const { history, forget, clear } = useViewHistory()
</script>

<template>
  <div class="history">
    <UiEmptyState v-if="!history.entries.length" title="Aucune trace pour l’instant" glyph="跡">
      <p>Les titres que vous ouvrez apparaissent ici, pour les retrouver facilement.</p>
      <template #actions><UiButton variant="line" to="/" icon-after="arrowRight">Explorer l’index</UiButton></template>
    </UiEmptyState>
    <template v-else>
      <div class="history__bar">
        <p class="label">{{ plural(history.entries.length, 'titre consulté', 'titres consultés') }}</p>
        <UiButton variant="ghost" size="sm" icon="trash" @click="clear()">Effacer l’historique</UiButton>
      </div>
      <ol class="history__list" role="list">
        <li v-for="item in history.entries" :key="item.manga.id" class="history__item">
          <MangaLink :manga="item.manga" class="history__link">
            <span class="history__thumb"><MangaCover :cover="snapshotCover(item.manga)" :title="item.manga.title" sizes="48px" decorative /></span>
            <span class="history__title">{{ item.manga.title }}</span>
            <time class="history__time numeric" :datetime="item.viewedAt">{{ relativeTime(item.viewedAt) }}</time>
          </MangaLink>
          <button type="button" class="history__forget" :aria-label="`Retirer ${item.manga.title} de l’historique`" @click="forget(item.manga.id)">
            <UiIcon name="close" :size="16" />
          </button>
        </li>
      </ol>
    </template>
  </div>
</template>

<style scoped>
.history__bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--s-3);
}

.history__item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--c-line);
  content-visibility: auto;
  contain-intrinsic-size: auto 80px;
}

.history__link {
  flex: 1;
  display: grid;
  grid-template-columns: 44px 1fr auto;
  align-items: center;
  gap: var(--s-4);
  padding-block: var(--s-2);
  min-width: 0;
}

.history__title {
  font-family: var(--font-display);
  font-size: var(--fs-lg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history__time {
  font-size: var(--fs-2xs);
  color: var(--c-fog);
}

.history__forget {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-fog);
}

.history__forget:hover {
  color: var(--c-bone);
}
</style>
