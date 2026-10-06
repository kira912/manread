<script setup lang="ts">
import type { IconName } from './Icon.vue'

const props = withDefaults(
  defineProps<{
    variant?: 'primary' | 'accent' | 'line' | 'ghost'
    size?: 'md' | 'sm'
    to?: string
    href?: string
    type?: 'button' | 'submit'
    icon?: IconName
    iconAfter?: IconName
    loading?: boolean
    disabled?: boolean
    pressed?: boolean
  }>(),
  { variant: 'line', size: 'md', type: 'button', pressed: undefined, loading: false, disabled: false },
)

const isExternal = computed(() => Boolean(props.href))
const component = computed(() => (props.to || props.href ? resolveComponent('NuxtLink') : 'button'))
const inactive = computed(() => props.disabled || props.loading)
</script>

<template>
  <component
    :is="component"
    class="button"
    :class="[`button--${variant}`, `button--${size}`, { 'is-loading': loading }]"
    :to="to"
    :href="href"
    :target="isExternal ? '_blank' : undefined"
    :rel="isExternal ? 'noopener noreferrer external' : undefined"
    :type="component === 'button' ? type : undefined"
    :disabled="component === 'button' ? inactive : undefined"
    :aria-disabled="inactive || undefined"
    :aria-busy="loading || undefined"
    :aria-pressed="component === 'button' ? pressed : undefined"
  >
    <UiIcon v-if="icon" :name="icon" :size="size === 'sm' ? 16 : 18" />
    <span class="button__label"><slot /></span>
    <UiIcon v-if="iconAfter" class="button__after" :name="iconAfter" :size="size === 'sm' ? 16 : 18" />
  </component>
</template>

<style scoped>
.button {
  --button-bg: transparent;
  --button-fg: var(--c-bone);
  --button-border: var(--c-line-strong);
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--s-2);
  min-height: var(--tap-min);
  padding-inline: var(--s-5);
  border: 1px solid var(--button-border);
  border-radius: var(--radius-xs);
  background: var(--button-bg);
  color: var(--button-fg);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
  isolation: isolate;
  overflow: hidden;
  transition:
    color var(--dur-2) var(--ease-out),
    border-color var(--dur-2) var(--ease-out),
    background-color var(--dur-2) var(--ease-out),
    transform var(--dur-1) var(--ease-out);
}

.button::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: var(--button-hover, var(--c-ink-3));
  transform: scaleX(0);
  transform-origin: left;
  transition: transform var(--dur-3) var(--ease-out);
}

.button:hover::before {
  transform: scaleX(1);
}

.button:active {
  transform: scale(0.98);
}

.button--sm {
  min-height: 36px;
  padding-inline: var(--s-3);
  font-size: var(--fs-2xs);
}

.button--primary {
  --button-bg: var(--c-bone);
  --button-fg: var(--c-void);
  --button-border: var(--c-bone);
  --button-hover: var(--c-paper);
}

.button--accent {
  --button-bg: var(--c-shu);
  --button-fg: var(--c-on-shu);
  --button-border: var(--c-shu);
  --button-hover: #ff6a3d;
}

.button--ghost {
  --button-border: transparent;
}

.button[aria-pressed='true'] {
  --button-border: var(--c-shu-line);
  --button-fg: var(--c-paper);
  background: var(--c-shu-soft);
}

.button__after {
  transition: transform var(--dur-2) var(--ease-out);
}

.button:hover .button__after {
  transform: translate(2px, -2px);
}

.button[disabled],
.button[aria-disabled='true'] {
  opacity: 0.5;
  pointer-events: none;
}

.is-loading .button__label {
  opacity: 0.5;
}

.is-loading::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 2px;
  background: currentColor;
  animation: wipe-in 900ms var(--ease-in-out) infinite;
}
</style>
