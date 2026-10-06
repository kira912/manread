export interface EditorialPickConfig {
  readonly mangaId: string
  readonly note: string
}

export const EDITORIAL_PICKS: readonly EditorialPickConfig[] = [
  { mangaId: '30656', note: 'L’encre comme une météo. Chaque duel se lit comme un coup de pinceau qu’on entendrait.' },
  { mangaId: '118586', note: 'Une fantasy racontée depuis le calme d’après la quête : le deuil, le temps, et les petites gentillesses.' },
  { mangaId: '86082', note: 'Un univers bâti à coups de recettes. Le donjon le plus inventif jamais dessiné.' },
  { mangaId: '34632', note: 'Dérangeant, inoubliable. Un récit d’apprentissage qui refuse de détourner le regard.' },
  { mangaId: '136807', note: 'Une seule lecture, un coup au cœur. Une lettre d’amour au geste même de dessiner.' },
]

export const FIXTURE_EDITORIAL_PICKS: readonly EditorialPickConfig[] = [
  { mangaId: '9001', note: 'Une lente combustion de sel, de marées et de souvenirs.' },
  { mangaId: '9004', note: 'L’architecture comme personnage. Chaque case est le plan d’un deuil.' },
  { mangaId: '9007', note: 'De petits enjeux, un cœur immense.' },
]
