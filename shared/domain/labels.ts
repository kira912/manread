import { slugify } from './slug'

const GENRE_LABELS: Readonly<Record<string, string>> = {
  Action: 'Action',
  Adventure: 'Aventure',
  Comedy: 'Comédie',
  Drama: 'Drame',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasy',
  Horror: 'Horreur',
  'Mahou Shoujo': 'Magical girl',
  Mecha: 'Mecha',
  Music: 'Musique',
  Mystery: 'Mystère',
  Psychological: 'Psychologique',
  Romance: 'Romance',
  'Sci-Fi': 'Science-fiction',
  'Slice of Life': 'Tranche de vie',
  Sports: 'Sport',
  Supernatural: 'Surnaturel',
  Thriller: 'Thriller',
  Historical: 'Historique',
}

const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  French: 'Français',
  English: 'Anglais',
  Japanese: 'Japonais',
  Korean: 'Coréen',
  Chinese: 'Chinois',
  Spanish: 'Espagnol',
  Portuguese: 'Portugais',
  German: 'Allemand',
  Italian: 'Italien',
  Indonesian: 'Indonésien',
  Thai: 'Thaï',
  Vietnamese: 'Vietnamien',
  Russian: 'Russe',
  Arabic: 'Arabe',
  Polish: 'Polonais',
  Turkish: 'Turc',
  Dutch: 'Néerlandais',
  Hindi: 'Hindi',
  Malay: 'Malais',
  Filipino: 'Philippin',
}

export const PREFERRED_LANGUAGES: readonly string[] = ['French', 'English']

const LANGUAGE_BY_CODE: Readonly<Record<string, string>> = {
  fr: 'French',
  en: 'English',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  es: 'Spanish',
  pt: 'Portuguese',
  de: 'German',
  it: 'Italian',
  id: 'Indonesian',
  th: 'Thai',
  vi: 'Vietnamese',
  ru: 'Russian',
  ar: 'Arabic',
  pl: 'Polish',
  tr: 'Turkish',
  nl: 'Dutch',
  hi: 'Hindi',
  ms: 'Malay',
  fil: 'Filipino',
  tl: 'Filipino',
}

export function genreLabel(genre: string): string {
  return GENRE_LABELS[genre] ?? genre
}

export function genreSlug(genre: string): string {
  return slugify(genreLabel(genre))
}

export function languageLabel(language: string | null): string {
  if (!language) return 'Version originale'
  return LANGUAGE_LABELS[language] ?? language
}

export function languagePreference(language: string | null, preferred: readonly string[] = PREFERRED_LANGUAGES): number {
  const index = language ? preferred.indexOf(language) : -1
  return index === -1 ? preferred.length : index
}

/** Maps BCP 47 locales (navigator.languages, Accept-Language) to catalog language names, user's first, defaults last. */
export function preferredLanguagesFromLocales(locales: readonly string[]): string[] {
  const languages = locales
    .map(locale => LANGUAGE_BY_CODE[locale.trim().toLowerCase().split(/[-_]/)[0] ?? ''])
    .filter((language): language is string => Boolean(language))
  return [...new Set([...languages, ...PREFERRED_LANGUAGES])]
}

export function parseAcceptLanguage(header: string | null | undefined): string[] {
  if (!header) return []
  return header
    .split(',')
    .map((part, index) => {
      const [tag = '', ...params] = part.trim().split(';')
      const q = Number(params.find(param => param.trim().startsWith('q='))?.trim().slice(2) ?? 1)
      return { tag: tag.trim(), q: Number.isFinite(q) ? q : 0, index }
    })
    .filter(entry => entry.tag && entry.tag !== '*' && entry.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map(entry => entry.tag)
}
