import { parseArgs } from 'node:util'
import { importChapter } from './lib/import-chapter.ts'

const USAGE = `
Import one chapter of legally distributable manga into the in-app reader.

  pnpm content:import \\
    --source <id> --source-name <name> \\
    --license <name> --rights-holder <name> [--license-url <https url>] \\
    --catalog <provider:id> --series-title <title> \\
    --chapter <number> [--chapter-title <title>] [--published YYYY-MM-DD] \\
    [--content-dir ./content] [--public-dir ./public/content] <images or directories…>

Only import content you are allowed to redistribute: your own work, work you hold a
license for, or work explicitly released for free redistribution. The license and the
rights holder are stored with every chapter and shown to readers.
`

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    source: { type: 'string' },
    'source-name': { type: 'string' },
    license: { type: 'string' },
    'license-url': { type: 'string' },
    'rights-holder': { type: 'string' },
    catalog: { type: 'string' },
    'series-title': { type: 'string' },
    chapter: { type: 'string' },
    'chapter-title': { type: 'string' },
    published: { type: 'string' },
    'content-dir': { type: 'string', default: './content' },
    'public-dir': { type: 'string', default: './public/content' },
    help: { type: 'boolean', short: 'h' },
  },
})

const required = ['source', 'source-name', 'license', 'rights-holder', 'catalog', 'series-title', 'chapter'] as const
const missing = required.filter(name => !values[name])
if (values.help || missing.length > 0 || positionals.length === 0) {
  if (missing.length) console.error(`Missing: ${missing.map(name => `--${name}`).join(', ')}`)
  console.log(USAGE)
  process.exit(values.help ? 0 : 1)
}

const [provider, catalogId] = String(values.catalog).split(':')
const chapterNumber = Number(values.chapter)
if (!provider || !catalogId || !Number.isFinite(chapterNumber) || chapterNumber <= 0) {
  console.error('--catalog must look like "anilist:12345" and --chapter must be a positive number.')
  process.exit(1)
}

try {
  const result = await importChapter({
    contentDir: String(values['content-dir']),
    publicDir: String(values['public-dir']),
    source: { id: String(values.source), name: String(values['source-name']) },
    license: { name: String(values.license), url: values['license-url'] ?? null, rightsHolder: String(values['rights-holder']) },
    catalog: { provider, id: catalogId },
    seriesTitle: String(values['series-title']),
    chapter: { number: chapterNumber, title: values['chapter-title'] ?? null, publishedAt: values.published ?? null },
    pages: positionals,
  })
  console.log(`Imported ${result.chapterId}: ${result.pageCount} pages, ${Math.round(result.bytes / 1024)} KiB`)
  console.log('Rebuild or redeploy so the new manifest is bundled with the server.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
