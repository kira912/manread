<script setup lang="ts">
import type { ReaderPreferences } from '#shared/domain/reader'

const open = defineModel<boolean>('open', { required: true })
const props = defineProps<{ preferences: ReaderPreferences }>()
const emit = defineEmits<{ change: [patch: Partial<ReaderPreferences>] }>()

const groups = [
  { key: 'mode', label: 'Affichage', options: [['auto', 'Auto'], ['paged', 'Page par page'], ['vertical', 'Défilement vertical']] },
  { key: 'direction', label: 'Sens de lecture', options: [['auto', 'Auto'], ['rtl', 'De droite à gauche'], ['ltr', 'De gauche à droite']] },
  { key: 'fit', label: 'Ajustement', options: [['height', 'À la hauteur'], ['width', 'À la largeur']] },
] as const

const shortcuts = [
  ['← →', 'Tourner les pages (selon le sens de lecture)'],
  ['Espace / Maj+Espace', 'Page suivante / précédente'],
  ['[ ]', 'Chapitre précédent / suivant'],
  ['F', 'Plein écran'],
  ['M', 'Afficher ou masquer les commandes'],
]
</script>

<template>
  <UiDialog v-model:open="open" label="Réglages du lecteur" variant="side">
    <div class="settings">
      <header class="settings__head">
        <h2 class="display">Lecteur</h2>
        <button type="button" class="settings__close" aria-label="Fermer les réglages" @click="open = false"><UiIcon name="close" /></button>
      </header>
      <fieldset v-for="group in groups" :key="group.key" class="settings__group">
        <legend class="label">{{ group.label }}</legend>
        <div class="settings__options">
          <label v-for="[value, text] in group.options" :key="value" class="settings__option" :class="{ 'is-checked': props.preferences[group.key] === value }">
            <input
              class="visually-hidden"
              type="radio"
              :name="group.key"
              :value="value"
              :checked="props.preferences[group.key] === value"
              @change="emit('change', { [group.key]: value })"
            />
            {{ text }}
          </label>
        </div>
      </fieldset>
      <p class="settings__hint">En « Auto », les mangas se lisent de droite à gauche, page par page, et les manhwas ou manhuas en défilement vertical.</p>
      <section class="settings__group" aria-labelledby="shortcuts-heading">
        <h3 id="shortcuts-heading" class="label">Clavier</h3>
        <dl class="settings__shortcuts">
          <template v-for="[keys, description] in shortcuts" :key="keys">
            <dt><kbd>{{ keys }}</kbd></dt>
            <dd>{{ description }}</dd>
          </template>
        </dl>
      </section>
    </div>
  </UiDialog>
</template>

<style scoped>
.settings {
  display: grid;
  gap: var(--s-5);
  padding: var(--s-5);
}

.settings__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.settings__head h2 {
  font-size: var(--fs-2xl);
}

.settings__close {
  display: grid;
  place-items: center;
  width: var(--tap-min);
  height: var(--tap-min);
  color: var(--c-mist);
}

.settings__group {
  display: grid;
  gap: var(--s-2);
  border: 0;
  padding: 0;
}

.settings__options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-1);
}

.settings__option {
  display: inline-flex;
  align-items: center;
  min-height: 40px;
  padding-inline: var(--s-3);
  border: 1px solid var(--c-line);
  font-size: var(--fs-sm);
  color: var(--c-mist);
  cursor: pointer;
}

.settings__option.is-checked {
  color: var(--c-paper);
  border-color: var(--c-shu-line);
  background: var(--c-shu-soft);
}

.settings__option:has(:focus-visible) {
  box-shadow: var(--focus-ring);
}

.settings__hint {
  font-size: var(--fs-sm);
  color: var(--c-fog);
}

.settings__shortcuts {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--s-2) var(--s-4);
  font-size: var(--fs-sm);
  color: var(--c-mist);
}

.settings__shortcuts kbd {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  border: 1px solid var(--c-line);
  padding: 2px 6px;
  white-space: nowrap;
}
</style>
