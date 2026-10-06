export interface EditorialPickConfig {
  readonly mangaId: string
  readonly note: string
}

export const EDITORIAL_PICKS: readonly EditorialPickConfig[] = [
  { mangaId: '30656', note: 'Ink as weather. Every duel reads like a brush stroke you can hear.' },
  { mangaId: '118586', note: 'A fantasy told from the quiet after the quest — grief, time, and small kindnesses.' },
  { mangaId: '86082', note: 'World-building through recipes. The most inventive dungeon ever drawn.' },
  { mangaId: '34632', note: 'Uncomfortable, unforgettable. A coming-of-age that refuses to look away.' },
  { mangaId: '136807', note: 'One sitting, one gut-punch. A love letter to the act of drawing itself.' },
]

export const FIXTURE_EDITORIAL_PICKS: readonly EditorialPickConfig[] = [
  { mangaId: '9001', note: 'A slow-burn of salt, tide and memory.' },
  { mangaId: '9004', note: 'Architecture as character. Every panel is a floor plan of grief.' },
  { mangaId: '9007', note: 'Small stakes, enormous heart.' },
]
