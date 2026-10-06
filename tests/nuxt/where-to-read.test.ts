import { mountSuspended } from '@nuxt/test-utils/runtime'
import { describe, expect, it } from 'vitest'
import WhereToRead from '~/components/manga/WhereToRead.vue'
import { buildAvailability } from '../support/builders'

describe('WhereToRead', () => {
  it('lists each platform once with safe external links', async () => {
    const wrapper = await mountSuspended(WhereToRead, {
      props: {
        mangaId: '1',
        title: 'One Piece',
        degraded: false,
        availability: [
          buildAvailability(),
          buildAvailability({ language: 'French', url: 'https://mangaplus.shueisha.co.jp/fr' }),
          buildAvailability({ platformId: 'viz', platformName: 'VIZ', url: 'https://www.viz.com/one-piece' }),
        ],
      },
    })
    const names = wrapper.findAll('.where__name').map(node => node.text())
    expect(names).toEqual(['MANGA Plus', 'VIZ'])
    for (const link of wrapper.findAll('a[href^="https://"]')) {
      expect(link.attributes('target')).toBe('_blank')
      expect(link.attributes('rel')).toContain('noopener')
      expect(link.attributes('rel')).toContain('noreferrer')
    }
    expect(wrapper.text()).toContain('Aussi en')
    expect(wrapper.text()).toContain('Français')
  })

  it('explains when no official source exists and flags degraded data', async () => {
    const wrapper = await mountSuspended(WhereToRead, { props: { mangaId: '1', title: 'Obscure', availability: [], degraded: true } })
    expect(wrapper.text()).toContain('Aucune source officielle pour l’instant')
    expect(wrapper.find('[role="status"]').text()).toContain('incomplète')
  })
})
