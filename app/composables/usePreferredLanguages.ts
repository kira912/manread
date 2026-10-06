import { parseAcceptLanguage, preferredLanguagesFromLocales } from '#shared/domain/labels'

/** Catalog languages ordered by the visitor's browser preferences, falling back to French then English. */
export function usePreferredLanguages() {
  const headers = import.meta.server ? useRequestHeaders(['accept-language']) : {}
  return useState<string[]>('preferred-languages', () =>
    preferredLanguagesFromLocales(
      import.meta.server ? parseAcceptLanguage(headers['accept-language']) : [...(navigator.languages ?? [navigator.language])],
    ),
  )
}
