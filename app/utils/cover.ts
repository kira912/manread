import type { MangaSnapshot } from '#shared/domain/library'
import { COVER_RENDER_WIDTHS, COVER_WIDTHS, type CoverImage } from '#shared/domain/manga'

const OPTIMIZABLE_ORIGIN = 'https://s4.anilist.co/'
const COVER_QUALITY = 72

export interface CoverSources {
  readonly src: string
  readonly srcset: string
}

type ImageUrlBuilder = (source: string, modifiers: Record<string, string | number>) => string

export function snapshotCover(snapshot: MangaSnapshot): CoverImage {
  return { small: snapshot.coverMedium, medium: snapshot.coverMedium, large: snapshot.coverLarge, dominantColor: snapshot.dominantColor }
}

export function coverSources(cover: CoverImage, buildUrl: ImageUrlBuilder): CoverSources {
  if (!cover.large.startsWith(OPTIMIZABLE_ORIGIN)) {
    return {
      src: cover.medium,
      srcset: [`${cover.small} ${COVER_WIDTHS.small}w`, `${cover.medium} ${COVER_WIDTHS.medium}w`, `${cover.large} ${COVER_WIDTHS.large}w`].join(', '),
    }
  }
  const variant = (width: number) => buildUrl(cover.large, { width, format: 'webp', quality: COVER_QUALITY })
  return {
    src: variant(COVER_WIDTHS.medium),
    srcset: COVER_RENDER_WIDTHS.map(width => `${variant(width)} ${width}w`).join(', '),
  }
}

export function useCoverSources() {
  const image = useImage()
  return (cover: CoverImage) => coverSources(cover, (source, modifiers) => image(source, modifiers))
}
