import type { Availability } from '#shared/domain/availability'
import type { Manga } from '#shared/domain/manga'
import type { AvailabilityProvider } from '../../../application/ports'
import type { AniListGateway } from './gateway'
import { ANILIST_PROVIDER_ID, mapMediaDetail } from './mapper'

const ANILIST_ID = /^[1-9]\d{0,8}$/

export class AniListAvailabilityProvider implements AvailabilityProvider {
  readonly id = ANILIST_PROVIDER_ID

  constructor(private readonly gateway: AniListGateway) {}

  async getAvailability(manga: Pick<Manga, 'id'>): Promise<Availability[]> {
    if (!ANILIST_ID.test(manga.id)) return []
    const raw = await this.gateway.loadMediaDetail(Number(manga.id))
    return raw ? (mapMediaDetail(raw, this.gateway)?.availability ?? []) : []
  }
}
