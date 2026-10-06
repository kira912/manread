import { describe, expect, it } from 'vitest'
import type { CatalogContext } from '../../../server/application/context'
import { getReadableChapter, listReadableChapters } from '../../../server/application/reading'
import { ContentStore, type ManifestReader } from '../../../server/infrastructure/content/content-store'
import { passthroughCache, RecordingMetrics, silentLogger } from '../../support/fakes'

function manifest(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    source: { id: 'studio', name: 'Studio', license: { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', rightsHolder: 'Ana' } },
    series: [
      {
        catalog: { provider: 'anilist', id: '42' },
        title: 'Series',
        chapters: [
          { id: 'series-c2', number: 2, title: null, publishedAt: null, pages: [{ file: '001-aaaaaaaa.webp', width: 800, height: 1200 }] },
          { id: 'series-c1', number: 1, title: 'Start', publishedAt: '2026-01-01', pages: [{ file: '001-bbbbbbbb.webp', width: 800, height: 1200 }] },
        ],
      },
      { catalog: { provider: 'other', id: '42' }, title: 'Elsewhere', chapters: [] },
    ],
    ...overrides,
  }
}

function reader(manifests: Record<string, unknown>): ManifestReader {
  return {
    listSourceIds: async () => Object.keys(manifests),
    readManifest: async sourceId => manifests[sourceId] ?? null,
  }
}

function store(manifests: Record<string, unknown>, metrics = new RecordingMetrics(), provider = 'anilist') {
  return new ContentStore({ manifests: reader(manifests), catalogProviderId: provider, cache: passthroughCache, logger: silentLogger, metrics })
}

describe('ContentStore', () => {
  it('lists chapters with license provenance for the active catalog only', async () => {
    const chapters = await store({ studio: manifest() }).listChapters('42')
    expect(chapters.map(chapter => chapter.id).sort()).toEqual(['studio~series-c1', 'studio~series-c2'])
    expect(chapters[0]?.license).toEqual({ name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', rightsHolder: 'Ana' })
    expect(await store({ studio: manifest() }, undefined, 'fixture').listChapters('42')).toEqual([])
  })

  it('exposes pages as public, hash-named URLs', async () => {
    const result = await store({ studio: manifest() }).getChapter('studio~series-c1')
    expect(result?.pages).toEqual([{ index: 0, url: '/content/studio/series-c1/001-bbbbbbbb.webp', width: 800, height: 1200 }])
    expect(await store({ studio: manifest() }).getChapter('studio~missing')).toBeNull()
    expect(await store({ studio: manifest() }).getChapter('malformed')).toBeNull()
  })

  it('ignores invalid manifests without breaking other sources', async () => {
    const metrics = new RecordingMetrics()
    const sources = {
      studio: manifest(),
      broken: 'not an object',
      mismatch: manifest(),
      unlicensed: manifest({ source: { id: 'unlicensed', name: 'X', license: { name: '', url: null, rightsHolder: '' } } }),
      '../escape': manifest(),
    }
    expect(await store(sources, metrics).listChapters('42')).toHaveLength(2)
    expect(metrics.counters.get('content_manifest_invalid:broken')).toBe(1)
    expect(metrics.counters.get('content_manifest_invalid:mismatch')).toBe(1)
    expect(metrics.counters.get('content_manifest_invalid:unlicensed')).toBe(1)
    expect(metrics.counters.has('content_manifest_invalid:../escape')).toBe(false)
  })

  it('rejects manifests with duplicate chapter ids', async () => {
    const duplicate = manifest()
    duplicate.series[0]!.chapters[1]!.id = 'series-c2'
    expect(await store({ studio: duplicate }).listChapters('42')).toEqual([])
  })

  it('feeds the reading use cases with ordered chapters and neighbours', async () => {
    const metrics = new RecordingMetrics()
    const context = { chapterSources: [store({ studio: manifest() })], logger: silentLogger, metrics } as unknown as CatalogContext
    expect((await listReadableChapters(context, '42')).map(chapter => chapter.number)).toEqual([1, 2])
    const readable = await getReadableChapter(context, 'studio~series-c1')
    expect(readable.previous).toBeNull()
    expect(readable.next?.id).toBe('studio~series-c2')
    await expect(getReadableChapter(context, 'studio~missing')).rejects.toMatchObject({ code: 'not_found' })
  })

  it('isolates a failing chapter source', async () => {
    const metrics = new RecordingMetrics()
    const failing = { id: 'down', listChapters: () => Promise.reject(new Error('down')), getChapter: async () => null }
    const context = { chapterSources: [failing, store({ studio: manifest() })], logger: silentLogger, metrics } as unknown as CatalogContext
    expect(await listReadableChapters(context, '42')).toHaveLength(2)
    expect(metrics.counters.get('chapter_source_failed:down')).toBe(1)
  })
})
