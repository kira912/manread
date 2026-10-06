<script setup lang="ts">
const ICONS = {
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13ZM15.2 15.2 20 20',
  index: 'M4 5h16M4 12h10M4 19h16',
  library: 'M6 4v16M10 4v16M14.5 4.5l4 15',
  arrowUpRight: 'M7 17 17 7M8 7h9v9',
  arrowRight: 'M4 12h15M13 6l6 6-6 6',
  arrowLeft: 'M20 12H5M11 6l-6 6 6 6',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  close: 'M6 6l12 12M18 6 6 18',
  bookmark: 'M7 4h10v16l-5-4-5 4V4Z',
  bookmarkFilled: 'M7 4h10v16l-5-4-5 4V4Z',
  chevronDown: 'm6 9 6 6 6-6',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  filters: 'M4 7h10M18 7h2M4 17h4M12 17h8M14 4v6M8 14v6',
  trash: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13',
  refresh: 'M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  collapse: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  command: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6Z',
} as const

export type IconName = keyof typeof ICONS

const props = withDefaults(defineProps<{ name: IconName; size?: number }>(), { size: 20 })
const filled = computed(() => props.name === 'bookmarkFilled')
</script>

<template>
  <svg
    class="icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path :d="ICONS[name]" />
  </svg>
</template>

<style scoped>
.icon {
  flex: none;
}
</style>
