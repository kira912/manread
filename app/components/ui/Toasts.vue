<script setup lang="ts">
const { toasts, dismiss } = useToast()

function runAction(id: number, action: () => void) {
  action()
  dismiss(id)
}
</script>

<template>
  <div class="toasts" role="status" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="toast">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.tone}`">
        <span class="toast__marker" aria-hidden="true" />
        <p class="toast__message">{{ toast.message }}</p>
        <button v-if="toast.action" type="button" class="toast__action" @click="runAction(toast.id, toast.action.run)">
          {{ toast.action.label }}
        </button>
        <button type="button" class="toast__close" aria-label="Dismiss notification" @click="dismiss(toast.id)">
          <UiIcon name="close" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts {
  position: fixed;
  z-index: var(--z-toast);
  right: var(--gutter);
  bottom: calc(var(--gutter) + var(--safe-bottom));
  display: grid;
  gap: var(--s-2);
  width: min(400px, calc(100vw - 2 * var(--gutter)));
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--s-3);
  padding: var(--s-3) var(--s-2) var(--s-3) var(--s-4);
  background: var(--c-ink-2);
  border: 1px solid var(--c-line);
  box-shadow: var(--shadow-float);
  font-size: var(--fs-sm);
  pointer-events: auto;
}

.toast__marker {
  width: 6px;
  height: 6px;
  background: var(--c-bone);
  flex: none;
}

.toast--error .toast__marker {
  background: var(--c-shu);
}

.toast__message {
  flex: 1;
  line-height: 1.4;
}

.toast__action {
  font-family: var(--font-mono);
  font-size: var(--fs-2xs);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--c-shu);
  padding: var(--s-2);
  min-height: 36px;
}

.toast__close {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  color: var(--c-fog);
}

.toast__close:hover {
  color: var(--c-bone);
}

.toast-enter-active,
.toast-leave-active {
  transition:
    opacity var(--dur-2) var(--ease-out),
    transform var(--dur-3) var(--ease-out);
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(12px);
}

@media (max-width: 899px) {
  .toasts {
    bottom: calc(var(--dock-height) + var(--safe-bottom) + var(--s-3));
    right: 50%;
    translate: 50% 0;
  }
}
</style>
