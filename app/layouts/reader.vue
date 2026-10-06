<template>
  <div class="reader-shell">
    <a class="reader-skip" href="#reader">Skip to pages</a>
    <slot />
    <UiToasts />
  </div>
</template>

<style scoped>
.reader-shell {
  min-height: 100dvh;
  background: #000;
}

.reader-skip {
  position: fixed;
  z-index: var(--z-toast);
  top: var(--s-3);
  left: var(--s-3);
  padding: var(--s-3) var(--s-4);
  background: var(--c-bone);
  color: var(--c-void);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  text-transform: uppercase;
  transform: translateY(-200%);
}

.reader-skip:focus {
  transform: none;
}
</style>
