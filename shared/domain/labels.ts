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

export const PREFERRED_LANGUAGES = ['French', 'English'] as const

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

export function languagePreference(language: string | null): number {
  const index = PREFERRED_LANGUAGES.indexOf(language as (typeof PREFERRED_LANGUAGES)[number])
  return index === -1 ? PREFERRED_LANGUAGES.length : index
}
