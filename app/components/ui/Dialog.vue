<script setup lang="ts">
const open = defineModel<boolean>('open', { required: true })
const props = withDefaults(defineProps<{ label: string; variant?: 'center' | 'sheet' | 'side'; fullscreenOnMobile?: boolean }>(), {
  variant: 'center',
  fullscreenOnMobile: false,
})

const dialog = ref<HTMLDialogElement | null>(null)
let returnFocusTo: HTMLElement | null = null

function sync(shouldOpen: boolean) {
  const element = dialog.value
  if (!element) return
  if (shouldOpen && !element.open) {
    returnFocusTo = document.activeElement instanceof HTMLElement ? document.activeElement : null
    element.showModal()
    document.documentElement.classList.add('is-scroll-locked')
  } else if (!shouldOpen && element.open) {
    element.close()
  }
}

function handleClose() {
  document.documentElement.classList.remove('is-scroll-locked')
  open.value = false
  returnFocusTo?.focus({ preventScroll: true })
  returnFocusTo = null
}

function handleBackdrop(event: MouseEvent) {
  if (event.target === dialog.value) open.value = false
}

watch(open, sync, { flush: 'post' })
onMounted(() => sync(open.value))
onBeforeUnmount(() => document.documentElement.classList.remove('is-scroll-locked'))
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    :class="[`dialog--${props.variant}`, { 'dialog--fullscreen-mobile': fullscreenOnMobile }]"
    :aria-label="label"
    @close="handleClose"
    @click="handleBackdrop"
  >
    <div class="dialog__surface">
      <slot :close="() => (open = false)" />
    </div>
  </dialog>
</template>

<style scoped>
.dialog {
  position: fixed;
  inset: 0;
  margin: auto;
  overflow: visible;
}

.dialog::backdrop {
  background: var(--c-scrim);
  backdrop-filter: blur(6px);
  animation: fade-in var(--dur-2) var(--ease-out);
}

.dialog__surface {
  height: 100%;
  background: var(--c-ink-1);
  border: 1px solid var(--c-line);
  box-shadow: var(--shadow-float);
  overflow: hidden;
}

.dialog--center {
  width: min(760px, calc(100vw - 2 * var(--gutter)));
  height: fit-content;
  max-height: min(680px, 80dvh);
  margin-top: 10vh;
}

.dialog--center[open] .dialog__surface {
  animation: rise-in var(--dur-3) var(--ease-out);
}

.dialog--sheet {
  width: 100vw;
  max-height: 88dvh;
  margin: auto 0 0;
}

.dialog--sheet .dialog__surface {
  border-radius: 12px 12px 0 0;
  overflow-y: auto;
  padding-bottom: var(--safe-bottom);
}

.dialog--sheet[open] .dialog__surface {
  animation: rise-in var(--dur-3) var(--ease-out);
}

.dialog--side {
  width: min(440px, 100vw);
  height: 100dvh;
  margin: 0 0 0 auto;
}

.dialog--side .dialog__surface {
  overflow-y: auto;
}

@media (max-width: 720px) {
  .dialog--fullscreen-mobile {
    width: 100vw;
    height: 100dvh;
    max-height: none;
    margin: 0;
  }

  .dialog--fullscreen-mobile .dialog__surface {
    border: 0;
  }
}
</style>

<style>
.is-scroll-locked {
  overflow: hidden;
  scrollbar-gutter: stable;
}
</style>
