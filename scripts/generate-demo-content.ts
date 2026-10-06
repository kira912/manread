import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { importChapter } from './lib/import-chapter.ts'

const DEMO_SOURCE = { id: 'manread-demo', name: 'Manread demo studio' }
const DEMO_LICENSE = { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', rightsHolder: 'Manread demo studio' }

interface DemoSeries {
  readonly catalogId: string
  readonly title: string
  readonly hue: number
  readonly vertical: boolean
  readonly chapters: readonly { readonly number: number; readonly title: string; readonly pages: number }[]
}

const SERIES: readonly DemoSeries[] = [
  {
    catalogId: '9001',
    title: 'Saltwater Archive',
    hue: 200,
    vertical: false,
    chapters: [
      { number: 1, title: 'What the tide returns', pages: 6 },
      { number: 2, title: 'A letter, unsigned', pages: 5 },
    ],
  },
  { catalogId: '9007', title: 'Late Bus to Haneul', hue: 220, vertical: true, chapters: [{ number: 1, title: 'Last stop', pages: 4 }] },
]

function pageSvg(series: DemoSeries, chapter: number, page: number, total: number): string {
  const width = series.vertical ? 800 : 900
  const height = series.vertical ? 2400 : 1350
  const panels = series.vertical
    ? [0, 1, 2].map(index => ({ x: 60, y: 80 + index * 780, w: width - 120, h: 680 }))
    : [
        { x: 50, y: 50, w: 800, h: 520 },
        { x: 50, y: 600, w: 380, h: 700 },
        { x: 460, y: 600, w: 390, h: 700 },
      ]
  const shapes = panels
    .map((panel, index) => {
      const lightness = 18 + ((page + index) % 4) * 8
      const cx = panel.x + panel.w * (0.3 + 0.2 * ((page + index) % 3))
      const cy = panel.y + panel.h * 0.4
      return `
        <rect x="${panel.x}" y="${panel.y}" width="${panel.w}" height="${panel.h}" fill="hsl(${series.hue} 30% ${lightness}%)" stroke="#111" stroke-width="6"/>
        <circle cx="${cx}" cy="${cy}" r="${Math.min(panel.w, panel.h) * 0.18}" fill="hsl(${series.hue} 70% 70%)"/>
        <path d="M${panel.x} ${panel.y + panel.h * 0.8} Q ${panel.x + panel.w / 2} ${panel.y + panel.h * 0.6} ${panel.x + panel.w} ${panel.y + panel.h * 0.85} V ${panel.y + panel.h} H ${panel.x} Z" fill="hsl(${series.hue} 40% 10%)"/>`
    })
    .join('')
  const bubble = panels[0]!
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#f4f1ea"/>
    ${shapes}
    <ellipse cx="${bubble.x + bubble.w - 170}" cy="${bubble.y + 110}" rx="150" ry="70" fill="#fff" stroke="#111" stroke-width="4"/>
    <text x="${bubble.x + bubble.w - 170}" y="${bubble.y + 122}" font-family="serif" font-size="34" text-anchor="middle" fill="#111">Ch.${chapter} · p.${page}/${total}</text>
  </svg>`
}

const workDir = await mkdtemp(join(tmpdir(), 'manread-demo-'))
try {
  for (const series of SERIES) {
    for (const chapter of series.chapters) {
      const files: string[] = []
      for (let page = 1; page <= chapter.pages; page += 1) {
        const path = join(workDir, `${series.catalogId}-${chapter.number}-${String(page).padStart(3, '0')}.png`)
        await writeFile(path, await sharp(Buffer.from(pageSvg(series, chapter.number, page, chapter.pages))).png().toBuffer())
        files.push(path)
      }
      const result = await importChapter({
        contentDir: './content',
        publicDir: './public/content',
        source: DEMO_SOURCE,
        license: DEMO_LICENSE,
        catalog: { provider: 'fixture', id: series.catalogId },
        seriesTitle: series.title,
        chapter: { number: chapter.number, title: chapter.title, publishedAt: '2026-09-01' },
        pages: files,
      })
      console.log(`Generated ${result.chapterId} (${result.pageCount} pages)`)
    }
  }
} finally {
  await rm(workDir, { recursive: true, force: true })
}
