import type { Availability } from '#shared/domain/availability'
import type { CreatorProfile } from '#shared/domain/creator'
import type { Manga, MangaOrigin, MangaStatus } from '#shared/domain/manga'
import { slugify } from '#shared/domain/slug'

export const FIXTURE_PROVIDER_ID = 'fixture'

interface FixtureSeed {
  readonly id: string
  readonly title: string
  readonly nativeTitle: string
  readonly hue: number
  readonly status: MangaStatus
  readonly origin: MangaOrigin
  readonly startYear: number
  readonly genres: readonly string[]
  readonly score: number
  readonly popularity: number
  readonly chapters: number | null
  readonly creatorId: string
  readonly synopsis: string
  readonly platforms: readonly (readonly [platformName: string, language: string])[]
}

const CREATORS = {
  '7001': { name: 'Aoi Kirishima', nativeName: '霧島 葵' },
  '7002': { name: 'Ren Hayasaka', nativeName: '早坂 蓮' },
  '7003': { name: 'Seo Jiwon', nativeName: '서지원' },
} as const satisfies Record<string, { name: string; nativeName: string }>

const SEEDS: readonly FixtureSeed[] = [
  { id: '9001', title: 'Saltwater Archive', nativeTitle: '潮の書庫', hue: 200, status: 'releasing', origin: 'JP', startYear: 2023, genres: ['Drama', 'Mystery', 'Slice of Life'], score: 86, popularity: 48_000, chapters: null, creatorId: '7001', synopsis: 'Une gardienne de phare répertorie les objets que la marée rapporte, jusqu’au jour où l’un d’eux est une lettre qui lui est adressée.', platforms: [['Lantern Comics', 'English'], ['Lantern Comics', 'French']] },
  { id: '9002', title: 'Ninth Floor Fox', nativeTitle: '九階の狐', hue: 18, status: 'releasing', origin: 'JP', startYear: 2024, genres: ['Action', 'Supernatural'], score: 81, popularity: 92_000, chapters: null, creatorId: '7002', synopsis: 'Une tour de bureaux cache un sanctuaire à un étage qui n’existe pas. Un gardien de nuit en devient malgré lui le protecteur.', platforms: [['Lantern Comics', 'English']] },
  { id: '9003', title: 'Paper Moon Courier', nativeTitle: '紙月便', hue: 48, status: 'finished', origin: 'JP', startYear: 2019, genres: ['Adventure', 'Fantasy'], score: 84, popularity: 61_000, chapters: 96, creatorId: '7001', synopsis: 'Des messages pliés en grues de papier traversent un continent en guerre, portés par un coursier qui ne sait pas lire.', platforms: [['Kite Reader', 'English'], ['Kite Reader', 'Spanish']] },
  { id: '9004', title: 'The Concrete Garden', nativeTitle: '콘크리트 정원', hue: 140, status: 'finished', origin: 'KR', startYear: 2020, genres: ['Drama', 'Psychological'], score: 88, popularity: 23_000, chapters: 142, creatorId: '7003', synopsis: 'Une architecte reconstruit l’immeuble de son enfance, pièce par pièce, à partir des souvenirs de ses anciens habitants.', platforms: [['Panel House', 'English']] },
  { id: '9005', title: 'Static Bloom', nativeTitle: 'スタティック・ブルーム', hue: 300, status: 'hiatus', origin: 'JP', startYear: 2021, genres: ['Sci-Fi', 'Romance'], score: 77, popularity: 35_000, chapters: 58, creatorId: '7002', synopsis: 'Deux opérateurs radio, de part et d’autre d’une mer gelée, tombent amoureux à travers les interférences.', platforms: [] },
  { id: '9006', title: 'Ledger of Small Gods', nativeTitle: '小さな神々の帳簿', hue: 260, status: 'releasing', origin: 'JP', startYear: 2022, genres: ['Comedy', 'Fantasy', 'Supernatural'], score: 79, popularity: 54_000, chapters: null, creatorId: '7001', synopsis: 'Un contrôleur fiscal est affecté aux esprits d’un village de montagne. Aucun n’a jamais fait de déclaration.', platforms: [['Kite Reader', 'English']] },
  { id: '9007', title: 'Late Bus to Haneul', nativeTitle: '하늘행 막차', hue: 220, status: 'finished', origin: 'KR', startYear: 2018, genres: ['Slice of Life', 'Romance'], score: 83, popularity: 41_000, chapters: 77, creatorId: '7003', synopsis: 'Le dernier bus de la nuit prend toujours les cinq mêmes inconnus, et chaque trajet raconte l’histoire de l’un d’eux.', platforms: [['Panel House', 'English'], ['Panel House', 'Korean']] },
  { id: '9008', title: 'Iron Calligrapher', nativeTitle: '鉄の書家', hue: 0, status: 'releasing', origin: 'JP', startYear: 2025, genres: ['Action', 'Historical'], score: 80, popularity: 18_000, chapters: null, creatorId: '7002', synopsis: 'Dans une ville où les mots écrits font loi, un scribe déchu se bat à l’encre et à la lame.', platforms: [['Lantern Comics', 'English']] },
  { id: '9009', title: 'Moth Season', nativeTitle: '蛾の季節', hue: 30, status: 'cancelled', origin: 'JP', startYear: 2017, genres: ['Horror', 'Mystery'], score: 72, popularity: 9_000, chapters: 31, creatorId: '7001', synopsis: 'Chaque été, les papillons de nuit reviennent dans la vallée, et chaque été quelqu’un oublie son propre nom.', platforms: [] },
  { id: '9010', title: 'Quiet Orbit', nativeTitle: '静かな軌道', hue: 180, status: 'upcoming', origin: 'JP', startYear: 2026, genres: ['Sci-Fi', 'Drama'], score: 0, popularity: 3_000, chapters: null, creatorId: '7002', synopsis: 'Un robot de maintenance, sur une station abandonnée, décide de terminer la fresque laissée par son équipage.', platforms: [] },
  { id: '9011', title: 'Tea for the Dragon King', nativeTitle: '龙王的茶', hue: 90, status: 'releasing', origin: 'CN', startYear: 2022, genres: ['Fantasy', 'Comedy'], score: 76, popularity: 27_000, chapters: null, creatorId: '7003', synopsis: 'La patronne d’un salon de thé découvre que son client le plus exigeant est le dragon du fleuve que tout le monde redoute.', platforms: [['Kite Reader', 'English']] },
  { id: '9012', title: 'Northbound Silence', nativeTitle: '北行きの沈黙', hue: 240, status: 'finished', origin: 'JP', startYear: 2015, genres: ['Drama', 'Sports'], score: 85, popularity: 33_000, chapters: 120, creatorId: '7002', synopsis: 'Une coureuse de fond sourde s’entraîne seule à travers Hokkaidō pour une course à laquelle personne ne la croit capable de participer.', platforms: [['Lantern Comics', 'English']] },
]

export interface FixtureEntry {
  readonly manga: Manga
  readonly availability: readonly Availability[]
}

export function buildFixtureCatalog(): readonly FixtureEntry[] {
  const summaries = new Map(SEEDS.map(seed => [seed.id, toManga(seed, [])]))
  return SEEDS.map(seed => {
    const related = SEEDS.filter(other => other.id !== seed.id && other.creatorId === seed.creatorId)
      .slice(0, 2)
      .map(other => ({ kind: 'Same creator', manga: summaries.get(other.id)! }))
    return { manga: toManga(seed, related), availability: toAvailability(seed) }
  })
}

export function buildFixtureCreators(catalog: readonly FixtureEntry[]): readonly CreatorProfile[] {
  return Object.entries(CREATORS).map(([id, creator]) => ({
    id,
    slug: slugify(creator.name),
    name: creator.name,
    nativeName: creator.nativeName,
    image: null,
    biography: [`${creator.name} est un auteur fictif du jeu de données hors ligne.`],
    works: catalog
      .filter(entry => entry.manga.credits.some(credit => credit.creatorId === id))
      .map(entry => ({ roleLabel: 'Story & Art', manga: entry.manga })),
  }))
}

function toManga(seed: FixtureSeed, relations: Manga['relations']): Manga {
  const cover = coverDataUri(seed.hue, seed.nativeTitle)
  const creator = CREATORS[seed.creatorId as keyof typeof CREATORS]
  return {
    id: seed.id,
    slug: slugify(seed.title),
    title: seed.title,
    nativeTitle: seed.nativeTitle,
    cover: { small: cover, medium: cover, large: cover, dominantColor: hslToHex(seed.hue, 55, 45) },
    status: seed.status,
    format: 'serial',
    origin: seed.origin,
    startYear: seed.startYear,
    genres: seed.genres,
    score: seed.score || null,
    popularity: seed.popularity,
    favourites: Math.round(seed.popularity / 12),
    chapters: seed.chapters,
    alternativeTitles: [seed.nativeTitle],
    synopsis: [seed.synopsis],
    bannerImage: null,
    volumes: seed.chapters ? Math.ceil(seed.chapters / 9) : null,
    endYear: seed.status === 'finished' ? seed.startYear + 3 : null,
    startDate: String(seed.startYear),
    tags: [{ name: seed.genres[0] ?? 'Drama', rank: 90 }],
    credits: [{ creatorId: seed.creatorId, slug: slugify(creator.name), name: creator.name, role: 'story_art', roleLabel: 'Story & Art', image: null }],
    relations,
    updatedAt: '2026-09-01T00:00:00.000Z',
  }
}

function toAvailability(seed: FixtureSeed): Availability[] {
  return seed.platforms.map(([platformName, language]) => ({
    platformId: slugify(platformName),
    platformName,
    url: `https://${slugify(platformName)}.example/titles/${seed.id}?lang=${encodeURIComponent(language.toLowerCase())}`,
    language,
    sourceProvider: FIXTURE_PROVIDER_ID,
  }))
}

function coverDataUri(hue: number, label: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 100"><rect width="70" height="100" fill="hsl(${hue} 45% 22%)"/><circle cx="52" cy="24" r="14" fill="hsl(${hue} 70% 60%)"/><text x="8" y="90" font-size="7" fill="#ece8e1" font-family="serif">${label}</text></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

function hslToHex(hue: number, saturation: number, lightness: number): string {
  const s = saturation / 100
  const l = lightness / 100
  const k = (n: number) => (n + hue / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const channel = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))))
  return `#${[channel(0), channel(8), channel(4)].map(value => value.toString(16).padStart(2, '0')).join('')}`
}
