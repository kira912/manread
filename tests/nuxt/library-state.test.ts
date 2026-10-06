import { mountSuspended } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it } from 'vitest'
import { defineComponent, h } from 'vue'
import LibraryControl from '~/components/manga/LibraryControl.vue'
import { buildSnapshot } from '../support/builders'

const LIBRARY_KEY = 'manread:library'

async function withLibrary() {
  let api!: ReturnType<typeof useLibrary>
  let toasts!: ReturnType<typeof useToast>
  await mountSuspended(
    defineComponent({
      setup() {
        api = useLibrary()
        toasts = useToast()
        return () => h('div')
      },
    }),
  )
  return { api: () => api, toasts: () => toasts }
}

describe('library state', () => {
  beforeEach(() => {
    localStorage.clear()
    useState('library').value = { version: 1, entries: {} }
  })

  it('persists changes to local storage', async () => {
    const { api } = await withLibrary()
    api().setStatus(buildSnapshot({ id: '42' }), 'reading')
    api().setProgress('42', 3)
    const stored = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? '{}')
    expect(stored.entries['42']).toMatchObject({ status: 'reading', chapter: 3 })
  })

  it('rejects invalid progress with a toast and leaves state untouched', async () => {
    const { api, toasts } = await withLibrary()
    api().setStatus(buildSnapshot({ id: '7', chapters: 5 }), 'reading')
    expect(api().setProgress('7', 99)).toBe(false)
    expect(api().library.value.entries['7']?.chapter).toBe(0)
    expect(toasts().toasts.value.at(-1)).toMatchObject({ tone: 'error', message: 'Le chapitre ne peut pas dépasser 5' })
  })

  it('offers an undo after removal', async () => {
    const { api, toasts } = await withLibrary()
    api().setStatus(buildSnapshot({ id: '9' }), 'reading')
    api().remove('9')
    expect(api().library.value.entries['9']).toBeUndefined()
    toasts().toasts.value.at(-1)?.action?.run()
    expect(api().library.value.entries['9']?.status).toBe('reading')
  })

  it('lets a reader add a title and change its status from the manga page', async () => {
    useState('library-ready').value = true
    const wrapper = await mountSuspended(LibraryControl, { props: { manga: buildSnapshot({ id: '55', title: 'Vagabond' }) } })
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('Dans votre bibliothèque')
    await wrapper.find('input[value="completed"]').setValue(true)
    expect(useState<{ entries: Record<string, { status: string }> }>('library').value.entries['55']?.status).toBe('completed')
  })
})
