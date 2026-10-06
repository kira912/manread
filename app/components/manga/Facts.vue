<script setup lang="ts">
import { originLabel, statusLabel, type Manga } from '#shared/domain/manga'

const props = defineProps<{ manga: Manga }>()

const facts = computed(() =>
  [
    { label: 'Status', value: statusLabel(props.manga.status) },
    { label: 'Type', value: props.manga.format === 'one_shot' ? 'One-shot' : originLabel(props.manga.origin) },
    {
      label: 'Published',
      value: props.manga.startYear ? `${props.manga.startYear}${props.manga.endYear && props.manga.endYear !== props.manga.startYear ? `–${props.manga.endYear}` : props.manga.status === 'releasing' ? '–' : ''}` : null,
    },
    { label: 'Chapters', value: props.manga.chapters ? String(props.manga.chapters) : props.manga.status === 'releasing' ? 'Ongoing' : null },
    { label: 'Volumes', value: props.manga.volumes ? String(props.manga.volumes) : null },
    { label: 'Score', value: formatScore(props.manga.score) },
    { label: 'Readers', value: props.manga.popularity ? compactNumber(props.manga.popularity) : null },
  ].filter((fact): fact is { label: string; value: string } => Boolean(fact.value)),
)
</script>

<template>
  <dl class="facts">
    <div v-for="fact in facts" :key="fact.label" class="facts__item">
      <dt class="label">{{ fact.label }}</dt>
      <dd class="facts__value">{{ fact.value }}</dd>
    </div>
  </dl>
</template>

<style scoped>
.facts {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  border-top: 1px solid var(--c-line);
  border-left: 1px solid var(--c-line);
}

.facts__item {
  display: grid;
  gap: var(--s-1);
  padding: var(--s-3) var(--s-4);
  border-right: 1px solid var(--c-line);
  border-bottom: 1px solid var(--c-line);
}

.facts__value {
  font-family: var(--font-display);
  font-size: var(--fs-xl);
  line-height: 1.1;
}
</style>
