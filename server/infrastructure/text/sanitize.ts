const MAX_PARAGRAPHS = 8
const MAX_TOTAL_LENGTH = 4000

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  rsquo: '’',
  lsquo: '‘',
  rdquo: '”',
  ldquo: '“',
}

export function htmlToParagraphs(html: string | null | undefined): string[] {
  if (!html) return []

  const text = decodeEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, '\n')
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, '\n\n')
      .replace(/<[^>]*>/g, ''),
  )

  const paragraphs: string[] = []
  let totalLength = 0
  for (const block of text.split(/\n{1,}/)) {
    const paragraph = block.replace(/[^\S\n]+/g, ' ').trim()
    if (!paragraph) continue
    if (totalLength + paragraph.length > MAX_TOTAL_LENGTH || paragraphs.length >= MAX_PARAGRAPHS) break
    paragraphs.push(paragraph)
    totalLength += paragraph.length
  }
  return paragraphs
}

export function plainText(value: string | null | undefined, maxLength: number): string {
  return htmlToParagraphs(value).join(' ').slice(0, maxLength)
}

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === '#') {
      const codePoint = entity[1]?.toLowerCase() === 'x' ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)
      return isPrintableCodePoint(codePoint) ? String.fromCodePoint(codePoint) : ''
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

function isPrintableCodePoint(codePoint: number): boolean {
  return Number.isInteger(codePoint) && codePoint > 0x1f && codePoint <= 0x10ffff && !(codePoint >= 0xd800 && codePoint <= 0xdfff)
}
