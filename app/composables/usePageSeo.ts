export interface PageSeo {
  readonly title: string
  readonly description: string
  readonly path: string
  readonly image?: string | null
  readonly imageAlt?: string
  readonly type?: 'website' | 'book' | 'profile'
  readonly noindex?: boolean
}

const DESCRIPTION_LIMIT = 160

export function useSiteUrl() {
  return String(useRuntimeConfig().public.siteUrl).replace(/\/+$/, '')
}

export function usePageSeo(input: MaybeRefOrGetter<PageSeo>) {
  const siteUrl = useSiteUrl()
  const siteName = String(useRuntimeConfig().public.siteName)
  const seo = computed(() => toValue(input))
  const description = computed(() => truncate(seo.value.description, DESCRIPTION_LIMIT))
  const url = computed(() => `${siteUrl}${seo.value.path}`)

  useSeoMeta({
    title: () => seo.value.title,
    description,
    ogTitle: () => seo.value.title,
    ogDescription: description,
    ogUrl: url,
    ogType: () => (seo.value.type === 'book' ? 'book' : seo.value.type === 'profile' ? 'profile' : 'website'),
    ogSiteName: siteName,
    ogLocale: 'fr_FR',
    ogImage: () => seo.value.image ?? undefined,
    ogImageAlt: () => seo.value.imageAlt,
    twitterCard: () => (seo.value.image ? 'summary_large_image' : 'summary'),
    twitterTitle: () => seo.value.title,
    twitterDescription: description,
    twitterImage: () => seo.value.image ?? undefined,
    robots: () => (seo.value.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
  })
  useHead({ link: [{ rel: 'canonical', href: url }] })
}

export function useJsonLd(data: MaybeRefOrGetter<Record<string, unknown> | null>) {
  useHead({
    script: [
      {
        key: 'json-ld',
        type: 'application/ld+json',
        innerHTML: () => {
          const value = toValue(data)
          return value ? serializeJsonLd(value) : ''
        },
      },
    ],
  })
}

export function serializeJsonLd(value: Record<string, unknown>): string {
  return JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026')
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text
  return `${text.slice(0, limit - 1).replace(/\s+\S*$/, '')}…`
}
