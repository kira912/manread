<script setup lang="ts">
import { librarySchema } from '~/infrastructure/storage/schemas'

const MAX_IMPORT_BYTES = 2_000_000
const { library, importLibrary } = useLibrary()
const toast = useToast()
const fileInput = ref<HTMLInputElement | null>(null)

function exportLibrary() {
  const payload = JSON.stringify(library.value, null, 2)
  const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `manread-bibliotheque-${new Date().toISOString().slice(0, 10)}.json`
  link.click()
  URL.revokeObjectURL(url)
}

async function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (file.size > MAX_IMPORT_BYTES) {
    toast.push('Ce fichier est trop volumineux pour être une bibliothèque Manread.', { tone: 'error' })
    return
  }
  const text = await file.text()
  const parsed = librarySchema.safeParse(safeJsonParse(text))
  if (!parsed.success) {
    toast.push('Ce fichier n’est pas un export de bibliothèque Manread valide.', { tone: 'error' })
    return
  }
  importLibrary(parsed.data)
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch (error) {
    console.warn('[library] import file is not JSON', error)
    return null
  }
}
</script>

<template>
  <div class="backup">
    <UiButton variant="ghost" size="sm" @click="exportLibrary">Exporter</UiButton>
    <UiButton variant="ghost" size="sm" @click="fileInput?.click()">Importer</UiButton>
    <input ref="fileInput" class="visually-hidden" type="file" accept="application/json,.json" tabindex="-1" aria-hidden="true" @change="onFileSelected" />
  </div>
</template>

<style scoped>
.backup {
  display: flex;
  gap: var(--s-1);
}
</style>
